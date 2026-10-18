/**
 * COMSAN Meeting System - Camera & Live Screen Sharing Component
 */

function requestStreamPermission() {
  if (!window.currentUserId) return;
  const me = (window.appState.users || []).find(u => u.id === window.currentUserId);
  if (me) me.streamPermission = 'PENDING';
  window.saveLocalState();
  window.socket.emit('stream:requestPermission', window.currentUserId);
  renderStreamSection();
  showToast('ส่งคำขอเปิดกล้อง/แชร์หน้าจอไปยังผู้ดำเนินการแล้ว', 'info');
}

function adminSetStreamPermission(userId, status) {
  const user = (window.appState.users || []).find(u => u.id === userId);
  if (user) user.streamPermission = status;
  window.saveLocalState();
  window.socket.emit('admin:setStreamPermission', { userId, status });
  renderStreamSection();
  showToast(status === 'APPROVED' ? `อนุมัติให้ ${user.nickname} แชร์หน้าจอ/กล้องแล้ว` : `คืนสถานะสิทธิ์ของ ${user.nickname} แล้ว`, 'success');
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
  closeStreamFullscreen();
}

function startFrameBroadcastLoop(mode) {
  if (window.streamInterval) clearInterval(window.streamInterval);
  const resSelect = document.getElementById('streamResSelect');
  const fpsSelect = document.getElementById('streamFpsSelect');
  window.selectedStreamRes = resSelect ? Number(resSelect.value) || 640 : 640;
  window.selectedStreamFps = fpsSelect ? Number(fpsSelect.value) || 5 : 5;

  const intervalMs = Math.max(65, Math.round(1000 / window.selectedStreamFps));
  const jpegQuality = window.selectedStreamRes >= 960 ? 0.72 : window.selectedStreamRes >= 640 ? 0.62 : 0.5;
  const video = document.getElementById('localStreamVideo');
  const me = (window.appState.users || []).find(u => u.id === window.currentUserId);
  const streamerName = me ? `${me.firstName} ${me.lastName} (${me.nickname})` : 'ผู้ดำเนินการ (ADMIN)';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  window.streamInterval = setInterval(() => {
    if (!window.localMediaStream || !video || video.readyState < 2) return;
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
  }, intervalMs);
}

async function startLocalStream(mode) {
  try {
    stopMediaTracksOnly();
    window.currentStreamMode = mode;
    const camSelect = document.getElementById('streamCameraSelect');
    const resSelect = document.getElementById('streamResSelect');
    window.selectedCameraDeviceId = camSelect ? camSelect.value : 'user';
    window.selectedStreamRes = resSelect ? Number(resSelect.value) || 640 : 640;

    if (mode === 'SCREEN') {
      window.localMediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: window.selectedStreamRes }, frameRate: { ideal: window.selectedStreamFps } },
        audio: false
      });
    } else {
      let videoConstraints = { width: { ideal: window.selectedStreamRes }, height: { ideal: Math.round(window.selectedStreamRes * 0.75) } };
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
  window.socket.emit('stream:stop');

  if (window.currentRole === 'USER' && window.currentUserId) {
    const me = (window.appState.users || []).find(u => u.id === window.currentUserId);
    if (me) me.streamPermission = 'NONE';
    window.saveLocalState();
    window.socket.emit('admin:setStreamPermission', { userId: window.currentUserId, status: 'NONE' });
    window.socket.emit('user:finishPermission', { userId: window.currentUserId, permType: 'STREAM' });
  }
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast('หยุดแชร์และคืนสิทธิ์เรียบร้อยแล้ว', 'info');
}

function stopLocalStream() {
  stopAndReleaseStream();
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
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

function renderStreamSection() {
  const state = window.appState;
  if (!state) return;
  const uid = window.currentUserId || 'COMSAN-01';
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
      return `
        <div class="p-2.5 rounded-xl border ${st === 'PENDING' ? 'bg-amber-500/15 border-amber-500' : st === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/40' : 'border-slate-200 dark:border-slate-800'} flex items-center justify-between text-xs gap-2">
          <div class="truncate">
            <span class="font-bold">#${originalIdx + 1} ${u.nickname}</span>
            <span class="block text-[10px] ${st === 'PENDING' ? 'text-amber-500 font-bold' : st === 'APPROVED' ? 'text-emerald-500 font-bold' : 'text-slate-400'}">
              ${st === 'PENDING' ? '🔔 ขอสิทธิ์แชร์หน้าจอ/กล้อง!' : st === 'APPROVED' ? '🎥 กำลังได้รับสิทธิ์' : 'ลำดับปกติ'}
            </span>
          </div>
          <div class="shrink-0">
            ${st === 'APPROVED' ? `<button type="button" onclick="adminSetStreamPermission('${u.id}', 'NONE')" class="px-2.5 py-1 rounded bg-rose-600 text-white font-bold">เสร็จสิ้น</button>` : st === 'PENDING' ? `<button type="button" onclick="adminSetStreamPermission('${u.id}', 'APPROVED')" class="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold">อนุญาต</button>` : `<button type="button" onclick="adminSetStreamPermission('${u.id}', 'APPROVED')" class="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold">ให้สิทธิ์</button>`}
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
window.stopLocalStream = stopLocalStream;
window.finishUserPermission = finishUserPermission;
window.openStreamFullscreen = openStreamFullscreen;
window.closeStreamFullscreen = closeStreamFullscreen;
window.renderStreamSection = renderStreamSection;
window.clearStreamViewerScreens = clearStreamViewerScreens;
