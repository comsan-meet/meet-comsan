/**
 * COMSAN Meeting System - Files Component
 */

async function downloadSharedFile(fileId) {
  const state = window.appState;
  const f = (state.files || []).find(item => item.id === fileId);
  if (!f) return showToast('ไม่พบข้อมูลไฟล์', 'error');

  if (!f.dataUrl && typeof window.fetchFileContentFromCloud === 'function') {
    showToast(`กำลังโหลดข้อมูลไฟล์ "${f.name}"...`, 'info');
    f.dataUrl = await window.fetchFileContentFromCloud(fileId);
  }

  if (!f.dataUrl) return showToast('ไม่พบข้อมูลเนื้อหาของไฟล์', 'error');
  try {
    triggerUniversalBlobDownload(dataURLToBlob(f.dataUrl), f.name);
    showToast(`กำลังดาวน์โหลด "${f.name}"...`, 'info');
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์', 'error');
  }
}

function requestFileDropPermission() {
  if (!window.currentUserId) return;
  const me = (window.appState.users || []).find(u => u.id === window.currentUserId);
  if (me) me.filePermission = 'PENDING';
  window.saveLocalState();
  window.socket.emit('file:requestPermission', window.currentUserId);
  renderFileDropSection();
  showToast('ส่งคำขออนุญาตอัปโหลดเอกสารแล้ว', 'info');
}

function adminSetFilePermission(userId, status) {
  const user = (window.appState.users || []).find(u => u.id === userId);
  if (user) user.filePermission = status;
  window.saveLocalState();
  window.socket.emit('admin:setFilePermission', { userId, status });
  renderFileDropSection();
}

function handleFileUpload(e, roleType) {
  const file = e.target.files[0];
  if (!file) return;
  let uploaderId = 'ADMIN', uploaderName = 'ผู้ดำเนินการ (ADMIN)';
  if (roleType === 'USER') {
    const me = (window.appState.users || []).find(u => u.id === window.currentUserId);
    uploaderId = me ? me.id : (window.currentUserId || 'USER');
    const pos = (me && me.position) ? ` (${me.position})` : '';
    uploaderName = me ? `${me.nickname || me.firstName || 'สมาชิก'}${pos}` : 'ผู้เข้าร่วมประชุม';
  }
  const reader = new FileReader();
  reader.onload = function (evt) {
    const now = Date.now();
    const fileObj = {
      id: 'FILE-' + now,
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: evt.target.result,
      uploaderId,
      uploaderName,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      uploadedAt: now,
      isPinned: false,
      pinnedAt: null
    };
    // Do NOT push directly to appState.files to prevent 2x duplication; ActionReducer handles it
    window.socket.emit('file:upload', fileObj);
    e.target.value = '';
    renderFileDropSection();
    showToast(`อัปโหลดไฟล์ "${file.name}" เรียบร้อยแล้ว`, 'success');
  };
  reader.readAsDataURL(file);
}

function togglePinSharedFile(fileId) {
  if (window.currentRole !== 'ADMIN' || !window.isAdminAuthenticated) return;
  const file = (window.appState?.files || []).find(f => f.id === fileId);
  if (!file) return;
  file.isPinned = !file.isPinned;
  file.pinnedAt = file.isPinned ? Date.now() : null;
  window.saveLocalState();
  window.socket.emit('admin:togglePinFile', fileId);
  renderFileDropSection();
  showToast(file.isPinned ? `📌 ปักหมุดเอกสาร "${file.name}" ไว้บนสุดแล้ว` : `เลิกปักหมุดเอกสาร "${file.name}" แล้ว`, 'info');
}

function deleteSharedFile(fileId) {
  if (!confirm('ต้องการลบไฟล์นี้ออกจากห้องประชุมหรือไม่?')) return;
  window.appState.files = (window.appState.files || []).filter(f => f.id !== fileId);
  window.saveLocalState();
  window.socket.emit('file:delete', fileId);
  renderFileDropSection();
}

function formatFileUploadStamp(f) {
  if (f && f.uploadedAt) {
    const d = new Date(f.uploadedAt);
    const date = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time} น.`;
  }
  return `${(f && f.time) || '-'} น.`;
}

function escapeFileHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/[&<>"']/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

function formatFileSize(bytes) {
  if (!bytes) return 'เอกสารแนบ';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Detect file icon, color theme, and label based on file name or MIME type
 */
function getFileVisualInfo(fileName, mimeType) {
  const name = (fileName || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop().trim() : '';
  const mime = (mimeType || '').toLowerCase();

  // 1. Excel / Spreadsheets (XLSX, XLS, CSV, ODS, TSV)
  if (['xlsx', 'xls', 'csv', 'ods', 'tsv'].includes(ext) || mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) {
    return {
      icon: 'file-spreadsheet',
      colorClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
      label: 'Excel'
    };
  }

  // 2. Word / Documents (DOCX, DOC, RTF, ODT)
  if (['docx', 'doc', 'rtf', 'odt'].includes(ext) || mime.includes('word') || mime.includes('document')) {
    return {
      icon: 'file-text',
      colorClass: 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400',
      label: 'Word'
    };
  }

  // 3. PowerPoint / Presentations (PPTX, PPT, PPS, PPSX, ODP, KEY)
  if (['pptx', 'ppt', 'pps', 'ppsx', 'odp', 'key'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    return {
      icon: 'presentation',
      colorClass: 'bg-orange-500/10 border-orange-500/25 text-orange-600 dark:text-orange-400',
      label: 'PowerPoint'
    };
  }

  // 4. PDF Documents (PDF)
  if (ext === 'pdf' || mime.includes('pdf')) {
    return {
      icon: 'file-text',
      colorClass: 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400',
      label: 'PDF'
    };
  }

  // 5. Video (MP4, MOV, AVI, MKV, WEBM, M4V, WMV, FLV, 3GP)
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'wmv', 'flv', '3gp'].includes(ext) || mime.startsWith('video/')) {
    return {
      icon: 'video',
      colorClass: 'bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400',
      label: 'วิดีโอ'
    };
  }

  // 6. Images / Photos (JPG, JPEG, PNG, GIF, WEBP, SVG, BMP, ICO, HEIC, TIFF)
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(ext) || mime.startsWith('image/')) {
    return {
      icon: 'image',
      colorClass: 'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
      label: 'รูปภาพ'
    };
  }

  // 7. Audio / Sound (MP3, WAV, M4A, AAC, OGG, FLAC, WMA, OPUS)
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'opus'].includes(ext) || mime.startsWith('audio/')) {
    return {
      icon: 'music',
      colorClass: 'bg-pink-500/10 border-pink-500/25 text-pink-600 dark:text-pink-400',
      label: 'เสียง'
    };
  }

  // 8. Archives / Compressed (ZIP, RAR, 7Z, TAR, GZ, BZ2, XZ)
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext) || mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) {
    return {
      icon: 'archive',
      colorClass: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
      label: 'ไฟล์บีบอัด'
    };
  }

  // 9. Code / Web / Config (JS, TS, HTML, CSS, JSON, PY, SQL, PHP, XML, YAML, SH, BAT)
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'sql', 'php', 'java', 'c', 'cpp', 'sh', 'bat', 'xml', 'yaml', 'yml'].includes(ext) || mime.includes('javascript') || mime.includes('json') || mime.includes('html') || mime.includes('xml')) {
    return {
      icon: 'code',
      colorClass: 'bg-teal-500/10 border-teal-500/25 text-teal-600 dark:text-teal-400',
      label: 'โค้ด/ข้อมูล'
    };
  }

  // 10. Text / Notes (TXT, MD, LOG)
  if (['txt', 'md', 'log'].includes(ext) || mime.includes('text/plain') || mime.includes('text/markdown')) {
    return {
      icon: 'file-text',
      colorClass: 'bg-slate-500/10 border-slate-500/25 text-slate-600 dark:text-slate-400',
      label: 'ข้อความ'
    };
  }

  // 11. Default fallback
  return {
    icon: 'file',
    colorClass: 'bg-primary/10 border-primary/20 text-primary',
    label: 'เอกสาร'
  };
}

async function previewSharedFile(fileId) {
  const state = window.appState;
  const f = (state.files || []).find(item => item.id === fileId);
  if (!f) return showToast('ไม่พบข้อมูลไฟล์', 'error');

  if (!f.dataUrl && typeof window.fetchFileContentFromCloud === 'function') {
    showToast(`กำลังโหลดข้อมูลสำหรับดูตัวอย่าง...`, 'info');
    f.dataUrl = await window.fetchFileContentFromCloud(fileId);
  }

  const modal = document.getElementById('filePreviewModal');
  const titleEl = document.getElementById('filePreviewTitle');
  const metaEl = document.getElementById('filePreviewMeta');
  const iconWrap = document.getElementById('filePreviewIconWrap');
  const iconEl = document.getElementById('filePreviewIcon');
  const bodyEl = document.getElementById('filePreviewBody');
  const dlBtn = document.getElementById('filePreviewDownloadBtn');
  const typeLabelEl = document.getElementById('filePreviewTypeLabel');

  if (!modal || !bodyEl) return;

  const visual = getFileVisualInfo(f.name, f.type);
  if (titleEl) titleEl.textContent = f.name;
  if (metaEl) metaEl.textContent = `${visual.label} • ${formatFileSize(f.size)} • อัปโหลดโดย ${f.uploaderName || '-'} • ${formatFileUploadStamp(f)}`;
  if (typeLabelEl) typeLabelEl.textContent = `ไฟล์ประเภท: ${visual.label} (${formatFileSize(f.size)})`;

  if (iconWrap && visual.colorClass) {
    iconWrap.className = `w-10 h-10 rounded-xl ${visual.colorClass} border flex items-center justify-center text-lg shrink-0`;
  }
  if (iconWrap && visual.icon) {
    iconWrap.innerHTML = window.lucideSvg ? window.lucideSvg(visual.icon, 'w-5 h-5') : `<i data-lucide="${visual.icon}" class="w-5 h-5"></i>`;
  }

  if (dlBtn) {
    dlBtn.onclick = () => downloadSharedFile(f.id);
  }

  const name = (f.name || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop().trim() : '';
  const mime = (f.type || '').toLowerCase();

  const isVideo = ['mp4', 'webm', 'mov', 'm4v', 'ogv', 'mkv'].includes(ext) || mime.startsWith('video/');
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext) || mime.startsWith('image/');
  const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'flac'].includes(ext) || mime.startsWith('audio/');
  const isPdf = ext === 'pdf' || mime.includes('pdf');
  const isText = ['txt', 'json', 'log', 'md', 'js', 'ts', 'html', 'css', 'py', 'sql', 'xml', 'yaml', 'yml'].includes(ext) || mime.startsWith('text/');

  // If dataUrl is missing
  if (!f.dataUrl) {
    bodyEl.innerHTML = `
      <div class="py-12 px-4 text-center space-y-3">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-3xl mx-auto">
          <i data-lucide="alert-triangle" class="w-8 h-8"></i>
        </div>
        <h4 class="text-base font-bold text-foreground">ไม่พบข้อมูลเนื้อหาของไฟล์</h4>
        <p class="text-xs text-muted-foreground max-w-sm mx-auto">ไฟล์นี้อาจถูกอัปโหลดจากแหล่งภายนอก หรือข้อมูลเนื้อหาไม่สมบูรณ์</p>
      </div>
    `;
  } else if (isVideo) {
    bodyEl.innerHTML = `
      <div class="w-full flex-1 flex flex-col items-center justify-center bg-black/95 rounded-2xl overflow-hidden shadow-inner p-1">
        <video id="filePreviewVideoEl" controls autoplay playsinline class="max-w-full max-h-[62vh] w-auto h-auto rounded-xl">
          <source src="${f.dataUrl}" type="${f.type || 'video/mp4'}">
          เบราว์เซอร์ของคุณไม่รองรับการเล่นแท็กวิดีโอ
        </video>
      </div>
    `;
  } else if (isImage) {
    bodyEl.innerHTML = `
      <div class="w-full flex-1 flex items-center justify-center bg-black/90 dark:bg-black/60 rounded-2xl overflow-hidden p-2 shadow-inner">
        <img src="${f.dataUrl}" alt="${escapeFileHtml(f.name)}" class="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg select-none" />
      </div>
    `;
  } else if (isAudio) {
    bodyEl.innerHTML = `
      <div class="w-full py-12 px-6 flex flex-col items-center justify-center text-center space-y-6 bg-muted/40 rounded-2xl border border-border/60">
        <div class="w-20 h-20 rounded-2xl bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/25 flex items-center justify-center text-4xl shadow-inner">
          <i data-lucide="music" class="w-10 h-10 animate-pulse"></i>
        </div>
        <div class="max-w-md">
          <h4 class="text-base font-bold text-foreground truncate">${escapeFileHtml(f.name)}</h4>
          <p class="text-xs text-muted-foreground mt-1">${formatFileSize(f.size)} • กำลังเล่นไฟล์เสียง</p>
        </div>
        <audio id="filePreviewAudioEl" controls autoplay class="w-full max-w-md shadow-xs" src="${f.dataUrl}"></audio>
      </div>
    `;
  } else if (isPdf) {
    bodyEl.innerHTML = `
      <div class="w-full h-[65vh] rounded-2xl overflow-hidden border border-border bg-card">
        <iframe src="${f.dataUrl}" class="w-full h-full border-0 rounded-2xl" title="${escapeFileHtml(f.name)}"></iframe>
      </div>
    `;
  } else if (isText) {
    let textContent = '';
    try {
      if (f.dataUrl.startsWith('data:')) {
        const base64 = f.dataUrl.split(',')[1];
        textContent = decodeURIComponent(escape(atob(base64)));
      } else {
        textContent = f.dataUrl;
      }
    } catch (e) {
      textContent = 'ไม่สามารถแปลงรหัสข้อความได้';
    }
    bodyEl.innerHTML = `
      <div class="w-full max-h-[62vh] overflow-auto p-4 rounded-2xl bg-muted/50 border border-border font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap select-text text-left">
        ${escapeFileHtml(textContent)}
      </div>
    `;
  } else {
    // Other file types (Office docs, spreadsheets, presentations, archives)
    bodyEl.innerHTML = `
      <div class="w-full py-12 px-6 flex flex-col items-center justify-center text-center space-y-4 bg-muted/30 rounded-2xl border border-border/60">
        <div class="w-20 h-20 rounded-2xl ${visual.colorClass} border flex items-center justify-center text-4xl shadow-sm">
          <i data-lucide="${visual.icon}"></i>
        </div>
        <div class="max-w-md space-y-1.5">
          <h4 class="text-base font-bold text-foreground">${escapeFileHtml(f.name)}</h4>
          <p class="text-xs text-muted-foreground">ไฟล์ประเภท ${visual.label} (${formatFileSize(f.size)})</p>
          <div class="p-3 bg-card border border-border rounded-xl text-xs text-muted-foreground mt-4 text-left flex items-start gap-2.5">
            <i data-lucide="info" class="w-4 h-4 text-primary shrink-0 mt-0.5"></i>
            <span>ไฟล์ประเภท <strong>${visual.label}</strong> ไม่รองรับการแสดงตัวอย่างบนเว็บเบราว์เซอร์โดยตรง คุณสามารถดาวน์โหลดเพื่อเปิดดูด้วยโปรแกรมในเครื่องได้ทันที</span>
          </div>
        </div>
        <button type="button" onclick="downloadSharedFile('${f.id}')" class="px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold text-xs flex items-center gap-2 hover:opacity-90 transition shadow-xs mt-2">
          <i data-lucide="download" class="w-4 h-4"></i> ดาวน์โหลดไฟล์นี้ทันที
        </button>
      </div>
    `;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeFilePreview() {
  const modal = document.getElementById('filePreviewModal');
  if (modal) {
    const vid = modal.querySelector('video');
    if (vid) {
      try { vid.pause(); vid.src = ''; } catch(e) {}
    }
    const aud = modal.querySelector('audio');
    if (aud) {
      try { aud.pause(); aud.src = ''; } catch(e) {}
    }
    const ifr = modal.querySelector('iframe');
    if (ifr) {
      try { ifr.src = ''; } catch(e) {}
    }

    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Close preview modal on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeFilePreview();
  }
});

function buildCards(files, isAdmin) {
  if (!files || files.length === 0) {
    return `<div class="py-12 text-center bg-card rounded-2xl border border-border text-xs text-muted-foreground">ยังไม่มีเอกสารประกอบการประชุมในขณะนี้</div>`;
  }

  // เรียงลำดับ: 1) เอกสารที่ปักหมุดอยู่บนสุดเสมอ 2) เอกสารที่อัปโหลดล่าสุดขึ้นก่อน
  const sortedFiles = files
    .map((f, originalIdx) => {
      const idTs = f.id && String(f.id).startsWith('FILE-') ? Number(String(f.id).slice(5)) || 0 : 0;
      return {
        f,
        originalIdx,
        uploadTs: f.uploadedAt || idTs || originalIdx
      };
    })
    .sort((a, b) => {
      const aPin = Boolean(a.f.isPinned);
      const bPin = Boolean(b.f.isPinned);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      if (aPin && bPin) {
        const pinDiff = (b.f.pinnedAt || 0) - (a.f.pinnedAt || 0);
        if (pinDiff !== 0) return pinDiff;
      }
      const tsDiff = b.uploadTs - a.uploadTs;
      return tsDiff !== 0 ? tsDiff : b.originalIdx - a.originalIdx;
    });

  return sortedFiles.map(({ f }) => {
    const visual = getFileVisualInfo(f.name, f.type);
    const isPinned = Boolean(f.isPinned);
    const cardBorderClass = isPinned
      ? 'border-amber-500/50 bg-amber-500/[0.04] ring-1 ring-amber-500/20 hover:border-amber-500/70'
      : 'border-border bg-card hover:border-primary/40';

    if (isAdmin) {
      return `
      <div class="group p-3.5 sm:p-4 rounded-2xl ${cardBorderClass} border shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
        <!-- File Info (Full width on mobile so filename is 100% readable) -->
        <div onclick="previewSharedFile('${f.id}')" class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/file select-none" title="คลิกเพื่อดูตัวอย่างไฟล์ (${visual.label})">
          <div class="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${visual.colorClass} border flex items-center justify-center text-base sm:text-lg shrink-0 shadow-xs transition-transform group-hover/file:scale-105" title="${visual.label}">
            <i data-lucide="${visual.icon}"></i>
            ${isPinned ? `<span class="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-white text-[8px] sm:text-[9px] flex items-center justify-center shadow-sm ring-2 ring-card" title="ปักหมุดไว้บนสุด"><i data-lucide="pin" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i></span>` : ''}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 min-w-0">
              ${isPinned ? `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                  <i data-lucide="pin" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i> ปักหมุด
                </span>
              ` : ''}
              <p class="text-xs sm:text-sm font-bold text-foreground truncate group-hover/file:text-primary transition-colors" title="${escapeFileHtml(f.name)}">
                ${escapeFileHtml(f.name)}
              </p>
            </div>
            <p class="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              <span class="font-semibold text-foreground/80">${formatFileSize(f.size)}</span> • โดย ${escapeFileHtml(f.uploaderName || '')} • <span class="text-emerald-600 dark:text-emerald-400 font-medium">${formatFileUploadStamp(f)}</span>
            </p>
          </div>
        </div>

        <!-- Admin Action Buttons: 4-button labeled bar on Mobile, Icon buttons on Desktop -->
        <div class="grid grid-cols-4 gap-1.5 pt-2.5 border-t border-border/60 w-full sm:w-auto sm:pt-0 sm:border-t-0 sm:flex sm:items-center sm:gap-1.5 shrink-0">
          <button type="button" onclick="event.stopPropagation(); togglePinSharedFile('${f.id}')" title="${isPinned ? 'เลิกปักหมุดเอกสาร' : 'ปักหมุดเอกสารไว้บนสุด'}"
            class="h-8 sm:w-9 sm:h-9 px-2 sm:px-0 rounded-xl border flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer ${isPinned ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600' : 'border-border bg-muted/40 sm:bg-card hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 text-muted-foreground'}">
            <i data-lucide="pin" class="w-3.5 h-3.5"></i>
            <span class="sm:hidden text-[11px] font-semibold whitespace-nowrap">${isPinned ? 'เลิกหมุด' : 'ปักหมุด'}</span>
          </button>
          <button type="button" onclick="event.stopPropagation(); previewSharedFile('${f.id}')" title="ดูตัวอย่างไฟล์ (${visual.label})"
            class="h-8 sm:w-9 sm:h-9 px-2 sm:px-0 rounded-xl border border-border bg-muted/40 sm:bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-muted-foreground flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer !w-8 !h-8 !min-w-0 !p-0 !gap-0 inline-flex items-center justify-center shrink-0" aria-label="ดูไฟล์"><i data-lucide="eye" class="h-4 w-4 pointer-events-none"></i></button>
          <button type="button" onclick="event.stopPropagation(); downloadSharedFile('${f.id}')" title="ดาวน์โหลดไฟล์ (${visual.label})"
            class="h-8 sm:w-9 sm:h-9 px-2 sm:px-0 rounded-xl border border-border bg-muted/40 sm:bg-card hover:bg-muted text-foreground flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span class="sm:hidden text-[11px] font-semibold whitespace-nowrap">โหลด</span>
          </button>
          <button type="button" onclick="event.stopPropagation(); deleteSharedFile('${f.id}')" title="ลบไฟล์"
            class="h-8 sm:w-9 sm:h-9 px-2 sm:px-0 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center gap-1 transition cursor-pointer !w-8 !h-8 !min-w-0 !p-0 !gap-0 inline-flex items-center justify-center shrink-0" aria-label="ลบ"><i data-lucide="trash-2" class="h-4 w-4 pointer-events-none"></i></button>
        </div>
      </div>
      `;
    }

    return `
    <div class="group p-3.5 sm:p-4 rounded-2xl ${cardBorderClass} border shadow-card flex items-center justify-between gap-2.5 sm:gap-3 transition">
      <div onclick="previewSharedFile('${f.id}')" class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/file select-none" title="คลิกเพื่อดูตัวอย่างไฟล์ (${visual.label})">
        <div class="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${visual.colorClass} border flex items-center justify-center text-base sm:text-lg shrink-0 shadow-xs transition-transform group-hover/file:scale-105" title="${visual.label}">
          <i data-lucide="${visual.icon}"></i>
          ${isPinned ? `<span class="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-white text-[8px] sm:text-[9px] flex items-center justify-center shadow-sm ring-2 ring-card" title="ปักหมุดไว้บนสุด"><i data-lucide="pin" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i></span>` : ''}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 min-w-0">
            ${isPinned ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                <i data-lucide="pin" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i> ปักหมุด
              </span>
            ` : ''}
            <p class="text-xs sm:text-sm font-semibold text-foreground truncate group-hover/file:text-primary transition-colors" title="${escapeFileHtml(f.name)}">
              ${escapeFileHtml(f.name)}
            </p>
            <span class="hidden sm:inline-flex items-center gap-1 text-[10px] font-normal px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground group-hover/file:bg-primary/10 group-hover/file:text-primary transition-colors shrink-0">
              <i data-lucide="eye" class="w-3 h-3"></i> ดูตัวอย่าง
            </span>
          </div>
          <p class="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">${formatFileSize(f.size)} • โดย ${escapeFileHtml(f.uploaderName || '')} • <span class="text-emerald-600 dark:text-emerald-400 font-medium">${formatFileUploadStamp(f)}</span></p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button type="button" onclick="event.stopPropagation(); previewSharedFile('${f.id}')" title="ดูตัวอย่างไฟล์ (${visual.label})"
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-muted-foreground flex items-center justify-center transition shadow-xs cursor-pointer">
          <i data-lucide="eye" class="w-3.5 h-3.5"></i>
        </button>
        <button type="button" onclick="event.stopPropagation(); downloadSharedFile('${f.id}')" title="ดาวน์โหลดไฟล์ (${visual.label})"
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition shadow-xs cursor-pointer">
          <i data-lucide="download" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    </div>
  `;
  }).join('');
}

function renderFileDropSection() {
  const state = window.appState;
  if (!state) return;
  const files = state.files || [];
  const uCount = document.getElementById('userFilesCount');
  const aCount = document.getElementById('adminFilesCount');
  if (uCount) uCount.textContent = files.length;
  if (aCount) aCount.textContent = files.length;

  if (window.currentUserId) {
    const me = (state.users || []).find(u => u.id === window.currentUserId);
    const permBox = document.getElementById('userFilePermissionBox');
    const dropzone = document.getElementById('userFileDropzone');
    if (me && permBox && dropzone) {
      if (me.filePermission === 'APPROVED' || me.checkedIn) {
        permBox.innerHTML = `<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[11px] font-bold">พร้อมแนบไฟล์</span>`;
        dropzone.classList.remove('hidden');
      } else if (me.filePermission === 'PENDING') {
        permBox.innerHTML = `<span class="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 inline-block">รออนุมัติ...</span>`;
        dropzone.classList.add('hidden');
      } else {
        permBox.innerHTML = `<button type="button" onclick="requestFileDropPermission()" class="px-3 py-1 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-[11px] sm:text-xs font-bold hover:bg-indigo-600 hover:text-white transition whitespace-nowrap shrink-0">+ ขอแนบไฟล์</button>`;
        dropzone.classList.add('hidden');
      }
    }
  }

  const userList = document.getElementById('userFilesList');
  const adminList = document.getElementById('adminFilesList');
  if (userList) userList.innerHTML = buildCards(files, false);
  if (adminList) adminList.innerHTML = buildCards(files, true);

  const permListEl = document.getElementById('adminFilePermissionsList');
  if (permListEl) {
    const searchEl = document.getElementById('adminFilePermSearchInput');
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';

    const sortedWithOriginalIndex = (state.users || [])
      .map((u, originalIdx) => ({ u, originalIdx }))
      .filter(({ u, originalIdx }) => {
        if (!q) return true;
        const seatStr = `#${originalIdx + 1}`;
        const nick = (u.nickname || '').toLowerCase();
        const full = (u.fullName || '').toLowerCase();
        return seatStr.includes(q) || nick.includes(q) || full.includes(q);
      })
      .sort((a, b) => {
        const getPrio = (st) => st === 'PENDING' ? 2 : st === 'APPROVED' ? 1 : 0;
        const diff = getPrio(b.u.filePermission) - getPrio(a.u.filePermission);
        return diff !== 0 ? diff : a.originalIdx - b.originalIdx;
      });

    if (sortedWithOriginalIndex.length === 0) {
      permListEl.innerHTML = `<div class="py-6 text-center text-xs text-muted-foreground">ไม่พบรายชื่อสมาชิกที่ค้นหา</div>`;
      return;
    }

    permListEl.innerHTML = sortedWithOriginalIndex.map(({ u, originalIdx }) => {
      const st = u.filePermission || 'NONE';
      const cardCls = st === 'PENDING'
        ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/20'
        : st === 'APPROVED'
        ? 'bg-emerald-500/10 border-emerald-500/40'
        : 'bg-card border-border hover:border-primary/30';

      return `
        <div class="p-2.5 sm:p-3 rounded-xl border ${cardCls} flex items-center justify-between text-xs gap-2.5 transition">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg ${st === 'PENDING' ? 'bg-amber-500 text-white' : st === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'} font-bold text-[11px] flex items-center justify-center shrink-0">
              #${originalIdx + 1}
            </div>
            <div class="min-w-0">
              <p class="font-bold text-foreground truncate">${escapeFileHtml(u.nickname || '')}</p>
              <p class="text-[10px] truncate ${st === 'PENDING' ? 'text-amber-600 dark:text-amber-400 font-bold' : st === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground'}">
                ${st === 'PENDING' ? 'ขออนุญาตอัปโหลดไฟล์' : st === 'APPROVED' ? 'กำลังได้รับสิทธิ์อัปโหลด' : 'ลำดับปกติ'}
              </p>
            </div>
          </div>
          <div class="shrink-0">
            ${st === 'APPROVED'
              ? `<button type="button" onclick="adminSetFilePermission('${u.id}', 'NONE')" class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition shadow-2xs whitespace-nowrap">เสร็จสิ้น</button>`
              : st === 'PENDING'
              ? `<div class="flex items-center gap-1.5"><button type="button" onclick="adminSetFilePermission('${u.id}', 'NONE')" class="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-500/30 text-[11px] font-bold transition whitespace-nowrap !w-8 !h-8 !min-w-0 !p-0 !gap-0 inline-flex items-center justify-center shrink-0" title="ไม่อนุญาต" aria-label="ไม่อนุญาต"><i data-lucide="x" class="h-4 w-4 pointer-events-none"></i></button><button type="button" onclick="adminSetFilePermission('${u.id}', 'APPROVED')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-2xs whitespace-nowrap !w-8 !h-8 !min-w-0 !p-0 !gap-0 inline-flex items-center justify-center shrink-0" title="อนุญาต" aria-label="อนุญาต"><i data-lucide="check" class="h-4 w-4 pointer-events-none"></i></button></div>`
              : `<button type="button" onclick="adminSetFilePermission('${u.id}', 'APPROVED')" class="px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border text-foreground text-[11px] font-semibold transition whitespace-nowrap !w-8 !h-8 !min-w-0 !p-0 !gap-0 inline-flex items-center justify-center shrink-0" title="ให้สิทธิ์" aria-label="ให้สิทธิ์"><i data-lucide="check" class="h-4 w-4 pointer-events-none"></i></button>`
            }
          </div>
        </div>
      `;
    }).join('');
  }
}

// Window attachments
window.downloadSharedFile = downloadSharedFile;
window.previewSharedFile = previewSharedFile;
window.closeFilePreview = closeFilePreview;
window.formatFileSize = formatFileSize;
window.requestFileDropPermission = requestFileDropPermission;
window.adminSetFilePermission = adminSetFilePermission;
window.formatFileUploadStamp = formatFileUploadStamp;
window.handleFileUpload = handleFileUpload;
window.togglePinSharedFile = togglePinSharedFile;
window.deleteSharedFile = deleteSharedFile;
window.renderFileDropSection = renderFileDropSection;
window.getFileVisualInfo = getFileVisualInfo;
