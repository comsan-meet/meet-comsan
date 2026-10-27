/**
 * COMSAN Meeting System - Camera & Live Screen Sharing Component
 */

function requestStreamPermission() {
  const userId = window.currentUserId || localStorage.getItem('comsan_current_user_id');
  if (!userId) {
    if (typeof showToast === 'function') showToast('กรุณาเข้าสู่ระบบก่อนขอสิทธิ์แชร์หน้าจอ', 'warning');
    return;
  }
  const me = (window.appState?.users || []).find(u => u.id === userId);
  if (me) me.streamPermission = 'PENDING';
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('stream:requestPermission', userId);
  }
  renderStreamSection();
  if (typeof showToast === 'function') showToast('ส่งคำขอเปิดกล้อง/แชร์หน้าจอไปยังผู้ดำเนินการแล้ว', 'info');
}

function adminSetStreamPermission(userId, status) {
  const user = (window.appState?.users || []).find(u => u.id === userId);
  if (user) user.streamPermission = status;
  if (status !== 'APPROVED') {
    if (window.appState?.activeStream && (window.appState.activeStream.streamerId === userId || !window.appState.activeStream.streamerId)) {
      window.appState.activeStream = null;
      clearStreamViewerScreens();
      if (window.socket) {
        window.socket.emit('stream:stop');
      }
    }
  }
  if (typeof window.saveLocalState === 'function') window.saveLocalState();
  if (window.socket) {
    window.socket.emit('admin:setStreamPermission', { userId, status });
  }
  if (typeof window.updateAdminSidebarBadges === 'function' && window.appState) {
    window.updateAdminSidebarBadges(window.appState);
  }
  renderStreamSection();
  if (user && typeof showToast === 'function') {
    showToast(status === 'APPROVED' ? `อนุมัติให้ ${user.nickname} แชร์หน้าจอ/กล้องแล้ว` : `คืนสถานะสิทธิ์ของ ${user.nickname} แล้ว`, 'success');
  }
}

async function populateCameraDeviceOptions() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    const selectEl = document.getElementById('streamCameraSelect');
    if (!selectEl) return;

    const currentVal = selectEl.value || window.selectedCameraDeviceId;
    let html = `
      <option value="user">📱 กล้องหน้า (Front Camera)</option>
      <option value="environment">📷 กล้องหลัง (Back Camera)</option>
    `;
    videoDevices.forEach((d, idx) => {
      if (d.deviceId) {
        html += `<option value="${d.deviceId}">💻 ${d.label || `กล้องตัวที่ ${idx + 1}`}</option>`;
      }
    });
    selectEl.innerHTML = html;
    if ([...selectEl.options].some(o => o.value === currentVal)) selectEl.value = currentVal;
  } catch (e) {}
}

function stopMediaTracksOnly() {
  if (window.streamInterval) {
    clearInterval(window.streamInterval);
    window.streamInterval = null;
  }
  if (window.localMediaStream) {
    window.localMediaStream.getTracks().forEach(t => t.stop());
    window.localMediaStream = null;
  }
  const video = document.getElementById('localStreamVideo');
  if (video) video.srcObject = null;
  const indicator = document.getElementById('liveStreamActiveIndicator');
  if (indicator) indicator.classList.add('hidden');
}

function clearStreamViewerScreens() {
  ['userLiveStreamViewer', 'adminLiveStreamViewer'].forEach(id => {
    const img = document.getElementById(id);
    if (img) {
      img.removeAttribute('src');
      img.classList.add('hidden');
    }
  });
  ['userStreamEmptyText', 'adminStreamEmptyText'].forEach(id => {
    const empty = document.getElementById(id);
    if (empty) empty.classList.remove('hidden');
  });
  const pill = document.getElementById('streamLiveStatusPill');
  if (pill) {
    pill.className = 'px-2.5 sm:px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0';
    pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span> รอการนำเสนอ';
  }
  const presName = document.getElementById('streamPresenterName');
  const presSub = document.getElementById('streamPresenterSub');
  if (presName) presName.textContent = 'ไม่มีการแชร์หน้าจอ';
  if (presSub) presSub.textContent = 'ยังไม่มีผู้แชร์หน้าจอหรือเปิดกล้องในขณะนี้';
  closeStreamFullscreen();
}

function startFrameBroadcastLoop(mode) {
  if (window.streamInterval) clearInterval(window.streamInterval);
  const resSelect = document.getElementById('streamResSelect');
  const fpsSelect = document.getElementById('streamFpsSelect');
  window.selectedStreamRes = resSelect ? Number(resSelect.value) || 640 : 640;
  window.selectedStreamFps = fpsSelect ? Number(fpsSelect.value) || 5 : 5;

  const intervalMs = Math.max(30, Math.round(1000 / window.selectedStreamFps));
  const jpegQuality = window.selectedStreamRes >= 960 ? 0.72 : window.selectedStreamRes >= 640 ? 0.62 : 0.5;
  const video = document.getElementById('localStreamVideo');
  const me = (window.appState.users || []).find(u => u.id === window.currentUserId);
  const streamerName = me ? `${me.firstName} ${me.lastName} (${me.nickname})` : 'ผู้ดำเนินการ (ADMIN)';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let isBroadcastingFrame = false;

  window.streamInterval = setInterval(() => {
    if (!window.localMediaStream || !video || video.readyState < 2) return;
    if (isBroadcastingFrame) return;
    isBroadcastingFrame = true;
    try {
      const targetW = window.selectedStreamRes;
      const ratio = video.videoHeight / Math.max(1, video.videoWidth);
      const targetH = Math.round(targetW * ratio) || Math.round(targetW * 0.75);
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.drawImage(video, 0, 0, targetW, targetH);
      window.socket.emit('stream:frame', {
        streamerId: window.currentUserId || 'ADMIN',
        streamerName,
        mode,
        frameDataUrl: canvas.toDataURL('image/jpeg', jpegQuality)
      });
    } finally {
      isBroadcastingFrame = false;
    }
  }, intervalMs);
}

async function startLocalStream(mode) {
  try {
    stopMediaTracksOnly();
    window.currentStreamMode = mode;
    const camSelect = document.getElementById('streamCameraSelect');
    const resSelect = document.getElementById('streamResSelect');
    const fpsSelect = document.getElementById('streamFpsSelect');
    window.selectedCameraDeviceId = camSelect ? camSelect.value : 'user';
    window.selectedStreamRes = resSelect ? Number(resSelect.value) || 640 : 640;
    window.selectedStreamFps = fpsSelect ? Number(fpsSelect.value) || 5 : 5;

    if (mode === 'SCREEN') {
      window.localMediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: window.selectedStreamRes }, frameRate: { ideal: window.selectedStreamFps, max: 30 } },
        audio: false
      });
    } else {
      let videoConstraints = {
        width: { ideal: window.selectedStreamRes },
        height: { ideal: Math.round(window.selectedStreamRes * 0.75) },
        frameRate: { ideal: window.selectedStreamFps, max: 30 }
      };
      if (window.selectedCameraDeviceId === 'user' || window.selectedCameraDeviceId === 'environment') {
        videoConstraints.facingMode = { ideal: window.selectedCameraDeviceId };
      } else {
        videoConstraints.deviceId = { exact: window.selectedCameraDeviceId };
      }
      window.localMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      populateCameraDeviceOptions();
    }

    const videoTrack = window.localMediaStream.getVideoTracks()[0];
    if (videoTrack) videoTrack.onended = () => stopAndReleaseStream();

    const video = document.getElementById('localStreamVideo');
    if (video) {
      video.srcObject = window.localMediaStream;
      await video.play();
    }

    const indicator = document.getElementById('liveStreamActiveIndicator');
    if (indicator) indicator.classList.remove('hidden');

    startFrameBroadcastLoop(mode);
    showToast(mode === 'SCREEN' ? 'เริ่มแชร์หน้าจอแล้ว' : 'เริ่มเปิดกล้องแล้ว', 'success');
  } catch (err) {
    showToast('ไม่สามารถเปิดกล้องหรือแชร์หน้าจอได้ (ต้องเปิดผ่าน localhost หรือ HTTPS)', 'error');
  }
}

function handleStreamSettingsChange(changeType) {
  if (!window.localMediaStream || !window.currentStreamMode) return;
  if (changeType === 'CAMERA_DEVICE' && window.currentStreamMode === 'CAMERA') {
    startLocalStream('CAMERA');
    showToast('สลับกล้องเรียบร้อยแล้ว', 'info');
  } else if (changeType === 'RES_FPS') {
    startFrameBroadcastLoop(window.currentStreamMode);
    showToast('อัปเดตความละเอียดและ FPS แล้ว', 'info');
  }
}

function stopAndReleaseStream() {
  stopMediaTracksOnly();
  window.currentStreamMode = null;
  if (window.appState) window.appState.activeStream = null;
  clearStreamViewerScreens();
  if (window.socket) window.socket.emit('stream:stop');

  if (window.currentUserId) {
    const me = (window.appState?.users || []).find(u => u.id === window.currentUserId);
    if (me) me.streamPermission = 'NONE';
    if (typeof window.saveLocalState === 'function') window.saveLocalState();
    if (window.socket) {
      window.socket.emit('admin:setStreamPermission', { userId: window.currentUserId, status: 'NONE' });
      window.socket.emit('user:finishPermission', { userId: window.currentUserId, permType: 'STREAM' });
    }
  }
  if (typeof window.renderAll === 'function') window.renderAll();
  if (typeof window.renderStreamSection === 'function') window.renderStreamSection();
  showToast('หยุดแชร์และคืนสิทธิ์เรียบร้อยแล้ว', 'info');
}

function adminStopAllStreams() {
  stopMediaTracksOnly();
  if (window.streamInterval) {
    clearInterval(window.streamInterval);
    window.streamInterval = null;
  }
  window.currentStreamMode = null;
  if (window.appState) {
    window.appState.activeStream = null;
    if (Array.isArray(window.appState.users)) {
      window.appState.users.forEach(u => {
        if (u.streamPermission === 'APPROVED' || u.streamPermission === 'PENDING') {
          u.streamPermission = 'NONE';
        }
      });
    }
  }
  clearStreamViewerScreens();
  if (window.socket) {
    window.socket.emit('admin:stopAllStreams');
    window.socket.emit('stream:stop');
  }
  if (typeof window.saveLocalState === 'function') window.saveLocalState();
  if (typeof window.renderAll === 'function') window.renderAll();
  if (typeof window.renderStreamSection === 'function') window.renderStreamSection();
  if (typeof showToast === 'function') showToast('สั่งหยุดการแชร์หน้าจอและกล้องทั้งหมดเรียบร้อยแล้ว', 'info');
}

function stopLocalStream() {
  if (window.currentRole === 'ADMIN') {
    adminStopAllStreams();
  } else {
    stopAndReleaseStream();
  }
}

function finishUserPermission(permType) {
  if (!window.currentUserId || !window.appState) return;
  const me = (window.appState.users || []).find(u => u.id === window.currentUserId);
  if (!me) return;
  if (permType === 'STREAM') {
    stopAndReleaseStream();
  } else if (permType === 'FILE') {
    me.filePermission = 'NONE';
    window.saveLocalState();
    window.socket.emit('admin:setFilePermission', { userId: window.currentUserId, status: 'NONE' });
    window.socket.emit('user:finishPermission', { userId: window.currentUserId, permType: 'FILE' });
    if (typeof window.renderAll === 'function') window.renderAll();
    showToast('เสร็จสิ้นการอัปโหลดและคืนสิทธิ์เรียบร้อยแล้ว', 'info');
  }
}

function openStreamFullscreen(sourceImgId) {
  const srcImg = document.getElementById(sourceImgId);
  if (!srcImg || srcImg.classList.contains('hidden') || !srcImg.src) {
    showToast('ยังไม่มีสัญญาณภาพสดให้ขยายเต็มจอ', 'warning');
    return;
  }
  window.activeFullscreenSourceId = sourceImgId;
  const fsModal = document.getElementById('streamFullscreenModal');
  const fsImg = document.getElementById('fullscreenStreamImg');
  if (fsModal && fsImg) {
    fsImg.src = srcImg.src;
    fsModal.classList.remove('hidden');
    fsModal.classList.add('flex');
    if (fsModal.requestFullscreen) fsModal.requestFullscreen().catch(() => {});
  }
}

function closeStreamFullscreen() {
  window.activeFullscreenSourceId = null;
  const fsModal = document.getElementById('streamFullscreenModal');
  if (fsModal) {
    fsModal.classList.add('hidden');
    fsModal.classList.remove('flex');
  }
  if (fsModal && document.fullscreenElement === fsModal && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function renderStreamSection() {
  const state = window.appState;
  if (!state) return;
  const uid = window.currentUserId || localStorage.getItem('comsan_current_user_id') || 'COMSAN-01';
  const me = (state.users || []).find(u => u.id === uid);
  const permBox = document.getElementById('userStreamPermissionBox');
  const controls = document.getElementById('userStreamControls');
  if (me && permBox && controls) {
      if (me.streamPermission === 'APPROVED') {
        permBox.innerHTML = `
          <button type="button" onclick="finishUserPermission('STREAM')" class="px-2.5 sm:px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 text-[11px] sm:text-xs font-bold hover:bg-rose-600 hover:text-white transition whitespace-nowrap shrink-0">
            คืนสิทธิ์
          </button>
        `;
        controls.classList.remove('hidden');
      } else if (me.streamPermission === 'PENDING') {
        permBox.innerHTML = `<span class="px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 text-[11px] sm:text-xs font-bold animate-pulse whitespace-nowrap shrink-0 inline-block">รออนุมัติ...</span>`;
        controls.classList.add('hidden');
      } else {
        permBox.innerHTML = `
          <button type="button" onclick="requestStreamPermission()" class="px-2.5 sm:px-3.5 py-1 sm:py-1.5 btn-primary-gradient text-white rounded-full text-[11px] sm:text-xs font-bold shadow-sm transition whitespace-nowrap shrink-0">
            ขอแชร์หน้าจอ/กล้อง
          </button>
        `;
        controls.classList.add('hidden');
      }
    }

  // Admin stream permission list
  const permListEl = document.getElementById('adminStreamPermissionsList');
  if (permListEl) {
    const sorted = (state.users || [])
      .map((u, originalIdx) => ({ u, originalIdx }))
      .sort((a, b) => {
        const getPrio = (st) => st === 'PENDING' ? 2 : st === 'APPROVED' ? 1 : 0;
        const diff = getPrio(b.u.streamPermission) - getPrio(a.u.streamPermission);
        return diff !== 0 ? diff : a.originalIdx - b.originalIdx;
      });

    permListEl.innerHTML = sorted.map(({ u, originalIdx }) => {
      const st = u.streamPermission || 'NONE';
      const cardCls = st === 'PENDING'
        ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/20'
        : st === 'APPROVED'
        ? 'bg-emerald-500/10 border-emerald-500/40'
        : 'bg-card border-border hover:border-primary/30';

      return `
        <div class="p-2.5 sm:p-3 rounded-xl border ${cardCls} flex items-center justify-between text-xs gap-2.5 transition">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-full ${st === 'PENDING' ? 'bg-amber-500 text-white' : st === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'} font-bold text-[11px] flex items-center justify-center shrink-0">
              #${originalIdx + 1}
            </div>
            <div class="min-w-0">
              <span class="font-bold text-foreground truncate block">${u.nickname || u.firstName || 'สมาชิก'}</span>
              <span class="block text-[10px] truncate ${st === 'PENDING' ? 'text-amber-600 dark:text-amber-400 font-bold' : st === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground'}">
                ${st === 'PENDING' ? '🔔 ขอสิทธิ์แชร์หน้าจอ/กล้อง!' : st === 'APPROVED' ? '🎥 กำลังได้รับสิทธิ์' : 'ลำดับปกติ'}
              </span>
            </div>
          </div>
          <div class="shrink-0">
            ${st === 'APPROVED'
              ? `<button type="button" onclick="adminSetStreamPermission('${u.id}', 'NONE')" class="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition shadow-2xs whitespace-nowrap cursor-pointer">เสร็จสิ้น</button>`
              : st === 'PENDING'
              ? `<div class="flex items-center gap-1.5"><button type="button" onclick="adminSetStreamPermission('${u.id}', 'NONE')" class="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-500/30 text-[11px] font-bold transition inline-flex items-center justify-center shrink-0 cursor-pointer" title="ไม่อนุญาต"><i data-lucide="x" class="h-4 w-4 pointer-events-none"></i></button><button type="button" onclick="adminSetStreamPermission('${u.id}', 'APPROVED')" class="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-2xs inline-flex items-center justify-center shrink-0 cursor-pointer" title="อนุญาต"><i data-lucide="check" class="h-4 w-4 pointer-events-none"></i></button></div>`
              : `<button type="button" onclick="adminSetStreamPermission('${u.id}', 'APPROVED')" class="w-8 h-8 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-border text-foreground text-[11px] font-semibold transition inline-flex items-center justify-center shrink-0 cursor-pointer" title="ให้สิทธิ์"><i data-lucide="check" class="h-4 w-4 pointer-events-none"></i></button>`}
          </div>
        </div>
      `;
    }).join('');
  }

  // Active stream viewer render
  if (state.activeStream && state.activeStream.frameDataUrl) {
    const act = state.activeStream;
    ['userLiveStreamViewer', 'adminLiveStreamViewer'].forEach(id => {
      const img = document.getElementById(id);
      if (img) {
        img.src = act.frameDataUrl;
        img.classList.remove('hidden');
      }
    });
    ['userStreamEmptyText', 'adminStreamEmptyText'].forEach(id => {
      const empty = document.getElementById(id);
      if (empty) empty.classList.add('hidden');
    });

    const pill = document.getElementById('streamLiveStatusPill');
    if (pill) {
      pill.className = 'px-2.5 sm:px-3 py-1 rounded-full bg-rose-500 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse whitespace-nowrap shrink-0';
      pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-white animate-ping shrink-0"></span> ${act.mode === 'SCREEN' ? 'กำลังแชร์หน้าจอ' : 'ถ่ายทอดสดกล้อง'}`;
    }
    const nameEl = document.getElementById('streamPresenterName');
    const subEl = document.getElementById('streamPresenterSub');
    if (nameEl) nameEl.textContent = act.streamerName || 'ผู้ดำเนินการ';
    if (subEl) subEl.textContent = `สัญญาณภาพสดจาก ${act.mode === 'SCREEN' ? 'หน้าจอคอมพิวเตอร์' : 'กล้องวิดีโอ'}`;

    if (window.activeFullscreenSourceId) {
      const fsImg = document.getElementById('fullscreenStreamImg');
      if (fsImg) fsImg.src = act.frameDataUrl;
    }
  } else {
    clearStreamViewerScreens();
  }
}

// Window attachments
window.requestStreamPermission = requestStreamPermission;
window.adminSetStreamPermission = adminSetStreamPermission;
window.populateCameraDeviceOptions = populateCameraDeviceOptions;
window.startLocalStream = startLocalStream;
window.handleStreamSettingsChange = handleStreamSettingsChange;
window.stopAndReleaseStream = stopAndReleaseStream;
window.adminStopAllStreams = adminStopAllStreams;
window.stopLocalStream = stopLocalStream;
window.finishUserPermission = finishUserPermission;
window.openStreamFullscreen = openStreamFullscreen;
window.closeStreamFullscreen = closeStreamFullscreen;
window.renderStreamSection = renderStreamSection;
window.clearStreamViewerScreens = clearStreamViewerScreens;
