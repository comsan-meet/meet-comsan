/**
 * COMSAN Meeting System - Projects Component
 * Manages Club Projects, Stakeholders, Divisions/Departments, Table View, and XLSX Import/Export
 * Enhanced with Accordion Collapsible Editor & Scroll Containment for Large Member Rosters (50+ members)
 */

(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  }
  if (typeof root !== 'undefined') {
    Object.assign(root, mod);
  }
  if (typeof window !== 'undefined') {
    Object.assign(window, mod);
  }
})(typeof self !== 'undefined' ? self : this, function () {

  let userProjectFilter = 'ALL';
  let userProjectSearch = '';
  let userProjectYear = 'ALL';

  let adminProjectFilter = 'ALL';
  let adminProjectSearch = '';
  let adminProjectYear = 'ALL';

  // Detail Modal State
  let activeDetailProjectId = null;
  let detailMemberDeptFilter = 'ALL';
  let detailMemberSearch = '';

  // Form Repeaters State
  let prjFormLeaders = [];
  let prjFormMembers = [];
  let prjFormAdvisors = [];
  let prjFormSmoOfficers = [];

  // Collapsible Accordion Sets for Form Repeaters
  let expandedLeadersIndices = new Set();
  let expandedMembersIndices = new Set();
  let expandedAdvisorsIndices = new Set();
  let expandedSmoIndices = new Set();

  let formMembersSearch = '';
  let formMembersDeptFilter = 'ALL';

  let isSavingProject = false;

  // Google Drive Photo Folder Catalog State
  let currentPhotoFolderUrl = '';
  let drivePhotoCatalog = []; // array of { id, name, url, size }
  let driveBridgeScriptUrl = (typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_drive_bridge_url') : '') || '';
  let activeCatalogPickerContext = null; // { type, index } when selecting from catalog modal

  // ========================================================
  // AVATARS & GOOGLE DRIVE RESOLVER & IMAGE CROPPER
  // ========================================================

  /**
   * Deterministic cute avatar URL using DiceBear Gaze Bold Pop Palette
   * Exactly matching user profile avatar standard (iconsAndAvatars.js)
   */
  function getCuteAvatarUrl(seed) {
    if (typeof window !== 'undefined' && typeof window.getUserAvatarUrl === 'function') {
      return window.getUserAvatarUrl(seed || 'comsan-user');
    }
    const cleanSeed = encodeURIComponent(String(seed || 'comsan-user').trim());
    return `https://api.dicebear.com/10.x/gaze/svg?seed=${cleanSeed}&backgroundColor=ff5d8f,ffb703,43aa8b,4d96ff,b57bff`;
  }

  /**
   * Extracts Google Drive file ID from URL, filename, or raw ID
   */
  function extractDriveFileId(input) {
    if (!input || typeof input !== 'string') return '';
    const trimmed = input.trim();
    if (!trimmed) return '';

    // /file/d/FILE_ID
    const dMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch && dMatch[1]) return dMatch[1];

    // id=FILE_ID
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];

    // googleusercontent.com/d/FILE_ID
    const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match && lh3Match[1]) return lh3Match[1];

    // thumbnail?id=FILE_ID
    const thumbMatch = trimmed.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/);
    if (thumbMatch && thumbMatch[1]) return thumbMatch[1];

    // Strip image extension if filename is the ID (e.g. 1AbCd... .jpg)
    const withoutExt = trimmed.replace(/\.(jpg|jpeg|png|webp|gif|svg)$/i, '');
    if (/^[a-zA-Z0-9_-]{20,60}$/.test(withoutExt)) {
      return withoutExt;
    }

    const generalMatch = trimmed.match(/([a-zA-Z0-9_-]{25,50})/);
    if (generalMatch && generalMatch[1]) {
      return generalMatch[1];
    }
    return '';
  }

  /**
   * Converts Google Drive links or file IDs to direct image preview URLs
   */
  function resolveGoogleDriveImageUrl(input) {
    if (!input || typeof input !== 'string') return '';
    const fileId = extractDriveFileId(input);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    return input.trim();
  }

  // Cropper State & Handlers
  let activeCropperCallback = null;
  let cropperActiveImage = null;
  let cropperImageSrc = '';
  let cropperState = {
    x: 0,
    y: 0,
    scale: 1,
    initialScale: 1,
    rotation: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    startStateX: 0,
    startStateY: 0
  };
  let cropperEventsAttached = false;

  function openImageCropperModal(options) {
    const { imageSrc, title, onSave } = options || {};
    if (!imageSrc) return;

    activeCropperCallback = onSave;
    cropperImageSrc = imageSrc;

    const titleEl = document.getElementById('cropperModalTitle');
    if (titleEl && title) titleEl.textContent = title;

    const modal = document.getElementById('projectAvatarCropperModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      cropperActiveImage = img;
      initCropperCanvas();
    };
    img.onerror = function () {
      if (typeof window.showToast === 'function') {
        window.showToast('ไม่สามารถโหลดรูปภาพสำหรับครอบตัดได้ กรุณาลองอัปโหลดเป็นไฟล์ภาพโดยตรง', 'warning');
      }
      closeImageCropperModal();
    };
    img.src = imageSrc;
  }

  function initCropperCanvas() {
    const canvas = document.getElementById('cropperCanvas');
    const wrapper = document.getElementById('cropperCanvasWrapper');
    if (!canvas || !wrapper || !cropperActiveImage) return;

    const minDim = Math.min(cropperActiveImage.naturalWidth, cropperActiveImage.naturalHeight);
    const baseScale = minDim > 0 ? (640 / minDim) : 1;

    cropperState.scale = baseScale;
    cropperState.initialScale = baseScale;
    cropperState.x = 0;
    cropperState.y = 0;
    cropperState.rotation = 0;
    cropperState.isDragging = false;

    const slider = document.getElementById('cropperZoomSlider');
    if (slider) {
      slider.min = (baseScale * 0.5).toFixed(2);
      slider.max = (baseScale * 3.5).toFixed(2);
      slider.step = ((baseScale * 3) / 100).toFixed(3);
      slider.value = baseScale.toFixed(2);
    }
    updateCropperZoomLabel();

    if (!cropperEventsAttached) {
      attachCropperEventListeners(wrapper);
      cropperEventsAttached = true;
    }

    renderCropperCanvas();
  }

  function attachCropperEventListeners(wrapper) {
    wrapper.addEventListener('mousedown', (e) => {
      e.preventDefault();
      cropperState.isDragging = true;
      cropperState.dragStartX = e.clientX;
      cropperState.dragStartY = e.clientY;
      cropperState.startStateX = cropperState.x;
      cropperState.startStateY = cropperState.y;
      wrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!cropperState.isDragging) return;
      const rect = wrapper.getBoundingClientRect();
      const ratio = rect.width > 0 ? (640 / rect.width) : 2;
      const dx = (e.clientX - cropperState.dragStartX) * ratio;
      const dy = (e.clientY - cropperState.dragStartY) * ratio;
      cropperState.x = cropperState.startStateX + dx;
      cropperState.y = cropperState.startStateY + dy;
      renderCropperCanvas();
    });

    window.addEventListener('mouseup', () => {
      if (cropperState.isDragging) {
        cropperState.isDragging = false;
        wrapper.style.cursor = 'grab';
      }
    });

    wrapper.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        cropperState.isDragging = true;
        cropperState.dragStartX = e.touches[0].clientX;
        cropperState.dragStartY = e.touches[0].clientY;
        cropperState.startStateX = cropperState.x;
        cropperState.startStateY = cropperState.y;
      }
    }, { passive: true });

    wrapper.addEventListener('touchmove', (e) => {
      if (!cropperState.isDragging || !e.touches || e.touches.length !== 1) return;
      const rect = wrapper.getBoundingClientRect();
      const ratio = rect.width > 0 ? (640 / rect.width) : 2;
      const dx = (e.touches[0].clientX - cropperState.dragStartX) * ratio;
      const dy = (e.touches[0].clientY - cropperState.dragStartY) * ratio;
      cropperState.x = cropperState.startStateX + dx;
      cropperState.y = cropperState.startStateY + dy;
      renderCropperCanvas();
    }, { passive: true });

    wrapper.addEventListener('touchend', () => {
      cropperState.isDragging = false;
    }, { passive: true });

    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      adjustCropperZoom(delta);
    }, { passive: false });
  }

  function renderCropperCanvas() {
    const canvas = document.getElementById('cropperCanvas');
    if (!canvas || !cropperActiveImage) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 640, 640);

    ctx.save();
    ctx.translate(320 + cropperState.x, 320 + cropperState.y);
    ctx.rotate((cropperState.rotation * Math.PI) / 180);
    ctx.scale(cropperState.scale, cropperState.scale);
    ctx.drawImage(cropperActiveImage, -cropperActiveImage.naturalWidth / 2, -cropperActiveImage.naturalHeight / 2);
    ctx.restore();
  }

  function adjustCropperZoom(deltaRatio) {
    const minScale = cropperState.initialScale * 0.4;
    const maxScale = cropperState.initialScale * 4.0;
    const newScale = Math.min(maxScale, Math.max(minScale, cropperState.scale + cropperState.initialScale * deltaRatio));
    cropperState.scale = newScale;

    const slider = document.getElementById('cropperZoomSlider');
    if (slider) slider.value = newScale.toFixed(2);
    updateCropperZoomLabel();
    renderCropperCanvas();
  }

  function onCropperZoomSliderChange(val) {
    cropperState.scale = val;
    updateCropperZoomLabel();
    renderCropperCanvas();
  }

  function updateCropperZoomLabel() {
    const label = document.getElementById('cropperZoomLabel');
    if (label && cropperState.initialScale > 0) {
      const pct = Math.round((cropperState.scale / cropperState.initialScale) * 100);
      label.textContent = `${pct}%`;
    }
  }

  function rotateCropper(deg) {
    cropperState.rotation = (cropperState.rotation + deg) % 360;
    renderCropperCanvas();
  }

  function resetCropperTransform() {
    cropperState.x = 0;
    cropperState.y = 0;
    cropperState.rotation = 0;
    cropperState.scale = cropperState.initialScale;
    const slider = document.getElementById('cropperZoomSlider');
    if (slider) slider.value = cropperState.initialScale.toFixed(2);
    updateCropperZoomLabel();
    renderCropperCanvas();
  }

  function saveCroppedImage() {
    if (!cropperActiveImage) {
      closeImageCropperModal();
      return;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 400;
    exportCanvas.height = 400;
    const ctx = exportCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const ratio = 400 / 640;
    ctx.save();
    ctx.translate(200 + cropperState.x * ratio, 200 + cropperState.y * ratio);
    ctx.rotate((cropperState.rotation * Math.PI) / 180);
    ctx.scale(cropperState.scale * ratio, cropperState.scale * ratio);
    ctx.drawImage(cropperActiveImage, -cropperActiveImage.naturalWidth / 2, -cropperActiveImage.naturalHeight / 2);
    ctx.restore();

    let resultUrl = '';
    try {
      resultUrl = exportCanvas.toDataURL('image/jpeg', 0.88);
    } catch (err) {
      console.warn('Canvas export failed or tainted:', err);
      resultUrl = cropperImageSrc || '';
    }

    if (typeof activeCropperCallback === 'function') {
      activeCropperCallback(resultUrl);
    }
    closeImageCropperModal();
  }

  function closeImageCropperModal() {
    const modal = document.getElementById('projectAvatarCropperModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    activeCropperCallback = null;
    cropperActiveImage = null;
    cropperImageSrc = '';
  }

  // Repeater Avatar Helpers
  function getRepeaterList(type) {
    if (type === 'LEADERS') return prjFormLeaders;
    if (type === 'MEMBERS') return prjFormMembers;
    if (type === 'ADVISORS') return prjFormAdvisors;
    if (type === 'SMO') return prjFormSmoOfficers;
    return null;
  }

  function handlePersonAvatarFileUpload(type, index, file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      if (typeof window.showToast === 'function') {
        window.showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'warning');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const list = getRepeaterList(type);
      const person = list && list[index];
      const personName = person ? (person.nickname || person.name || 'สมาชิก') : 'สมาชิก';

      openImageCropperModal({
        imageSrc: e.target.result,
        title: `ครอบตัดรูปโปรไฟล์ (${personName})`,
        onSave: function (croppedDataUrl) {
          updateRepeaterField(type, index, 'avatar', croppedDataUrl);
          renderRepeater(type);
          if (typeof window.showToast === 'function') {
            window.showToast('อัปโหลดและครอบตัดรูปภาพเรียบร้อยแล้ว', 'success');
          }
        }
      });
    };
    reader.readAsDataURL(file);
  }

  function handlePersonDriveAvatarInput(type, index, value) {
    const list = getRepeaterList(type);
    if (!list || !list[index]) return;

    const directUrl = resolveGoogleDriveImageUrl(value);
    list[index].avatar = directUrl;

    const preview = document.getElementById(`avatar_preview_${type}_${index}`);
    if (preview) {
      const seed = list[index].nickname || list[index].name || `${type}_${index}`;
      const fallback = getCuteAvatarUrl(seed);
      preview.src = directUrl || fallback;
    }
  }

  function applyDriveAvatarForRepeater(type, index) {
    const inputEl = document.getElementById(`avatar_drive_input_${type}_${index}`);
    const val = inputEl ? inputEl.value.trim() : '';
    if (!val) {
      if (typeof window.showToast === 'function') {
        window.showToast('กรุณาระบุรหัสรูปภาพ หรือลิงก์ Google Drive ในช่องกรอก', 'info');
      }
      return;
    }
    const resolved = resolveGoogleDriveImageUrl(val);
    updateRepeaterField(type, index, 'avatar', resolved);
    renderRepeater(type);
    if (typeof window.showToast === 'function') {
      window.showToast('ดึงและเชื่อมต่อรูปภาพจาก Google Drive เรียบร้อยแล้ว', 'success');
    }
  }

  function triggerCropForRepeater(type, index) {
    const list = getRepeaterList(type);
    const person = list && list[index];
    if (!person) return;

    if (!person.avatar) {
      const fileInput = document.getElementById(`avatar_file_${type}_${index}`);
      if (fileInput) fileInput.click();
      return;
    }

    const personName = person.nickname || person.name || 'สมาชิก';
    openImageCropperModal({
      imageSrc: person.avatar,
      title: `ครอบตัดรูปโปรไฟล์ (${personName})`,
      onSave: function (croppedDataUrl) {
        updateRepeaterField(type, index, 'avatar', croppedDataUrl);
        renderRepeater(type);
        if (typeof window.showToast === 'function') {
          window.showToast('ครอบตัดและบันทึกรูปภาพเรียบร้อยแล้ว', 'success');
        }
      }
    });
  }

  function resetRepeaterAvatarToCute(type, index) {
    updateRepeaterField(type, index, 'avatar', '');
    renderRepeater(type);
    if (typeof window.showToast === 'function') {
      window.showToast('คืนค่าเป็นรูปโปรไฟล์น่ารัก (DiceBear) เรียบร้อยแล้ว', 'info');
    }
  }

  // ========================================================
  // GOOGLE DRIVE PHOTO FOLDER CATALOG & AUTO-MATCHER
  // ========================================================

  /**
   * Extracts Google Drive Folder ID from a URL or raw folder ID string
   */
  function extractDriveFolderId(input) {
    if (!input || typeof input !== 'string') return '';
    const trimmed = input.trim();
    if (!trimmed) return '';

    // /drive/folders/FOLDER_ID or /folders/FOLDER_ID
    const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
    if (folderMatch && folderMatch[1]) return folderMatch[1];

    // id=FOLDER_ID
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
    if (idMatch && idMatch[1]) return idMatch[1];

    // Raw alphanumeric ID if length >= 15
    if (/^[a-zA-Z0-9_-]{15,70}$/.test(trimmed)) {
      return trimmed;
    }
    return '';
  }

  /**
   * Search for a photo in drivePhotoCatalog matching the given query (filename or nickname/name)
   */
  function findPhotoInCatalog(query) {
    if (!query || !Array.isArray(drivePhotoCatalog) || drivePhotoCatalog.length === 0) return null;
    const q = String(query).trim().toLowerCase();
    if (!q) return null;

    // 1. Exact match with extension
    let found = drivePhotoCatalog.find(f => (f.name || '').toLowerCase() === q);
    if (found) return found;

    // 2. Exact match without extension (e.g. "บอม" matches "บอม.jpg" or "บอม.png")
    found = drivePhotoCatalog.find(f => {
      const baseName = (f.name || '').replace(/\.[^/.]+$/, '').toLowerCase();
      return baseName === q;
    });
    if (found) return found;

    // 3. Substring match (e.g. "บอม" matches "นายอิทธิพัทธ์_บอม.jpg")
    found = drivePhotoCatalog.find(f => {
      const baseName = (f.name || '').replace(/\.[^/.]+$/, '').toLowerCase();
      return baseName.includes(q) || (q.length > 2 && q.includes(baseName));
    });
    if (found) return found;

    return null;
  }

  /**
   * Scroll and focus to the Drive Photo Folder toolbar
   */
  function focusDrivePhotoFolderInput() {
    const input = document.getElementById('prjFormPhotoFolderUrl');
    const toolbar = document.getElementById('prjDrivePhotoFolderToolbar');
    if (toolbar && typeof toolbar.scrollIntoView === 'function') {
      toolbar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (input) {
      setTimeout(() => input.focus(), 250);
    }
  }

  /**
   * Listener when user types in Folder URL input
   */
  function onDrivePhotoFolderInputChanged(val) {
    currentPhotoFolderUrl = (val || '').trim();
    const clearBtn = document.getElementById('prjFormPhotoFolderClearBtn');
    if (clearBtn) {
      if (currentPhotoFolderUrl) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }
  }

  function clearDrivePhotoFolder() {
    currentPhotoFolderUrl = '';
    drivePhotoCatalog = [];
    const input = document.getElementById('prjFormPhotoFolderUrl');
    if (input) input.value = '';
    const clearBtn = document.getElementById('prjFormPhotoFolderClearBtn');
    if (clearBtn) clearBtn.classList.add('hidden');
    updateDrivePhotoFolderStatusUi();
    if (typeof window.showToast === 'function') {
      window.showToast('ล้างลิงก์และคลังรูปภาพแล้ว', 'info');
    }
  }

  function updateDrivePhotoFolderStatusUi() {
    const badge = document.getElementById('prjDriveCatalogBadge');
    const viewBtn = document.getElementById('prjDriveCatalogViewBtn');
    const countSpan = document.getElementById('prjDriveCatalogCount');
    const statusText = document.getElementById('prjDriveFolderStatusText');
    const clearBtn = document.getElementById('prjFormPhotoFolderClearBtn');

    if (clearBtn) {
      if (currentPhotoFolderUrl) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    const count = Array.isArray(drivePhotoCatalog) ? drivePhotoCatalog.length : 0;

    if (count > 0) {
      if (badge) {
        badge.textContent = `เชื่อมต่อแล้ว (${count} รูป)`;
        badge.classList.remove('hidden');
      }
      if (viewBtn) viewBtn.classList.remove('hidden');
      if (countSpan) countSpan.textContent = count;
      if (statusText) {
        statusText.innerHTML = `
          <i data-lucide="check-circle" class="h-3.5 w-3.5 text-emerald-500 shrink-0"></i>
          <span class="text-emerald-600 dark:text-emerald-400 font-medium">เชื่อมต่อแล้ว พบรูปภาพ ${count} รูปในโฟลเดอร์ พร้อมใช้งานจับคู่ชื่อรูปในการ์ดแต่ละคน</span>
        `;
      }
    } else {
      if (badge) badge.classList.add('hidden');
      if (viewBtn) viewBtn.classList.add('hidden');
      if (countSpan) countSpan.textContent = '0';
      if (statusText) {
        statusText.innerHTML = `
          <i data-lucide="info" class="h-3.5 w-3.5 text-blue-500 shrink-0"></i>
          <span>วางลิงก์โฟลเดอร์ Drive รวมรูปภาพ แล้วกด <b>"สแกนอ่านรูปในโฟลเดอร์"</b> เพื่อให้ระบบดึงรูปตามชื่อไฟล์ให้อัตโนมัติ</span>
        `;
      }
    }
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  /**
   * Scans Google Drive Folder using the GAS bridge Web App or guides the user
   */
  async function scanDrivePhotoFolder() {
    const input = document.getElementById('prjFormPhotoFolderUrl');
    const url = input ? input.value.trim() : currentPhotoFolderUrl;
    if (!url) {
      if (typeof window.showToast === 'function') {
        window.showToast('กรุณาวางลิงก์โฟลเดอร์ Google Drive ก่อนกดสแกน', 'warning');
      }
      if (input) input.focus();
      return;
    }

    const folderId = extractDriveFolderId(url);
    if (!folderId) {
      if (typeof window.showToast === 'function') {
        window.showToast('ไม่พบรหัสโฟลเดอร์ในลิงก์ที่ระบุ กรุณาตรวจสอบลิงก์โฟลเดอร์ Google Drive', 'error');
      }
      return;
    }

    currentPhotoFolderUrl = url;

    // Check if Google Apps Script Bridge URL is configured
    if (!driveBridgeScriptUrl) {
      openDriveScriptHelpModal();
      return;
    }

    // Auto-fix URL if user entered .../edit
    let scriptUrl = driveBridgeScriptUrl.trim();
    if (scriptUrl.includes('/edit')) {
      scriptUrl = scriptUrl.replace(/\/edit.*$/, '/exec');
      driveBridgeScriptUrl = scriptUrl;
      try { localStorage.setItem('comsan_drive_bridge_url', scriptUrl); } catch (e) {}
    }

    const scanBtn = document.getElementById('prjDriveScanBtn');
    const scanBtnText = document.getElementById('prjDriveScanBtnText');
    if (scanBtn) scanBtn.disabled = true;
    if (scanBtnText) scanBtnText.textContent = 'กำลังสแกนรูป...';

    const statusText = document.getElementById('prjDriveFolderStatusText');
    if (statusText) {
      statusText.innerHTML = `
        <i data-lucide="loader-2" class="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0"></i>
        <span>กำลังเชื่อมต่อ Google Apps Script เพื่ออ่านรูปภาพในโฟลเดอร์...</span>
      `;
      if (typeof window.refreshIcons === 'function') window.refreshIcons();
      else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    try {
      const fetchUrl = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}folderId=${encodeURIComponent(folderId)}`;
      const res = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });
      const data = await res.json();

      const files = (data && (Array.isArray(data.files) ? data.files : (Array.isArray(data.data) ? data.data : []))) || [];
      const isSuccess = data && (data.status === 'success' || data.ok === true || files.length > 0);

      if (isSuccess) {
        drivePhotoCatalog = files.map(f => ({
          id: f.id,
          name: f.name || 'untitled',
          url: f.url || `https://lh3.googleusercontent.com/d/${f.id}`,
          size: f.size || 0
        }));
        updateDrivePhotoFolderStatusUi();
        renderRepeater('LEADERS');
        renderRepeater('MEMBERS');
        renderRepeater('ADVISORS');
        renderRepeater('SMO');

        if (typeof window.showToast === 'function') {
          window.showToast(`สแกนพบรูปภาพทั้งหมด ${drivePhotoCatalog.length} รูปในโฟลเดอร์ Google Drive เรียบร้อยแล้ว`, 'success');
        }
      } else {
        const errMsg = (data && (data.message || data.error)) || 'ไม่สามารถดึงรายชื่อไฟล์จาก Google Apps Script ได้';
        throw new Error(errMsg);
      }
    } catch (err) {
      console.error('Scan Drive Folder Error:', err);
      const friendlyMsg = err && err.message ? err.message : 'กรุณาตรวจสอบการตั้งค่าสคริปต์ (ตั้งค่า Anyone / ทุกคน และใช้ลิงก์ /exec)';
      if (typeof window.showToast === 'function') {
        window.showToast(`การเชื่อมต่อสคริปต์ขัดข้อง: ${friendlyMsg}`, 'error');
      }
      if (statusText) {
        statusText.innerHTML = `
          <i data-lucide="alert-circle" class="h-3.5 w-3.5 text-rose-500 shrink-0"></i>
          <span class="text-rose-500 font-medium">การเชื่อมต่อขัดข้อง: ${escapeHtml(friendlyMsg)}</span>
        `;
        if (typeof window.refreshIcons === 'function') window.refreshIcons();
        else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      }
    } finally {
      if (scanBtn) scanBtn.disabled = false;
      if (scanBtnText) scanBtnText.textContent = 'สแกนอ่านรูปในโฟลเดอร์';
    }
  }

  /**
   * Handle local batch photo select as instant offline catalog
   */
  function handleLocalBatchPhotoSelect(event) {
    const files = event && event.target && event.target.files;
    if (!files || files.length === 0) return;

    const list = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type && file.type.startsWith('image/')) {
        list.push({
          id: `local_${Date.now()}_${i}`,
          name: file.name,
          url: URL.createObjectURL(file),
          localFile: file,
          size: file.size
        });
      }
    }

    if (list.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast('ไม่พบไฟล์รูปภาพที่เลือก', 'warning');
      }
      return;
    }

    drivePhotoCatalog = list;
    updateDrivePhotoFolderStatusUi();
    closeDriveScriptHelpModal();

    // Re-render repeaters
    renderRepeater('LEADERS');
    renderRepeater('MEMBERS');
    renderRepeater('ADVISORS');
    renderRepeater('SMO');

    if (typeof window.showToast === 'function') {
      window.showToast(`นำเข้ารูปภาพจากเครื่องสำเร็จ ${list.length} รูป พร้อมจับคู่ชื่อไฟล์แล้ว`, 'success');
    }
  }

  /**
   * Auto Match All photos from catalog to all persons in all repeaters
   */
  function autoMatchAllPhotosFromCatalog() {
    if (!Array.isArray(drivePhotoCatalog) || drivePhotoCatalog.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast('ยังไม่มีคลังรูปภาพ กรุณาสแกนโฟลเดอร์ Google Drive หรือเลือกรูปภาพก่อน', 'warning');
      }
      focusDrivePhotoFolderInput();
      return;
    }

    let matchedCount = 0;
    const repeaters = [
      { type: 'LEADERS', list: prjFormLeaders },
      { type: 'MEMBERS', list: prjFormMembers },
      { type: 'ADVISORS', list: prjFormAdvisors },
      { type: 'SMO', list: prjFormSmoOfficers }
    ];

    repeaters.forEach(({ list }) => {
      if (!Array.isArray(list)) return;
      list.forEach(person => {
        // Try matching query
        const query = person.driveFileName || person.nickname || person.name || '';
        if (!query) return;

        let photo = findPhotoInCatalog(query);
        // If not found, try nickname alone
        if (!photo && person.nickname) {
          photo = findPhotoInCatalog(person.nickname);
        }
        // If not found, try first token of full name (e.g. surname stripped)
        if (!photo && person.name) {
          const parts = person.name.trim().split(/\s+/);
          if (parts[0]) photo = findPhotoInCatalog(parts[0]);
          if (!photo && parts[1]) photo = findPhotoInCatalog(parts[1]);
        }

        if (photo) {
          person.driveFileName = photo.name;
          person.avatar = photo.url || `https://lh3.googleusercontent.com/d/${photo.id}`;
          matchedCount++;
        }
      });
    });

    renderRepeater('LEADERS');
    renderRepeater('MEMBERS');
    renderRepeater('ADVISORS');
    renderRepeater('SMO');

    if (typeof window.showToast === 'function') {
      window.showToast(`จับคู่รูปภาพสำเร็จ ${matchedCount} คน จากทั้งหมดในโครงการ`, 'success');
    }
  }

  /**
   * Single Person Drive Filename Handler
   */
  function handlePersonDriveFileNameInput(type, index, value) {
    const list = getRepeaterList(type);
    if (!list || !list[index]) return;
    list[index].driveFileName = (value || '').trim();

    // If input is an exact URL or ID, resolve directly
    if (value && (value.includes('http') || value.includes('drive.google') || value.length > 25)) {
      const resolved = resolveGoogleDriveImageUrl(value);
      if (resolved && resolved !== value) {
        list[index].avatar = resolved;
        const preview = document.getElementById(`avatar_preview_${type}_${index}`);
        if (preview) preview.src = resolved;
      }
    }
  }

  /**
   * Match single person photo by filename or nickname
   */
  function matchPersonPhotoByFileName(type, index) {
    const list = getRepeaterList(type);
    const person = list && list[index];
    if (!person) return;

    const input = document.getElementById(`avatar_drive_filename_${type}_${index}`);
    const query = (input ? input.value.trim() : '') || person.driveFileName || person.nickname || person.name || '';

    if (!query) {
      if (typeof window.showToast === 'function') {
        window.showToast('กรุณาระบุชื่อไฟล์รูปภาพ (เช่น บอม.jpg) หรือชื่อเล่นก่อนกดค้นหา', 'info');
      }
      if (input) input.focus();
      return;
    }

    // If query is a direct Drive link or file ID
    const driveId = extractDriveFileId(query);
    if (driveId && (query.includes('http') || query.length >= 25)) {
      const resolved = `https://lh3.googleusercontent.com/d/${driveId}`;
      updateRepeaterField(type, index, 'avatar', resolved);
      renderRepeater(type);
      if (typeof window.showToast === 'function') {
        window.showToast('เชื่อมต่อรูปภาพจาก Google Drive สำเร็จ', 'success');
      }
      return;
    }

    // Look in catalog
    const photo = findPhotoInCatalog(query) || (person.nickname ? findPhotoInCatalog(person.nickname) : null);
    if (photo) {
      person.driveFileName = photo.name;
      const avatarUrl = photo.url || `https://lh3.googleusercontent.com/d/${photo.id}`;
      updateRepeaterField(type, index, 'avatar', avatarUrl);
      renderRepeater(type);
      if (typeof window.showToast === 'function') {
        window.showToast(`จับคู่รูปภาพ "${photo.name}" สำเร็จ!`, 'success');
      }
    } else {
      if (Array.isArray(drivePhotoCatalog) && drivePhotoCatalog.length > 0) {
        if (typeof window.showToast === 'function') {
          window.showToast(`ไม่พบไฟล์รูปที่ตรงกับ "${query}" ในคลังรูป (${drivePhotoCatalog.length} รูป)`, 'warning');
        }
        openDriveCatalogPickerForPerson(type, index);
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast(`ยังไม่ได้สแกนโฟลเดอร์ Google Drive กรุณากด "สแกนอ่านรูปในโฟลเดอร์" ด้านบน`, 'warning');
        }
        focusDrivePhotoFolderInput();
      }
    }
  }

  function selectPhotoFromCatalogForPerson(type, index, fileId, fileName) {
    const list = getRepeaterList(type);
    if (!list || !list[index]) return;

    list[index].driveFileName = fileName;
    const photo = Array.isArray(drivePhotoCatalog) ? drivePhotoCatalog.find(p => p.id === fileId || p.name === fileName) : null;
    const avatarUrl = (photo && photo.url) ? photo.url : `https://lh3.googleusercontent.com/d/${fileId}`;
    updateRepeaterField(type, index, 'avatar', avatarUrl);
    renderRepeater(type);
    closeDriveCatalogListModal();
    if (typeof window.showToast === 'function') {
      window.showToast(`เลือกรูป "${fileName}" เรียบร้อยแล้ว`, 'success');
    }
  }

  function openDriveCatalogPickerForPerson(type, index) {
    activeCatalogPickerContext = { type, index };
    openDriveCatalogListModal();
  }

  /**
   * Modals & UI Controls for Drive Apps Script & Catalog Browser
   */
  function openDriveScriptHelpModal() {
    const input = document.getElementById('prjDriveBridgeUrlInput') || document.getElementById('prjDriveBridgeScriptUrlInput');
    if (input) input.value = driveBridgeScriptUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_drive_bridge_url') || '' : '');
    const modal = document.getElementById('driveScriptHelpModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function closeDriveScriptHelpModal() {
    const modal = document.getElementById('driveScriptHelpModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function saveDriveBridgeUrlFromModal() {
    const input = document.getElementById('prjDriveBridgeUrlInput') || document.getElementById('prjDriveBridgeScriptUrlInput');
    let val = input ? input.value.trim() : '';
    if (!val) {
      if (typeof window.showToast === 'function') {
        window.showToast('กรุณาระบุ URL ของเว็บแอปพลิเคชัน Google Apps Script', 'warning');
      }
      return;
    }

    if (val.includes('/edit')) {
      val = val.replace(/\/edit.*$/, '/exec');
      if (input) input.value = val;
    }

    driveBridgeScriptUrl = val;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('comsan_drive_bridge_url', val);
      } catch (e) {}
    }
    closeDriveScriptHelpModal();
    if (typeof window.showToast === 'function') {
      window.showToast('บันทึกการตั้งค่าสคริปต์ Google Apps Script เรียบร้อยแล้ว กำลังสแกนรูป...', 'info');
    }
    scanDrivePhotoFolder();
  }

  function copyGasScriptToClipboard() {
    const code = `function doGet(e) {
  var folderId = e.parameter.folderId;
  if (!folderId && e.parameter.url) {
    var match = e.parameter.url.match(/folders\\/([a-zA-Z0-9_-]+)/);
    if (match) folderId = match[1];
  }
  if (!folderId) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      status: "error",
      message: "Missing folderId parameter"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var list = [];
    while (files.hasNext()) {
      var file = files.next();
      var name = file.getName();
      var id = file.getId();
      var mime = file.getMimeType();
      if (mime.indexOf("image/") === 0 || name.match(/\\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
        list.push({
          id: id,
          name: name,
          size: file.getSize(),
          url: "https://lh3.googleusercontent.com/d/" + id
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      status: "success",
      folderName: folder.getName(),
      totalFiles: list.length,
      files: list
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        if (typeof window.showToast === 'function') {
          window.showToast('คัดลอกโค้ดสคริปต์ Google Apps Script แล้ว! นำไปวางใน script.google.com ได้เลย', 'success');
        }
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (typeof window.showToast === 'function') {
        window.showToast('คัดลอกโค้ดสคริปต์ Google Apps Script แล้ว', 'success');
      }
    }
  }

  function openDriveCatalogListModal() {
    const modal = document.getElementById('driveCatalogListModal');
    if (!modal) return;
    const countEl = document.getElementById('driveCatalogListModalCount');
    if (countEl) countEl.textContent = Array.isArray(drivePhotoCatalog) ? drivePhotoCatalog.length : 0;
    filterDriveCatalogGrid('');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function closeDriveCatalogListModal() {
    const modal = document.getElementById('driveCatalogListModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    activeCatalogPickerContext = null;
  }

  function filterDriveCatalogGrid(searchVal) {
    const grid = document.getElementById('driveCatalogPhotosGrid');
    if (!grid) return;

    if (!Array.isArray(drivePhotoCatalog) || drivePhotoCatalog.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-muted-foreground space-y-2">
          <i data-lucide="image-off" class="h-8 w-8 mx-auto text-muted-foreground/50"></i>
          <p>ยังไม่มีรูปภาพในคลัง</p>
          <button type="button" onclick="closeDriveCatalogListModal(); focusDrivePhotoFolderInput();" class="text-blue-500 font-semibold underline cursor-pointer">
            วางลิงก์โฟลเดอร์แล้วกดสแกน
          </button>
        </div>
      `;
      if (typeof window.refreshIcons === 'function') window.refreshIcons();
      return;
    }

    const q = (searchVal || '').trim().toLowerCase();
    const filtered = drivePhotoCatalog.filter(item => {
      if (!q) return true;
      return (item.name || '').toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-8 text-center text-xs text-muted-foreground">
          ไม่พบรูปภาพที่ชื่อตรงกับ "${escapeHtml(q)}"
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const isPicking = Boolean(activeCatalogPickerContext);
      const url = item.url || `https://lh3.googleusercontent.com/d/${item.id}`;
      return `
        <div class="p-2 rounded-xl bg-card border border-border hover:border-primary/50 transition flex flex-col items-center gap-1.5 group text-center">
          <div class="w-full aspect-square rounded-lg overflow-hidden bg-muted relative">
            <img src="${escapeHtml(url)}" alt="${escapeHtml(item.name)}"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onerror="this.onerror=null; this.src='https://api.dicebear.com/10.x/shapes/svg?seed=${escapeHtml(item.name)}';" />
          </div>
          <span class="text-[11px] font-semibold text-foreground truncate w-full" title="${escapeHtml(item.name)}">
            ${escapeHtml(item.name)}
          </span>
          ${isPicking ? `
            <button type="button" onclick="selectPhotoFromCatalogForPerson('${activeCatalogPickerContext.type}', ${activeCatalogPickerContext.index}, '${item.id}', '${escapeHtml(item.name)}')"
              class="w-full py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold transition cursor-pointer">
              เลือกรูปนี้
            </button>
          ` : `
            <span class="text-[9px] text-muted-foreground">รหัส: ${escapeHtml(item.id.slice(0, 10))}...</span>
          `}
        </div>
      `;
    }).join('');

    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function getProjectsList() {
    let list = [];
    if (typeof window !== 'undefined' && window.appState && Array.isArray(window.appState.projects)) {
      list = window.appState.projects;
    }
    const sampleProjectIds = new Set(['PRJ-2569-01', 'PRJ-2568-02', 'PRJ-2569-03']);
    // Deduplicate by ID and exclude defunct sample projects
    const unique = [];
    const seen = new Set();
    list.forEach(p => {
      if (p && p.id && !sampleProjectIds.has(p.id) && !seen.has(p.id)) {
        seen.add(p.id);
        unique.push(p);
      }
    });
    return unique;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getStatusMeta(status) {
    switch (status) {
      case 'IN_PROGRESS':
        return {
          label: 'กำลังดำเนินการ',
          color: 'emerald',
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dotClass: 'bg-emerald-500',
          ping: true,
          icon: 'play-circle'
        };
      case 'COMPLETED':
        return {
          label: 'สิ้นสุดแล้ว',
          color: 'blue',
          badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          dotClass: 'bg-blue-500',
          ping: false,
          icon: 'check-circle-2'
        };
      case 'PLANNING':
      default:
        return {
          label: 'เตรียมการ',
          color: 'amber',
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dotClass: 'bg-amber-500',
          ping: false,
          icon: 'clock'
        };
    }
  }

  function formatThaiDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[0], 10);
        const thaiMonths = [
          'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        const thaiYear = y < 2500 ? y + 543 : y;
        return `${d} ${thaiMonths[m - 1] || ''} ${thaiYear}`;
      }
    } catch (e) {}
    return dateStr;
  }

  function formatThaiDateRange(startDate, endDate) {
    if (!startDate && !endDate) return '-';
    if (!endDate || startDate === endDate) return formatThaiDate(startDate);
    return `${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`;
  }

  // Get visually distinct Tailwind color class based on department name
  function getDepartmentBadgeClass(deptName) {
    if (!deptName) return 'bg-muted text-muted-foreground border-border';
    const d = deptName.toLowerCase();
    if (d.includes('กิจกรรม') || d.includes('สันทนาการ') || d.includes('เกม')) {
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    }
    if (d.includes('สถานที่') || d.includes('ยานพาหนะ') || d.includes('สวัสดิการ') || d.includes('ค่าย')) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
    if (d.includes('พยาบาล') || d.includes('สุขอนามัย') || d.includes('ดูแล')) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    }
    if (d.includes('สื่อ') || d.includes('ประชาสัมพันธ์') || d.includes('ภาพ') || d.includes('ถ่าย')) {
      return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
    }
    if (d.includes('ทะเบียน') || d.includes('ประเมิน') || d.includes('สถิติ')) {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    }
    if (d.includes('วิชาการ') || d.includes('วิทยากร') || d.includes('อบรม')) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
    if (d.includes('เครื่องแต่งกาย') || d.includes('พร็อพ') || d.includes('การแสดง')) {
      return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
    }
    return 'bg-primary/10 text-primary border-primary/20';
  }

  // ========================================================
  // 1. USER VIEW RENDERING
  // ========================================================
  function renderUserProjectsSection() {
    const container = document.getElementById('uToolSec_PROJECTS');
    if (!container) return;

    const allProjects = getProjectsList();

    const yearSet = new Set();
    allProjects.forEach(p => {
      if (p.academicYear) yearSet.add(p.academicYear);
    });
    const sortedYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));

    const q = userProjectSearch.trim().toLowerCase();
    const filtered = allProjects.filter(p => {
      if (userProjectFilter !== 'ALL' && p.status !== userProjectFilter) return false;
      if (userProjectYear !== 'ALL' && p.academicYear !== userProjectYear) return false;
      if (q) {
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const codeMatch = (p.code || '').toLowerCase().includes(q);
        const yearMatch = (p.academicYear || '').toLowerCase().includes(q);
        const leaderMatch = (p.leaders || []).some(l => 
          (l.name || '').toLowerCase().includes(q) || (l.nickname || '').toLowerCase().includes(q)
        );
        const memberMatch = (p.members || []).some(m =>
          (m.name || '').toLowerCase().includes(q) || (m.nickname || '').toLowerCase().includes(q) || (m.department || '').toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q)
        );
        if (!titleMatch && !codeMatch && !yearMatch && !leaderMatch && !memberMatch) return false;
      }
      return true;
    });

    const counts = {
      ALL: allProjects.length,
      IN_PROGRESS: allProjects.filter(p => p.status === 'IN_PROGRESS').length,
      COMPLETED: allProjects.filter(p => p.status === 'COMPLETED').length,
      PLANNING: allProjects.filter(p => p.status === 'PLANNING').length
    };

    let html = `
      <div class="space-y-4">
        <!-- Header & Counter -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
                <i data-lucide="folder-kanban" class="text-primary h-5 w-5"></i>
                โครงการของชมรม
              </h3>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                ${allProjects.length} โครงการ
              </span>
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">
              ติดตามโครงการ กิจกรรม โครงสร้างฝ่ายงาน เล่มโครงการ และงบประมาณของชมรมสันทนาการ
            </p>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="bg-card border border-border/80 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
          <!-- Status Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button type="button" onclick="setUserProjectFilter('ALL')"
              class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                userProjectFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
              }">
              ทั้งหมด (${counts.ALL})
            </button>
            <button type="button" onclick="setUserProjectFilter('IN_PROGRESS')"
              class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                userProjectFilter === 'IN_PROGRESS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-emerald-600 dark:text-emerald-400'
              }">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              กำลังดำเนินการ (${counts.IN_PROGRESS})
            </button>
            <button type="button" onclick="setUserProjectFilter('COMPLETED')"
              class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                userProjectFilter === 'COMPLETED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-blue-600 dark:text-blue-400'
              }">
              <i data-lucide="check-circle-2" class="h-3.5 w-3.5"></i>
              สิ้นสุดแล้ว (${counts.COMPLETED})
            </button>
            <button type="button" onclick="setUserProjectFilter('PLANNING')"
              class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                userProjectFilter === 'PLANNING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-amber-600 dark:text-amber-400'
              }">
              <i data-lucide="clock" class="h-3.5 w-3.5"></i>
              เตรียมการ (${counts.PLANNING})
            </button>
          </div>

          <!-- Search Input & Year Dropdown -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div class="relative flex-1">
              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"></i>
              <input type="text"
                id="userProjectSearchInput"
                value="${escapeHtml(userProjectSearch)}"
                oninput="setUserProjectSearch(this.value)"
                placeholder="ค้นหาชื่อโครงการ, รหัส, ฝ่ายงาน, หรือชื่อผู้เกี่ยวข้อง..."
                class="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-muted/40 border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              ${userProjectSearch ? `
                <button type="button" onclick="setUserProjectSearch('')" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <i data-lucide="x" class="h-3.5 w-3.5"></i>
                </button>
              ` : ''}
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <select onchange="setUserProjectYear(this.value)" class="py-2 px-3 rounded-xl text-xs bg-muted/40 border border-border focus:outline-hidden focus:border-primary text-foreground">
                <option value="ALL" ${userProjectYear === 'ALL' ? 'selected' : ''}>ทุกปีการศึกษา</option>
                ${sortedYears.map(yr => `<option value="${yr}" ${userProjectYear === yr ? 'selected' : ''}>ปีการศึกษา ${yr}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Project Cards Grid -->
        ${filtered.length === 0 ? `
          <div class="bg-card border border-border rounded-3xl p-8 text-center space-y-3">
            <div class="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto text-2xl">
              <i data-lucide="folder-search" class="h-7 w-7"></i>
            </div>
            <div class="space-y-1">
              <p class="font-bold text-foreground text-sm">ไม่พบโครงการที่ค้นหา</p>
              <p class="text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะอื่น</p>
            </div>
            ${(userProjectSearch || userProjectFilter !== 'ALL' || userProjectYear !== 'ALL') ? `
              <button type="button" onclick="resetUserProjectFilters()"
                class="px-4 py-2 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition">
                ล้างตัวกรองทั้งหมด
              </button>
            ` : ''}
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${filtered.map(p => renderProjectCardHtml(p, false)).join('')}
          </div>
        `}
      </div>
    `;

    container.innerHTML = html;
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function renderProjectCardHtml(p, isAdmin = false) {
    const statusMeta = getStatusMeta(p.status);
    const leaders = Array.isArray(p.leaders) ? p.leaders : [];
    const members = Array.isArray(p.members) ? p.members : [];
    const primaryLeader = leaders[0] || null;
    const hasDrive = Boolean(p.googleDriveUrl);
    const hasDoc = Boolean(p.projectDocument && p.projectDocument.url);
    const hasBudgetDoc = Boolean(p.budgetDocument && p.budgetDocument.url);

    // Count unique departments
    const depts = new Set();
    members.forEach(m => {
      if (m.department && m.department.trim()) depts.add(m.department.trim());
    });

    return `
      <div class="bg-card border border-border/80 hover:border-primary/40 rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md group relative">
        <div class="space-y-3">
          <!-- Top Row: Status Badge & Code/Year -->
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}">
              <span class="relative flex h-2 w-2">
                ${statusMeta.ping ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${statusMeta.dotClass} opacity-75"></span>` : ''}
                <span class="relative inline-flex rounded-full h-2 w-2 ${statusMeta.dotClass}"></span>
              </span>
              ${statusMeta.label}
            </span>

            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
              ${p.academicYear ? `<span class="px-2 py-0.5 rounded-md bg-muted font-sans font-medium text-foreground">ปี ${escapeHtml(p.academicYear)}</span>` : ''}
              ${p.code ? `<span class="truncate max-w-[110px]" title="${escapeHtml(p.code)}">${escapeHtml(p.code)}</span>` : ''}
            </div>
          </div>

          <!-- Project Title -->
          <div class="space-y-1">
            <h4 onclick="openProjectDetailModal('${p.id}')"
              class="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
              title="${escapeHtml(p.title)}">
              ${escapeHtml(p.title)}
            </h4>
          </div>

          <!-- Meta Pills: Dates, Location, Budget -->
          <div class="space-y-1.5 text-xs text-muted-foreground">
            <div class="flex items-center gap-2">
              <i data-lucide="calendar" class="h-3.5 w-3.5 text-primary shrink-0"></i>
              <span class="truncate">${formatThaiDateRange(p.startDate, p.endDate)}</span>
            </div>
            ${p.location ? `
              <div class="flex items-center gap-2">
                <i data-lucide="map-pin" class="h-3.5 w-3.5 text-rose-500 shrink-0"></i>
                <span class="truncate">${escapeHtml(p.location)}</span>
              </div>
            ` : ''}
            ${p.budget ? `
              <div class="flex items-center gap-2">
                <i data-lucide="wallet" class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"></i>
                <span class="font-semibold text-foreground">${escapeHtml(p.budget)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Departments & Team Count Chip -->
          <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <i data-lucide="layers" class="h-3 w-3"></i>
              ${depts.size} ฝ่ายงาน
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-muted text-foreground border border-border">
              <i data-lucide="users" class="h-3 w-3"></i>
              ${members.length} สมาชิก
            </span>
          </div>

          <!-- Short Summary -->
          ${p.summary ? `
            <p class="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/40">
              ${escapeHtml(p.summary)}
            </p>
          ` : ''}

          <!-- Primary Leader Chip -->
          ${primaryLeader ? (() => {
            const leaderSeed = primaryLeader.nickname || primaryLeader.name || 'leader';
            const leaderFallback = getCuteAvatarUrl(leaderSeed);
            const leaderAvatar = primaryLeader.avatar ? escapeHtml(primaryLeader.avatar) : leaderFallback;
            return `
              <div class="pt-1 flex items-center gap-2.5">
                <img src="${leaderAvatar}" alt="${escapeHtml(primaryLeader.name || 'ผู้รับผิดชอบ')}"
                  class="w-7 h-7 rounded-full object-cover ring-1 ring-border shrink-0 shadow-2xs"
                  onerror="this.onerror=null; this.src='${leaderFallback}';" />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-foreground truncate">
                    ${escapeHtml(primaryLeader.name)} ${primaryLeader.nickname ? `(${escapeHtml(primaryLeader.nickname)})` : ''}
                  </p>
                  <p class="text-[10px] text-muted-foreground truncate">
                    ${escapeHtml(primaryLeader.role || 'ผู้รับผิดชอบโครงการ')}
                  </p>
                </div>
              </div>
            `;
          })() : ''}

          <!-- Feature Indicator Tags -->
          <div class="flex items-center gap-1.5 flex-wrap pt-1">
            ${hasDrive ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <i data-lucide="hard-drive" class="h-3 w-3"></i> Drive
              </span>
            ` : ''}
            ${hasDoc ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <i data-lucide="file-text" class="h-3 w-3"></i> เล่มโครงการ
              </span>
            ` : ''}
            ${hasBudgetDoc ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <i data-lucide="banknote" class="h-3 w-3"></i> เล่มงบประมาณ
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="pt-4 mt-3 border-t border-border/60 flex items-center justify-between gap-2">
          <button type="button" onclick="openProjectDetailModal('${p.id}')"
            class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
            <i data-lucide="external-link" class="h-3.5 w-3.5"></i>
            ดูรายละเอียดโครงการ
          </button>

          ${isAdmin ? `
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" onclick="openAdminProjectEditModal('${p.id}')"
                class="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border flex items-center justify-center transition cursor-pointer"
                title="แก้ไขโครงการ">
                <i data-lucide="square-pen" class="h-3.5 w-3.5"></i>
              </button>
              <button type="button" onclick="confirmDeleteProject('${p.id}', '${escapeHtml(p.title)}')"
                class="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center transition cursor-pointer"
                title="ลบโครงการ">
                <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ========================================================
  // 2. ADMIN VIEW RENDERING
  // ========================================================
  function renderAdminProjectsSection() {
    const container = document.getElementById('aTab_PROJECTS');
    if (!container) return;

    const allProjects = getProjectsList();

    const yearSet = new Set();
    allProjects.forEach(p => {
      if (p.academicYear) yearSet.add(p.academicYear);
    });
    const sortedYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));

    const q = adminProjectSearch.trim().toLowerCase();
    const filtered = allProjects.filter(p => {
      if (adminProjectFilter !== 'ALL' && p.status !== adminProjectFilter) return false;
      if (adminProjectYear !== 'ALL' && p.academicYear !== adminProjectYear) return false;
      if (q) {
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const codeMatch = (p.code || '').toLowerCase().includes(q);
        const yearMatch = (p.academicYear || '').toLowerCase().includes(q);
        const leaderMatch = (p.leaders || []).some(l => 
          (l.name || '').toLowerCase().includes(q) || (l.nickname || '').toLowerCase().includes(q)
        );
        const memberMatch = (p.members || []).some(m =>
          (m.name || '').toLowerCase().includes(q) || (m.nickname || '').toLowerCase().includes(q) || (m.department || '').toLowerCase().includes(q)
        );
        if (!titleMatch && !codeMatch && !yearMatch && !leaderMatch && !memberMatch) return false;
      }
      return true;
    });

    const inProgressCount = allProjects.filter(p => p.status === 'IN_PROGRESS').length;
    const completedCount = allProjects.filter(p => p.status === 'COMPLETED').length;
    const planningCount = allProjects.filter(p => p.status === 'PLANNING').length;

    let html = `
      <div class="space-y-6">
        <!-- Top Banner & Action -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="p-2 rounded-2xl bg-primary/10 text-primary">
                <i data-lucide="folder-kanban" class="h-6 w-6"></i>
              </span>
              <div>
                <h3 class="text-lg sm:text-xl font-extrabold text-foreground">จัดการโครงการของชมรม (Projects)</h3>
                <p class="text-xs text-muted-foreground">สร้าง แก้ไข ติดตามสถานะ โครงสร้างฝ่ายงาน เล่มโครงการ งบประมาณ และนำเข้ารายชื่อจาก Excel</p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="downloadProjectMembersTemplate()"
              class="px-3.5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="download" class="h-4 w-4"></i>
              <span>โหลด Template Excel</span>
            </button>
            <button type="button" onclick="openAdminProjectEditModal()"
              class="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer">
              <i data-lucide="plus-circle" class="h-4 w-4"></i>
              <span>สร้างโครงการใหม่</span>
            </button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-card border border-border/80 rounded-2xl p-4 space-y-1 shadow-2xs">
            <div class="flex items-center justify-between text-muted-foreground text-xs">
              <span>โครงการทั้งหมด</span>
              <i data-lucide="folder" class="h-4 w-4 text-primary"></i>
            </div>
            <p class="text-xl sm:text-2xl font-black text-foreground">${allProjects.length}</p>
          </div>

          <div class="bg-card border border-border/80 rounded-2xl p-4 space-y-1 shadow-2xs">
            <div class="flex items-center justify-between text-muted-foreground text-xs">
              <span>กำลังดำเนินการ</span>
              <i data-lucide="play-circle" class="h-4 w-4 text-emerald-500"></i>
            </div>
            <p class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">${inProgressCount}</p>
          </div>

          <div class="bg-card border border-border/80 rounded-2xl p-4 space-y-1 shadow-2xs">
            <div class="flex items-center justify-between text-muted-foreground text-xs">
              <span>สิ้นสุดแล้ว</span>
              <i data-lucide="check-circle-2" class="h-4 w-4 text-blue-500"></i>
            </div>
            <p class="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">${completedCount}</p>
          </div>

          <div class="bg-card border border-border/80 rounded-2xl p-4 space-y-1 shadow-2xs">
            <div class="flex items-center justify-between text-muted-foreground text-xs">
              <span>เตรียมการ</span>
              <i data-lucide="clock" class="h-4 w-4 text-amber-500"></i>
            </div>
            <p class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">${planningCount}</p>
          </div>
        </div>

        <!-- Filters & Search -->
        <div class="bg-card border border-border/80 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button type="button" onclick="setAdminProjectFilter('ALL')"
              class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                adminProjectFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
              }">
              ทั้งหมด (${allProjects.length})
            </button>
            <button type="button" onclick="setAdminProjectFilter('IN_PROGRESS')"
              class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                adminProjectFilter === 'IN_PROGRESS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-emerald-600 dark:text-emerald-400'
              }">
              กำลังดำเนินการ (${inProgressCount})
            </button>
            <button type="button" onclick="setAdminProjectFilter('COMPLETED')"
              class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                adminProjectFilter === 'COMPLETED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-blue-600 dark:text-blue-400'
              }">
              สิ้นสุดแล้ว (${completedCount})
            </button>
            <button type="button" onclick="setAdminProjectFilter('PLANNING')"
              class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                adminProjectFilter === 'PLANNING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-amber-600 dark:text-amber-400'
              }">
              เตรียมการ (${planningCount})
            </button>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div class="relative flex-1">
              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"></i>
              <input type="text"
                value="${escapeHtml(adminProjectSearch)}"
                oninput="setAdminProjectSearch(this.value)"
                placeholder="ค้นหาชื่อโครงการ, รหัส, ฝ่ายงาน, หรือผู้รับผิดชอบ..."
                class="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-muted/40 border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              ${adminProjectSearch ? `
                <button type="button" onclick="setAdminProjectSearch('')" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <i data-lucide="x" class="h-3.5 w-3.5"></i>
                </button>
              ` : ''}
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <select onchange="setAdminProjectYear(this.value)" class="py-2 px-3 rounded-xl text-xs bg-muted/40 border border-border focus:outline-hidden focus:border-primary text-foreground">
                <option value="ALL" ${adminProjectYear === 'ALL' ? 'selected' : ''}>ทุกปีการศึกษา</option>
                ${sortedYears.map(yr => `<option value="${yr}" ${adminProjectYear === yr ? 'selected' : ''}>ปีการศึกษา ${yr}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Project Cards Grid (Admin) -->
        ${filtered.length === 0 ? `
          <div class="bg-card border border-border rounded-3xl p-8 text-center space-y-3">
            <div class="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto text-2xl">
              <i data-lucide="folder-search" class="h-7 w-7"></i>
            </div>
            <div class="space-y-1">
              <p class="font-bold text-foreground text-sm">ยังไม่มีโครงการในหมวดหมู่นี้</p>
              <p class="text-xs text-muted-foreground">สามารถกดปุ่ม "สร้างโครงการใหม่" ด้านบนเพื่อเพิ่มโครงการ</p>
            </div>
            <button type="button" onclick="openAdminProjectEditModal()"
              class="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs transition cursor-pointer">
              + สร้างโครงการใหม่
            </button>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${filtered.map(p => renderProjectCardHtml(p, true)).join('')}
          </div>
        `}
      </div>
    `;

    container.innerHTML = html;
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  // Filter setters
  function setUserProjectFilter(f) {
    userProjectFilter = f;
    renderUserProjectsSection();
  }
  function setUserProjectSearch(q) {
    userProjectSearch = q;
    renderUserProjectsSection();
  }
  function setUserProjectYear(y) {
    userProjectYear = y;
    renderUserProjectsSection();
  }
  function resetUserProjectFilters() {
    userProjectFilter = 'ALL';
    userProjectSearch = '';
    userProjectYear = 'ALL';
    renderUserProjectsSection();
  }

  function setAdminProjectFilter(f) {
    adminProjectFilter = f;
    renderAdminProjectsSection();
  }
  function setAdminProjectSearch(q) {
    adminProjectSearch = q;
    renderAdminProjectsSection();
  }
  function setAdminProjectYear(y) {
    adminProjectYear = y;
    renderAdminProjectsSection();
  }

  // ========================================================
  // 3. FULL PROJECT DETAIL MODAL WITH TABLE & DIVISIONS
  // ========================================================
  function openProjectDetailModal(projectId) {
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === projectId);
    if (!p) {
      if (typeof showToast === 'function') showToast('ไม่พบข้อมูลโครงการที่ระบุ', 'warning');
      return;
    }

    activeDetailProjectId = projectId;
    detailMemberDeptFilter = 'ALL';
    detailMemberSearch = '';

    const modal = document.getElementById('projectDetailModal');
    if (!modal) return;

    // Header & Badges
    const statusMeta = getStatusMeta(p.status);
    const statusBadgeEl = document.getElementById('prjDetailStatusBadge');
    if (statusBadgeEl) {
      statusBadgeEl.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`;
      statusBadgeEl.innerHTML = `
        <span class="relative flex h-2 w-2">
          ${statusMeta.ping ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${statusMeta.dotClass} opacity-75"></span>` : ''}
          <span class="relative inline-flex rounded-full h-2 w-2 ${statusMeta.dotClass}"></span>
        </span>
        ${statusMeta.label}
      `;
    }

    const yearBadgeEl = document.getElementById('prjDetailYearBadge');
    if (yearBadgeEl) {
      yearBadgeEl.textContent = p.academicYear ? `ปีการศึกษา ${p.academicYear}` : '';
      yearBadgeEl.classList.toggle('hidden', !p.academicYear);
    }

    const codeBadgeEl = document.getElementById('prjDetailCodeBadge');
    if (codeBadgeEl) {
      codeBadgeEl.textContent = p.code ? `รหัส: ${p.code}` : '';
      codeBadgeEl.classList.toggle('hidden', !p.code);
    }

    const titleEl = document.getElementById('prjDetailTitle');
    if (titleEl) titleEl.textContent = p.title || 'ไม่มีชื่อโครงการ';

    // Dates, Location, Budget
    const datesEl = document.getElementById('prjDetailDates');
    if (datesEl) datesEl.textContent = formatThaiDateRange(p.startDate, p.endDate);

    const locEl = document.getElementById('prjDetailLocation');
    if (locEl) locEl.textContent = p.location || 'ไม่ได้ระบุสถานที่';

    const budgetEl = document.getElementById('prjDetailBudget');
    if (budgetEl) budgetEl.textContent = p.budget || 'ไม่มีระบุงบประมาณ';

    // Google Drive Link Button
    const driveBox = document.getElementById('prjDetailGoogleDriveBox');
    const driveBtn = document.getElementById('prjDetailGoogleDriveBtn');
    if (driveBox && driveBtn) {
      if (p.googleDriveUrl) {
        driveBox.classList.remove('hidden');
        driveBtn.href = p.googleDriveUrl;
      } else {
        driveBox.classList.add('hidden');
        driveBtn.href = '#';
      }
    }

    // Documents (เล่มโครงการ & เล่มงบประมาณ)
    const docBox = document.getElementById('prjDetailDocBox');
    const docTitle = document.getElementById('prjDetailDocTitle');
    const docDate = document.getElementById('prjDetailDocDate');
    const docBtn = document.getElementById('prjDetailDocBtn');
    if (docBox && docBtn) {
      if (p.projectDocument && p.projectDocument.url) {
        docBox.classList.remove('hidden');
        if (docTitle) docTitle.textContent = p.projectDocument.title || 'เล่มโครงการ (ฉบับสมบูรณ์)';
        if (docDate) docDate.textContent = p.projectDocument.updatedAt ? `อัปเดตเมื่อ: ${formatThaiDate(p.projectDocument.updatedAt)}` : '';
        docBtn.href = p.projectDocument.url;
      } else {
        docBox.classList.add('hidden');
        docBtn.href = '#';
      }
    }

    const budgetDocBox = document.getElementById('prjDetailBudgetDocBox');
    const budgetDocTitle = document.getElementById('prjDetailBudgetDocTitle');
    const budgetDocAmount = document.getElementById('prjDetailBudgetDocAmount');
    const budgetDocDate = document.getElementById('prjDetailBudgetDocDate');
    const budgetDocBtn = document.getElementById('prjDetailBudgetDocBtn');
    if (budgetDocBox && budgetDocBtn) {
      if (p.budgetDocument && p.budgetDocument.url) {
        budgetDocBox.classList.remove('hidden');
        if (budgetDocTitle) budgetDocTitle.textContent = p.budgetDocument.title || 'เล่มงบประมาณและบัญชี';
        if (budgetDocAmount) budgetDocAmount.textContent = p.budgetDocument.totalBudget ? `ยอดรวม: ${p.budgetDocument.totalBudget}` : '';
        if (budgetDocDate) budgetDocDate.textContent = p.budgetDocument.updatedAt ? `อัปเดตเมื่อ: ${formatThaiDate(p.budgetDocument.updatedAt)}` : '';
        budgetDocBtn.href = p.budgetDocument.url;
      } else {
        budgetDocBox.classList.add('hidden');
        budgetDocBtn.href = '#';
      }
    }

    // Full Description Narrative
    const descEl = document.getElementById('prjDetailDescription');
    if (descEl) {
      descEl.textContent = p.description || p.summary || 'ยังไม่มีการระบุรายละเอียดโครงการ';
    }

    // Render Leaders (Cards)
    renderPersonCardsList('prjDetailLeadersList', p.leaders, 'ผู้รับผิดชอบโครงการ');

    // Render Members (TABLE with Departments & Search & XLSX Action)
    renderProjectMembersTableView(p);

    // Render Advisors & SMO (Cards)
    renderPersonCardsList('prjDetailAdvisorsList', p.advisors, 'อาจารย์ที่ปรึกษา');
    renderPersonCardsList('prjDetailSmoOfficersList', p.smoOfficers, 'ตัวแทนสโมสรนักศึกษา');

    // Admin Action Buttons in modal
    const adminActions = document.getElementById('prjDetailAdminActions');
    const editBtn = document.getElementById('prjDetailEditBtn');
    const deleteBtn = document.getElementById('prjDetailDeleteBtn');
    const isAdmin = window.currentRole === 'ADMIN';

    if (adminActions) adminActions.classList.toggle('hidden', !isAdmin);
    if (editBtn) {
      editBtn.onclick = () => {
        closeProjectDetailModal();
        openAdminProjectEditModal(p.id);
      };
    }
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        closeProjectDetailModal();
        confirmDeleteProject(p.id, p.title);
      };
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function closeProjectDetailModal() {
    const modal = document.getElementById('projectDetailModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    activeDetailProjectId = null;
  }

  // ========================================================
  // 3.1 MEMBERS TABLE & DEPARTMENT BREAKDOWN LOGIC
  // ========================================================
  function renderProjectMembersTableView(p) {
    if (!p) return;
    const members = Array.isArray(p.members) ? p.members : [];
    const isAdmin = window.currentRole === 'ADMIN';

    // Show/hide Import button based on role
    const importBtn = document.getElementById('prjDetailBtnImportXlsx');
    if (importBtn) importBtn.classList.toggle('hidden', !isAdmin);

    // Show/hide Table Action Header
    const actionTh = document.getElementById('prjDetailTableActionTh');
    if (actionTh) actionTh.classList.toggle('hidden', !isAdmin);

    // Count departments
    const deptMap = {};
    members.forEach(m => {
      const dept = (m.department && m.department.trim()) ? m.department.trim() : 'ฝ่ายดำเนินงานทั่วไป';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const depts = Object.keys(deptMap);

    // Update Counter Badges
    const countBadge = document.getElementById('prjDetailMembersCountBadge');
    if (countBadge) countBadge.textContent = `${members.length} คน`;

    const deptCountText = document.getElementById('prjDetailDeptCountText');
    if (deptCountText) deptCountText.textContent = `ทั้งหมด ${depts.length} ฝ่ายงาน`;

    // Department Pills
    const deptSummary = document.getElementById('prjDetailDeptSummary');
    if (deptSummary) {
      if (depts.length === 0) {
        deptSummary.innerHTML = `<span class="text-xs text-muted-foreground italic">ยังไม่มีข้อมูลฝ่ายงาน</span>`;
      } else {
        const allBtn = `
          <button type="button" onclick="setProjectDetailDeptFilter('ALL')"
            class="px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
              detailMemberDeptFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80'
            }">
            ทุกฝ่าย (${members.length})
          </button>
        `;

        const deptBtns = depts.map(dept => {
          const isActive = detailMemberDeptFilter === dept;
          const badgeClass = getDepartmentBadgeClass(dept);
          return `
            <button type="button" onclick="setProjectDetailDeptFilter('${escapeHtml(dept)}')"
              class="px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/50'
                  : `${badgeClass} hover:opacity-80`
              }">
              <span>${escapeHtml(dept)}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10'}">${deptMap[dept]}</span>
            </button>
          `;
        }).join('');

        deptSummary.innerHTML = allBtn + deptBtns;
      }
    }

    // Reset/Sync search input
    const searchInput = document.getElementById('prjMembersTableSearch');
    if (searchInput && searchInput.value !== detailMemberSearch) {
      searchInput.value = detailMemberSearch;
    }
    const clearBtn = document.getElementById('prjMembersTableSearchClear');
    if (clearBtn) clearBtn.classList.toggle('hidden', !detailMemberSearch);

    // Render Table Body
    renderProjectMembersTableRows(p);
  }

  function renderProjectMembersTableRows(p) {
    const tbody = document.getElementById('prjDetailMembersTableBody');
    if (!tbody || !p) return;

    const members = Array.isArray(p.members) ? p.members : [];
    const isAdmin = window.currentRole === 'ADMIN';

    const q = detailMemberSearch.trim().toLowerCase();
    const filtered = members.filter(m => {
      const dept = (m.department && m.department.trim()) ? m.department.trim() : 'ฝ่ายดำเนินงานทั่วไป';
      if (detailMemberDeptFilter !== 'ALL' && dept !== detailMemberDeptFilter) return false;
      if (q) {
        const nameMatch = (m.name || '').toLowerCase().includes(q);
        const nickMatch = (m.nickname || '').toLowerCase().includes(q);
        const deptMatch = dept.toLowerCase().includes(q);
        const roleMatch = (m.role || '').toLowerCase().includes(q);
        const detailMatch = (m.details || '').toLowerCase().includes(q);
        const phoneMatch = (m.phone || '').toLowerCase().includes(q);
        const mailMatch = (m.kkuMail || '').toLowerCase().includes(q);
        if (!nameMatch && !nickMatch && !deptMatch && !roleMatch && !detailMatch && !phoneMatch && !mailMatch) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const colSpan = isAdmin ? 9 : 8;
      tbody.innerHTML = `
        <tr>
          <td colspan="${colSpan}" class="py-8 px-4 text-center text-muted-foreground text-xs bg-muted/10">
            <div class="flex flex-col items-center justify-center space-y-2">
              <i data-lucide="users-round" class="h-6 w-6 text-muted-foreground/60"></i>
              <p class="font-medium text-foreground">ไม่พบรายชื่อในเงื่อนไขที่เลือก</p>
              ${detailMemberSearch || detailMemberDeptFilter !== 'ALL' ? `
                <button type="button" onclick="clearProjectMembersTableFilters()" class="text-xs text-primary hover:underline font-semibold cursor-pointer">
                  ล้างตัวกรองและคำค้นหา
                </button>
              ` : `
                ${isAdmin ? `
                  <div class="flex items-center gap-2 pt-1">
                    <button type="button" onclick="triggerImportProjectMembersXlsx()" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer">
                      <i data-lucide="file-spreadsheet" class="h-3.5 w-3.5 mr-1 inline"></i> นำเข้ารายชื่อจาก Excel (.xlsx)
                    </button>
                  </div>
                ` : ''}
              `}
            </div>
          </td>
        </tr>
      `;
      if (typeof window.refreshIcons === 'function') window.refreshIcons();
      else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      return;
    }

    tbody.innerHTML = filtered.map((m, idx) => {
      const dept = (m.department && m.department.trim()) ? m.department.trim() : 'ฝ่ายดำเนินงานทั่วไป';
      const deptBadge = getDepartmentBadgeClass(dept);
      const name = m.name || 'ไม่ระบุชื่อ';
      const nickname = m.nickname ? `(${m.nickname})` : '';
      const seed = m.nickname || m.name || m.id || `member_${idx}`;
      const fallbackUrl = getCuteAvatarUrl(seed);
      const avatarUrl = m.avatar || fallbackUrl;

      return `
        <tr class="hover:bg-muted/40 transition-colors">
          <!-- # -->
          <td class="py-3 px-3 text-center font-mono font-medium text-muted-foreground text-[11px]">
            ${idx + 1}
          </td>

          <!-- Member / Name -->
          <td class="py-3 px-3">
            <div class="flex items-center gap-2.5">
              <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}"
                class="w-8 h-8 rounded-full object-cover ring-1 ring-border shrink-0 shadow-2xs"
                onerror="this.onerror=null; this.src='${fallbackUrl}';" />
              <div class="min-w-0">
                <p class="font-bold text-foreground text-xs truncate" title="${escapeHtml(name)} ${escapeHtml(nickname)}">
                  ${escapeHtml(name)} ${nickname ? `<span class="font-normal text-muted-foreground">${escapeHtml(nickname)}</span>` : ''}
                </p>
              </div>
            </div>
          </td>

          <!-- Department (ฝ่าย) -->
          <td class="py-3 px-3">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${deptBadge}">
              <i data-lucide="tag" class="h-3 w-3 shrink-0"></i>
              <span class="truncate max-w-[140px]" title="${escapeHtml(dept)}">${escapeHtml(dept)}</span>
            </span>
          </td>

          <!-- Role (หน้าที่ในโครงการ) -->
          <td class="py-3 px-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-foreground border border-border">
              <span class="truncate max-w-[130px]" title="${escapeHtml(m.role || 'ทีมงาน')}">${escapeHtml(m.role || 'ทีมงาน')}</span>
            </span>
          </td>

          <!-- Details (รายละเอียดหน้าที่) -->
          <td class="py-3 px-3 text-muted-foreground text-[11px] leading-relaxed">
            <span class="line-clamp-2" title="${escapeHtml(m.details || '-')}">${escapeHtml(m.details || '-')}</span>
          </td>

          <!-- Phone -->
          <td class="py-3 px-3 whitespace-nowrap">
            ${m.phone ? `
              <a href="tel:${escapeHtml(m.phone)}" class="inline-flex items-center gap-1 text-xs text-foreground hover:text-primary transition font-medium" title="โทร: ${escapeHtml(m.phone)}">
                <i data-lucide="phone" class="h-3 w-3 text-emerald-500"></i>
                <span>${escapeHtml(m.phone)}</span>
              </a>
            ` : `<span class="text-muted-foreground text-[11px]">-</span>`}
          </td>

          <!-- KKUMAIL -->
          <td class="py-3 px-3 whitespace-nowrap">
            ${m.kkuMail ? `
              <a href="mailto:${escapeHtml(m.kkuMail)}" class="inline-flex items-center gap-1 text-xs text-foreground hover:text-primary transition font-mono" title="อีเมล: ${escapeHtml(m.kkuMail)}">
                <i data-lucide="mail" class="h-3 w-3 text-primary"></i>
                <span class="truncate max-w-[150px]">${escapeHtml(m.kkuMail)}</span>
              </a>
            ` : `<span class="text-muted-foreground text-[11px]">-</span>`}
          </td>

          <!-- Contact Link Button -->
          <td class="py-3 px-3 text-center">
            ${m.contactLink ? `
              <a href="${escapeHtml(m.contactLink)}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition" title="เปิดช่องทางติดต่อ">
                <i data-lucide="external-link" class="h-3.5 w-3.5"></i>
              </a>
            ` : `<span class="text-muted-foreground text-[11px]">-</span>`}
          </td>

          <!-- Admin Actions -->
          ${isAdmin ? `
            <td class="py-3 px-3 text-center">
              <button type="button" onclick="confirmDeleteProjectMember('${escapeHtml(m.id || m.name)}')"
                class="w-7 h-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition inline-flex items-center justify-center cursor-pointer"
                title="ลบสมาชิกคนนี้ออกจากโครงการ">
                <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
              </button>
            </td>
          ` : ''}
        </tr>
      `;
    }).join('');

    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function setProjectDetailDeptFilter(dept) {
    detailMemberDeptFilter = dept;
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (p) renderProjectMembersTableView(p);
  }

  function handleProjectMembersTableSearch(query) {
    detailMemberSearch = query || '';
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (p) {
      const clearBtn = document.getElementById('prjMembersTableSearchClear');
      if (clearBtn) clearBtn.classList.toggle('hidden', !detailMemberSearch);
      renderProjectMembersTableRows(p);
    }
  }

  function clearProjectMembersTableSearch() {
    detailMemberSearch = '';
    const searchInput = document.getElementById('prjMembersTableSearch');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('prjMembersTableSearchClear');
    if (clearBtn) clearBtn.classList.add('hidden');

    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (p) renderProjectMembersTableRows(p);
  }

  function clearProjectMembersTableFilters() {
    detailMemberDeptFilter = 'ALL';
    detailMemberSearch = '';
    const searchInput = document.getElementById('prjMembersTableSearch');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('prjMembersTableSearchClear');
    if (clearBtn) clearBtn.classList.add('hidden');

    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (p) renderProjectMembersTableView(p);
  }

  // ========================================================
  // 3.2 EXCEL (.XLSX) IMPORT & EXPORT ENGINE
  // ========================================================
  function triggerImportProjectMembersXlsx() {
    if (window.currentRole !== 'ADMIN') {
      if (typeof showToast === 'function') showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถนำเข้ารายชื่อได้', 'warning');
      return;
    }
    const input = document.getElementById('prjDetailMembersExcelInput');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  function triggerImportProjectMembersXlsxForForm() {
    const input = document.getElementById('prjFormMembersExcelInput');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  // Parse Excel ArrayBuffer into standardized member objects
  function parseMembersFromExcelBuffer(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
      throw new Error('ไม่พบไลบรารี XLSX กรุณารีเฟรชหน้าจอ');
    }
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!Array.isArray(rows) || rows.length === 0) return [];

    return rows.map((r, idx) => {
      const department = String(
        r['ฝ่าย'] || r['ฝ่ายงาน'] || r['แผนก'] || r['หมวด'] || r['Department'] || r['Dept'] || r['Team'] || 'ฝ่ายดำเนินงานทั่วไป'
      ).trim();

      let name = String(r['ชื่อ-นามสกุล'] || r['ชื่อ - นามสกุล'] || r['ชื่อ-สกุล'] || r['ชื่อ นามสกุล'] || r['ชื่อ'] || r['Name'] || r['Full Name'] || '').trim();
      const lastName = String(r['นามสกุล'] || r['Last Name'] || '').trim();
      if (lastName && !name.includes(lastName)) {
        name = `${name} ${lastName}`.trim();
      }

      const nickname = String(r['ชื่อเล่น'] || r['Nickname'] || r['Nick Name'] || '').trim();
      const role = String(r['หน้าที่'] || r['ตำแหน่ง'] || r['บทบาท'] || r['หน้าที่ในโครงการ'] || r['Role'] || r['Position'] || 'ทีมงาน').trim();
      const details = String(r['รายละเอียด'] || r['รายละเอียดหน้าที่'] || r['หน้าที่ความรับผิดชอบ'] || r['ความรับผิดชอบ'] || r['Details'] || r['Description'] || '').trim();
      const phone = String(r['เบอร์ติดต่อ'] || r['เบอร์โทร'] || r['เบอร์โทรศัพท์'] || r['เบอร์'] || r['Phone'] || r['Tel'] || '').trim();
      const kkuMail = String(r['KKU-MAIL'] || r['KKUMAIL'] || r['KKU Mail'] || r['kku-mail'] || r['อีเมล'] || r['Email'] || '').trim();
      const contactLink = String(r['ลิงก์ติดต่อ'] || r['ช่องทางติดต่อ'] || r['โซเชียล'] || r['Contact Link'] || r['Social'] || '').trim();
      let avatar = String(r['รูปหน้า'] || r['ลิงก์รูปหน้า'] || r['รูป'] || r['Avatar'] || '').trim();
      if (avatar) {
        avatar = resolveGoogleDriveImageUrl(avatar);
      }

      return {
        id: `MBR-${Date.now()}-${idx + 1}`,
        department,
        name: name || `สมาชิก #${idx + 1}`,
        nickname,
        role,
        details,
        phone,
        kkuMail,
        contactLink,
        avatar
      };
    }).filter(m => m.name && m.name.trim());
  }

  // Handle Excel Import inside Project Detail Modal
  async function handleProjectMembersExcelImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!activeDetailProjectId) {
      if (typeof showToast === 'function') showToast('ไม่พบรหัสโครงการที่กำลังเปิดอยู่', 'error');
      return;
    }

    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (!p) return;

    try {
      const reader = new FileReader();
      reader.onload = async function (e) {
        try {
          const parsed = parseMembersFromExcelBuffer(e.target.result);
          if (parsed.length === 0) {
            if (typeof showToast === 'function') showToast('ไม่พบข้อมูลรายชื่อสมาชิกในไฟล์ Excel', 'warning');
            return;
          }

          const depts = new Set(parsed.map(m => m.department));

          const confirmed = typeof window.showConfirmDialog === 'function'
            ? await window.showConfirmDialog({
                title: 'ยืนยันการนำเข้ารายชื่อจาก Excel',
                message: `พบรายชื่อสมาชิกในไฟล์จำนวน ${parsed.length} คน จาก ${depts.size} ฝ่ายงาน\nต้องการเพิ่มรายชื่อเข้าสู่โครงการ "${p.title}" ใช่หรือไม่?`,
                confirmText: 'เพิ่มรายชื่อสู่โครงการ',
                cancelText: 'ยกเลิก',
                isDanger: false,
                icon: 'file-spreadsheet'
              })
            : true;

          if (!confirmed) return;

          if (!Array.isArray(p.members)) p.members = [];
          p.members.push(...parsed);

          if (window.socket && typeof window.socket.emit === 'function') {
            window.socket.emit('admin:updateProject', p);
          }

          if (typeof saveLocalState === 'function') saveLocalState();

          renderProjectMembersTableView(p);
          if (typeof showToast === 'function') {
            showToast(`นำเข้ารายชื่อสำเร็จ ${parsed.length} คน (${depts.size} ฝ่ายงาน)`, 'success');
          }
        } catch (err) {
          console.error('Error importing Excel:', err);
          if (typeof showToast === 'function') showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Excel Import inside Admin Project Edit Form Repeater
  function handleFormMembersExcelImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const parsed = parseMembersFromExcelBuffer(e.target.result);
          if (parsed.length === 0) {
            if (typeof showToast === 'function') showToast('ไม่พบข้อมูลรายชื่อในไฟล์ Excel', 'warning');
            return;
          }

          prjFormMembers.push(...parsed);
          renderRepeater('MEMBERS');
          if (typeof showToast === 'function') {
            showToast(`นำเข้ารายชื่อเข้าสู่แบบฟอร์มแล้ว ${parsed.length} คน`, 'success');
          }
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast('เกิดข้อผิดพลาดในการนำเข้า: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
    }
  }

  // Download Sample Excel Template
  function downloadProjectMembersTemplate() {
    if (typeof XLSX === 'undefined') {
      if (typeof showToast === 'function') showToast('กำลังโหลดไลบรารี Excel กรุณาลองใหม่อีกครั้ง', 'warning');
      return;
    }

    const templateData = [
      ['ฝ่าย', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'หน้าที่', 'รายละเอียดหน้าที่', 'เบอร์ติดต่อ', 'KKU-MAIL', 'ลิงก์ติดต่อ', 'ลิงก์รูปหน้า'],
      ['ฝ่ายกิจกรรมและสันทนาการ', 'นางสาวพิมพ์ชนก รัตนสุวรรณ', 'พลอย', 'หัวหน้าฝ่ายกิจกรรมและเกม', 'ออกแบบฐานกิจกรรม กลุ่มสัมพันธ์ และเกมสันทนาการ', '089-876-5432', 'pimchanok.r@kkumail.com', 'https://instagram.com/ploy_cs', ''],
      ['ฝ่ายกิจกรรมและสันทนาการ', 'นายธนกฤต มั่นคง', 'เจมส์', 'สตาฟฟ์นันทนาการและเพลง', 'ดูแลกิจกรรมร้องเพลง เต้นประกอบจังหวะ และนำเกมกลุ่มย่อย', '085-111-2233', 'thanakrit.m@kkumail.com', 'https://facebook.com/james.comsan', ''],
      ['ฝ่ายสถานที่และสวัสดิการ', 'นายกิตติศักดิ์ พรหมดี', 'ฟีฟ่า', 'หัวหน้าฝ่ายสถานที่และสวัสดิการ', 'จัดเตรียมอุปกรณ์ค่าย อาหาร น้ำดื่ม และการประสานงานพื้นที่', '082-345-6789', 'kittisak.p@kkumail.com', 'https://line.me/ti/p/~fifa_cs', ''],
      ['ฝ่ายสถานที่และสวัสดิการ', 'นายชินวัตร วิเศษศักดิ์', 'อาร์ม', 'สตาฟฟ์ฝ่ายสถานที่และยานพาหนะ', 'ดูแลการเดินทาง การจัดเต็นท์พักแรม และระบบไฟฟ้าส่องสว่าง', '084-999-8877', 'chinawat.w@kkumail.com', 'https://line.me/ti/p/~arm_cs', ''],
      ['ฝ่ายพยาบาลและสุขอนามัย', 'นางสาวสุชาวดี มีสุข', 'ฟ้า', 'เจ้าหน้าที่พยาบาลประจำค่าย', 'จัดเตรียมกระเป๋ายา เวชภัณฑ์ และดูแลสุขภาพของชาวค่าย', '086-444-5566', 'suchawadee.m@kkumail.com', 'https://instagram.com/fah_care', ''],
      ['ฝ่ายสื่อและประชาสัมพันธ์', 'นายวรเมธ ศรีสวัสดิ์', 'นิว', 'หัวหน้าฝ่ายสื่อและบันทึกภาพ', 'บันทึกภาพนิ่ง วิดีโอกิจกรรม และผลิตสื่อสรุปผลโครงการ', '087-333-2211', 'worameth.s@kkumail.com', 'https://instagram.com/new_photo', ''],
      ['ฝ่ายทะเบียนและประเมินผล', 'นางสาวกานดา นวลจันทร์', 'มายด์', 'เจ้าหน้าที่ทะเบียนและประเมินผล', 'รับลงทะเบียน แจกป้ายชื่อ รวบรวมแบบประเมินและสรุปรายงานสถิติ', '083-222-1100', 'kanda.n@kkumail.com', 'https://line.me/ti/p/~mind_kanda', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);

    ws['!cols'] = [
      { wch: 25 }, // ฝ่าย
      { wch: 30 }, // ชื่อ-นามสกุล
      { wch: 12 }, // ชื่อเล่น
      { wch: 28 }, // หน้าที่
      { wch: 45 }, // รายละเอียดหน้าที่
      { wch: 16 }, // เบอร์ติดต่อ
      { wch: 28 }, // KKU-MAIL
      { wch: 35 }, // ลิงก์ติดต่อ
      { wch: 25 }  // ลิงก์รูปหน้า
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อผู้เกี่ยวข้องในโครงการ');
    XLSX.writeFile(wb, 'COMSAN_Template_รายชื่อผู้เกี่ยวข้องในโครงการ.xlsx');

    if (typeof showToast === 'function') {
      showToast('ดาวน์โหลดไฟล์ตัวอย่าง Excel เรียบร้อยแล้ว', 'success');
    }
  }

  // Export current project members to Excel
  function exportCurrentProjectMembersToExcel() {
    if (typeof XLSX === 'undefined') {
      if (typeof showToast === 'function') showToast('กำลังโหลดไลบรารี Excel กรุณาลองใหม่อีกครั้ง', 'warning');
      return;
    }

    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (!p) {
      if (typeof showToast === 'function') showToast('ไม่พบข้อมูลโครงการ', 'warning');
      return;
    }

    const members = Array.isArray(p.members) ? p.members : [];
    if (members.length === 0) {
      if (typeof showToast === 'function') showToast('ยังไม่มีรายชื่อผู้เกี่ยวข้องในโครงการนี้สำหรับส่งออก', 'info');
      return;
    }

    const rows = [
      ['ลำดับ', 'ฝ่ายงาน', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'หน้าที่ / บทบาท', 'รายละเอียดหน้าที่', 'เบอร์ติดต่อ', 'KKU-MAIL', 'ลิงก์ช่องทางติดต่อ']
    ];

    members.forEach((m, idx) => {
      rows.push([
        idx + 1,
        m.department || 'ฝ่ายดำเนินงานทั่วไป',
        m.name || '',
        m.nickname || '',
        m.role || 'ทีมงาน',
        m.details || '',
        m.phone || '',
        m.kkuMail || '',
        m.contactLink || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 26 }, // ฝ่ายงาน
      { wch: 30 }, // ชื่อ-นามสกุล
      { wch: 12 }, // ชื่อเล่น
      { wch: 26 }, // หน้าที่
      { wch: 45 }, // รายละเอียดหน้าที่
      { wch: 16 }, // เบอร์ติดต่อ
      { wch: 28 }, // KKU-MAIL
      { wch: 35 }  // ลิงก์ช่องทางติดต่อ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อผู้เกี่ยวข้อง');
    const safeTitle = (p.code || p.title || 'Project').replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
    XLSX.writeFile(wb, `รายชื่อผู้เกี่ยวข้อง_${safeTitle}.xlsx`);

    if (typeof showToast === 'function') {
      showToast(`ส่งออกรายชื่อ ${members.length} คน เป็นไฟล์ Excel สำเร็จ`, 'success');
    }
  }

  // Delete a single member from active project in table view
  async function confirmDeleteProjectMember(memberIdOrName) {
    if (window.currentRole !== 'ADMIN') return;

    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (!p || !Array.isArray(p.members)) return;

    const member = p.members.find(m => m.id === memberIdOrName || m.name === memberIdOrName);
    const memberName = member ? member.name : 'สมาชิกรายนี้';

    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'ยืนยันการลบสมาชิกออกจากโครงการ',
          message: `คุณต้องการลบ "${memberName}" ออกจากรายชื่อผู้เกี่ยวข้องในโครงการนี้หรือไม่?`,
          confirmText: 'ลบสมาชิก',
          cancelText: 'ยกเลิก',
          isDanger: true,
          icon: 'trash-2'
        })
      : false;

    if (!confirmed) return;

    p.members = p.members.filter(m => m.id !== memberIdOrName && m.name !== memberIdOrName);

    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('admin:updateProject', p);
    }
    if (typeof saveLocalState === 'function') saveLocalState();

    try {
      const sb = (window.socket && window.socket.engine && typeof window.socket.engine.scheduleSaveToSupabase === 'function')
        ? window.socket.engine
        : ((window.socket && typeof window.socket.scheduleSaveToSupabase === 'function') ? window.socket : null);
      if (sb) {
        sb.lastKnownProjects = window.appState.projects;
        sb.scheduleSaveToSupabase(window.appState, true);
      }
    } catch (e) {}

    renderProjectMembersTableView(p);
    if (typeof showToast === 'function') {
      showToast(`ลบ "${memberName}" ออกจากโครงการแล้ว`, 'info');
    }
  }

  // Helper to render personnel cards for Leaders, Advisors, SMO
  function renderPersonCardsList(containerId, list, emptyLabel) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!Array.isArray(list) || list.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-4 rounded-2xl bg-muted/30 border border-border/40 text-center text-xs text-muted-foreground">
          ยังไม่มีการระบุข้อมูล${emptyLabel}
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((person, pIdx) => {
      const name = person.name || 'ไม่ระบุชื่อ';
      const nickname = person.nickname ? `(${person.nickname})` : '';
      const role = person.role || 'หน้าที่ไม่ระบุ';
      const department = person.department ? `<p class="text-[11px] text-muted-foreground truncate">${escapeHtml(person.department)}</p>` : '';
      const details = person.details ? `<p class="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40 leading-relaxed mt-2">${escapeHtml(person.details)}</p>` : '';
      const seed = person.nickname || person.name || person.id || `person_${pIdx}`;
      const fallbackUrl = getCuteAvatarUrl(seed);
      const avatarUrl = person.avatar || fallbackUrl;

      return `
        <div class="bg-card border border-border/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-primary/30 transition">
          <div class="space-y-2">
            <div class="flex items-start gap-3">
              <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}"
                class="w-12 h-12 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0 shadow-sm"
                onerror="this.onerror=null; this.src='${fallbackUrl}';" />

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h5 class="text-xs sm:text-sm font-bold text-foreground truncate" title="${escapeHtml(name)} ${escapeHtml(nickname)}">
                    ${escapeHtml(name)} ${escapeHtml(nickname)}
                  </h5>
                </div>
                <span class="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  ${escapeHtml(role)}
                </span>
                ${department}
              </div>
            </div>

            ${details}
          </div>

          <!-- Contact Badges / Links -->
          <div class="pt-2 border-t border-border/60 flex items-center gap-1.5 flex-wrap">
            ${person.phone ? `
              <a href="tel:${escapeHtml(person.phone)}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition" title="โทร: ${escapeHtml(person.phone)}">
                <i data-lucide="phone" class="h-3 w-3 text-emerald-500"></i>
                <span class="truncate max-w-[100px]">${escapeHtml(person.phone)}</span>
              </a>
            ` : ''}

            ${person.kkuMail ? `
              <a href="mailto:${escapeHtml(person.kkuMail)}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition" title="KKU-Mail: ${escapeHtml(person.kkuMail)}">
                <i data-lucide="mail" class="h-3 w-3 text-primary"></i>
                <span class="truncate max-w-[120px]">${escapeHtml(person.kkuMail)}</span>
              </a>
            ` : ''}

            ${person.contactLink ? `
              <a href="${escapeHtml(person.contactLink)}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary transition ml-auto" title="เปิดช่องทางติดต่อ">
                <i data-lucide="external-link" class="h-3 w-3"></i>
                <span>ติดต่อ</span>
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // ========================================================
  // 4. ADMIN PROJECT EDITOR MODAL (ACCORDION & COMPACT ROWS)
  // ========================================================
  function openAdminProjectEditModal(projectId = null) {
    if (window.currentRole !== 'ADMIN') {
      if (typeof showToast === 'function') showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการโครงการได้', 'warning');
      return;
    }

    const modal = document.getElementById('adminProjectEditModal');
    if (!modal) return;

    const allProjects = getProjectsList();
    const isEdit = Boolean(projectId);
    const p = isEdit ? allProjects.find(item => item.id === projectId) : null;

    // Reset saving lock
    isSavingProject = false;

    // Reset repeater collapse/expand and search state
    expandedLeadersIndices = new Set();
    expandedMembersIndices = new Set();
    expandedAdvisorsIndices = new Set();
    expandedSmoIndices = new Set();
    formMembersSearch = '';
    formMembersDeptFilter = 'ALL';

    const searchInput = document.getElementById('prjFormMembersSearch');
    if (searchInput) searchInput.value = '';
    const searchClear = document.getElementById('prjFormMembersSearchClear');
    if (searchClear) searchClear.classList.add('hidden');

    // Set modal title
    const modalTitle = document.getElementById('adminPrjModalTitle');
    if (modalTitle) modalTitle.textContent = (isEdit && p) ? 'แก้ไขข้อมูลโครงการ' : 'สร้างโครงการใหม่';

    // Populate basic fields safely
    document.getElementById('prjFormId').value = (isEdit && p) ? p.id : '';
    document.getElementById('prjFormTitle').value = (isEdit && p) ? (p.title || '') : '';
    document.getElementById('prjFormCode').value = (isEdit && p) ? (p.code || '') : '';
    document.getElementById('prjFormAcademicYear').value = (isEdit && p) ? (p.academicYear || '') : '2569';
    document.getElementById('prjFormStatus').value = (isEdit && p) ? (p.status || 'IN_PROGRESS') : 'IN_PROGRESS';
    document.getElementById('prjFormStartDate').value = (isEdit && p) ? (p.startDate || '') : (new Date().toISOString().slice(0, 10));
    document.getElementById('prjFormEndDate').value = (isEdit && p) ? (p.endDate || '') : (new Date().toISOString().slice(0, 10));
    document.getElementById('prjFormLocation').value = (isEdit && p) ? (p.location || '') : '';
    document.getElementById('prjFormBudget').value = (isEdit && p) ? (p.budget || '') : '';
    document.getElementById('prjFormSummary').value = (isEdit && p) ? (p.summary || '') : '';
    document.getElementById('prjFormDescription').value = (isEdit && p) ? (p.description || '') : '';
    document.getElementById('prjFormGoogleDriveUrl').value = (isEdit && p) ? (p.googleDriveUrl || '') : '';

    // Document & Budget Document
    document.getElementById('prjFormDocTitle').value = isEdit && p && p.projectDocument ? (p.projectDocument.title || '') : '';
    document.getElementById('prjFormDocUrl').value = isEdit && p && p.projectDocument ? (p.projectDocument.url || '') : '';
    document.getElementById('prjFormBudgetDocTitle').value = isEdit && p && p.budgetDocument ? (p.budgetDocument.title || '') : '';
    document.getElementById('prjFormBudgetDocAmount').value = isEdit && p && p.budgetDocument ? (p.budgetDocument.totalBudget || '') : '';
    document.getElementById('prjFormBudgetDocUrl').value = isEdit && p && p.budgetDocument ? (p.budgetDocument.url || '') : '';

    // Clone stakeholder arrays safely
    prjFormLeaders = isEdit && p && Array.isArray(p.leaders) ? JSON.parse(JSON.stringify(p.leaders)) : [];
    prjFormMembers = isEdit && p && Array.isArray(p.members) ? JSON.parse(JSON.stringify(p.members)) : [];
    prjFormAdvisors = isEdit && p && Array.isArray(p.advisors) ? JSON.parse(JSON.stringify(p.advisors)) : [];
    prjFormSmoOfficers = isEdit && p && Array.isArray(p.smoOfficers) ? JSON.parse(JSON.stringify(p.smoOfficers)) : [];

    // By default, for leaders, advisors, smo (small arrays), keep them expanded
    prjFormLeaders.forEach((_, idx) => expandedLeadersIndices.add(idx));
    prjFormAdvisors.forEach((_, idx) => expandedAdvisorsIndices.add(idx));
    prjFormSmoOfficers.forEach((_, idx) => expandedSmoIndices.add(idx));
    // For members: KEEP ALL COLLAPSED by default so 50+ members appear as a tidy list!
    expandedMembersIndices.clear();

    // Google Drive Photo Folder & Catalog
    currentPhotoFolderUrl = (isEdit && p && p.photoFolderUrl) ? p.photoFolderUrl : '';
    drivePhotoCatalog = (isEdit && p && Array.isArray(p.photoCatalog)) ? JSON.parse(JSON.stringify(p.photoCatalog)) : [];
    const photoFolderInput = document.getElementById('prjFormPhotoFolderUrl');
    if (photoFolderInput) photoFolderInput.value = currentPhotoFolderUrl;
    updateDrivePhotoFolderStatusUi();

    // Render repeaters
    renderRepeater('LEADERS');
    renderRepeater('MEMBERS');
    renderRepeater('ADVISORS');
    renderRepeater('SMO');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function closeAdminProjectEditModal() {
    const modal = document.getElementById('adminProjectEditModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // Toggle single item in repeater
  function toggleRepeaterItem(type, index) {
    let set;
    if (type === 'LEADERS') set = expandedLeadersIndices;
    else if (type === 'MEMBERS') set = expandedMembersIndices;
    else if (type === 'ADVISORS') set = expandedAdvisorsIndices;
    else if (type === 'SMO') set = expandedSmoIndices;

    if (!set) return;

    if (set.has(index)) {
      set.delete(index);
    } else {
      set.add(index);
    }

    renderRepeater(type);
  }

  // Toggle expand / collapse all for Members repeater
  function toggleExpandAllMembersRepeater() {
    if (expandedMembersIndices.size === prjFormMembers.length) {
      expandedMembersIndices.clear();
    } else {
      prjFormMembers.forEach((_, idx) => expandedMembersIndices.add(idx));
    }
    renderRepeater('MEMBERS');
  }

  // Filter members inside the admin edit form
  function filterFormMembersRepeater(val) {
    formMembersSearch = val || '';
    const searchClear = document.getElementById('prjFormMembersSearchClear');
    if (searchClear) searchClear.classList.toggle('hidden', !formMembersSearch);
    renderRepeater('MEMBERS');
  }

  function clearFormMembersSearch() {
    formMembersSearch = '';
    const searchInput = document.getElementById('prjFormMembersSearch');
    if (searchInput) searchInput.value = '';
    const searchClear = document.getElementById('prjFormMembersSearchClear');
    if (searchClear) searchClear.classList.add('hidden');
    renderRepeater('MEMBERS');
  }

  function filterFormMembersByDept(dept) {
    formMembersDeptFilter = dept || 'ALL';
    renderRepeater('MEMBERS');
  }

  // Repeater helper with collapsible cards & smooth scrolling
  function renderRepeater(type) {
    let list;
    let containerId;
    let typeLabel;
    let expandedSet;

    if (type === 'LEADERS') {
      list = prjFormLeaders;
      containerId = 'prjFormLeadersContainer';
      typeLabel = 'ผู้รับผิดชอบโครงการ';
      expandedSet = expandedLeadersIndices;
    } else if (type === 'MEMBERS') {
      list = prjFormMembers;
      containerId = 'prjFormMembersContainer';
      typeLabel = 'ผู้เกี่ยวข้องกับโครงการ';
      expandedSet = expandedMembersIndices;
    } else if (type === 'ADVISORS') {
      list = prjFormAdvisors;
      containerId = 'prjFormAdvisorsContainer';
      typeLabel = 'อาจารย์ที่ปรึกษา';
      expandedSet = expandedAdvisorsIndices;
    } else if (type === 'SMO') {
      list = prjFormSmoOfficers;
      containerId = 'prjFormSmoContainer';
      typeLabel = 'ตัวแทนสโมสรนักศึกษา';
      expandedSet = expandedSmoIndices;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    // Special Header & Dropdown sync for MEMBERS
    if (type === 'MEMBERS') {
      const countBadge = document.getElementById('prjFormMembersCountBadge');
      if (countBadge) countBadge.textContent = `${list.length} คน`;

      // Update Expand/Collapse All button label
      const toggleExpandLabel = document.getElementById('prjFormToggleExpandLabel');
      if (toggleExpandLabel) {
        toggleExpandLabel.textContent = (expandedSet.size === list.length && list.length > 0) ? 'ย่อทั้งหมด' : 'ขยายทั้งหมด';
      }

      // Populate Department Filter Select
      const deptSelect = document.getElementById('prjFormDeptFilterSelect');
      if (deptSelect) {
        const uniqueDepts = Array.from(new Set(list.map(m => (m.department || '').trim()).filter(Boolean)));
        const currentVal = formMembersDeptFilter;
        deptSelect.innerHTML = `
          <option value="ALL" ${currentVal === 'ALL' ? 'selected' : ''}>ทุกฝ่ายงาน (${list.length})</option>
          ${uniqueDepts.map(d => {
            const count = list.filter(m => (m.department || '').trim() === d).length;
            return `<option value="${escapeHtml(d)}" ${currentVal === d ? 'selected' : ''}>${escapeHtml(d)} (${count})</option>`;
          }).join('')}
        `;
      }
    }

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-muted/20 border border-border/40 text-center text-xs text-muted-foreground space-y-1">
          <p class="font-medium">ยังไม่มีรายการ${typeLabel}</p>
          <p class="text-[11px]">กดปุ่มด้านบนเพื่อเพิ่ม หรือนำเข้าจากไฟล์ Excel (.xlsx)</p>
        </div>
      `;
      return;
    }

    // Filter list if MEMBERS
    const q = (type === 'MEMBERS' ? formMembersSearch : '').trim().toLowerCase();
    const deptFilter = type === 'MEMBERS' ? formMembersDeptFilter : 'ALL';

    const itemsHtml = list.map((item, idx) => {
      // Check filters for MEMBERS
      if (type === 'MEMBERS') {
        const itemDept = (item.department || '').trim();
        if (deptFilter !== 'ALL' && itemDept !== deptFilter) return '';
        if (q) {
          const matchName = (item.name || '').toLowerCase().includes(q);
          const matchNick = (item.nickname || '').toLowerCase().includes(q);
          const matchDept = itemDept.toLowerCase().includes(q);
          const matchRole = (item.role || '').toLowerCase().includes(q);
          const matchPhone = (item.phone || '').toLowerCase().includes(q);
          const matchMail = (item.kkuMail || '').toLowerCase().includes(q);
          if (!matchName && !matchNick && !matchDept && !matchRole && !matchPhone && !matchMail) return '';
        }
      }

      const isExpanded = expandedSet.has(idx);
      const deptBadge = getDepartmentBadgeClass(item.department);
      const seed = item.nickname || item.name || item.id || `${type}_${idx}`;
      const itemFallbackUrl = getCuteAvatarUrl(seed);
      const itemAvatarUrl = item.avatar || itemFallbackUrl;

      // Collapsed summary row
      if (!isExpanded) {
        return `
          <div id="formMemberItem_${type}_${idx}" class="bg-card border border-border/80 hover:border-indigo-500/40 rounded-2xl p-2.5 sm:p-3 transition-all duration-150 shadow-2xs group">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none" onclick="toggleRepeaterItem('${type}', ${idx})">
                <span class="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
                  ${idx + 1}
                </span>

                <img src="${escapeHtml(itemAvatarUrl)}" alt="avatar"
                  class="w-7 h-7 rounded-full object-cover ring-1 ring-border shrink-0 shadow-2xs"
                  onerror="this.onerror=null; this.src='${itemFallbackUrl}';" />

                ${type === 'MEMBERS' && item.department ? `
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${deptBadge} shrink-0 max-w-[130px] truncate" title="${escapeHtml(item.department)}">
                    ${escapeHtml(item.department)}
                  </span>
                ` : ''}

                <div class="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    ${escapeHtml(item.name || `คลิกเพื่อกรอกชื่อ-สกุล`)} ${item.nickname ? `<span class="text-muted-foreground font-normal">(${escapeHtml(item.nickname)})</span>` : ''}
                  </span>
                  ${item.role ? `
                    <span class="text-[11px] text-muted-foreground font-normal truncate max-w-[130px]">· ${escapeHtml(item.role)}</span>
                  ` : ''}
                  ${item.phone ? `
                    <span class="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <i data-lucide="phone" class="h-2.5 w-2.5 text-emerald-500"></i> ${escapeHtml(item.phone)}
                    </span>
                  ` : ''}
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="toggleRepeaterItem('${type}', ${idx})"
                  class="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition flex items-center gap-1 cursor-pointer"
                  title="แก้ไขข้อมูล">
                  <i data-lucide="chevron-down" class="h-3.5 w-3.5"></i>
                  <span class="hidden sm:inline">แก้ไข</span>
                </button>
                <button type="button" onclick="removeRepeaterItem('${type}', ${idx})"
                  class="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition cursor-pointer"
                  title="ลบ">
                  <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }

      // Expanded Card with all inputs
      return `
        <div id="formMemberItem_${type}_${idx}" class="bg-card border-2 border-indigo-500/40 rounded-2xl p-3.5 sm:p-4 space-y-3 transition-all duration-200 shadow-sm relative">
          <!-- Expanded Card Header -->
          <div class="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div class="flex items-center gap-2 cursor-pointer select-none min-w-0" onclick="toggleRepeaterItem('${type}', ${idx})">
              <span class="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                ${idx + 1}
              </span>
              <img src="${escapeHtml(itemAvatarUrl)}" alt="avatar"
                class="w-6 h-6 rounded-full object-cover ring-1 ring-border shrink-0 shadow-2xs"
                onerror="this.onerror=null; this.src='${itemFallbackUrl}';" />
              <span class="text-xs font-bold text-foreground truncate">
                ${escapeHtml(item.name || `${typeLabel} #${idx + 1}`)} ${item.nickname ? `(${escapeHtml(item.nickname)})` : ''}
              </span>
              ${type === 'MEMBERS' && item.department ? `
                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold border ${deptBadge}">
                  ${escapeHtml(item.department)}
                </span>
              ` : ''}
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" onclick="toggleRepeaterItem('${type}', ${idx})"
                class="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition flex items-center gap-1 cursor-pointer"
                title="ย่อเก็บ">
                <i data-lucide="chevron-up" class="h-3.5 w-3.5"></i>
                <span>ย่อเก็บ</span>
              </button>
              <button type="button" onclick="removeRepeaterItem('${type}', ${idx})"
                class="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition cursor-pointer"
                title="ลบ">
                <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            ${type === 'MEMBERS' ? `
              <div class="sm:col-span-2">
                <label class="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                  <i data-lucide="tag" class="h-3 w-3"></i> ฝ่ายงานที่สังกัด (Department / Division) *
                </label>
                <input type="text" value="${escapeHtml(item.department || '')}"
                  oninput="updateRepeaterField('${type}', ${idx}, 'department', this.value)"
                  placeholder="เช่น ฝ่ายกิจกรรมและสันทนาการ, ฝ่ายสถานที่และสวัสดิการ, ฝ่ายพยาบาล ฯลฯ"
                  class="w-full px-3 py-1.5 rounded-lg bg-card border border-indigo-500/30 focus:border-indigo-500 text-xs font-semibold" />
              </div>
            ` : ''}

            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">ชื่อ - สกุล *</label>
              <input type="text" value="${escapeHtml(item.name || '')}"
                oninput="updateRepeaterField('${type}', ${idx}, 'name', this.value)"
                placeholder="เช่น นายอิทธิพัทธ์ พืชผักหวาน"
                class="w-full px-3 py-1.5 rounded-lg bg-card border border-border focus:border-primary text-xs" />
            </div>

            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">ชื่อเล่น</label>
              <input type="text" value="${escapeHtml(item.nickname || '')}"
                oninput="updateRepeaterField('${type}', ${idx}, 'nickname', this.value)"
                placeholder="เช่น บอม"
                class="w-full px-3 py-1.5 rounded-lg bg-card border border-border focus:border-primary text-xs" />
            </div>

            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">หน้าที่ / ตำแหน่งในโครงการ</label>
              <input type="text" value="${escapeHtml(item.role || '')}"
                oninput="updateRepeaterField('${type}', ${idx}, 'role', this.value)"
                placeholder="เช่น หัวหน้าฝ่ายกิจกรรม / สตาฟฟ์นันทนาการ / MC"
                class="w-full px-3 py-1.5 rounded-lg bg-card border border-border focus:border-primary text-xs" />
            </div>

            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">เบอร์ติดต่อ</label>
              <input type="text" value="${escapeHtml(item.phone || '')}"
                oninput="updateRepeaterField('${type}', ${idx}, 'phone', this.value)"
                placeholder="เช่น 081-234-5678"
                class="w-full px-3 py-1.5 rounded-lg bg-card border border-border focus:border-primary text-xs" />
            </div>

            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">KKU-MAIL</label>
              <input type="text" value="${escapeHtml(item.kkuMail || '')}"
                oninput="updateRepeaterField('${type}', ${idx}, 'kkuMail', this.value)"
                placeholder="เช่น user.p@kkumail.com"
                class="w-full px-3 py-1.5 rounded-lg bg-card border border-border focus:border-primary text-xs" />
            </div>

            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">ลิงก์ช่องทางการติดต่อ (IG/FB/Line)</label>
              <input type="url" value="${escapeHtml(item.contactLink || '')}"
                oninput="updateRepeaterField('${type}', ${idx}, 'contactLink', this.value)"
                placeholder="https://..."
                class="w-full px-3 py-1.5 rounded-lg bg-card border border-border focus:border-primary text-xs" />
            </div>

            <!-- Avatar / Photo Section (Direct Upload, Google Drive ID/Link, Crop, Cute Fallback) -->
            <div class="sm:col-span-2 p-3 sm:p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <label class="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <i data-lucide="image" class="h-3.5 w-3.5 text-indigo-500"></i>
                  <span>รูปโปรไฟล์ประจำตัว (Profile Photo)</span>
                </label>
                ${item.avatar ? `
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.avatar.startsWith('data:image') ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : (item.avatar.includes('googleusercontent') || item.avatar.includes('drive.google')) ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'}">
                    ${item.avatar.startsWith('data:image') ? '✓ รูปอัปโหลด / ครอบตัดแล้ว' : (item.avatar.includes('googleusercontent') || item.avatar.includes('drive.google')) ? `✓ รูปจาก Google Drive${item.driveFileName ? ` (${escapeHtml(item.driveFileName)})` : ''}` : '✓ ลิงก์รูปกำหนดเอง'}
                  </span>
                ` : `
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <i data-lucide="user" class="h-3 w-3"></i> รูปโปรไฟล์เริ่มต้น (DiceBear)
                  </span>
                `}
              </div>

              <div class="flex flex-col sm:flex-row items-center sm:items-start gap-3.5">
                <!-- Avatar Preview with quick Crop overlay -->
                <div class="relative group shrink-0">
                  <img src="${escapeHtml(itemAvatarUrl)}" alt="avatar preview"
                    id="avatar_preview_${type}_${idx}"
                    class="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-indigo-500/30 shadow-sm bg-background transition-transform group-hover:scale-105"
                    onerror="this.onerror=null; this.src='${itemFallbackUrl}';" />
                  
                  <button type="button" onclick="triggerCropForRepeater('${type}', ${idx})"
                    title="คลิกเพื่อครอบตัดรูปนี้"
                    class="absolute inset-0 bg-black/55 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-semibold transition-opacity backdrop-blur-xs cursor-pointer">
                    <i data-lucide="crop" class="h-4 w-4 mb-0.5"></i>
                    <span>ครอบตัด</span>
                  </button>
                </div>

                <!-- Avatar Actions & Drive Controls -->
                <div class="flex-1 w-full space-y-2 min-w-0">
                  <!-- Action Buttons -->
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <!-- Hidden File Input for direct upload -->
                    <input type="file" id="avatar_file_${type}_${idx}" accept="image/*" class="hidden"
                      onchange="handlePersonAvatarFileUpload('${type}', ${idx}, this.files[0])" />
                    
                    <button type="button" onclick="document.getElementById('avatar_file_${type}_${idx}').click()"
                      class="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer">
                      <i data-lucide="upload-cloud" class="h-3.5 w-3.5"></i>
                      <span>อัปโหลดรูปตรงๆ</span>
                    </button>

                    <button type="button" onclick="triggerCropForRepeater('${type}', ${idx})"
                      class="px-2.5 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-[11px] font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      title="ครอบตัดรูป ปรับตำแหน่ง ซูม และหมุนภาพ">
                      <i data-lucide="crop" class="h-3.5 w-3.5 text-indigo-500"></i>
                      <span>ครอบตัดรูป (Crop)</span>
                    </button>

                    ${Array.isArray(drivePhotoCatalog) && drivePhotoCatalog.length > 0 ? `
                      <button type="button" onclick="openDriveCatalogPickerForPerson('${type}', ${idx})"
                        class="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="เปิดดูและเลือกรูปจากคลังภาพ Google Drive ที่สแกนแล้ว">
                        <i data-lucide="images" class="h-3.5 w-3.5"></i>
                        <span>เลือกจากคลัง Drive</span>
                      </button>
                    ` : ''}

                    ${item.avatar ? `
                      <button type="button" onclick="resetRepeaterAvatarToCute('${type}', ${idx})"
                        class="px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 text-[11px] font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="ลบรูปกำหนดเอง และคืนค่าเป็นรูปการ์ตูนน่ารัก">
                        <i data-lucide="user" class="h-3.5 w-3.5"></i><span>ใช้รูปเริ่มต้น</span>
                      </button>
                    ` : ''}
                  </div>

                  <!-- Google Drive Photo Input (by filename in folder or direct ID/link) -->
                  <div class="space-y-1">
                    <div class="relative flex items-center">
                      <div class="absolute left-2.5 flex items-center pointer-events-none text-blue-500">
                        <i data-lucide="hard-drive" class="h-3.5 w-3.5"></i>
                      </div>
                      <input type="text"
                        id="avatar_drive_filename_${type}_${idx}"
                        value="${escapeHtml(item.driveFileName || (item.avatar && !item.avatar.startsWith('data:image') && !item.avatar.includes('dicebear') ? item.avatar : ''))}"
                        oninput="handlePersonDriveFileNameInput('${type}', ${idx}, this.value)"
                        onkeydown="if(event.key==='Enter'){event.preventDefault(); matchPersonPhotoByFileName('${type}', ${idx});}"
                        placeholder="พิมพ์ชื่อรูปใน Drive เช่น ${escapeHtml(item.nickname || 'บอม')}.jpg หรือรหัสรูป..."
                        class="w-full pl-8 pr-20 py-1.5 rounded-lg bg-card border border-border focus:border-primary text-xs" />
                      <button type="button" onclick="matchPersonPhotoByFileName('${type}', ${idx})"
                        class="absolute right-1 px-2.5 py-0.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition cursor-pointer shadow-2xs">
                        ดึงรูป
                      </button>
                    </div>

                    ${(() => {
                      if (!item.avatar && Array.isArray(drivePhotoCatalog) && drivePhotoCatalog.length > 0) {
                        const suggest = findPhotoInCatalog(item.nickname || item.name);
                        if (suggest) {
                          return `
                            <div class="flex items-center gap-1.5 pt-0.5">
                              <span class="text-[10px] text-muted-foreground">พบรูปตรงกับชื่อ:</span>
                              <button type="button" onclick="selectPhotoFromCatalogForPerson('${type}', ${idx}, '${suggest.id}', '${escapeHtml(suggest.name)}')"
                                class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 transition cursor-pointer">
                                <i data-lucide="image" class="h-3 w-3"></i><span>ใช้รูป "${escapeHtml(suggest.name)}"</span>
                              </button>
                            </div>
                          `;
                        }
                      }
                      return '';
                    })()}

                    <p class="text-[10px] text-muted-foreground flex items-center gap-1">
                      <i data-lucide="info" class="h-3 w-3 shrink-0 text-blue-500"></i>
                      <span>พิมพ์ชื่อรูปในไดรฟ์ (เช่น บอม.jpg หรือชื่อเล่น) หรือใส่รหัสรูปในไดรฟ์ แล้วกด <b>"ดึงรูป"</b></span>
                    </p>
                  </div>

                  <!-- Advanced / Direct URL toggle -->
                  <details class="text-[11px] text-muted-foreground">
                    <summary class="cursor-pointer hover:text-foreground font-medium select-none">
                      หรือระบุลิงก์รูปตรง (Custom URL)
                    </summary>
                    <div class="pt-1.5">
                      <input type="url" value="${escapeHtml(item.avatar || '')}"
                        id="avatar_url_input_${type}_${idx}"
                        oninput="updateRepeaterField('${type}', ${idx}, 'avatar', this.value)"
                        placeholder="https://example.com/photo.jpg"
                        class="w-full px-3 py-1 rounded-lg bg-card border border-border focus:border-primary text-xs" />
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">รายละเอียดหน้าที่ความรับผิดชอบ (ถ้ามี)</label>
              <textarea rows="2"
                oninput="updateRepeaterField('${type}', ${idx}, 'details', this.value)"
                placeholder="ระบุรายละเอียดความรับผิดชอบในโครงการ..."
                class="w-full px-3 py-1.5 rounded-lg bg-card border border-border focus:border-primary text-xs resize-none">${escapeHtml(item.details || '')}</textarea>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (!itemsHtml.trim()) {
      container.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-muted/20 border border-border/40 text-center text-xs text-muted-foreground space-y-1">
          <p class="font-medium">ไม่พบสมาชิกที่ตรงกับคำค้นหาหรือฝ่ายที่เลือก</p>
          <button type="button" onclick="clearFormMembersSearch()" class="text-xs text-primary font-semibold hover:underline">
            ล้างคำค้นหา
          </button>
        </div>
      `;
    } else {
      container.innerHTML = itemsHtml;
    }

    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function addRepeaterItem(type) {
    const newItem = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      department: type === 'MEMBERS' ? (formMembersDeptFilter !== 'ALL' ? formMembersDeptFilter : 'ฝ่ายกิจกรรมและสันทนาการ') : '',
      name: '',
      nickname: '',
      role: '',
      details: '',
      phone: '',
      kkuMail: '',
      contactLink: '',
      avatar: ''
    };

    let newIdx = 0;
    if (type === 'LEADERS') {
      prjFormLeaders.push(newItem);
      newIdx = prjFormLeaders.length - 1;
      expandedLeadersIndices.add(newIdx);
    } else if (type === 'MEMBERS') {
      prjFormMembers.push(newItem);
      newIdx = prjFormMembers.length - 1;
      expandedMembersIndices.add(newIdx); // Auto-expand new item!
    } else if (type === 'ADVISORS') {
      prjFormAdvisors.push(newItem);
      newIdx = prjFormAdvisors.length - 1;
      expandedAdvisorsIndices.add(newIdx);
    } else if (type === 'SMO') {
      prjFormSmoOfficers.push(newItem);
      newIdx = prjFormSmoOfficers.length - 1;
      expandedSmoIndices.add(newIdx);
    }

    renderRepeater(type);

    // Smooth scroll to the newly added item
    setTimeout(() => {
      const el = document.getElementById(`formMemberItem_${type}_${newIdx}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }

  function removeRepeaterItem(type, index) {
    let set;
    if (type === 'LEADERS') {
      prjFormLeaders.splice(index, 1);
      set = expandedLeadersIndices;
    } else if (type === 'MEMBERS') {
      prjFormMembers.splice(index, 1);
      set = expandedMembersIndices;
    } else if (type === 'ADVISORS') {
      prjFormAdvisors.splice(index, 1);
      set = expandedAdvisorsIndices;
    } else if (type === 'SMO') {
      prjFormSmoOfficers.splice(index, 1);
      set = expandedSmoIndices;
    }

    if (set) {
      set.delete(index);
    }

    renderRepeater(type);
  }

  function updateRepeaterField(type, index, field, value) {
    let list;
    if (type === 'LEADERS') list = prjFormLeaders;
    else if (type === 'MEMBERS') list = prjFormMembers;
    else if (type === 'ADVISORS') list = prjFormAdvisors;
    else if (type === 'SMO') list = prjFormSmoOfficers;

    if (list && list[index]) {
      list[index][field] = value;
    }
  }

  // Save Project Form
  function saveProjectFromAdminForm(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (isSavingProject) return;
    isSavingProject = true;

    const id = document.getElementById('prjFormId').value.trim();
    const title = document.getElementById('prjFormTitle').value.trim();
    if (!title) {
      isSavingProject = false;
      if (typeof showToast === 'function') showToast('กรุณากรอกชื่อโครงการ', 'error');
      document.getElementById('prjFormTitle').focus();
      return;
    }

    const code = document.getElementById('prjFormCode').value.trim();
    const academicYear = document.getElementById('prjFormAcademicYear').value.trim();
    const status = document.getElementById('prjFormStatus').value;
    const startDate = document.getElementById('prjFormStartDate').value;
    const endDate = document.getElementById('prjFormEndDate').value || startDate;
    const location = document.getElementById('prjFormLocation').value.trim();
    const budget = document.getElementById('prjFormBudget').value.trim();
    const summary = document.getElementById('prjFormSummary').value.trim();
    const description = document.getElementById('prjFormDescription').value.trim();
    const googleDriveUrl = document.getElementById('prjFormGoogleDriveUrl').value.trim();

    // Documents
    const docTitle = document.getElementById('prjFormDocTitle').value.trim();
    const docUrl = document.getElementById('prjFormDocUrl').value.trim();
    const budgetDocTitle = document.getElementById('prjFormBudgetDocTitle').value.trim();
    const budgetDocAmount = document.getElementById('prjFormBudgetDocAmount').value.trim();
    const budgetDocUrl = document.getElementById('prjFormBudgetDocUrl').value.trim();

    const todayISO = new Date().toISOString().slice(0, 10);
    const nowISO = new Date().toISOString();

    const photoFolderUrl = currentPhotoFolderUrl || (document.getElementById('prjFormPhotoFolderUrl') ? document.getElementById('prjFormPhotoFolderUrl').value.trim() : '');

    const projectPayload = {
      id: id || undefined,
      title,
      code,
      academicYear,
      status,
      startDate,
      endDate,
      location,
      budget,
      summary,
      description,
      googleDriveUrl,
      photoFolderUrl,
      photoCatalog: Array.isArray(drivePhotoCatalog) ? drivePhotoCatalog : [],
      projectDocument: {
        title: docTitle || 'เล่มโครงการ.pdf',
        url: docUrl,
        updatedAt: todayISO
      },
      budgetDocument: {
        title: budgetDocTitle || 'เล่มงบประมาณ.pdf',
        url: budgetDocUrl,
        totalBudget: budgetDocAmount || budget,
        updatedAt: todayISO
      },
      leaders: prjFormLeaders.filter(l => l.name && l.name.trim()),
      members: prjFormMembers.filter(m => m.name && m.name.trim()),
      advisors: prjFormAdvisors.filter(a => a.name && a.name.trim()),
      smoOfficers: prjFormSmoOfficers.filter(s => s.name && s.name.trim())
    };

    if (id) {
      // Update
      projectPayload.id = id;
      projectPayload.updatedAt = nowISO;
      if (window.socket && typeof window.socket.emit === 'function') {
        window.socket.emit('admin:updateProject', projectPayload);
      }
      if (window.appState && Array.isArray(window.appState.projects)) {
        const idx = window.appState.projects.findIndex(p => p && p.id === id);
        if (idx !== -1) {
          window.appState.projects[idx] = {
            ...window.appState.projects[idx],
            ...projectPayload,
            updatedAt: nowISO
          };
        } else {
          window.appState.projects.unshift({
            ...projectPayload,
            createdAt: nowISO,
            updatedAt: nowISO
          });
        }
      }
      if (typeof showToast === 'function') showToast('บันทึกการแก้ไขโครงการสำเร็จ', 'success');
    } else {
      // Create
      const newId = `PRJ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      projectPayload.id = newId;
      projectPayload.createdAt = nowISO;
      projectPayload.updatedAt = nowISO;

      if (window.socket && typeof window.socket.emit === 'function') {
        window.socket.emit('admin:createProject', projectPayload);
      }

      if (window.appState && Array.isArray(window.appState.projects)) {
        const alreadyAdded = window.appState.projects.some(p => p && p.id === newId);
        if (!alreadyAdded) {
          window.appState.projects.unshift(projectPayload);
        }
      }
      if (typeof showToast === 'function') showToast('สร้างโครงการใหม่เรียบร้อยแล้ว', 'success');
    }

    // Always deduplicate window.appState.projects
    if (window.appState && Array.isArray(window.appState.projects)) {
      const uPrjs = [];
      const sIds = new Set();
      window.appState.projects.forEach(p => {
        if (p && p.id && !sIds.has(p.id)) {
          sIds.add(p.id);
          uPrjs.push(p);
        }
      });
      window.appState.projects = uPrjs;
      if (typeof saveLocalState === 'function') saveLocalState();

      // Guarantee immediate direct persistence to Supabase without delay
      try {
        const sb = (window.socket && window.socket.engine && typeof window.socket.engine.scheduleSaveToSupabase === 'function')
          ? window.socket.engine
          : ((window.socket && typeof window.socket.scheduleSaveToSupabase === 'function') ? window.socket : null);
        if (sb) {
          sb.lastKnownProjects = window.appState.projects;
          sb.scheduleSaveToSupabase(window.appState, true);
        }
      } catch (e) {}
    }

    closeAdminProjectEditModal();
    isSavingProject = false;

    // If detail modal is currently showing the updated project, refresh it immediately
    if (activeDetailProjectId && (activeDetailProjectId === id || activeDetailProjectId === projectPayload.id)) {
      openProjectDetailModal(activeDetailProjectId);
    }

    if (typeof window.renderAll === 'function') window.renderAll();
    else {
      renderUserProjectsSection();
      renderAdminProjectsSection();
    }
  }

  // Delete Project Confirmation
  async function confirmDeleteProject(projectId, title) {
    if (window.currentRole !== 'ADMIN') {
      if (typeof showToast === 'function') showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบโครงการได้', 'warning');
      return;
    }

    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'ยืนยันการลบโครงการ',
          message: `คุณต้องการลบโครงการ "${title}" ออกจากระบบอย่างถาวรหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
          confirmText: 'ลบโครงการ',
          cancelText: 'ยกเลิก',
          isDanger: true,
          icon: 'trash-2'
        })
      : false;

    if (!confirmed) return;

    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('admin:deleteProject', { projectId });
    }

    if (window.appState && Array.isArray(window.appState.projects)) {
      window.appState.projects = window.appState.projects.filter(p => p && p.id !== projectId);
      if (typeof saveLocalState === 'function') saveLocalState();

      // Guarantee immediate direct persistence to Supabase without delay
      try {
        const sb = (window.socket && window.socket.engine && typeof window.socket.engine.scheduleSaveToSupabase === 'function')
          ? window.socket.engine
          : ((window.socket && typeof window.socket.scheduleSaveToSupabase === 'function') ? window.socket : null);
        if (sb) {
          sb.lastKnownProjects = window.appState.projects;
          sb.scheduleSaveToSupabase(window.appState, true);
        }
      } catch (e) {}
    }

    // If detail modal is currently showing the deleted project, close it!
    if (activeDetailProjectId === projectId) {
      closeProjectDetailModal();
    }

    if (typeof showToast === 'function') showToast(`ลบโครงการ "${title}" เรียบร้อยแล้ว`, 'info');

    if (typeof window.renderAll === 'function') window.renderAll();
    else {
      renderUserProjectsSection();
      renderAdminProjectsSection();
    }
  }

  if (typeof window !== 'undefined') {
    window.focusDrivePhotoFolderInput = focusDrivePhotoFolderInput;
    window.onDrivePhotoFolderInputChanged = onDrivePhotoFolderInputChanged;
    window.clearDrivePhotoFolder = clearDrivePhotoFolder;
    window.scanDrivePhotoFolder = scanDrivePhotoFolder;
    window.handleLocalBatchPhotoSelect = handleLocalBatchPhotoSelect;
    window.autoMatchAllPhotosFromCatalog = autoMatchAllPhotosFromCatalog;
    window.handlePersonDriveFileNameInput = handlePersonDriveFileNameInput;
    window.matchPersonPhotoByFileName = matchPersonPhotoByFileName;
    window.selectPhotoFromCatalogForPerson = selectPhotoFromCatalogForPerson;
    window.openDriveCatalogPickerForPerson = openDriveCatalogPickerForPerson;
    window.openDriveScriptHelpModal = openDriveScriptHelpModal;
    window.closeDriveScriptHelpModal = closeDriveScriptHelpModal;
    window.saveDriveBridgeUrlFromModal = saveDriveBridgeUrlFromModal;
    window.copyGasScriptToClipboard = copyGasScriptToClipboard;
    window.openDriveCatalogListModal = openDriveCatalogListModal;
    window.closeDriveCatalogListModal = closeDriveCatalogListModal;
    window.filterDriveCatalogGrid = filterDriveCatalogGrid;
  }

  return {
    renderUserProjectsSection,
    renderAdminProjectsSection,
    openProjectDetailModal,
    closeProjectDetailModal,
    openAdminProjectEditModal,
    closeAdminProjectEditModal,
    addRepeaterItem,
    removeRepeaterItem,
    updateRepeaterField,
    toggleRepeaterItem,
    toggleExpandAllMembersRepeater,
    filterFormMembersRepeater,
    clearFormMembersSearch,
    filterFormMembersByDept,
    saveProjectFromAdminForm,
    confirmDeleteProject,
    setUserProjectFilter,
    setUserProjectSearch,
    setUserProjectYear,
    resetUserProjectFilters,
    setAdminProjectFilter,
    setAdminProjectSearch,
    setAdminProjectYear,
    // Table, Divisions, and Excel (.xlsx) methods
    setProjectDetailDeptFilter,
    handleProjectMembersTableSearch,
    clearProjectMembersTableSearch,
    clearProjectMembersTableFilters,
    triggerImportProjectMembersXlsx,
    triggerImportProjectMembersXlsxForForm,
    handleProjectMembersExcelImport,
    handleFormMembersExcelImport,
    downloadProjectMembersTemplate,
    exportCurrentProjectMembersToExcel,
    confirmDeleteProjectMember,
    getActiveDetailProjectId: () => activeDetailProjectId,
    getProjectsList,
    // Avatar, Google Drive & Cropper methods
    getCuteAvatarUrl,
    extractDriveFileId,
    resolveGoogleDriveImageUrl,
    openImageCropperModal,
    closeImageCropperModal,
    saveCroppedImage,
    adjustCropperZoom,
    onCropperZoomSliderChange,
    rotateCropper,
    resetCropperTransform,
    handlePersonAvatarFileUpload,
    handlePersonDriveAvatarInput,
    applyDriveAvatarForRepeater,
    triggerCropForRepeater,
    resetRepeaterAvatarToCute,
    // Drive Photo Folder & Catalog methods
    focusDrivePhotoFolderInput,
    onDrivePhotoFolderInputChanged,
    clearDrivePhotoFolder,
    updateDrivePhotoFolderStatusUi,
    scanDrivePhotoFolder,
    handleLocalBatchPhotoSelect,
    autoMatchAllPhotosFromCatalog,
    handlePersonDriveFileNameInput,
    matchPersonPhotoByFileName,
    selectPhotoFromCatalogForPerson,
    openDriveCatalogPickerForPerson,
    openDriveScriptHelpModal,
    closeDriveScriptHelpModal,
    saveDriveBridgeUrlFromModal,
    copyGasScriptToClipboard,
    openDriveCatalogListModal,
    closeDriveCatalogListModal,
    filterDriveCatalogGrid,
    extractDriveFolderId,
    findPhotoInCatalog
  };
});
