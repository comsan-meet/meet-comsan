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
          <span class="text-emerald-600 dark:text-emerald-400 font-medium">เชื่อมต่อแล้ว พบรูปภาพ ${count} รูปในโฟลเดอร์ พร้อมใช้งานจับคู่ชื่อรูปในการ์ดแต่ละบุคคล</span>
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
    const stateObj = (typeof window !== 'undefined' && (window.appState || window.AppState)) || null;
    if (stateObj && Array.isArray(stateObj.projects)) {
      list = stateObj.projects;
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
  if (typeof window !== 'undefined') {
    window.getProjectsList = getProjectsList;
  }

  function escapeJs(str) {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '&quot;')
      .replace(/\r?\n/g, ' ');
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

  // Helper to extract an array of clean department names from a member object (supports multiple departments)
  function getMemberDepartments(m) {
    if (!m) return ['ฝ่ายดำเนินงานทั่วไป'];
    // 1. If explicit department string is present, split strictly by comma (never by slash)
    if (m.department && typeof m.department === 'string' && m.department.trim()) {
      const list = m.department.split(/[,，،、\n;]/).map(d => d.trim()).filter(Boolean);
      if (list.length > 0) return Array.from(new Set(list));
    }
    // 2. Otherwise check departments array (and ensure legacy comma strings are parsed)
    if (Array.isArray(m.departments) && m.departments.length > 0) {
      const list = m.departments.flatMap(d => String(d).split(/[,，،、\n;]/)).map(d => d.trim()).filter(Boolean);
      if (list.length > 0) return Array.from(new Set(list));
    }
    return ['ฝ่ายดำเนินงานทั่วไป'];
  }

  // Curated Tailwind palettes for department badges + user theme option
  const DEPARTMENT_COLOR_PALETTES = {
    theme: { key: 'theme', name: 'ตามธีมผู้ใช้', class: 'bg-primary/10 text-primary border-primary/20', bgClass: 'bg-primary' },
    indigo: { key: 'indigo', name: 'น้ำเงินคราม', class: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', bgClass: 'bg-indigo-500' },
    sky: { key: 'sky', name: 'ฟ้าสดใส', class: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', bgClass: 'bg-sky-500' },
    emerald: { key: 'emerald', name: 'เขียวมรกต', class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', bgClass: 'bg-emerald-500' },
    amber: { key: 'amber', name: 'ส้มอำพัน', class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', bgClass: 'bg-amber-500' },
    rose: { key: 'rose', name: 'กุหลาบแดง', class: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', bgClass: 'bg-rose-500' },
    pink: { key: 'pink', name: 'ชมพูสดใส', class: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20', bgClass: 'bg-pink-500' },
    purple: { key: 'purple', name: 'ม่วงอัญชัน', class: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', bgClass: 'bg-purple-500' },
    violet: { key: 'violet', name: 'ม่วงลาเวนเดอร์', class: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20', bgClass: 'bg-violet-500' },
    teal: { key: 'teal', name: 'เขียวหัวเป็ด', class: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20', bgClass: 'bg-teal-500' },
    cyan: { key: 'cyan', name: 'ฟ้าคราม', class: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', bgClass: 'bg-cyan-500' },
    orange: { key: 'orange', name: 'ส้มสด', class: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', bgClass: 'bg-orange-500' },
    slate: { key: 'slate', name: 'เทากลาง', class: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20', bgClass: 'bg-slate-500' }
  };

  function getAutoColorForDept(deptName) {
    const keys = Object.keys(DEPARTMENT_COLOR_PALETTES).filter(k => k !== 'theme');
    if (!deptName) return keys[0];
    let hash = 0;
    for (let i = 0; i < deptName.length; i++) {
      hash = (hash << 5) - hash + deptName.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % keys.length;
    return keys[idx];
  }

  // Get visually distinct Tailwind color class based on department name & project color settings
  function getDepartmentBadgeClass(deptName, project = null) {
    if (!deptName) return 'bg-muted text-muted-foreground border-border';

    const p = project || (activeDetailProjectId ? getProjectsList().find(item => item.id === activeDetailProjectId) : null);
    const config = p?.departmentColorConfig || null;
    const mode = config?.mode || 'AUTO';

    if (mode === 'THEME') {
      return 'bg-primary/10 text-primary border-primary/20';
    }

    if (mode === 'UNIFIED') {
      const uColor = config?.unifiedColor || 'indigo';
      if (uColor === 'theme') {
        return 'bg-primary/10 text-primary border-primary/20';
      }
      return DEPARTMENT_COLOR_PALETTES[uColor]?.class || 'bg-primary/10 text-primary border-primary/20';
    }

    if (mode === 'CUSTOM') {
      const customKey = config?.customColors?.[deptName];
      if (customKey === 'theme') {
        return 'bg-primary/10 text-primary border-primary/20';
      }
      if (customKey && DEPARTMENT_COLOR_PALETTES[customKey]) {
        return DEPARTMENT_COLOR_PALETTES[customKey].class;
      }
    }

    // Default: AUTO mode - deterministic color based on department name
    const autoKey = getAutoColorForDept(deptName);
    return DEPARTMENT_COLOR_PALETTES[autoKey]?.class || DEPARTMENT_COLOR_PALETTES.indigo.class;
  }

// -------------------------------------------------------------
  // DEPARTMENT COLOR CONFIGURATION SYSTEM (ADMIN ONLY)
  // -------------------------------------------------------------
  let editingColorProjectId = null;
  let tempDeptColorConfig = { mode: 'AUTO', unifiedColor: 'indigo', customColors: {} };

  function openDepartmentColorConfigModal(projectId = null) {
    if (window.currentRole !== 'ADMIN') {
      if (typeof showToast === 'function') showToast('เฉพาะ Admin เท่านั้นที่สามารถปรับแต่งสีได้', 'warning');
      return;
    }

    const prjId = projectId || activeDetailProjectId;
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === prjId);
    if (!p) {
      if (typeof showToast === 'function') showToast('ไม่พบข้อมูลโครงการ', 'error');
      return;
    }

    editingColorProjectId = prjId;
    const existing = p.departmentColorConfig || {};
    tempDeptColorConfig = {
      mode: existing.mode || 'AUTO',
      unifiedColor: existing.unifiedColor || 'indigo',
      customColors: { ...(existing.customColors || {}) }
    };

    const subtitle = document.getElementById('prjDeptColorModalSubtitle');
    if (subtitle) {
      const titleStr = p.title || prjId;
      subtitle.textContent = `โครงการ: ${titleStr}`;
      subtitle.title = titleStr;
    }

    renderDeptColorModalUi(p);

    const modal = document.getElementById('prjDeptColorSettingsModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (typeof window.refreshIcons === 'function') window.refreshIcons();
      else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }
  }

  function closeDepartmentColorConfigModal() {
    const modal = document.getElementById('prjDeptColorSettingsModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    editingColorProjectId = null;
  }

  function setDeptColorEditMode(mode) {
    tempDeptColorConfig.mode = mode;
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === editingColorProjectId);
    renderDeptColorModalUi(p);
  }

  function selectUnifiedColor(colorKey) {
    tempDeptColorConfig.unifiedColor = colorKey;
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === editingColorProjectId);
    renderDeptColorModalUi(p);
  }

  function selectDeptCustomColor(deptName, colorKey) {
    if (!tempDeptColorConfig.customColors) tempDeptColorConfig.customColors = {};
    tempDeptColorConfig.customColors[deptName] = colorKey;
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === editingColorProjectId);
    renderDeptColorModalUi(p);
  }

  function renderDeptColorModalUi(p) {
    const mode = tempDeptColorConfig.mode || 'AUTO';
    const unifiedColor = tempDeptColorConfig.unifiedColor || 'indigo';

    // 1. Update Mode Cards
    const modes = ['AUTO', 'THEME', 'UNIFIED', 'CUSTOM'];
    modes.forEach(m => {
      const btn = document.getElementById(`btnColorMode${m.charAt(0) + m.slice(1).toLowerCase()}`);
      const radio = document.getElementById(`radioColorMode${m.charAt(0) + m.slice(1).toLowerCase()}`);
      const isSelected = mode === m;
      if (btn) {
        btn.className = `p-2.5 sm:p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
          isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs' : 'border-border bg-card hover:bg-muted/40'
        }`;
      }
      if (radio) {
        radio.className = `w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
          isSelected ? 'border-primary bg-primary text-white' : 'border-border'
        }`;
        radio.innerHTML = isSelected ? '<span class="w-1.5 h-1.5 rounded-full bg-white"></span>' : '';
      }
    });

    // 2. Toggle sections
    const autoSec = document.getElementById('deptColorAutoSection');
    const themeSec = document.getElementById('deptColorThemeSection');
    const unifiedSec = document.getElementById('deptColorUnifiedSection');
    const customSec = document.getElementById('deptColorCustomSection');

    if (autoSec) autoSec.classList.toggle('hidden', mode !== 'AUTO');
    if (themeSec) themeSec.classList.toggle('hidden', mode !== 'THEME');
    if (unifiedSec) unifiedSec.classList.toggle('hidden', mode !== 'UNIFIED');
    if (customSec) customSec.classList.toggle('hidden', mode !== 'CUSTOM');

    // Get departments in this project
    const members = p && Array.isArray(p.members) ? p.members : [];
    const deptsSet = new Set();
    members.forEach(m => {
      getMemberDepartments(m).forEach(d => deptsSet.add(d));
    });
    const depts = Array.from(deptsSet);

    // 3. Render Theme Mode Preview
    const themePreviewGrid = document.getElementById('deptColorThemePreviewGrid');
    if (themePreviewGrid) {
      if (depts.length === 0) {
        themePreviewGrid.innerHTML = '<span class="text-xs text-muted-foreground italic">ไม่มีรายชื่อฝ่าย</span>';
      } else {
        themePreviewGrid.innerHTML = depts.map(dept => `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs bg-primary/10 text-primary border-primary/20">
            <span class="w-2.5 h-2.5 rounded-full bg-primary"></span>
            <span>${escapeHtml(dept)}</span>
          </span>
        `).join('');
      }
    }

    // 4. Render Unified Palette Grid & Live Preview
    const unifiedGrid = document.getElementById('deptColorUnifiedPaletteGrid');
    if (unifiedGrid) {
      unifiedGrid.innerHTML = Object.keys(DEPARTMENT_COLOR_PALETTES).map(key => {
        const pal = DEPARTMENT_COLOR_PALETTES[key];
        const isSel = unifiedColor === key;
        return `
          <button type="button" onclick="selectUnifiedColor('${key}')"
            class="p-2 rounded-xl sm:rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
              isSel ? 'border-primary ring-2 ring-primary/40 bg-card shadow-xs' : 'border-border hover:bg-muted/40'
            }">
            <span class="w-6 h-6 rounded-full ${pal.bgClass} flex items-center justify-center shadow-xs">
              ${isSel ? '<i data-lucide="check" class="h-3.5 w-3.5 text-white stroke-[3]"></i>' : ''}
            </span>
            <span class="text-[11px] font-medium text-foreground truncate max-w-full">${pal.name}</span>
          </button>
        `;
      }).join('');
    }

    const unifiedPreviewGrid = document.getElementById('deptColorUnifiedPreviewGrid');
    if (unifiedPreviewGrid) {
      const uPal = DEPARTMENT_COLOR_PALETTES[unifiedColor] || DEPARTMENT_COLOR_PALETTES.indigo;
      if (depts.length === 0) {
        unifiedPreviewGrid.innerHTML = '<span class="text-xs text-muted-foreground italic">ไม่มีรายชื่อฝ่าย</span>';
      } else {
        unifiedPreviewGrid.innerHTML = depts.map(dept => `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${uPal.class}">
            <span class="w-2.5 h-2.5 rounded-full ${uPal.bgClass}"></span>
            <span>${escapeHtml(dept)}</span>
          </span>
        `).join('');
      }
    }

    // 5. Render Custom Depts List
    const customList = document.getElementById('deptColorCustomDeptsList');
    if (customList) {
      if (depts.length === 0) {
        customList.innerHTML = '<p class="text-xs text-muted-foreground italic p-4 text-center border border-dashed rounded-2xl">ยังไม่มีรายชื่อฝ่ายในโครงการนี้</p>';
      } else {
        customList.innerHTML = depts.map(dept => {
          const currentKey = tempDeptColorConfig.customColors?.[dept] || getAutoColorForDept(dept);
          const activePal = DEPARTMENT_COLOR_PALETTES[currentKey] || DEPARTMENT_COLOR_PALETTES.indigo;
          const isCurrentTheme = currentKey === 'theme';
          return `
            <div class="p-3 rounded-2xl border border-border/70 bg-card/60 hover:bg-card transition space-y-2.5 shadow-2xs">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex items-center gap-1.5 flex-1">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition shadow-2xs ${activePal.class}">
                    <span class="w-2.5 h-2.5 rounded-full ${activePal.bgClass}"></span>
                    <span class="break-words line-clamp-1">${escapeHtml(dept)}</span>
                  </span>
                </div>
                <div class="text-[11px] text-muted-foreground shrink-0 font-medium flex items-center gap-1 bg-muted/40 px-2.5 py-0.5 rounded-lg border border-border/40">
                  <span>สี:</span>
                  <strong class="text-foreground">${activePal.name}</strong>
                </div>
              </div>
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                <button type="button" onclick="selectDeptCustomColor('${escapeJs(dept)}', 'theme')"
                  class="px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                    isCurrentTheme ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/40 shadow-xs' : 'border-border bg-muted/40 hover:bg-muted text-foreground'
                  }">
                  <i data-lucide="sparkles" class="h-3.5 w-3.5"></i>
                  <span>ใช้สีตามธีมผู้ใช้</span>
                </button>
                <span class="text-[10px] text-muted-foreground font-medium">หรือเลือกสีเจาะจง:</span>
              </div>
              <div class="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                ${Object.keys(DEPARTMENT_COLOR_PALETTES).filter(k => k !== 'theme').map(k => {
                  const pal = DEPARTMENT_COLOR_PALETTES[k];
                  const isCur = currentKey === k;
                  return `
                    <button type="button" onclick="selectDeptCustomColor('${escapeJs(dept)}', '${k}')"
                      class="h-7 rounded-xl ${pal.bgClass} transition hover:scale-110 flex items-center justify-center cursor-pointer relative shadow-2xs ${
                        isCur ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10' : 'opacity-65 hover:opacity-100 hover:shadow-xs'
                      }"
                      title="${pal.name}">
                      ${isCur ? '<i data-lucide="check" class="h-3.5 w-3.5 text-white stroke-[3]"></i>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 6. Render Auto Preview Grid
    const autoGrid = document.getElementById('deptColorAutoPreviewGrid');
    if (autoGrid) {
      autoGrid.innerHTML = depts.map(dept => {
        const autoKey = getAutoColorForDept(dept);
        const pal = DEPARTMENT_COLOR_PALETTES[autoKey] || DEPARTMENT_COLOR_PALETTES.indigo;
        return `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${pal.class}">
            <span class="w-2.5 h-2.5 rounded-full ${pal.bgClass}"></span>
            <span>${escapeHtml(dept)}</span>
          </span>
        `;
      }).join('');
    }

    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function saveDepartmentColorConfig() {
    if (!editingColorProjectId) return;
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === editingColorProjectId);
    if (!p) return;

    const nowISO = new Date().toISOString();
    p.updatedAt = nowISO;
    p.departmentColorConfig = {
      mode: tempDeptColorConfig.mode || 'AUTO',
      unifiedColor: tempDeptColorConfig.unifiedColor || 'indigo',
      customColors: { ...(tempDeptColorConfig.customColors || {}) }
    };

    // Emit socket update
    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('admin:updateProject', p);
    }
    if (typeof window.saveLocalState === 'function') {
      window.saveLocalState();
    } else if (typeof saveLocalState === 'function') {
      saveLocalState();
    }

    if (typeof window.persistProjectsToCloud === 'function') {
      window.persistProjectsToCloud(true);
    }

    // Refresh UI properly
    if (typeof renderAdminProjectsSection === 'function') {
      renderAdminProjectsSection();
    }
    if (typeof renderUserProjectsSection === 'function') {
      renderUserProjectsSection();
    }
    if (activeDetailProjectId && activeDetailProjectId === p.id) {
      openProjectDetailModal(p.id);
    }
    closeDepartmentColorConfigModal();

    if (typeof window.showToast === 'function') {
      window.showToast('บันทึกการตั้งค่าสีฝ่ายงานเรียบร้อยแล้ว', 'success');
    } else if (typeof showToast === 'function') {
      showToast('บันทึกการตั้งค่าสีฝ่ายงานเรียบร้อยแล้ว', 'success');
    }
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

    // Count unique departments (supports multiple departments per person)
    const depts = new Set();
    members.forEach(m => {
      getMemberDepartments(m).forEach(d => depts.add(d));
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

          <!-- Project Leaders (ผู้ดูแลโครงการทุกคน) -->
          ${leaders.length > 0 ? `
            <div class="pt-2 border-t border-border/50 space-y-1.5">
              <div class="flex items-center justify-between text-[11px] font-bold text-foreground">
                <span class="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <i data-lucide="crown" class="h-3.5 w-3.5 text-amber-500 shrink-0"></i>
                  <span>ผู้ดูแลโครงการ (${leaders.length} คน)</span>
                </span>
              </div>
              <div class="space-y-1.5">
                ${leaders.map((leader, lIdx) => {
                  const leaderSeed = leader.nickname || leader.name || `leader_${lIdx}`;
                  const leaderFallback = getCuteAvatarUrl(leaderSeed);
                  const leaderAvatar = leader.avatar ? escapeHtml(leader.avatar) : leaderFallback;
                  return `
                    <div class="flex items-center gap-2.5 p-1.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition">
                      <img src="${leaderAvatar}" alt="${escapeHtml(leader.name || 'ผู้ดูแลโครงการ')}"
                        onclick="window.openPersonPhotoPreviewModal && window.openPersonPhotoPreviewModal({
                          name: '${escapeJs(leader.name || '')}',
                          nickname: '${escapeJs(leader.nickname || '')}',
                          role: '${escapeJs(leader.role || '')}',
                          department: '${escapeJs(leader.department || '')}',
                          avatar: '${escapeJs(leaderAvatar)}',
                          phone: '${escapeJs(leader.phone || '')}',
                          kkuMail: '${escapeJs(leader.kkuMail || '')}',
                          contactLink: '${escapeJs(leader.contactLink || '')}',
                          details: '${escapeJs(leader.details || '')}'
                        })"
                        class="w-7 h-7 rounded-full object-cover ring-1 ring-border shrink-0 shadow-2xs cursor-pointer hover:ring-2 hover:ring-primary hover:scale-110 transition-all duration-200"
                        title="คลิกเพื่อดูรูปโปรไฟล์"
                        onerror="this.onerror=null; this.src='${leaderFallback}';" />
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-foreground truncate" title="${escapeHtml(leader.name)} ${leader.nickname ? `(${escapeHtml(leader.nickname)})` : ''}">
                          ${escapeHtml(leader.name)} ${leader.nickname ? `<span class="font-normal text-muted-foreground">(${escapeHtml(leader.nickname)})</span>` : ''}
                        </p>
                        <p class="text-[10px] text-muted-foreground truncate" title="${escapeHtml(leader.role || 'ผู้รับผิดชอบโครงการ')}">
                          ${escapeHtml(leader.role || 'ผู้รับผิดชอบโครงการ')}
                        </p>
                      </div>
                      ${leader.phone ? `
                        <a href="tel:${escapeHtml(leader.phone)}" class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 hover:bg-emerald-500/20 transition" title="โทร: ${escapeHtml(leader.phone)}">
                          <i data-lucide="phone" class="h-3 w-3"></i>
                        </a>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

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

    if (adminActions) {
      if (isAdmin) {
        adminActions.classList.remove('hidden');
        adminActions.classList.add('flex');
      } else {
        adminActions.classList.add('hidden');
        adminActions.classList.remove('flex');
      }
    }
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

    // Setup Calendar Tab state & badges
    const calEvents = Array.isArray(p.calendarEvents) ? p.calendarEvents : [];
    const countBadge = document.getElementById('prjDetailCalCountBadge');
    if (countBadge) countBadge.textContent = calEvents.length;
    const totalBadge = document.getElementById('prjCalEventsTotalBadge');
    if (totalBadge) totalBadge.textContent = `${calEvents.length} กิจกรรม`;

    // Reset to Overview tab by default
    switchProjectDetailTab('OVERVIEW');

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  // ========================================================
  // PROJECT CALENDAR CONTROLLER & SUB-VIEWS
  // ========================================================
  window.projectCalendarState = window.projectCalendarState || {};

  function switchProjectDetailTab(tab = 'OVERVIEW') {
    const overviewContent = document.getElementById('prjDetailOverviewTabContent');
    const calContent = document.getElementById('prjDetailCalendarTabContent');
    const btnOverview = document.getElementById('prjDetailTabBtnOverview');
    const btnCal = document.getElementById('prjDetailTabBtnCalendar');

    if (tab === 'CALENDAR') {
      if (overviewContent) overviewContent.classList.add('hidden');
      if (calContent) calContent.classList.remove('hidden');
      if (btnOverview) {
        btnOverview.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-2 cursor-pointer';
      }
      if (btnCal) {
        btnCal.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-card text-foreground shadow-2xs cursor-pointer';
      }
      if (activeDetailProjectId) {
        renderProjectCalendarView(activeDetailProjectId);
      }
    } else {
      if (overviewContent) overviewContent.classList.remove('hidden');
      if (calContent) calContent.classList.add('hidden');
      if (btnOverview) {
        btnOverview.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-card text-foreground shadow-2xs cursor-pointer';
      }
      if (btnCal) {
        btnCal.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-2 cursor-pointer';
      }
    }
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function renderProjectCalendarView(projectId) {
    if (!projectId) return;
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item && item.id === projectId);
    if (!p) return;

    window.projectCalendarState[projectId] = window.projectCalendarState[projectId] || {
      view: 'MONTH',
      currentDate: new Date(),
      categoryFilter: 'ALL'
    };
    const pState = window.projectCalendarState[projectId];
    const calEvents = Array.isArray(p.calendarEvents) ? p.calendarEvents : [];

    // Update Badges (View-only)
    const countBadge = document.getElementById('prjDetailCalCountBadge');
    if (countBadge) countBadge.textContent = calEvents.length;
    const totalBadge = document.getElementById('prjCalEventsTotalBadge');
    if (totalBadge) totalBadge.textContent = `${calEvents.length} กิจกรรม`;

    // View switch buttons styling
    const btnMonth = document.getElementById('prjCalBtnViewMonth');
    const btnList = document.getElementById('prjCalBtnViewList');
    if (btnMonth && btnList) {
      if (pState.view === 'MONTH') {
        btnMonth.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-card text-foreground shadow-2xs transition cursor-pointer';
        btnList.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer';
      } else {
        btnMonth.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer';
        btnList.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-card text-foreground shadow-2xs transition cursor-pointer';
      }
    }

    // Render Category Filter Pills
    const filterContainer = document.getElementById('prjCalCategoryFiltersContainer');
    if (filterContainer) {
      const categories = (typeof window.getCalendarCategories === 'function') ? window.getCalendarCategories() : [];
      let catPillsHtml = `
        <button type="button" onclick="setProjectCalendarCategoryFilter('ALL')"
          class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors h-8 rounded-full px-3.5 shrink-0 ${pState.categoryFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'border border-input bg-background hover:bg-accent hover:text-white'} cursor-pointer">
          ทั้งหมด (${calEvents.length})
        </button>
      `;
      categories.forEach(cat => {
        const catCount = calEvents.filter(e => e.category === cat.key).length;
        catPillsHtml += `
          <button type="button" onclick="setProjectCalendarCategoryFilter('${cat.key}')"
            class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors h-8 rounded-full px-3.5 shrink-0 ${pState.categoryFilter === cat.key ? 'bg-primary text-primary-foreground' : 'border border-input bg-background hover:bg-accent hover:text-white'} cursor-pointer">
            ${cat.label} (${catCount})
          </button>
        `;
      });
      filterContainer.innerHTML = catPillsHtml;
    }

    // Filter events
    let filteredEvents = [...calEvents];
    if (pState.categoryFilter !== 'ALL') {
      filteredEvents = filteredEvents.filter(e => e.category === pState.categoryFilter);
    }
    filteredEvents.sort((a, b) => {
      const dtA = `${a.startDate || ''}T${a.startTime || '00:00'}`;
      const dtB = `${b.startDate || ''}T${b.startTime || '00:00'}`;
      return dtA.localeCompare(dtB);
    });

    const bodyEl = document.getElementById('prjDetailCalendarBody');
    if (!bodyEl) return;

    if (pState.view === 'MONTH') {
      bodyEl.innerHTML = renderProjectMonthGridView(filteredEvents, pState, p, false);
    } else {
      bodyEl.innerHTML = renderProjectAgendaListView(filteredEvents, pState, p, false);
    }

    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function setProjectCalendarView(view) {
    if (!activeDetailProjectId) return;
    window.projectCalendarState[activeDetailProjectId] = window.projectCalendarState[activeDetailProjectId] || {};
    window.projectCalendarState[activeDetailProjectId].view = view;
    renderProjectCalendarView(activeDetailProjectId);
  }

  function navigateProjectCalendarMonth(delta) {
    if (!activeDetailProjectId) return;
    window.projectCalendarState[activeDetailProjectId] = window.projectCalendarState[activeDetailProjectId] || { currentDate: new Date() };
    const cur = window.projectCalendarState[activeDetailProjectId].currentDate || new Date();
    if (delta === 0) {
      window.projectCalendarState[activeDetailProjectId].currentDate = new Date();
    } else {
      window.projectCalendarState[activeDetailProjectId].currentDate = new Date(cur.getFullYear(), cur.getMonth() + delta, 1);
    }
    renderProjectCalendarView(activeDetailProjectId);
  }

  function setProjectCalendarCategoryFilter(category) {
    if (!activeDetailProjectId) return;
    window.projectCalendarState[activeDetailProjectId] = window.projectCalendarState[activeDetailProjectId] || {};
    window.projectCalendarState[activeDetailProjectId].categoryFilter = category;
    renderProjectCalendarView(activeDetailProjectId);
  }

  function renderProjectMonthGridView(events, pState, project, isAdmin = false) {
    const current = pState.currentDate || new Date();
    const year = current.getFullYear();
    const month = current.getMonth();

    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayIso = (typeof window.getLocalTodayIso === 'function') ? window.getLocalTodayIso() : (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'));

    let html = `
      <div class="space-y-4">
        <!-- Month Navigation Header -->
        <div class="flex items-center justify-between px-1">
          <h4 class="font-extrabold text-base sm:text-lg text-foreground">
            ${thaiMonths[month]} ${year + 543}
          </h4>
          <div class="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onclick="navigateProjectCalendarMonth(0)"
              class="h-8 px-3 rounded-full border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95" title="กลับไปเดือนปัจจุบัน">
              วันนี้
            </button>
            <div class="flex items-center gap-1">
              <button type="button" onclick="navigateProjectCalendarMonth(-1)"
                class="w-8 h-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition shadow-2xs cursor-pointer active:scale-95" title="เดือนก่อนหน้า">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
              </button>
              <button type="button" onclick="navigateProjectCalendarMonth(1)"
                class="w-8 h-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition shadow-2xs cursor-pointer active:scale-95" title="เดือนถัดไป">
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Month Grid -->
        <div class="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <!-- Day names -->
          <div class="grid grid-cols-7 bg-muted/60 border-b border-border text-center py-2 text-xs font-bold text-muted-foreground">
            ${thaiDays.map((d, idx) => `<div class="${idx === 0 ? 'text-rose-500' : ''}">${d}</div>`).join('')}
          </div>

          <!-- Day cells -->
          <div class="grid grid-cols-7 divide-x divide-y divide-border/60">
    `;

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="min-h-[85px] sm:min-h-[105px] p-1.5 bg-muted/10 opacity-40"></div>`;
    }

    // Days cells
    for (let day = 1; day <= totalDays; day++) {
      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => {
        const sd = String(e.startDate || '').slice(0, 10);
        const ed = String(e.endDate || e.startDate || '').slice(0, 10);
        return sd && sd <= dayDateStr && dayDateStr <= (ed >= sd ? ed : sd);
      });
      const isToday = dayDateStr === todayIso;

      html += `
        <div class="min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 bg-card hover:bg-muted/30 transition flex flex-col justify-between group">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-primary text-white shadow-xs' : 'text-foreground'}">
              ${day}
            </span>
            ${isAdmin ? `
              <button type="button" onclick="openAddCalendarEventModal(null, '${dayDateStr}', '${project.id}')"
                class="opacity-0 group-hover:opacity-100 transition w-5 h-5 rounded hover:bg-primary/10 text-primary flex items-center justify-center text-[10px] cursor-pointer" title="เพิ่มกิจกรรมในวันนี้">
                <i data-lucide="plus" class="w-3 h-3"></i>
              </button>
            ` : ''}
          </div>

          <!-- Event badges in day cell -->
          <div class="space-y-1 overflow-y-auto max-h-[60px] scrollbar-none">
            ${dayEvents.map(e => {
              const styles = typeof window.getEventVisualStyles === 'function'
                ? window.getEventVisualStyles(e)
                : { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', dot: 'bg-primary' };
              const catInfo = styles.catMeta || {};
              return `
                <div onclick="openCalendarEventDetailModal('${e.id}')"
                  class="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate cursor-pointer transition ${styles.bg} ${styles.text} border ${styles.border} hover:scale-[1.02] flex items-center justify-between group/chip"
                  title="${e.title} (${e.startTime || ''})">
                  <span class="truncate flex-1 flex items-center gap-1 min-w-0">
                    <span class="w-1.5 h-1.5 rounded-full ${styles.dot} shrink-0" title="ประเภท: ${catInfo.label || ''}"></span>
                    ${(e.startTime && !e.isAllDay && String(e.startDate).slice(0, 10) === dayDateStr) ? `<span class="opacity-75 mr-0.5 shrink-0">${e.startTime}</span>` : ''}
                    <span class="truncate font-semibold">${e.title}</span>
                  </span>
                  ${isAdmin ? `
                    <button type="button" onclick="event.stopPropagation(); openAddCalendarEventModal('${e.id}', null, '${project.id}')"
                      class="opacity-0 group-hover/chip:opacity-100 hover:scale-125 ml-1 text-inherit hover:text-primary transition shrink-0 p-0.5 cursor-pointer"
                      title="แก้ไขกิจกรรมนี้">
                      <i data-lucide="square-pen" class="w-2.5 h-2.5"></i>
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Trailing empty cells
    const totalSlots = firstDay + totalDays;
    const trailing = (7 - (totalSlots % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      html += `<div class="min-h-[85px] sm:min-h-[105px] p-1.5 bg-muted/10 opacity-40"></div>`;
    }

    html += `
          </div>
        </div>
      </div>
    `;
    return html;
  }

  function renderProjectAgendaListView(events, pState, project, isAdmin = false) {
    const current = pState.currentDate || new Date();
    const year = current.getFullYear();
    const month = current.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const monthStartIso = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEndIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

    // Filter events occurring or active in this month
    const monthEvents = events.filter(evt => {
      const s = String(evt.startDate || '').slice(0, 10);
      const e = String(evt.endDate || evt.startDate || '').slice(0, 10);
      if (!s) return false;
      const end = (e >= s) ? e : s;
      return s <= monthEndIso && end >= monthStartIso;
    });

    const fullThaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    let html = `
      <div class="space-y-4">
        <!-- Month Navigation Header in Project List View -->
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <h4 class="font-extrabold text-base sm:text-lg text-foreground">
              ${fullThaiMonths[month]} ${year + 543}
            </h4>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              ${monthEvents.length} รายการ
            </span>
          </div>
          <div class="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onclick="navigateProjectCalendarMonth(0)"
              class="h-8 px-3 rounded-full border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95" title="กลับไปเดือนปัจจุบัน">
              วันนี้
            </button>
            <div class="flex items-center gap-1">
              <button type="button" onclick="navigateProjectCalendarMonth(-1)"
                class="w-8 h-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition shadow-2xs cursor-pointer active:scale-95" title="เดือนก่อนหน้า">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
              </button>
              <button type="button" onclick="navigateProjectCalendarMonth(1)"
                class="w-8 h-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition shadow-2xs cursor-pointer active:scale-95" title="เดือนถัดไป">
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
    `;

    if (monthEvents.length === 0) {
      html += `
        <div class="text-center py-10 px-4 bg-muted/20 border border-dashed border-border rounded-2xl space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto text-xl">
            <i data-lucide="calendar-x" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-foreground">ไม่มีกำหนดการในเดือน ${fullThaiMonths[month]} ${year + 543}</h4>
            <p class="text-xs text-muted-foreground mt-0.5">${isAdmin ? 'คุณสามารถเพิ่มกิจกรรมใหม่ หรือนำเข้าไฟล์ปฏิทิน .ics เข้าสู่โครงการได้ทันที' : 'ขณะนี้ยังไม่มีกิจกรรมที่กำหนดไว้ในเดือนนี้'}</p>
          </div>
          ${isAdmin ? `
            <div class="flex items-center justify-center gap-2 pt-1">
              <button type="button" onclick="openAddCalendarEventModal(null, '${monthStartIso}', '${project.id}')"
                class="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> เพิ่มกิจกรรมในเดือนนี้
              </button>
              <button type="button" onclick="triggerImportProjectCalendarIcs()"
                class="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="upload" class="w-3.5 h-3.5 text-muted-foreground"></i> นำเข้าไฟล์ .ics
              </button>
            </div>
          ` : ''}
        </div>
      </div>`;
      return html;
    }

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    html += `<div class="space-y-3">`;
    monthEvents.forEach(evt => {
      const styles = typeof window.getEventVisualStyles === 'function'
        ? window.getEventVisualStyles(evt)
        : { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', dot: 'bg-primary' };
      const catInfo = styles.catMeta;

      const sDate = String(evt.startDate || '').split('-');
      const dayNum = sDate[2] ? parseInt(sDate[2], 10) : '01';
      const monthNum = sDate[1] ? parseInt(sDate[1], 10) - 1 : 0;
      const monthStr = thaiMonths[monthNum] || 'ม.ค.';

      html += `
        <div class="bg-card border border-border/80 hover:border-primary/40 rounded-2xl p-3.5 sm:p-4 shadow-xs transition hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
          <div class="flex items-start gap-3 min-w-0">
            <!-- Date Badge -->
            <div class="w-12 h-12 rounded-xl ${styles.bg} ${styles.text} border ${styles.border} flex flex-col items-center justify-center shrink-0">
              <span class="text-sm font-black leading-none">${dayNum}</span>
              <span class="text-[10px] font-bold uppercase mt-0.5">${monthStr}</span>
            </div>

            <!-- Event Details -->
            <div class="space-y-1 min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${catInfo.bg || styles.bg} ${catInfo.text || styles.text} border ${catInfo.border || styles.border}">
                  <span class="w-1.5 h-1.5 rounded-full ${catInfo.dot || styles.dot} shrink-0"></span>
                  <i data-lucide="${catInfo.icon || 'star'}" class="w-3 h-3 inline-block"></i>
                  <span>${catInfo.label || 'กิจกรรม'}</span>
                </span>
                <span class="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <i data-lucide="clock" class="w-3 h-3"></i>
                  ${evt.isAllDay ? 'ตลอดทั้งวัน' : `${evt.startTime || '09:00'} - ${evt.endTime || '12:00'} น.`}
                </span>
                ${evt.location ? `
                  <span class="text-xs text-muted-foreground font-medium flex items-center gap-1 truncate max-w-[200px]">
                    <i data-lucide="map-pin" class="w-3 h-3 text-rose-500"></i>
                    ${evt.location}
                  </span>
                ` : ''}
              </div>
              <h4 onclick="openCalendarEventDetailModal('${evt.id}')"
                class="text-sm sm:text-base font-bold text-foreground hover:text-primary transition cursor-pointer truncate" title="${evt.title}">
                ${evt.title}
              </h4>
              ${evt.description ? `<p class="text-xs text-muted-foreground line-clamp-1">${evt.description}</p>` : ''}
              ${Array.isArray(evt.assignees) && evt.assignees.length > 0 ? `
                <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span class="text-[11px] text-muted-foreground font-medium">ผู้รับผิดชอบ:</span>
                  ${evt.assignees.map(a => `
                    <span class="px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold">
                      ${a.name}
                    </span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button type="button" onclick="openCalendarEventDetailModal('${evt.id}')"
              class="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition cursor-pointer" title="ดูรายละเอียด">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            </button>
            ${isAdmin ? `
              <button type="button" onclick="openAddCalendarEventModal('${evt.id}', null, '${project.id}')"
                class="px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition cursor-pointer" title="แก้ไข">
                <i data-lucide="square-pen" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="confirmDeleteCalendarEvent('${evt.id}', '${evt.title}', '${project.id}')"
                class="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition cursor-pointer" title="ลบ">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
    return html;
  }

  function toggleCurrentProjectShowInMainCalendar(projectIdOrChecked, maybeChecked) {
    const isAdmin = typeof window.isCalendarAdmin === 'function'
      ? window.isCalendarAdmin()
      : Boolean(window.currentRole === 'ADMIN' && window.isAdminAuthenticated);
    if (!isAdmin) {
      if (typeof showToast === 'function') {
        showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถตั้งค่านี้ได้', 'warning');
      }
      const toggleEl = document.getElementById('prjShowInMainCalToggle');
      if (toggleEl && activeDetailProjectId) {
        const allProjects = getProjectsList();
        const prj = allProjects.find(p => p && p.id === activeDetailProjectId);
        if (prj) toggleEl.checked = prj.showInMainCalendar !== false;
      }
      return;
    }
    const targetId = (typeof projectIdOrChecked === 'string') ? projectIdOrChecked : activeDetailProjectId;
    const isChecked = (typeof projectIdOrChecked === 'string') ? Boolean(maybeChecked) : Boolean(projectIdOrChecked);
    if (!targetId) return;
    const allProjects = getProjectsList();
    const prj = allProjects.find(p => p && p.id === targetId);
    if (!prj) return;

    prj.showInMainCalendar = Boolean(isChecked);
    prj.updatedAt = new Date().toISOString();

    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('admin:updateProjectCalendar', {
        projectId: targetId,
        calendarEvents: prj.calendarEvents || [],
        showInMainCalendar: prj.showInMainCalendar
      });
    }
    if (typeof window.saveLocalState === 'function') window.saveLocalState();

    // Refresh main calendar
    if (typeof window.renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') {
      window.renderAdminCalendarSection();
    }
    if (typeof window.renderUserCalendarSection === 'function') {
      window.renderUserCalendarSection();
    }

    if (typeof showToast === 'function') {
      showToast(isChecked ? 'กิจกรรมของโครงการจะแสดงในปฏิทินรวมแล้ว' : 'ซ่อนกิจกรรมโครงการจากปฏิทินรวมแล้ว', 'success');
    }
  }

  function triggerImportProjectCalendarIcs() {
    const isAdmin = typeof window.isCalendarAdmin === 'function'
      ? window.isCalendarAdmin()
      : Boolean(window.currentRole === 'ADMIN' && window.isAdminAuthenticated);
    if (!isAdmin) {
      if (typeof showToast === 'function') {
        showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถนำเข้าไฟล์ .ics ได้', 'warning');
      }
      return;
    }
    const input = document.getElementById('prjDetailCalIcsFileInput');
    if (input) input.click();
  }

  function handleProjectCalendarIcsFileSelected(e) {
    const isAdmin = typeof window.isCalendarAdmin === 'function'
      ? window.isCalendarAdmin()
      : Boolean(window.currentRole === 'ADMIN' && window.isAdminAuthenticated);
    if (!isAdmin) {
      if (typeof showToast === 'function') {
        showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถนำเข้าไฟล์ .ics ได้', 'warning');
      }
      e.target.value = '';
      return;
    }
    const file = e.target.files && e.target.files[0];
    if (!file || !activeDetailProjectId) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const text = evt.target.result;
        if (typeof window.parseIcsText !== 'function') {
          return showToast('ระบบไม่พร้อมสำหรับการอ่านไฟล์ .ics', 'error');
        }
        const parsedEvents = window.parseIcsText(text);
        if (!parsedEvents || parsedEvents.length === 0) {
          return showToast('ไม่พบข้อมูลกิจกรรมในไฟล์ .ics ที่อัปโหลด', 'warning');
        }

        const allProjects = getProjectsList();
        const prj = allProjects.find(p => p && p.id === activeDetailProjectId);
        if (!prj) return;

        if (!Array.isArray(prj.calendarEvents)) prj.calendarEvents = [];
        let addedCount = 0;
        parsedEvents.forEach(pe => {
          const newEv = {
            id: 'evt_prj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: pe.title || 'กิจกรรมใหม่',
            description: pe.description || '',
            category: pe.category || 'EVENT',
            color: pe.color || 'indigo',
            startDate: pe.startDate,
            startTime: pe.startTime || '09:00',
            endDate: pe.endDate || pe.startDate,
            endTime: pe.endTime || '12:00',
            isAllDay: Boolean(pe.isAllDay),
            location: pe.location || '',
            assignees: Array.isArray(pe.assignees) ? pe.assignees : [],
            createdSource: 'ICS_IMPORT',
            projectId: prj.id
          };
          prj.calendarEvents.push(newEv);
          addedCount++;
        });
        prj.updatedAt = new Date().toISOString();

        if (window.socket && typeof window.socket.emit === 'function') {
          window.socket.emit('admin:updateProjectCalendar', {
            projectId: activeDetailProjectId,
            calendarEvents: prj.calendarEvents,
            showInMainCalendar: prj.showInMainCalendar !== false
          });
        }
        if (typeof window.saveLocalState === 'function') window.saveLocalState();

        renderProjectCalendarView(activeDetailProjectId);

        if (prj.showInMainCalendar !== false) {
          if (typeof window.renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') window.renderAdminCalendarSection();
          if (typeof window.renderUserCalendarSection === 'function') window.renderUserCalendarSection();
        }

        if (typeof showToast === 'function') {
          showToast(`นำเข้า ${addedCount} กิจกรรมเข้าสู่โครงการเรียบร้อยแล้ว`, 'success');
        }
      } catch (err) {
        console.error('Error importing project ICS:', err);
        if (typeof showToast === 'function') showToast('ไม่สามารถอ่านไฟล์ .ics ได้', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function getFormProjectId() {
    let formId = document.getElementById('prjFormId')?.value?.trim();
    if (!formId) {
      formId = activeDetailProjectId || `PRJ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const idEl = document.getElementById('prjFormId');
      if (idEl) idEl.value = formId;
    }
    return formId;
  }


  // Project Calendar Color Palette & Picker Helpers
  const PROJECT_CAL_PALETTES = {
    indigo: { label: 'คราม (Indigo)', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-500', solid: 'bg-indigo-600' },
    blue: { label: 'น้ำเงิน (Blue)', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500', solid: 'bg-blue-600' },
    emerald: { label: 'เขียวมรกต (Emerald)', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500', solid: 'bg-emerald-600' },
    amber: { label: 'เหลืองอำพัน (Amber)', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500', solid: 'bg-amber-600' },
    rose: { label: 'แดงกุหลาบ (Rose)', bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500', solid: 'bg-rose-600' },
    purple: { label: 'ม่วง (Purple)', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500', solid: 'bg-purple-600' },
    cyan: { label: 'ฟ้าคราม (Cyan)', bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-500', solid: 'bg-cyan-600' },
    pink: { label: 'ชมพู (Pink)', bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/30', dot: 'bg-pink-500', solid: 'bg-pink-600' },
    orange: { label: 'ส้มสด (Orange)', bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500', solid: 'bg-orange-600' },
    teal: { label: 'เขียวไข่กา (Teal)', bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30', dot: 'bg-teal-500', solid: 'bg-teal-600' },
    slate: { label: 'เทาเข้ม (Slate)', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500', solid: 'bg-slate-600' }
  };

  function renderProjectColorPicker(selectedColor = 'indigo') {
    const container = document.getElementById('prjFormCalColorSwatches');
    const badge = document.getElementById('prjFormCalColorNameBadge');
    const input = document.getElementById('prjFormCalendarColor');
    if (!container) return;

    const chosen = selectedColor || (input && input.value) || 'indigo';
    if (input) input.value = chosen;

    const pal = PROJECT_CAL_PALETTES[chosen] || PROJECT_CAL_PALETTES.indigo;
    if (badge) {
      badge.textContent = pal.label;
      badge.className = `text-[10px] font-bold px-2 py-0.5 rounded-full ${pal.bg} ${pal.text} border ${pal.border}`;
    }

    container.innerHTML = Object.entries(PROJECT_CAL_PALETTES).map(([k, p]) => {
      const isSel = k === chosen;
      return `
        <button type="button" onclick="selectProjectCalendarColor('${k}')"
          class="w-6 h-6 rounded-full ${p.solid} transition cursor-pointer flex items-center justify-center ${isSel ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-xs' : 'opacity-80 hover:opacity-100 hover:scale-105'}"
          title="${p.label}">
          ${isSel ? '<i data-lucide="check" class="w-3 h-3 text-white"></i>' : ''}
        </button>
      `;
    }).join('');

    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function selectProjectCalendarColor(colorKey) {
    const input = document.getElementById('prjFormCalendarColor');
    if (input) input.value = colorKey;

    renderProjectColorPicker(colorKey);

    const projectId = getFormProjectId();
    if (!projectId) return;

    const allProjects = getProjectsList();
    const prj = allProjects.find(p => p && p.id === projectId);
    if (prj) {
      prj.calendarColor = colorKey;
      prj.color = colorKey;
      if (Array.isArray(prj.calendarEvents)) {
        // Update all events of this project to use the project theme color
        prj.calendarEvents = prj.calendarEvents.map(e => ({
          ...e,
          color: colorKey,
          projectColor: colorKey
        }));
      }
    }

    if (window.appState && Array.isArray(window.appState.projects)) {
      const statePrj = window.appState.projects.find(p => p && p.id === projectId);
      if (statePrj) {
        statePrj.calendarColor = colorKey;
        statePrj.color = colorKey;
        if (Array.isArray(statePrj.calendarEvents)) {
          statePrj.calendarEvents = statePrj.calendarEvents.map(e => ({
            ...e,
            color: colorKey,
            projectColor: colorKey
          }));
        }
      }
    }

    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('admin:updateProjectCalendar', {
        projectId,
        calendarEvents: (prj && prj.calendarEvents) || [],
        showInMainCalendar: (prj && prj.showInMainCalendar !== false),
        calendarColor: colorKey,
        color: colorKey
      });
    }

    if (typeof window.saveLocalState === 'function') window.saveLocalState();

    renderFormCalendarEvents(projectId);
    if (typeof window.renderProjectCalendarView === 'function' && window.activeDetailProjectId === projectId) {
      window.renderProjectCalendarView(projectId);
    }
    if (typeof window.renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') {
      window.renderAdminCalendarSection();
    }
    if (typeof window.renderUserCalendarSection === 'function') {
      window.renderUserCalendarSection();
    }
    if (typeof window.renderTodayEventsBanner === 'function') {
      window.renderTodayEventsBanner();
    }

    const pal = PROJECT_CAL_PALETTES[colorKey] || PROJECT_CAL_PALETTES.indigo;
    if (typeof showToast === 'function') {
      showToast(`ปรับสีปฏิทินโครงการเป็น "${pal.label}" เรียบร้อยแล้ว`, 'success');
    }
  }

  // Form Project Calendar View State (Month vs List)
  let formCalendarView = 'MONTH';
  let formCalendarCurrentDate = new Date();

  function setFormCalendarView(view) {
    formCalendarView = (view === 'LIST') ? 'LIST' : 'MONTH';
    const monthBtn = document.getElementById('prjFormCalBtnViewMonth');
    const listBtn = document.getElementById('prjFormCalBtnViewList');
    if (monthBtn && listBtn) {
      if (formCalendarView === 'MONTH') {
        monthBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-card text-foreground shadow-2xs transition cursor-pointer';
        listBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer';
      } else {
        listBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-card text-foreground shadow-2xs transition cursor-pointer';
        monthBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer';
      }
    }
    renderFormCalendarEvents(getFormProjectId());
  }

  function navigateFormCalendarMonth(delta) {
    if (delta === 0) {
      formCalendarCurrentDate = new Date();
    } else {
      const year = formCalendarCurrentDate.getFullYear();
      const month = formCalendarCurrentDate.getMonth();
      formCalendarCurrentDate = new Date(year, month + delta, 1);
    }
    renderFormCalendarEvents(getFormProjectId());
  }

  function renderFormMonthGridView(events, targetId) {
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const cur = formCalendarCurrentDate || new Date();
    const year = cur.getFullYear();
    const month = cur.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let html = `
      <div class="space-y-3">
        <!-- Month Navigation Header -->
        <div class="flex items-center justify-between px-1">
          <h4 class="font-extrabold text-sm sm:text-base text-foreground">
            ${thaiMonths[month]} ${year + 543}
          </h4>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="navigateFormCalendarMonth(0)"
              class="h-7 px-2.5 rounded-full border border-border bg-card hover:bg-muted text-foreground text-[11px] font-semibold flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95" title="กลับไปเดือนปัจจุบัน">
              วันนี้
            </button>
            <div class="flex items-center gap-1">
              <button type="button" onclick="navigateFormCalendarMonth(-1)"
                class="w-7 h-7 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition shadow-2xs cursor-pointer active:scale-95" title="เดือนก่อนหน้า">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="navigateFormCalendarMonth(1)"
                class="w-7 h-7 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition shadow-2xs cursor-pointer active:scale-95" title="เดือนถัดไป">
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Month Grid -->
        <div class="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
          <!-- Day names -->
          <div class="grid grid-cols-7 bg-muted/60 border-b border-border text-center py-1.5 text-[11px] font-bold text-muted-foreground">
            ${thaiDays.map((d, idx) => `<div class="${idx === 0 ? 'text-rose-500' : ''}">${d}</div>`).join('')}
          </div>

          <!-- Day cells -->
          <div class="grid grid-cols-7 divide-x divide-y divide-border/60">
    `;

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="min-h-[75px] sm:min-h-[85px] p-1 bg-muted/10 opacity-40"></div>`;
    }

    // Days cells
    for (let day = 1; day <= totalDays; day++) {
      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => {
        const sd = String(e.startDate || '').slice(0, 10);
        const ed = String(e.endDate || e.startDate || '').slice(0, 10);
        return sd && sd <= dayDateStr && dayDateStr <= (ed >= sd ? ed : sd);
      });
      const isToday = dayDateStr === todayIso;

      html += `
        <div class="min-h-[75px] sm:min-h-[85px] p-1 sm:p-1.5 bg-card hover:bg-muted/30 transition flex flex-col justify-between group">
          <div class="flex items-center justify-between mb-0.5">
            <span class="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${isToday ? 'bg-primary text-white shadow-2xs' : 'text-foreground'}">
              ${day}
            </span>
            <button type="button" onclick="openAddCalendarEventModal(null, '${dayDateStr}', '${targetId}')"
              class="opacity-0 group-hover:opacity-100 transition w-5 h-5 rounded hover:bg-primary/10 text-primary flex items-center justify-center text-[10px] cursor-pointer" title="เพิ่มกิจกรรมในวันที่ ${day}">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <!-- Event badges in day cell -->
          <div class="space-y-0.5 overflow-y-auto max-h-[50px] scrollbar-none">
            ${dayEvents.map(e => {
              const styles = typeof window.getEventVisualStyles === 'function'
                ? window.getEventVisualStyles(e)
                : { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', dot: 'bg-primary' };
              const catInfo = styles.catMeta || {};
              return `
                <div onclick="openCalendarEventDetailModal('${e.id}')"
                  class="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate cursor-pointer transition ${styles.bg} ${styles.text} border ${styles.border} hover:scale-[1.02] flex items-center justify-between group/chip"
                  title="${e.title} (${e.startTime || ''})">
                  <span class="truncate flex-1 flex items-center gap-1 min-w-0">
                    <span class="w-1.5 h-1.5 rounded-full ${styles.dot} shrink-0" title="ประเภท: ${catInfo.label || ''}"></span>
                    ${(e.startTime && !e.isAllDay && String(e.startDate).slice(0, 10) === dayDateStr) ? `<span class="opacity-75 mr-0.5 shrink-0">${e.startTime}</span>` : ''}
                    <span class="truncate font-semibold">${e.title}</span>
                  </span>
                  <button type="button" onclick="event.stopPropagation(); openAddCalendarEventModal('${e.id}', null, '${targetId}')"
                    class="opacity-0 group-hover/chip:opacity-100 hover:scale-125 ml-1 text-inherit hover:text-primary transition shrink-0 p-0.5 cursor-pointer"
                    title="แก้ไขกิจกรรมนี้">
                    <i data-lucide="square-pen" class="w-2.5 h-2.5"></i>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Trailing empty cells
    const totalSlots = firstDay + totalDays;
    const trailing = (7 - (totalSlots % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      html += `<div class="min-h-[75px] sm:min-h-[85px] p-1 bg-muted/10 opacity-40"></div>`;
    }

    html += `
          </div>
        </div>
      </div>
    `;
    return html;
  }

  function renderFormCalendarEvents(projectId = null) {
    const targetId = projectId || getFormProjectId();
    const container = document.getElementById('prjFormCalendarEventsContainer');
    const badge = document.getElementById('prjFormCalEventsTotalBadge');
    if (!container) return;

    const allProjects = getProjectsList();
    const prj = allProjects.find(p => p && p.id === targetId);
    const events = (prj && Array.isArray(prj.calendarEvents)) ? [...prj.calendarEvents] : [];

    if (badge) badge.textContent = `${events.length} กิจกรรม`;

    // Sync switcher buttons state
    const monthBtn = document.getElementById('prjFormCalBtnViewMonth');
    const listBtn = document.getElementById('prjFormCalBtnViewList');
    if (monthBtn && listBtn) {
      if (formCalendarView === 'MONTH') {
        monthBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-card text-foreground shadow-2xs transition cursor-pointer';
        listBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer';
      } else {
        listBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-card text-foreground shadow-2xs transition cursor-pointer';
        monthBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer';
      }
    }

    // Render Month Grid
    if (formCalendarView === 'MONTH') {
      container.innerHTML = renderFormMonthGridView(events, targetId);
      if (typeof window.refreshIcons === 'function') window.refreshIcons();
      else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      return;
    }

    // Render List View
    if (events.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 px-4 bg-muted/20 border border-dashed border-border rounded-2xl space-y-2">
          <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-base">
            <i data-lucide="calendar" class="w-5 h-5"></i>
          </div>
          <p class="text-xs text-muted-foreground">ยังไม่มีกำหนดการหรือกิจกรรมในโครงการนี้</p>
          <div class="flex items-center justify-center gap-2 pt-1">
            <button type="button" onclick="openAddCalendarEventModal(null, null, getFormProjectId())"
              class="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition cursor-pointer shadow-2xs">
              + เพิ่มกิจกรรมแรก
            </button>
            <button type="button" onclick="triggerImportProjectCalendarIcsForForm()"
              class="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-medium transition cursor-pointer">
              นำเข้า .ics
            </button>
          </div>
        </div>
      `;
      if (typeof window.refreshIcons === 'function') window.refreshIcons();
      else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      return;
    }

    events.sort((a, b) => {
      const dtA = `${a.startDate || ''}T${a.startTime || '00:00'}`;
      const dtB = `${b.startDate || ''}T${b.startTime || '00:00'}`;
      return dtA.localeCompare(dtB);
    });

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    let html = '<div class="space-y-2 max-h-[360px] overflow-y-auto pr-1">';
    events.forEach(evt => {
      const styles = typeof window.getEventVisualStyles === 'function'
        ? window.getEventVisualStyles(evt)
        : { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', dot: 'bg-primary' };
      const catInfo = styles.catMeta || { label: 'กิจกรรม', icon: 'star' };

      const sDate = String(evt.startDate || '').split('-');
      const dayNum = sDate[2] ? parseInt(sDate[2], 10) : '01';
      const monthNum = sDate[1] ? parseInt(sDate[1], 10) - 1 : 0;
      const monthStr = thaiMonths[monthNum] || 'ม.ค.';
      const safeTitle = (evt.title || '').replace(/'/g, "\\'");

      html += `
        <div class="bg-card border border-border/80 hover:border-primary/40 rounded-xl p-3 shadow-2xs transition flex items-center justify-between gap-3 group">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg ${styles.bg} ${styles.text} border ${styles.border} flex flex-col items-center justify-center shrink-0">
              <span class="text-xs font-black leading-none">${dayNum}</span>
              <span class="text-[9px] font-bold uppercase mt-0.5">${monthStr}</span>
            </div>
            <div class="space-y-0.5 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${catInfo.bg || styles.bg} ${catInfo.text || styles.text} border ${catInfo.border || styles.border}">
                  <span class="w-1.5 h-1.5 rounded-full ${catInfo.dot || styles.dot} shrink-0"></span>
                  <i data-lucide="${catInfo.icon || 'star'}" class="w-2.5 h-2.5 inline-block"></i>
                  <span>${catInfo.label || 'กิจกรรม'}</span>
                </span>
                <span class="text-[11px] text-muted-foreground flex items-center gap-1">
                  <i data-lucide="clock" class="w-3 h-3"></i>
                  ${evt.isAllDay ? 'ตลอดทั้งวัน' : `${evt.startTime || '09:00'} - ${evt.endTime || '12:00'} น.`}
                </span>
                ${evt.location ? `
                  <span class="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-[150px]">
                    <i data-lucide="map-pin" class="w-3 h-3 text-rose-500"></i> ${evt.location}
                  </span>
                ` : ''}
              </div>
              <h5 class="text-xs font-bold text-foreground truncate cursor-pointer hover:text-primary transition"
                onclick="openCalendarEventDetailModal('${evt.id}')" title="${evt.title}">
                ${evt.title}
              </h5>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button type="button" onclick="openAddCalendarEventModal('${evt.id}', null, '${targetId}')"
              class="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition cursor-pointer"
              title="แก้ไขกิจกรรมนี้">
              <i data-lucide="square-pen" class="w-3.5 h-3.5"></i>
            </button>
            <button type="button" onclick="confirmDeleteCalendarEvent('${evt.id}', '${safeTitle}', '${targetId}')"
              class="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center transition cursor-pointer"
              title="ลบกิจกรรมนี้">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  // Helper: Retrieve all project stakeholders & duties for calendar assignee selection
  function getProjectStakeholdersForCalendar(projectId) {
    const list = [];
    const roleSet = new Set();
    const isCurrentForm = Boolean(projectId && document.getElementById('prjFormId')?.value === projectId);

    let leaders = [];
    let members = [];
    let advisors = [];
    let smoOfficers = [];

    if (isCurrentForm) {
      leaders = Array.isArray(prjFormLeaders) ? prjFormLeaders : [];
      members = Array.isArray(prjFormMembers) ? prjFormMembers : [];
      advisors = Array.isArray(prjFormAdvisors) ? prjFormAdvisors : [];
      smoOfficers = Array.isArray(prjFormSmoOfficers) ? prjFormSmoOfficers : [];
    }

    if (leaders.length === 0 && members.length === 0 && advisors.length === 0 && smoOfficers.length === 0 && projectId) {
      const allProjects = typeof getProjectsList === 'function' ? getProjectsList() : (window.appState?.projects || []);
      const prj = allProjects.find(p => p && p.id === projectId);
      if (prj) {
        leaders = Array.isArray(prj.leaders) ? prj.leaders : [];
        members = Array.isArray(prj.members) ? prj.members : [];
        advisors = Array.isArray(prj.advisors) ? prj.advisors : [];
        smoOfficers = Array.isArray(prj.smoOfficers) ? prj.smoOfficers : [];
      }
    }

    // Default common project duties
    const defaultRoles = [
      'หัวหน้าโครงการ',
      'รองหัวหน้าโครงการ',
      'ผู้ประสานงานโครงการ',
      'เลขานุการโครงการ',
      'ฝ่ายสถานที่และอุปกรณ์',
      'ฝ่ายพิธีการและสันทนาการ',
      'ฝ่ายทะเบียนและต้อนรับ',
      'ฝ่ายสวัสดิการและพยาบาล',
      'ฝ่ายสื่อ สารสนเทศและประชาสัมพันธ์',
      'ฝ่ายการเงินและงบประมาณ',
      'ฝ่ายประเมินผล',
      'อาจารย์ที่ปรึกษาโครงการ',
      'ผู้ดูแลจากสโมสรนักศึกษา'
    ];
    defaultRoles.forEach(r => roleSet.add(r));

    // Process leaders
    leaders.forEach(l => {
      if (!l || !l.name || !l.name.trim()) return;
      const name = l.name.trim();
      const nick = (l.nickname || '').trim();
      const displayName = nick ? `${name} (${nick})` : name;
      const duty = (l.duty || l.dept || 'หัวหน้าโครงการ').trim();
      if (duty) roleSet.add(duty);
      list.push({ name, nickname: nick, displayName, duty, group: 'ผู้รับผิดชอบโครงการ (Leaders)' });
    });

    // Process members
    members.forEach(m => {
      if (!m || !m.name || !m.name.trim()) return;
      const name = m.name.trim();
      const nick = (m.nickname || '').trim();
      const displayName = nick ? `${name} (${nick})` : name;
      const duty = (m.duty || m.dept || 'ฝ่ายดำเนินงาน').trim();
      if (duty) roleSet.add(duty);
      if (m.dept && m.dept.trim()) roleSet.add(m.dept.trim());
      list.push({ name, nickname: nick, displayName, duty, dept: m.dept || '', group: 'สมาชิกโครงการ (Members)' });
    });

    // Process advisors
    advisors.forEach(a => {
      if (!a || !a.name || !a.name.trim()) return;
      const name = a.name.trim();
      const nick = (a.nickname || '').trim();
      const displayName = nick ? `${name} (${nick})` : name;
      const duty = (a.duty || a.dept || 'อาจารย์ที่ปรึกษาโครงการ').trim();
      if (duty) roleSet.add(duty);
      list.push({ name, nickname: nick, displayName, duty, group: 'ที่ปรึกษาโครงการ (Advisors)' });
    });

    // Process smo
    smoOfficers.forEach(s => {
      if (!s || !s.name || !s.name.trim()) return;
      const name = s.name.trim();
      const nick = (s.nickname || '').trim();
      const displayName = nick ? `${name} (${nick})` : name;
      const duty = (s.duty || s.dept || 'ผู้ดูแลจากสโมสรนักศึกษา').trim();
      if (duty) roleSet.add(duty);
      list.push({ name, nickname: nick, displayName, duty, group: 'สโมสรนักศึกษา (SMO)' });
    });

    return {
      stakeholders: list,
      roles: Array.from(roleSet)
    };
  }
  if (typeof window !== 'undefined') {
    window.getProjectStakeholdersForCalendar = getProjectStakeholdersForCalendar;
    window.renderProjectColorPicker = renderProjectColorPicker;
    window.selectProjectCalendarColor = selectProjectCalendarColor;
    window.setFormCalendarView = setFormCalendarView;
    window.navigateFormCalendarMonth = navigateFormCalendarMonth;
  }

  function triggerImportProjectCalendarIcsForForm() {
    const input = document.getElementById('prjFormCalIcsFileInput');
    if (input) input.click();
  }

  function handleFormProjectCalendarIcsImport(e) {
    const file = e.target.files && e.target.files[0];
    const projectId = getFormProjectId();
    if (!file || !projectId) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const text = evt.target.result;
        if (typeof window.parseIcsText !== 'function') {
          return showToast('ระบบไม่พร้อมสำหรับการอ่านไฟล์ .ics', 'error');
        }
        const parsedEvents = window.parseIcsText(text);
        if (!parsedEvents || parsedEvents.length === 0) {
          return showToast('ไม่พบข้อมูลกิจกรรมในไฟล์ .ics ที่อัปโหลด', 'warning');
        }

        const allProjects = getProjectsList();
        let prj = allProjects.find(p => p && p.id === projectId);
        if (!prj) {
          prj = {
            id: projectId,
            title: document.getElementById('prjFormTitle')?.value?.trim() || 'โครงการร่างใหม่',
            calendarEvents: [],
            showInMainCalendar: document.getElementById('prjFormShowInMainCalToggle')?.checked !== false
          };
          allProjects.push(prj);
        }

        if (!Array.isArray(prj.calendarEvents)) prj.calendarEvents = [];
        let addedCount = 0;
        parsedEvents.forEach(pe => {
          const newEv = {
            id: 'evt_prj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: pe.title || 'กิจกรรมใหม่',
            description: pe.description || '',
            category: pe.category || 'EVENT',
            color: pe.color || 'indigo',
            startDate: pe.startDate,
            startTime: pe.startTime || '09:00',
            endDate: pe.endDate || pe.startDate,
            endTime: pe.endTime || '12:00',
            isAllDay: Boolean(pe.isAllDay),
            location: pe.location || '',
            assignees: Array.isArray(pe.assignees) ? pe.assignees : [],
            createdSource: 'ICS_IMPORT',
            projectId: prj.id
          };
          prj.calendarEvents.push(newEv);
          addedCount++;
        });
        prj.updatedAt = new Date().toISOString();

        if (window.socket && typeof window.socket.emit === 'function') {
          window.socket.emit('admin:updateProjectCalendar', {
            projectId,
            calendarEvents: prj.calendarEvents,
            showInMainCalendar: prj.showInMainCalendar !== false
          });
        }
        if (typeof window.saveLocalState === 'function') window.saveLocalState();

        renderFormCalendarEvents(projectId);
        if (typeof renderProjectCalendarView === 'function' && activeDetailProjectId === projectId) {
          renderProjectCalendarView(projectId);
        }

        if (prj.showInMainCalendar !== false) {
          if (typeof window.renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') window.renderAdminCalendarSection();
          if (typeof window.renderUserCalendarSection === 'function') window.renderUserCalendarSection();
        }

        if (typeof showToast === 'function') {
          showToast(`นำเข้า ${addedCount} กิจกรรมเข้าสู่โครงการเรียบร้อยแล้ว`, 'success');
        }
      } catch (err) {
        console.error('Error importing project ICS in form:', err);
        if (typeof showToast === 'function') showToast('ไม่สามารถอ่านไฟล์ .ics ได้', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleFormShowInMainCalToggleChanged(isChecked) {
    const projectId = getFormProjectId();
    if (!projectId) return;
    const isBool = Boolean(isChecked);

    const allProjects = getProjectsList();
    const prj = allProjects.find(p => p && p.id === projectId);
    if (prj) {
      prj.showInMainCalendar = isBool;
    }
    if (window.appState && Array.isArray(window.appState.projects)) {
      const statePrj = window.appState.projects.find(p => p && p.id === projectId);
      if (statePrj) statePrj.showInMainCalendar = isBool;
    }

    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('admin:updateProjectCalendar', {
        projectId,
        calendarEvents: (prj && prj.calendarEvents) || [],
        showInMainCalendar: isBool
      });
    }
    if (typeof window.saveLocalState === 'function') window.saveLocalState();
    if (typeof window.renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') {
      window.renderAdminCalendarSection();
    }
    if (typeof window.renderUserCalendarSection === 'function') {
      window.renderUserCalendarSection();
    }
    if (typeof window.renderTodayEventsBanner === 'function') {
      window.renderTodayEventsBanner();
    }
  }

  function exportCurrentProjectCalendarIcs() {
    if (!activeDetailProjectId) return;
    const allProjects = getProjectsList();
    const prj = allProjects.find(p => p && p.id === activeDetailProjectId);
    if (!prj) return;

    const events = Array.isArray(prj.calendarEvents) ? prj.calendarEvents : [];
    if (events.length === 0) {
      if (typeof showToast === 'function') showToast('ไม่มีกิจกรรมในโครงการนี้สำหรับส่งออก', 'warning');
      return;
    }

    if (typeof window.generateIcsString !== 'function') {
      if (typeof showToast === 'function') showToast('ระบบสร้างไฟล์ .ics ไม่พร้อมใช้งาน', 'error');
      return;
    }

    const icsContent = window.generateIcsString(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (prj.title || 'project').replace(/[/\\?%*:|"<>]/g, '_');
    link.download = `${safeTitle}_calendar.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') showToast('ส่งออกไฟล์ปฏิทิน .ics ของโครงการเรียบร้อยแล้ว', 'success');
  }

  let activePreviewPerson = null;

  // Person Photo Preview Lightbox Modal
  function openPersonPhotoPreviewModal(personOrId) {
    if (!personOrId) return;
    let person = personOrId;
    if (typeof personOrId === 'string' && activeDetailProjectId) {
      const allProjects = getProjectsList();
      const prj = allProjects.find(item => item.id === activeDetailProjectId);
      if (prj) {
        const found = (prj.members || []).find(m => m.id === personOrId || m.name === personOrId)
          || (prj.leaders || []).find(l => l.id === personOrId || l.name === personOrId)
          || (prj.advisors || []).find(a => a.id === personOrId || a.name === personOrId)
          || (prj.smoOfficers || []).find(s => s.id === personOrId || s.name === personOrId);
        if (found) person = found;
      }
    }
    if (!person || typeof person !== 'object') return;

    const modal = document.getElementById('personPhotoPreviewModal');
    if (!modal) return;

    const nameEl = document.getElementById('personPhotoModalName');
    const nicknameEl = document.getElementById('personPhotoModalNickname');
    const roleEl = document.getElementById('personPhotoModalRole');
    const deptEl = document.getElementById('personPhotoModalDept');
    const imgEl = document.getElementById('personPhotoModalImg');
    const fullLinkEl = document.getElementById('personPhotoModalFullLink');
    const detailsWrapper = document.getElementById('personPhotoModalDetailsWrapper');
    const detailsEl = document.getElementById('personPhotoModalDetails');
    const phoneBtn = document.getElementById('personPhotoModalPhoneBtn');
    const phoneText = document.getElementById('personPhotoModalPhoneText');
    const mailBtn = document.getElementById('personPhotoModalMailBtn');
    const mailText = document.getElementById('personPhotoModalMailText');
    const linkBtn = document.getElementById('personPhotoModalLinkBtn');
    activePreviewPerson = person;

    const editBtn = document.getElementById('personPhotoModalEditBtn');
    if (editBtn) editBtn.classList.toggle('hidden', window.currentRole !== 'ADMIN');
    const deleteBtn = document.getElementById('personPhotoModalDeleteBtn');
    if (deleteBtn) deleteBtn.classList.toggle('hidden', window.currentRole !== 'ADMIN');

    const name = person.name || 'ไม่ระบุชื่อ';
    const nickname = person.nickname ? `(${person.nickname})` : '';
    const seed = person.nickname || person.name || 'member';
    const fallback = getCuteAvatarUrl(seed);
    const avatar = person.avatar || fallback;

    if (nameEl) nameEl.textContent = name;
    if (nicknameEl) nicknameEl.textContent = nickname;
    if (roleEl) roleEl.textContent = person.role || 'สมาชิกโครงการ';

    if (deptEl) {
      const depts = getMemberDepartments(person);
      if (depts.length > 0 && depts[0] !== 'ฝ่ายดำเนินงานทั่วไป') {
        deptEl.innerHTML = depts.map(d => `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getDepartmentBadgeClass(d)}">${escapeHtml(d)}</span>`).join(' ');
        deptEl.classList.remove('hidden');
      } else if (person.department) {
        deptEl.textContent = person.department;
        deptEl.classList.remove('hidden');
      } else {
        deptEl.classList.add('hidden');
      }
    }

    if (imgEl) {
      imgEl.src = avatar;
      imgEl.onerror = () => { imgEl.src = fallback; };
    }

    if (fullLinkEl) {
      if (person.avatar && (person.avatar.startsWith('http') || person.avatar.startsWith('//'))) {
        fullLinkEl.href = person.avatar;
        fullLinkEl.classList.remove('hidden');
      } else {
        fullLinkEl.classList.add('hidden');
      }
    }

    if (detailsWrapper && detailsEl) {
      if (Array.isArray(person.rolesList) && person.rolesList.length > 1) {
        detailsEl.innerHTML = `
          <div class="space-y-1.5">
            <p class="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">หน้าที่และความรับผิดชอบในโครงการ (${person.rolesList.length} หน้าที่):</p>
            ${person.rolesList.map(r => {
              const roleTitle = r.duty || r.position || 'ทีมงาน';
              return `
                <div class="p-2 rounded-xl bg-card border border-border/70 space-y-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0">${r.index}</span>
                    <span class="font-bold text-foreground text-xs">${escapeHtml(roleTitle)}</span>
                    ${r.department ? `<span class="text-[10px] px-1.5 py-0.2 rounded-md font-semibold border ${getDepartmentBadgeClass(r.department)} ml-auto">${escapeHtml(r.department)}</span>` : ''}
                  </div>
                  ${r.description ? `<p class="text-[11px] text-muted-foreground pl-6 leading-relaxed">${escapeHtml(r.description)}</p>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;
        detailsWrapper.classList.remove('hidden');
      } else if (person.details && person.details.trim()) {
        detailsEl.textContent = person.details.trim();
        detailsWrapper.classList.remove('hidden');
      } else {
        detailsWrapper.classList.add('hidden');
      }
    }

    if (phoneBtn && phoneText) {
      if (person.phone) {
        phoneBtn.href = `tel:${person.phone}`;
        phoneText.textContent = person.phone;
        phoneBtn.classList.remove('hidden');
      } else {
        phoneBtn.classList.add('hidden');
      }
    }

    if (mailBtn && mailText) {
      if (person.kkuMail) {
        mailBtn.href = `mailto:${person.kkuMail}`;
        mailText.textContent = person.kkuMail;
        mailBtn.classList.remove('hidden');
      } else {
        mailBtn.classList.add('hidden');
      }
    }

    if (linkBtn) {
      if (person.contactLink) {
        linkBtn.href = person.contactLink;
        linkBtn.classList.remove('hidden');
      } else {
        linkBtn.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function closePersonPhotoPreviewModal() {
    const modal = document.getElementById('personPhotoPreviewModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
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

    // Show/hide Clear All & Add Member buttons based on role
    const clearAllBtn = document.getElementById('prjDetailBtnClearAllMembers');
    if (clearAllBtn) clearAllBtn.classList.toggle('hidden', !isAdmin || members.length === 0);
    const addBtn = document.getElementById('prjDetailBtnAddMember');
    if (addBtn) addBtn.classList.toggle('hidden', !isAdmin);

    // Show/hide Table Action Header
    const actionTh = document.getElementById('prjDetailTableActionTh');
    if (actionTh) actionTh.classList.toggle('hidden', !isAdmin);

    // Count departments (supports multiple departments per person)
    const deptMap = {};
    members.forEach(m => {
      const deptsList = getMemberDepartments(m);
      deptsList.forEach(d => {
        deptMap[d] = (deptMap[d] || 0) + 1;
      });
    });
    const depts = Object.keys(deptMap);

    // Update Counter Badges
    const countBadge = document.getElementById('prjDetailMembersCountBadge');
    if (countBadge) countBadge.textContent = `${members.length} คน`;

    const deptCountText = document.getElementById('prjDetailDeptCountText');
    if (deptCountText) deptCountText.textContent = `ทั้งหมด ${depts.length} ฝ่ายงาน`;

    const deptColorConfigBtn = document.getElementById('prjDetailDeptColorConfigBtn');
    if (deptColorConfigBtn) {
      deptColorConfigBtn.classList.toggle('hidden', window.currentRole !== 'ADMIN');
    }

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
      const memberDepts = getMemberDepartments(m);
      if (detailMemberDeptFilter !== 'ALL' && !memberDepts.includes(detailMemberDeptFilter)) return false;
      if (q) {
        const nameMatch = (m.name || '').toLowerCase().includes(q);
        const nickMatch = (m.nickname || '').toLowerCase().includes(q);
        const deptMatch = memberDepts.some(d => d.toLowerCase().includes(q));
        const roleMatch = (m.role || '').toLowerCase().includes(q);
        const detailMatch = (m.details || '').toLowerCase().includes(q);
        const phoneMatch = (m.phone || '').toLowerCase().includes(q);
        const mailMatch = (m.kkuMail || '').toLowerCase().includes(q);
        if (!nameMatch && !nickMatch && !deptMatch && !roleMatch && !detailMatch && !phoneMatch && !mailMatch) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const colSpan = 4;
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
      const depts = getMemberDepartments(m);
      const name = m.name || 'ไม่ระบุชื่อ';
      const nickname = m.nickname ? `(${m.nickname})` : '';
      const seed = m.nickname || m.name || m.id || `member_${idx}`;
      const fallbackUrl = getCuteAvatarUrl(seed);
      const avatarUrl = m.avatar || fallbackUrl;

      return `
        <tr onclick="window.openPersonPhotoPreviewModal && window.openPersonPhotoPreviewModal('${escapeJs(m.id || m.name)}')"
            class="hover:bg-muted/50 cursor-pointer transition-colors group select-none"
            title="คลิกเพื่อดูโปรไฟล์และรายละเอียดฉบับเต็ม">
          <!-- # -->
          <td class="py-3 px-3 text-center font-mono font-medium text-muted-foreground text-[11px]">
            ${idx + 1}
          </td>

          <!-- Member / Name -->
          <td class="py-3 px-3">
            <div class="flex items-center gap-2.5">
              <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}"
                class="w-8 h-8 rounded-full object-cover ring-1 ring-border shrink-0 shadow-2xs group-hover:ring-2 group-hover:ring-primary group-hover:scale-105 transition-all duration-200"
                onerror="this.onerror=null; this.src='${fallbackUrl}';" />
              <div class="min-w-0">
                <p class="font-bold text-foreground text-xs truncate group-hover:text-primary transition-colors" title="${escapeHtml(name)} ${escapeHtml(nickname)}">
                  ${escapeHtml(name)} ${nickname ? `<span class="font-normal text-muted-foreground">(${escapeHtml(m.nickname)})</span>` : ''}
                </p>
                ${m.phone || m.kkuMail ? `
                  <p class="text-[10px] text-muted-foreground/80 truncate font-mono">
                    ${escapeHtml(m.phone || m.kkuMail)}
                  </p>
                ` : ''}
              </div>
            </div>
          </td>

          <!-- Department (ฝ่าย) -->
          <td class="py-3 px-3">
            <div class="flex items-center gap-1 flex-wrap">
              ${depts.map(d => `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getDepartmentBadgeClass(d)}">
                  <i data-lucide="tag" class="h-3 w-3 shrink-0"></i>
                  <span class="truncate max-w-[130px]" title="${escapeHtml(d)}">${escapeHtml(d)}</span>
                </span>
              `).join('')}
            </div>
          </td>

          <!-- Role (หน้าที่ในโครงการ) -->
          <td class="py-3 px-3">
            ${Array.isArray(m.rolesList) && m.rolesList.length > 1 ? `
              <div class="flex flex-col gap-1">
                ${m.rolesList.map(r => {
                  const roleTitle = r.duty || r.position || 'ทีมงาน';
                  return `
                    <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-foreground border border-border">
                      <span class="text-foreground font-semibold">${escapeHtml(roleTitle)}</span>
                      ${r.department && depts.length > 1 ? `<span class="text-[10px] text-muted-foreground font-normal">(${escapeHtml(r.department)})</span>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-foreground border border-border">
                <span class="truncate max-w-[140px]" title="${escapeHtml(m.role || m.position || 'ทีมงาน')}">${escapeHtml(m.role || m.position || 'ทีมงาน')}</span>
              </span>
            `}
          </td>
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

    const splitByComma = (val) => {
      if (!val) return [];
      return String(val)
        .split(/[,،、\n;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    };

    const getRowValue = (row, possibleKeys) => {
      if (!row || typeof row !== 'object') return '';
      const rowKeys = Object.keys(row);

      // Phase 1: exact trimmed case-insensitive
      for (const pKey of possibleKeys) {
        const cleanP = pKey.trim().toLowerCase();
        for (const k of rowKeys) {
          if (k.trim().toLowerCase() === cleanP) {
            const v = row[k];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
              return String(v).trim();
            }
          }
        }
      }

      // Phase 2: normalized (strip spaces, slashes, dashes, colons)
      const norm = str => String(str).toLowerCase().replace(/[\s\-_/\\|:]/g, '');
      for (const pKey of possibleKeys) {
        const normP = norm(pKey);
        for (const k of rowKeys) {
          if (norm(k) === normP) {
            const v = row[k];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
              return String(v).trim();
            }
          }
        }
      }

      return '';
    };

    return rows.map((r, idx) => {
      // 1. Departments (support multi-department)
      const rawDeptStr = getRowValue(r, [
        'ฝ่ายที่สังกัด', 'ฝ่ายงาน', 'ฝ่าย', 'แผนก', 'หมวด', 'สังกัด', 'department', 'dept', 'division', 'team'
      ]);
      const hasExplicitDept = Boolean(rawDeptStr);
      const rawDepts = splitByComma(rawDeptStr);

      // 2. Positions, Duties, Descriptions (comma-separated alignment matching)
      const rawDutyStr = getRowValue(r, [
        'หน้าที่ / บทบาท', 'หน้าที่/บทบาท', 'บทบาท / หน้าที่', 'บทบาท/หน้าที่', 'หน้าที่ในโครงการ', 'หน้าที่รับผิดชอบ',
        'หน้าที่และความรับผิดชอบ', 'หน้าที่', 'บทบาท', 'ภาระงาน', 'role', 'roles', 'duty', 'duties'
      ]);
      const hasExplicitDuty = Boolean(rawDutyStr);
      const rawDuties = splitByComma(rawDutyStr);

      const rawPosStr = getRowValue(r, [
        'ตำแหน่งในโครงการ', 'ตำแหน่ง / หน้าที่', 'ตำแหน่ง/หน้าที่', 'ตำแหน่ง', 'position', 'title'
      ]);
      const hasExplicitPos = Boolean(rawPosStr);
      const rawPositions = splitByComma(rawPosStr);

      const rawDescStr = getRowValue(r, [
        'รายละเอียดหน้าที่ความรับผิดชอบ', 'รายละเอียดหน้าที่', 'หน้าที่ความรับผิดชอบ', 'ความรับผิดชอบ',
        'รายละเอียด', 'คำอธิบาย', 'อธิบาย', 'details', 'description', 'desc'
      ]);
      const hasExplicitDesc = Boolean(rawDescStr);
      const rawDescs = splitByComma(rawDescStr);

      const hasExplicitRole = hasExplicitDuty || hasExplicitPos || hasExplicitDesc;

      const maxLen = Math.max(rawDuties.length, rawPositions.length, rawDescs.length, rawDepts.length, 1);
      const rolesList = [];

      for (let i = 0; i < maxLen; i++) {
        // Connect index i of duty with index i of department
        const dept = rawDepts[i] || (rawDepts.length === 1 ? rawDepts[0] : (rawDepts[rawDepts.length - 1] || (hasExplicitDept ? rawDeptStr : 'ฝ่ายดำเนินงานทั่วไป')));
        const duty = rawDuties[i] || (rawDuties.length === 1 ? rawDuties[0] : (rawPositions[i] || ''));
        const pos = rawPositions[i] || (rawPositions.length === 1 ? rawPositions[0] : '');
        const desc = rawDescs[i] || (rawDescs.length === 1 ? rawDescs[0] : '');

        if (dept || duty || pos || desc || maxLen === 1) {
          rolesList.push({
            index: i + 1,
            position: pos,
            duty: duty || pos || (hasExplicitRole ? '' : 'ทีมงาน'),
            description: desc,
            department: dept || 'ฝ่ายดำเนินงานทั่วไป'
          });
        }
      }

      // Unique departments
      const uniqueDepts = Array.from(new Set(
        rawDepts.length > 0 ? rawDepts : rolesList.map(item => item.department).filter(Boolean)
      ));
      if (uniqueDepts.length === 0 && !hasExplicitDept) uniqueDepts.push('ฝ่ายดำเนินงานทั่วไป');
      const departmentSummary = uniqueDepts.join(', ');

      // Role summary string
      let roleSummary = '';
      if (rawDuties.length > 0) {
        roleSummary = rawDuties.join(', ');
      } else if (rawPositions.length > 0) {
        roleSummary = rawPositions.join(', ');
      } else if (hasExplicitRole) {
        roleSummary = rolesList.map(item => item.duty || item.position).filter(Boolean).join(', ') || 'ทีมงาน';
      } else {
        roleSummary = 'ทีมงาน';
      }

      // Details summary string
      const detailsSummary = rawDescs.length > 0
        ? rawDescs.join('; ')
        : (rolesList.map(item => item.description).filter(Boolean).join('; ') || '');

      // Name & Nickname
      let name = getRowValue(r, [
        'ชื่อ-นามสกุล', 'ชื่อ - นามสกุล', 'ชื่อ-สกุล', 'ชื่อ สกุล', 'ชื่อ นามสกุล', 'ชื่อ', 'รายชื่อ', 'สมาชิก', 'ผู้เกี่ยวข้อง', 'name', 'full name', 'fullname'
      ]);
      const lastName = getRowValue(r, ['นามสกุล', 'last name', 'lastname']);
      if (lastName && !name.includes(lastName)) {
        name = `${name} ${lastName}`.trim();
      }

      const nickname = getRowValue(r, ['ชื่อเล่น', 'nickname', 'nick name', 'nick']);
      const phone = getRowValue(r, ['เบอร์ติดต่อ', 'เบอร์โทร', 'เบอร์โทรศัพท์', 'เบอร์', 'โทรศัพท์', 'phone', 'tel', 'mobile']);
      const kkuMail = getRowValue(r, ['kku-mail', 'kkumail', 'kku mail', 'อีเมล kku', 'อีเมล', 'email', 'mail']);
      const contactLink = getRowValue(r, ['ลิงก์ช่องทางติดต่อ', 'ลิงก์ติดต่อ', 'ช่องทางติดต่อ', 'ลิงก์', 'โซเชียล', 'contact link', 'contact', 'social', 'ig', 'facebook', 'line']);
      let avatar = getRowValue(r, ['ลิงก์รูปหน้า', 'รูปหน้า', 'รูปโปรไฟล์', 'รูปภาพ', 'รูป', 'โปรไฟล์', 'avatar', 'photo', 'image']);
      if (avatar) {
        avatar = resolveGoogleDriveImageUrl(avatar);
      }

      return {
        id: `MBR-${Date.now()}-${idx + 1}`,
        name: name || `สมาชิก #${idx + 1}`,
        nickname,
        department: departmentSummary,
        departments: uniqueDepts,
        hasExplicitDept,
        hasExplicitRole,
        hasExplicitDesc,
        role: roleSummary,
        position: '',
        details: detailsSummary,
        rolesList,
        phone,
        kkuMail,
        contactLink,
        avatar
      };
    }).filter(m => m.name && m.name.trim());
  }

  // Smart Upsert: matches existing members by name/email, updating details while PRESERVING avatars & contacts
  function upsertMembersList(targetList, incomingList) {
    let updatedCount = 0;
    let addedCount = 0;

    function normalizePersonName(name) {
      if (!name) return '';
      return String(name)
        .replace(/^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|mr\.|ms\.|mrs\.)\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    }

    incomingList.forEach(incoming => {
      const incNorm = normalizePersonName(incoming.name);
      const incMail = (incoming.kkuMail || '').trim().toLowerCase();

      // Find match in targetList
      const existingIdx = targetList.findIndex(existing => {
        if (incMail && existing.kkuMail && existing.kkuMail.trim().toLowerCase() === incMail) {
          return true;
        }
        if (incNorm && normalizePersonName(existing.name) === incNorm) {
          return true;
        }
        return false;
      });

      if (existingIdx !== -1) {
        // UPDATE existing person while PRESERVING connected data (avatar, contact channels, etc.)
        const existing = targetList[existingIdx];

        // Departments: if incoming has explicit department, use it! If not, keep existing!
        let finalDepts = [];
        let finalDeptStr = '';
        if (incoming.hasExplicitDept && incoming.departments && incoming.departments.length > 0) {
          finalDepts = incoming.departments;
          finalDeptStr = incoming.department;
        } else {
          finalDepts = getMemberDepartments(existing);
          finalDeptStr = existing.department || finalDepts.join(', ');
        }

        // Roles & Duties: if incoming has explicit role, use it! If not, keep existing!
        const finalRole = incoming.hasExplicitRole ? incoming.role : (existing.role || 'ทีมงาน');
        const finalPosition = incoming.hasExplicitRole ? incoming.position : (existing.position || '');
        const finalDetails = incoming.hasExplicitDesc ? incoming.details : (existing.details || '');
        const finalRolesList = (incoming.hasExplicitRole && Array.isArray(incoming.rolesList) && incoming.rolesList.length > 0)
          ? incoming.rolesList
          : (existing.rolesList || []);

        targetList[existingIdx] = {
          ...existing,
          // Update name/nickname
          name: incoming.name || existing.name,
          nickname: incoming.nickname || existing.nickname || '',
          // Departments
          department: finalDeptStr,
          departments: finalDepts,
          // Roles & Duties
          role: finalRole,
          position: finalPosition,
          details: finalDetails,
          rolesList: finalRolesList,
          // Contacts: update if provided, preserve if empty!
          phone: incoming.phone || existing.phone || '',
          kkuMail: incoming.kkuMail || existing.kkuMail || '',
          contactLink: incoming.contactLink || existing.contactLink || '',
          // Avatar: PRESERVE existing avatar if incoming is empty!
          avatar: incoming.avatar || existing.avatar || ''
        };
        updatedCount++;
      } else {
        // INSERT new person
        targetList.push(incoming);
        addedCount++;
      }
    });

    return { updatedCount, addedCount, total: targetList.length };
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

          if (!Array.isArray(p.members)) p.members = [];

          // Pre-count matches for the confirm dialog
          function normalizePersonName(name) {
            if (!name) return '';
            return String(name).replace(/^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|mr\.|ms\.|mrs\.)\s*/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
          }
          let matchCount = 0;
          let newCount = 0;
          parsed.forEach(inc => {
            const incNorm = normalizePersonName(inc.name);
            const incMail = (inc.kkuMail || '').trim().toLowerCase();
            const exists = p.members.some(m => (incMail && m.kkuMail && m.kkuMail.trim().toLowerCase() === incMail) || (incNorm && normalizePersonName(m.name) === incNorm));
            if (exists) matchCount++;
            else newCount++;
          });

          const confirmed = typeof window.showConfirmDialog === 'function'
            ? await window.showConfirmDialog({
                title: 'ยืนยันการอัปเดตและนำเข้ารายชื่อ',
                message: `พบรายชื่อในไฟล์ Excel ทั้งหมด ${parsed.length} คน\n• มีข้อมูลเดิมในระบบ: ${matchCount} คน (จะอัปเดตหน้าที่/ฝ่าย โดยคงรูปโปรไฟล์และข้อมูลเดิมไว้)\n• รายชื่อสมาชิกใหม่: ${newCount} คน\n\nต้องการดำเนินการเข้าสู่โครงการ "${p.title}" ใช่หรือไม่?`,
                confirmText: 'อัปเดตและนำเข้าข้อมูล',
                cancelText: 'ยกเลิก',
                isDanger: false,
                icon: 'file-spreadsheet',
                actionIcon: 'file-spreadsheet'
              })
            : true;

          if (!confirmed) return;

          const res = upsertMembersList(p.members, parsed);

          if (window.socket && typeof window.socket.emit === 'function') {
            window.socket.emit('admin:updateProject', p);
          }

          if (typeof saveLocalState === 'function') saveLocalState();
          if (typeof window.persistProjectsToCloud === 'function') {
            window.persistProjectsToCloud(true);
          }

          renderProjectMembersTableView(p);
          if (typeof showToast === 'function') {
            showToast(`นำเข้าสำเร็จ: ปรับปรุงข้อมูล ${res.updatedCount} คน, เพิ่มสมาชิกใหม่ ${res.addedCount} คน`, 'success');
          }
        } catch (err) {
          console.error('Error importing Excel:', err);
          if (typeof showToast === 'function') showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ' + err.message, 'error');
        } finally {
          event.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      event.target.value = '';
    }
  }

  // Handle Excel Import inside Admin Project Edit Form Repeater
  function handleFormMembersExcelImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async function (e) {
        try {
          const parsed = parseMembersFromExcelBuffer(e.target.result);
          if (parsed.length === 0) {
            if (typeof showToast === 'function') showToast('ไม่พบข้อมูลรายชื่อในไฟล์ Excel', 'warning');
            return;
          }

          function normalizePersonName(name) {
            if (!name) return '';
            return String(name).replace(/^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|mr\.|ms\.|mrs\.)\s*/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
          }
          let matchCount = 0;
          let newCount = 0;
          parsed.forEach(inc => {
            const incNorm = normalizePersonName(inc.name);
            const incMail = (inc.kkuMail || '').trim().toLowerCase();
            const exists = prjFormMembers.some(m => (incMail && m.kkuMail && m.kkuMail.trim().toLowerCase() === incMail) || (incNorm && normalizePersonName(m.name) === incNorm));
            if (exists) matchCount++;
            else newCount++;
          });

          const confirmed = typeof window.showConfirmDialog === 'function'
            ? await window.showConfirmDialog({
                title: 'ยืนยันการอัปเดตและนำเข้ารายชื่อเข้าสู่ฟอร์ม',
                message: `พบรายชื่อในไฟล์ Excel ทั้งหมด ${parsed.length} คน\n• มีข้อมูลเดิมในฟอร์ม: ${matchCount} คน (จะอัปเดตข้อมูลโดยคงรูปภาพและข้อมูลเดิมไว้)\n• รายชื่อใหม่: ${newCount} คน\n\nต้องการนำเข้าข้อมูลใช่หรือไม่?`,
                confirmText: 'อัปเดตและเพิ่มรายชื่อ',
                cancelText: 'ยกเลิก',
                isDanger: false,
                icon: 'file-spreadsheet',
                actionIcon: 'file-spreadsheet'
              })
            : true;

          if (!confirmed) return;

          const res = upsertMembersList(prjFormMembers, parsed);
          renderRepeater('MEMBERS');
          if (typeof showToast === 'function') {
            showToast(`นำเข้าสำเร็จ: ปรับปรุงข้อมูล ${res.updatedCount} คน, เพิ่มใหม่ ${res.addedCount} คน`, 'success');
          }
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast('เกิดข้อผิดพลาดในการนำเข้า: ' + err.message, 'error');
        } finally {
          event.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      event.target.value = '';
    }
  }

  // Clear all members in Project Detail Modal Table
  async function clearAllProjectDetailMembers() {
    if (window.currentRole !== 'ADMIN') {
      if (typeof showToast === 'function') showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถล้างรายชื่อได้', 'warning');
      return;
    }
    if (!activeDetailProjectId) return;
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (!p || !Array.isArray(p.members) || p.members.length === 0) {
      if (typeof showToast === 'function') showToast('ไม่มีรายชื่อสมาชิกให้ล้าง', 'info');
      return;
    }

    const count = p.members.length;
    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'ยืนยันการล้างรายชื่อทั้งหมดในโครงการ',
          message: `คุณต้องการลบรายชื่อสมาชิกทั้งหมดจำนวน ${count} คน ออกจากโครงการ "${p.title}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
          confirmText: `ล้างรายชื่อทั้งหมด (${count} คน)`,
          cancelText: 'ยกเลิก',
          isDanger: true,
          icon: 'trash-2'
        })
      : false;

    if (!confirmed) return;

    p.members = [];
    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('admin:updateProject', p);
    }
    if (typeof saveLocalState === 'function') saveLocalState();
    if (typeof window.persistProjectsToCloud === 'function') {
      window.persistProjectsToCloud(true);
    }

    renderProjectMembersTableView(p);
    if (typeof showToast === 'function') {
      showToast(`ล้างรายชื่อสมาชิกทั้งหมด (${count} คน) เรียบร้อยแล้ว`, 'info');
    }
  }

  // Download Sample Excel Template
  function downloadProjectMembersTemplate() {
    if (typeof XLSX === 'undefined') {
      if (typeof showToast === 'function') showToast('กำลังโหลดไลบรารี Excel กรุณาลองใหม่อีกครั้ง', 'warning');
      return;
    }

    const templateData = [
      ['ฝ่าย', 'หน้าที่ / บทบาท', 'รายละเอียดหน้าที่', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'เบอร์ติดต่อ', 'KKU-MAIL', 'ลิงก์ติดต่อ', 'ลิงก์รูปหน้า'],
      ['ฝ่ายกิจกรรมและสันทนาการ, ฝ่ายสถานที่และสวัสดิการ', 'ออกแบบเกมสันทนาการ, จัดเตรียมอุปกรณ์', 'ดูแลเกมค่ายและกลุ่มสัมพันธ์, จัดเตรียมห้อง CP9127 และระบบเสียง', 'นางสาวพิมพ์ชนก รัตนสุวรรณ', 'พลอย', '089-876-5432', 'pimchanok.r@kkumail.com', 'https://instagram.com/ploy_cs', ''],
      ['ฝ่ายกิจกรรมและสันทนาการ', 'สตาฟฟ์นันทนาการและเพลง', 'ดูแลกิจกรรมร้องเพลง เต้นประกอบจังหวะ และนำเกมกลุ่มย่อย', 'นายธนกฤต มั่นคง', 'เจมส์', '085-111-2233', 'thanakrit.m@kkumail.com', 'https://facebook.com/james.comsan', ''],
      ['ฝ่ายสถานที่และสวัสดิการ', 'หัวหน้าฝ่ายสถานที่และสวัสดิการ', 'จัดเตรียมอุปกรณ์ค่าย อาหาร น้ำดื่ม และการประสานงานพื้นที่', 'นายกิตติศักดิ์ พรหมดี', 'ฟีฟ่า', '082-345-6789', 'kittisak.p@kkumail.com', 'https://line.me/ti/p/~fifa_cs', ''],
      ['ฝ่ายสถานที่และสวัสดิการ, ฝ่ายยานพาหนะ', 'จัดเต็นท์พักแรม, ประสานงานรถตู้', 'ดูแลการเดินทางและระบบไฟฟ้าส่องสว่าง, ประสานงานรถรับส่งนักศึกษา', 'นายชินวัตร วิเศษศักดิ์', 'อาร์ม', '084-999-8877', 'chinawat.w@kkumail.com', 'https://line.me/ti/p/~arm_cs', ''],
      ['ฝ่ายพยาบาลและสุขอนามัย', 'เจ้าหน้าที่พยาบาลประจำค่าย', 'จัดเตรียมกระเป๋ายา เวชภัณฑ์ และดูแลสุขภาพของชาวค่าย', 'นางสาวสุชาวดี มีสุข', 'ฟ้า', '086-444-5566', 'suchawadee.m@kkumail.com', 'https://instagram.com/fah_care', ''],
      ['ฝ่ายสื่อและประชาสัมพันธ์', 'บันทึกภาพและผลิตสื่อ', 'บันทึกภาพนิ่ง วิดีโอกิจกรรม และผลิตสื่อสรุปผลโครงการ', 'นายวรเมธ ศรีสวัสดิ์', 'นิว', '087-333-2211', 'worameth.s@kkumail.com', 'https://instagram.com/new_photo', ''],
      ['ฝ่ายทะเบียนและประเมินผล', 'รับลงทะเบียนและประเมินผล', 'รับลงทะเบียน แจกป้ายชื่อ รวบรวมแบบประเมินและสรุปรายงานสถิติ', 'นางสาวกานดา นวลจันทร์', 'มายด์', '083-222-1100', 'kanda.n@kkumail.com', 'https://line.me/ti/p/~mind_kanda', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);

    ws['!cols'] = [
      { wch: 32 }, // ฝ่าย
      { wch: 32 }, // หน้าที่ / บทบาท
      { wch: 50 }, // รายละเอียดหน้าที่
      { wch: 28 }, // ชื่อ-นามสกุล
      { wch: 12 }, // ชื่อเล่น
      { wch: 16 }, // เบอร์ติดต่อ
      { wch: 28 }, // KKU-MAIL
      { wch: 32 }, // ลิงก์ติดต่อ
      { wch: 22 }  // ลิงก์รูปหน้า
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
      ['ลำดับ', 'ฝ่ายงาน', 'หน้าที่ / บทบาท', 'รายละเอียดหน้าที่', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'เบอร์ติดต่อ', 'KKU-MAIL', 'ลิงก์ช่องทางติดต่อ']
    ];

    members.forEach((m, idx) => {
      const depts = getMemberDepartments(m);
      let duties = m.role || 'ทีมงาน';
      let descs = m.details || '';

      if (Array.isArray(m.rolesList) && m.rolesList.length > 0) {
        duties = m.rolesList.map(r => r.duty || r.position).filter(Boolean).join(', ') || duties;
        descs = m.rolesList.map(r => r.description).filter(Boolean).join('; ') || descs;
      }

      rows.push([
        idx + 1,
        depts.join(', '),
        duties,
        descs,
        m.name || '',
        m.nickname || '',
        m.phone || '',
        m.kkuMail || '',
        m.contactLink || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 30 }, // ฝ่ายงาน
      { wch: 25 }, // ตำแหน่ง
      { wch: 30 }, // หน้าที่
      { wch: 45 }, // รายละเอียดหน้าที่
      { wch: 28 }, // ชื่อ-นามสกุล
      { wch: 12 }, // ชื่อเล่น
      { wch: 16 }, // เบอร์ติดต่อ
      { wch: 28 }, // KKU-MAIL
      { wch: 32 }  // ลิงก์ช่องทางติดต่อ
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
                onclick="window.openPersonPhotoPreviewModal && window.openPersonPhotoPreviewModal({
                  name: '${escapeJs(name)}',
                  nickname: '${escapeJs(person.nickname || '')}',
                  role: '${escapeJs(role)}',
                  department: '${escapeJs(person.department || '')}',
                  avatar: '${escapeJs(avatarUrl)}',
                  phone: '${escapeJs(person.phone || '')}',
                  kkuMail: '${escapeJs(person.kkuMail || '')}',
                  contactLink: '${escapeJs(person.contactLink || '')}',
                  details: '${escapeJs(person.details || '')}'
                })"
                class="w-12 h-12 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0 shadow-sm cursor-pointer hover:ring-primary hover:scale-105 transition-all duration-200"
                title="คลิกเพื่อดูรูปโปรไฟล์ขนาดเต็ม"
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
  // -------------------------------------------------------------
  // UNSAVED CHANGES CONFIRMATION POPUP SYSTEM
  // -------------------------------------------------------------
  let initialAdminPrjFormSnapshot = null;
  let initialMemberEditSnapshot = null;

  function promptUnsavedChanges() {
    return new Promise(resolve => {
      const modal = document.getElementById('prjUnsavedChangesModal');
      if (!modal) {
        const ok = confirm('คุณยังไม่ได้บันทึกการเปลี่ยนแปลง ต้องการออกโดยไม่บันทึกหรือไม่?');
        return resolve(ok ? 'DISCARD' : 'STAY');
      }

      const saveBtn = document.getElementById('prjUnsavedSaveBtn');
      const discardBtn = document.getElementById('prjUnsavedDiscardBtn');
      const stayBtn = document.getElementById('prjUnsavedStayBtn');

      const cleanup = (choice) => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        resolve(choice);
      };

      if (saveBtn) saveBtn.onclick = () => cleanup('SAVE');
      if (discardBtn) discardBtn.onclick = () => cleanup('DISCARD');
      if (stayBtn) stayBtn.onclick = () => cleanup('STAY');

      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (typeof window.refreshIcons === 'function') window.refreshIcons();
      else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    });
  }

  function getAdminProjectFormSnapshot() {
    return JSON.stringify({
      title: document.getElementById('prjFormTitle')?.value || '',
      code: document.getElementById('prjFormCode')?.value || '',
      academicYear: document.getElementById('prjFormAcademicYear')?.value || '',
      status: document.getElementById('prjFormStatus')?.value || '',
      startDate: document.getElementById('prjFormStartDate')?.value || '',
      endDate: document.getElementById('prjFormEndDate')?.value || '',
      location: document.getElementById('prjFormLocation')?.value || '',
      budget: document.getElementById('prjFormBudget')?.value || '',
      summary: document.getElementById('prjFormSummary')?.value || '',
      description: document.getElementById('prjFormDescription')?.value || '',
      googleDriveUrl: document.getElementById('prjFormGoogleDriveUrl')?.value || '',
      docTitle: document.getElementById('prjFormDocTitle')?.value || '',
      docUrl: document.getElementById('prjFormDocUrl')?.value || '',
      budgetDocTitle: document.getElementById('prjFormBudgetDocTitle')?.value || '',
      budgetDocAmount: document.getElementById('prjFormBudgetDocAmount')?.value || '',
      budgetDocUrl: document.getElementById('prjFormBudgetDocUrl')?.value || '',
      photoFolderUrl: currentPhotoFolderUrl || '',
      showInMainCalendar: Boolean(document.getElementById('prjFormShowInMainCalToggle')?.checked),
      leaders: prjFormLeaders || [],
      members: prjFormMembers || [],
      advisors: prjFormAdvisors || [],
      smo: prjFormSmoOfficers || []
    });
  }

  function getMemberEditFormSnapshot() {
    return JSON.stringify({
      name: document.getElementById('prjMemberEditName')?.value || '',
      nickname: document.getElementById('prjMemberEditNickname')?.value || '',
      dept: document.getElementById('prjMemberEditDept')?.value || '',
      duty: document.getElementById('prjMemberEditDuty')?.value || '',
      details: document.getElementById('prjMemberEditDetails')?.value || '',
      phone: document.getElementById('prjMemberEditPhone')?.value || '',
      email: document.getElementById('prjMemberEditEmail')?.value || '',
      contactLink: document.getElementById('prjMemberEditContactLink')?.value || '',
      avatar: editingMemberAvatar || ''
    });
  }

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

    // By default, keep ALL repeaters (Leaders, Members, Advisors, SMO) collapsed as compact summary rows!
    expandedLeadersIndices.clear();
    expandedMembersIndices.clear();
    expandedAdvisorsIndices.clear();
    expandedSmoIndices.clear();

    // Google Drive Photo Folder & Catalog
    currentPhotoFolderUrl = (isEdit && p && p.photoFolderUrl) ? p.photoFolderUrl : '';
    drivePhotoCatalog = (isEdit && p && Array.isArray(p.photoCatalog)) ? JSON.parse(JSON.stringify(p.photoCatalog)) : [];
    const photoFolderInput = document.getElementById('prjFormPhotoFolderUrl');
    if (photoFolderInput) photoFolderInput.value = currentPhotoFolderUrl;
    updateDrivePhotoFolderStatusUi();

    // Project Calendar & Schedule Section in Form
    const toggleShowInMain = document.getElementById('prjFormShowInMainCalToggle');
    if (toggleShowInMain) {
      toggleShowInMain.checked = (isEdit && p && p.showInMainCalendar !== false) || !isEdit;
    }
    const calColor = (isEdit && p && (p.calendarColor || p.color)) || 'indigo';
    const colorInput = document.getElementById('prjFormCalendarColor');
    if (colorInput) colorInput.value = calColor;
    renderProjectColorPicker(calColor);
    renderFormCalendarEvents((isEdit && p) ? p.id : null);

    // Render repeaters
    renderRepeater('LEADERS');
    renderRepeater('MEMBERS');
    renderRepeater('ADVISORS');
    renderRepeater('SMO');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

    // Snapshot initial form state for unsaved change protection
    initialAdminPrjFormSnapshot = getAdminProjectFormSnapshot();
  }

  async function closeAdminProjectEditModal(force = false) {
    if (!force && initialAdminPrjFormSnapshot) {
      const current = getAdminProjectFormSnapshot();
      if (current !== initialAdminPrjFormSnapshot) {
        const choice = await promptUnsavedChanges();
        if (choice === 'STAY') return;
        if (choice === 'SAVE') {
          saveProjectFromAdminForm();
          return;
        }
        // choice === 'DISCARD' -> proceed to close
      }
    }

    const modal = document.getElementById('adminProjectEditModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    initialAdminPrjFormSnapshot = null;
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
        const uniqueDepts = Array.from(new Set(list.flatMap(m => getMemberDepartments(m)).filter(Boolean)));
        const currentVal = formMembersDeptFilter;
        deptSelect.innerHTML = `
          <option value="ALL" ${currentVal === 'ALL' ? 'selected' : ''}>ทุกฝ่ายงาน (${list.length})</option>
          ${uniqueDepts.map(d => {
            const count = list.filter(m => getMemberDepartments(m).includes(d)).length;
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
        const itemDepts = getMemberDepartments(item);
        if (deptFilter !== 'ALL' && !itemDepts.includes(deptFilter)) return '';
        if (q) {
          const matchName = (item.name || '').toLowerCase().includes(q);
          const matchNick = (item.nickname || '').toLowerCase().includes(q);
          const matchDept = itemDepts.some(d => d.toLowerCase().includes(q)) || (item.department || '').toLowerCase().includes(q);
          const matchRole = (item.role || '').toLowerCase().includes(q);
          const matchPhone = (item.phone || '').toLowerCase().includes(q);
          const matchMail = (item.kkuMail || '').toLowerCase().includes(q);
          if (!matchName && !matchNick && !matchDept && !matchRole && !matchPhone && !matchMail) return '';
        }
      }

      const isExpanded = expandedSet.has(idx);
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

                ${type === 'MEMBERS' ? (() => {
                  const depts = getMemberDepartments(item);
                  if (depts.length === 0 || (depts.length === 1 && depts[0] === 'ฝ่ายดำเนินงานทั่วไป' && !item.department)) return '';
                  return `
                    <div class="flex items-center gap-1 flex-wrap shrink-0">
                      ${depts.map(d => `
                        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getDepartmentBadgeClass(d)} max-w-[130px] truncate" title="${escapeHtml(d)}">
                          ${escapeHtml(d)}
                        </span>
                      `).join('')}
                    </div>
                  `;
                })() : ''}

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
              ${type === 'MEMBERS' ? (() => {
                const depts = getMemberDepartments(item);
                if (depts.length === 0 || (depts.length === 1 && depts[0] === 'ฝ่ายดำเนินงานทั่วไป' && !item.department)) return '';
                return `
                  <div class="flex items-center gap-1 flex-wrap shrink-0">
                    ${depts.map(d => `
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getDepartmentBadgeClass(d)}">
                        ${escapeHtml(d)}
                      </span>
                    `).join('')}
                  </div>
                `;
              })() : ''}
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
                <label class="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center justify-between flex-wrap gap-1">
                  <span class="flex items-center gap-1">
                    <i data-lucide="tag" class="h-3 w-3"></i> ฝ่ายงานที่สังกัด (Department / Division) *
                  </span>
                  <span class="text-[10px] font-normal text-muted-foreground">สังกัดได้มากกว่า 1 ฝ่าย โดยคั่นด้วยเครื่องหมายจุลภาค (,)</span>
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
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                หน้าที่ / บทบาท <span class="text-[10px] opacity-75">(คั่นด้วย , หากมีหลายหน้าที่)</span>
              </label>
              <input type="text" value="${escapeHtml(item.role || '')}"
                oninput="updateRepeaterField('${type}', ${idx}, 'role', this.value)"
                placeholder="เช่น หัวหน้าฝ่ายกิจกรรม, สตาฟฟ์นันทนาการ"
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
                      <span>อัปโหลดรูป</span>
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
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                รายละเอียดหน้าที่ความรับผิดชอบ <span class="text-[10px] opacity-75">(ถ้ามี - หากมีหลายหน้าที่ ให้คั่นด้วยเครื่องหมายจุลภาค , ให้ตรงกับหน้าที่)</span>
              </label>
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

  async function removeRepeaterItem(type, index) {
    let list;
    let label = 'บุคคล';
    if (type === 'LEADERS') { list = prjFormLeaders; label = 'ผู้รับผิดชอบโครงการ'; }
    else if (type === 'MEMBERS') { list = prjFormMembers; label = 'สมาชิกผู้เกี่ยวข้อง'; }
    else if (type === 'ADVISORS') { list = prjFormAdvisors; label = 'ที่ปรึกษาโครงการ'; }
    else if (type === 'SMO') { list = prjFormSmoOfficers; label = 'สโมสรนักศึกษา'; }

    const item = list && list[index];
    const name = item ? (item.name || `${label} #${index + 1}`) : label;

    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'ยืนยันการลบรายชื่อ',
          message: `คุณต้องการลบ "${name}" ออกจากรายชื่อโครงการใช่หรือไม่?`,
          confirmText: 'ลบรายชื่อ',
          cancelText: 'ยกเลิก',
          isDanger: true,
          icon: 'trash-2'
        })
      : true;

    if (!confirmed) return;

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
    if (typeof showToast === 'function') {
      showToast(`ลบ "${name}" เรียบร้อยแล้ว`, 'info');
    }
  }

  // Clear all members in Project Edit Form Repeater
  async function clearAllRepeaterMembers(type = 'MEMBERS') {
    let list;
    let label = 'บุคคลในโครงการ';
    if (type === 'LEADERS') { list = prjFormLeaders; label = 'ผู้รับผิดชอบโครงการ'; }
    else if (type === 'MEMBERS') { list = prjFormMembers; label = 'สมาชิกผู้เกี่ยวข้อง'; }
    else if (type === 'ADVISORS') { list = prjFormAdvisors; label = 'ที่ปรึกษาโครงการ'; }
    else if (type === 'SMO') { list = prjFormSmoOfficers; label = 'สโมสรนักศึกษา'; }

    if (!list || list.length === 0) {
      if (typeof showToast === 'function') showToast(`ไม่มีรายชื่อ${label}ให้ล้าง`, 'info');
      return;
    }

    const count = list.length;
    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: `ยืนยันการล้างรายชื่อ${label}ทั้งหมด`,
          message: `คุณต้องการล้างรายชื่อ${label}ทั้งหมดจำนวน ${count} คน ออกจากฟอร์มใช่หรือไม่?`,
          confirmText: `ล้างทั้งหมด (${count} คน)`,
          cancelText: 'ยกเลิก',
          isDanger: true,
          icon: 'trash-2'
        })
      : false;

    if (!confirmed) return;

    if (type === 'LEADERS') {
      prjFormLeaders.length = 0;
      expandedLeadersIndices.clear();
    } else if (type === 'MEMBERS') {
      prjFormMembers.length = 0;
      expandedMembersIndices.clear();
    } else if (type === 'ADVISORS') {
      prjFormAdvisors.length = 0;
      expandedAdvisorsIndices.clear();
    } else if (type === 'SMO') {
      prjFormSmoOfficers.length = 0;
      expandedSmoIndices.clear();
    }

    renderRepeater(type);
    if (typeof showToast === 'function') {
      showToast(`ล้างรายชื่อ${label}ทั้งหมด (${count} คน) เรียบร้อยแล้ว`, 'info');
    }
  }

  function updateRepeaterField(type, index, field, value) {
    let list;
    if (type === 'LEADERS') list = prjFormLeaders;
    else if (type === 'MEMBERS') list = prjFormMembers;
    else if (type === 'ADVISORS') list = prjFormAdvisors;
    else if (type === 'SMO') list = prjFormSmoOfficers;

    if (list && list[index]) {
      list[index][field] = value;
      if (field === 'department') {
        const depts = String(value).split(/[,，،、\n;]/).map(d => d.trim()).filter(Boolean);
        list[index].departments = depts.length > 0 ? depts : ['ฝ่ายดำเนินงานทั่วไป'];
      }
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

    const showInMainCalendar = document.getElementById('prjFormShowInMainCalToggle')
      ? document.getElementById('prjFormShowInMainCalToggle').checked
      : true;

    const existingPrj = (getProjectsList() || []).find(p => p && p.id === id);
    const existingCalEvents = (existingPrj && Array.isArray(existingPrj.calendarEvents)) ? existingPrj.calendarEvents : [];

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
      smoOfficers: prjFormSmoOfficers.filter(s => s.name && s.name.trim()),
      calendarEvents: existingCalEvents,
      calendarColor: document.getElementById('prjFormCalendarColor')?.value || 'indigo',
      color: document.getElementById('prjFormCalendarColor')?.value || 'indigo',
      showInMainCalendar
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
        if (typeof window.persistProjectsToCloud === 'function') {
          window.persistProjectsToCloud(true);
        } else {
          const sb = (window.supabaseSocketAdapter)
            ? window.supabaseSocketAdapter
            : ((window.socket && window.socket.engine && typeof window.socket.engine.scheduleSaveToSupabase === 'function')
              ? window.socket.engine
              : ((window.socket && typeof window.socket.scheduleSaveToSupabase === 'function') ? window.socket : null));
          if (sb) {
            sb.lastKnownProjects = window.appState.projects;
            sb.scheduleSaveToSupabase(window.appState, true);
          }
        }
      } catch (e) {}
    }

    closeAdminProjectEditModal(true);
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
    if (typeof window.renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') {
      window.renderAdminCalendarSection();
    }
    if (typeof window.renderUserCalendarSection === 'function') {
      window.renderUserCalendarSection();
    }
    if (typeof window.renderTodayEventsBanner === 'function') {
      window.renderTodayEventsBanner();
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

    // Record in deleted projects list so it can never be accidentally revived by sync
    try {
      const raw = localStorage.getItem('comsan_deleted_project_ids');
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.includes(projectId)) arr.push(projectId);
      localStorage.setItem('comsan_deleted_project_ids', JSON.stringify(arr.slice(-200)));
    } catch (e) {}

    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('admin:deleteProject', { projectId });
    }

    if (window.appState && Array.isArray(window.appState.projects)) {
      window.appState.projects = window.appState.projects.filter(p => p && p.id !== projectId);
      if (typeof saveLocalState === 'function') saveLocalState();

      // Guarantee immediate direct persistence to Supabase without delay
      try {
        if (typeof window.persistProjectsToCloud === 'function') {
          window.persistProjectsToCloud(true);
        } else {
          const sb = (window.supabaseSocketAdapter)
            ? window.supabaseSocketAdapter
            : ((window.socket && window.socket.engine && typeof window.socket.engine.scheduleSaveToSupabase === 'function')
              ? window.socket.engine
              : ((window.socket && typeof window.socket.scheduleSaveToSupabase === 'function') ? window.socket : null));
          if (sb) {
            sb.lastKnownProjects = window.appState.projects;
            sb.scheduleSaveToSupabase(window.appState, true);
          }
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

  // ========================================================
  // IN-WEB MEMBER EDIT & ADD ENGINE (DIRECT WEB EDITING)
  // ========================================================
  let editingMemberId = null;
  let editingMemberAvatar = '';

  function openEditProjectMemberModal(memberIdOrName) {
    if (window.currentRole !== 'ADMIN') {
      if (typeof showToast === 'function') showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขข้อมูลได้', 'warning');
      return;
    }
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (!p || !Array.isArray(p.members)) return;

    const member = p.members.find(m => m.id === memberIdOrName || m.name === memberIdOrName);
    if (!member) {
      if (typeof showToast === 'function') showToast('ไม่พบข้อมูลผู้เกี่ยวข้องรายนี้', 'warning');
      return;
    }

    editingMemberId = member.id || member.name;
    editingMemberAvatar = member.avatar || '';

    const modal = document.getElementById('projectMemberEditModal');
    if (!modal) return;

    const titleEl = document.getElementById('prjMemberEditModalTitle');
    const subtitleEl = document.getElementById('prjMemberEditModalSubtitle');
    if (titleEl) titleEl.textContent = 'แก้ไขข้อมูลผู้เกี่ยวข้องในโครงการ';
    if (subtitleEl) subtitleEl.textContent = `โครงการ: ${p.title}`;

    const idInput = document.getElementById('prjMemberEditMemberId');
    if (idInput) idInput.value = member.id || '';

    const nameInput = document.getElementById('prjMemberEditName');
    if (nameInput) nameInput.value = member.name || '';

    const nickInput = document.getElementById('prjMemberEditNickname');
    if (nickInput) nickInput.value = member.nickname || '';

    const depts = getMemberDepartments(member);
    const deptInput = document.getElementById('prjMemberEditDept');
    if (deptInput) deptInput.value = member.department || depts.join(', ');

    const dutyInput = document.getElementById('prjMemberEditDuty');
    if (dutyInput) dutyInput.value = member.role || '';

    const posInput = document.getElementById('prjMemberEditPosition');
    if (posInput) posInput.value = member.position || '';

    const detailsInput = document.getElementById('prjMemberEditDetails');
    if (detailsInput) detailsInput.value = member.details || '';

    const phoneInput = document.getElementById('prjMemberEditPhone');
    if (phoneInput) phoneInput.value = member.phone || '';

    const emailInput = document.getElementById('prjMemberEditEmail');
    if (emailInput) emailInput.value = member.kkuMail || '';

    const linkInput = document.getElementById('prjMemberEditContactLink');
    if (linkInput) linkInput.value = member.contactLink || '';

    updateMemberEditModalPhotoUi(member.name, member.nickname, member.avatar);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

    initialMemberEditSnapshot = getMemberEditFormSnapshot();
  }

  function openAddProjectMemberModal() {
    if (window.currentRole !== 'ADMIN') {
      if (typeof showToast === 'function') showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเพิ่มสมาชิกได้', 'warning');
      return;
    }
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (!p) return;

    editingMemberId = null;
    editingMemberAvatar = '';

    const modal = document.getElementById('projectMemberEditModal');
    if (!modal) return;

    const titleEl = document.getElementById('prjMemberEditModalTitle');
    const subtitleEl = document.getElementById('prjMemberEditModalSubtitle');
    if (titleEl) titleEl.textContent = 'เพิ่มผู้เกี่ยวข้องในโครงการ';
    if (subtitleEl) subtitleEl.textContent = `โครงการ: ${p.title}`;

    const idInput = document.getElementById('prjMemberEditMemberId');
    if (idInput) idInput.value = '';

    const nameInput = document.getElementById('prjMemberEditName');
    if (nameInput) {
      nameInput.value = '';
      setTimeout(() => nameInput.focus(), 100);
    }

    const nickInput = document.getElementById('prjMemberEditNickname');
    if (nickInput) nickInput.value = '';

    const defaultDept = (detailMemberDeptFilter && detailMemberDeptFilter !== 'ALL')
      ? detailMemberDeptFilter
      : 'ฝ่ายกิจกรรมและสันทนาการ';
    const deptInput = document.getElementById('prjMemberEditDept');
    if (deptInput) deptInput.value = defaultDept;

    const dutyInput = document.getElementById('prjMemberEditDuty');
    if (dutyInput) dutyInput.value = 'ทีมงาน';

    const posInput = document.getElementById('prjMemberEditPosition');
    if (posInput) posInput.value = '';

    const detailsInput = document.getElementById('prjMemberEditDetails');
    if (detailsInput) detailsInput.value = '';

    const phoneInput = document.getElementById('prjMemberEditPhone');
    if (phoneInput) phoneInput.value = '';

    const emailInput = document.getElementById('prjMemberEditEmail');
    if (emailInput) emailInput.value = '';

    const linkInput = document.getElementById('prjMemberEditContactLink');
    if (linkInput) linkInput.value = '';

    updateMemberEditModalPhotoUi('new_member', '', '');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

    initialMemberEditSnapshot = getMemberEditFormSnapshot();
  }

  async function closeProjectMemberEditModal(force = false) {
    if (!force && initialMemberEditSnapshot) {
      const current = getMemberEditFormSnapshot();
      if (current !== initialMemberEditSnapshot) {
        const choice = await promptUnsavedChanges();
        if (choice === 'STAY') return;
        if (choice === 'SAVE') {
          saveProjectMemberFromModal();
          return;
        }
        // choice === 'DISCARD' -> proceed to close
      }
    }

    const modal = document.getElementById('projectMemberEditModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    editingMemberId = null;
    editingMemberAvatar = '';
    initialMemberEditSnapshot = null;
  }

  function updateMemberEditModalPhotoUi(name, nickname, avatar) {
    const previewImg = document.getElementById('prjMemberEditPhotoPreview');
    const statusEl = document.getElementById('prjMemberEditPhotoStatus');
    const seed = nickname || name || 'person';
    const fallbackUrl = getCuteAvatarUrl(seed);
    const photoUrl = avatar || fallbackUrl;

    if (previewImg) {
      previewImg.src = photoUrl;
      previewImg.onerror = () => { previewImg.src = fallbackUrl; };
    }

    if (statusEl) {
      if (avatar) {
        statusEl.className = 'text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
        statusEl.textContent = '✓ มีรูปโปรไฟล์กำหนดเอง';
      } else {
        statusEl.className = 'text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
        statusEl.textContent = 'รูปเริ่มต้น (DiceBear)';
      }
    }
  }

  function handleMemberEditModalFileUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      openImageCropperModal({
        imageSrc: e.target.result,
        title: 'ครอบตัดรูปโปรไฟล์',
        onSave: (croppedBase64) => {
          editingMemberAvatar = croppedBase64;
          const nameInput = document.getElementById('prjMemberEditName');
          const nickInput = document.getElementById('prjMemberEditNickname');
          const name = nameInput ? nameInput.value.trim() : '';
          const nick = nickInput ? nickInput.value.trim() : '';
          updateMemberEditModalPhotoUi(name, nick, croppedBase64);
          if (typeof showToast === 'function') showToast('อัปโหลดและครอบตัดรูปเรียบร้อยแล้ว', 'success');
        }
      });
    };
    reader.readAsDataURL(file);
  }

  function triggerCropForMemberEditModal() {
    const previewImg = document.getElementById('prjMemberEditPhotoPreview');
    const currentSrc = editingMemberAvatar || (previewImg ? previewImg.src : '');
    if (!currentSrc) {
      if (typeof showToast === 'function') showToast('ยังไม่มีรูปสำหรับครอบตัด กรุณาอัปโหลดรูปก่อน', 'warning');
      return;
    }
    openImageCropperModal({
      imageSrc: currentSrc,
      title: 'ครอบตัดและปรับแต่งรูปภาพ',
      onSave: (croppedBase64) => {
        editingMemberAvatar = croppedBase64;
        const nameInput = document.getElementById('prjMemberEditName');
        const nickInput = document.getElementById('prjMemberEditNickname');
        const name = nameInput ? nameInput.value.trim() : '';
        const nick = nickInput ? nickInput.value.trim() : '';
        updateMemberEditModalPhotoUi(name, nick, croppedBase64);
        if (typeof showToast === 'function') showToast('ครอบตัดรูปเรียบร้อยแล้ว', 'success');
      }
    });
  }

  function resetMemberEditModalPhotoToCute() {
    editingMemberAvatar = '';
    const nameInput = document.getElementById('prjMemberEditName');
    const nickInput = document.getElementById('prjMemberEditNickname');
    const name = nameInput ? nameInput.value.trim() : '';
    const nick = nickInput ? nickInput.value.trim() : '';
    updateMemberEditModalPhotoUi(name, nick, '');
    if (typeof showToast === 'function') showToast('คืนค่ารูปเป็นรูปเริ่มต้นแล้ว', 'info');
  }

  function matchPhotoForMemberEditModal() {
    const input = document.getElementById('prjMemberEditDriveFileName');
    const query = input ? input.value.trim() : '';
    if (!query) {
      if (typeof showToast === 'function') showToast('กรุณาพิมพ์ชื่อรูปหรือรหัสรูปในไดรฟ์', 'warning');
      return;
    }
    const found = findPhotoInCatalog(query);
    if (found) {
      const url = `https://lh3.googleusercontent.com/d/${found.id}`;
      editingMemberAvatar = url;
      const name = document.getElementById('prjMemberEditName').value.trim();
      const nick = document.getElementById('prjMemberEditNickname').value.trim();
      updateMemberEditModalPhotoUi(name, nick, url);
      if (typeof showToast === 'function') showToast(`ดึงรูป "${found.name}" จากไดรฟ์สำเร็จ!`, 'success');
    } else {
      const extractedId = extractDriveFileId(query);
      if (extractedId) {
        const url = `https://lh3.googleusercontent.com/d/${extractedId}`;
        editingMemberAvatar = url;
        const name = document.getElementById('prjMemberEditName').value.trim();
        const nick = document.getElementById('prjMemberEditNickname').value.trim();
        updateMemberEditModalPhotoUi(name, nick, url);
        if (typeof showToast === 'function') showToast('ดึงรูปจากรหัส Google Drive สำเร็จ', 'success');
      } else {
        if (typeof showToast === 'function') showToast(`ไม่พบรูป "${query}" ในไดรฟ์ กรุณาตรวจสอบชื่อไฟล์`, 'warning');
      }
    }
  }

  function saveProjectMemberFromModal() {
    const allProjects = getProjectsList();
    const p = allProjects.find(item => item.id === activeDetailProjectId);
    if (!p) {
      if (typeof showToast === 'function') showToast('ไม่พบข้อมูลโครงการ', 'error');
      return;
    }

    const name = document.getElementById('prjMemberEditName').value.trim();
    if (!name) {
      if (typeof showToast === 'function') showToast('กรุณากรอกชื่อ-นามสกุล', 'warning');
      document.getElementById('prjMemberEditName').focus();
      return;
    }

    const nickname = document.getElementById('prjMemberEditNickname').value.trim();
    const rawDeptStr = document.getElementById('prjMemberEditDept').value.trim();
    const rawDutyStr = document.getElementById('prjMemberEditDuty').value.trim();
    const details = document.getElementById('prjMemberEditDetails').value.trim();
    const phone = document.getElementById('prjMemberEditPhone').value.trim();
    const kkuMail = document.getElementById('prjMemberEditEmail').value.trim();
    const contactLink = document.getElementById('prjMemberEditContactLink').value.trim();

    const splitByComma = val => String(val || '').split(/[,，،、\n;]/).map(s => s.trim()).filter(Boolean);
    const depts = splitByComma(rawDeptStr);
    const uniqueDepts = depts.length > 0 ? Array.from(new Set(depts)) : ['ฝ่ายดำเนินงานทั่วไป'];
    const deptSummary = uniqueDepts.join(', ');

    const rawDuties = splitByComma(rawDutyStr);
    const rawDescs = splitByComma(details);

    const maxLen = Math.max(rawDuties.length, rawDescs.length, uniqueDepts.length, 1);
    const rolesList = [];
    for (let i = 0; i < maxLen; i++) {
      const d = uniqueDepts[i] || (uniqueDepts.length === 1 ? uniqueDepts[0] : (uniqueDepts[uniqueDepts.length - 1] || 'ฝ่ายดำเนินงานทั่วไป'));
      const duty = rawDuties[i] || (rawDuties.length === 1 ? rawDuties[0] : 'ทีมงาน');
      const desc = rawDescs[i] || (rawDescs.length === 1 ? rawDescs[0] : '');

      if (d || duty || desc || maxLen === 1) {
        rolesList.push({
          index: i + 1,
          duty: duty || 'ทีมงาน',
          description: desc,
          department: d
        });
      }
    }

    const roleSummary = rawDuties.join(', ') || (rolesList.length > 0 ? rolesList.map(r => r.duty).join(', ') : 'ทีมงาน');

    if (!Array.isArray(p.members)) p.members = [];

    if (editingMemberId) {
      // Edit existing member
      const idx = p.members.findIndex(m => m.id === editingMemberId || m.name === editingMemberId);
      if (idx !== -1) {
        const existing = p.members[idx];
        p.members[idx] = {
          ...existing,
          name,
          nickname,
          department: deptSummary,
          departments: uniqueDepts,
          role: roleSummary,
          position: '',
          details,
          rolesList,
          phone,
          kkuMail,
          contactLink,
          avatar: editingMemberAvatar || existing.avatar || ''
        };
      }
    } else {
      // Add new member
      p.members.push({
        id: `MBR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        nickname,
        department: deptSummary,
        departments: uniqueDepts,
        role: roleSummary,
        position: rawPositions.join(', ') || '',
        details,
        rolesList,
        phone,
        kkuMail,
        contactLink,
        avatar: editingMemberAvatar || ''
      });
    }

    // Emit socket & persist
    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('admin:updateProject', p);
    }
    if (typeof saveLocalState === 'function') saveLocalState();
    if (typeof window.persistProjectsToCloud === 'function') {
      window.persistProjectsToCloud(true);
    }

    renderProjectMembersTableView(p);
    closeProjectMemberEditModal(true);
    if (typeof showToast === 'function') {
      showToast(editingMemberId ? `บันทึกข้อมูล "${name}" เรียบร้อยแล้ว` : `เพิ่ม "${name}" เข้าสู่โครงการเรียบร้อยแล้ว`, 'success');
    }
  }

  function openEditProjectMemberModalFromPreview() {
    if (!activePreviewPerson) return;
    const target = activePreviewPerson;
    closePersonPhotoPreviewModal();
    openEditProjectMemberModal(target.id || target.name);
  }

  function deleteProjectMemberFromPreview() {
    if (!activePreviewPerson) return;
    const target = activePreviewPerson;
    closePersonPhotoPreviewModal();
    confirmDeleteProjectMember(target.id || target.name);
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
    window.openPersonPhotoPreviewModal = openPersonPhotoPreviewModal;
    window.closePersonPhotoPreviewModal = closePersonPhotoPreviewModal;
    window.clearAllRepeaterMembers = clearAllRepeaterMembers;
    window.clearAllProjectDetailMembers = clearAllProjectDetailMembers;
    window.getMemberDepartments = getMemberDepartments;
    window.upsertMembersList = upsertMembersList;
    window.openEditProjectMemberModal = openEditProjectMemberModal;
    window.openAddProjectMemberModal = openAddProjectMemberModal;
    window.closeProjectMemberEditModal = closeProjectMemberEditModal;
    window.openDepartmentColorConfigModal = openDepartmentColorConfigModal;
    window.closeDepartmentColorConfigModal = closeDepartmentColorConfigModal;
    window.setDeptColorEditMode = setDeptColorEditMode;
    window.selectUnifiedColor = selectUnifiedColor;
    window.selectDeptCustomColor = selectDeptCustomColor;
    window.saveDepartmentColorConfig = saveDepartmentColorConfig;
    window.saveProjectMemberFromModal = saveProjectMemberFromModal;
    window.handleMemberEditModalFileUpload = handleMemberEditModalFileUpload;
    window.triggerCropForMemberEditModal = triggerCropForMemberEditModal;
    window.resetMemberEditModalPhotoToCute = resetMemberEditModalPhotoToCute;
    window.matchPhotoForMemberEditModal = matchPhotoForMemberEditModal;
    window.openEditProjectMemberModalFromPreview = openEditProjectMemberModalFromPreview;
    window.deleteProjectMemberFromPreview = deleteProjectMemberFromPreview;
    window.switchProjectDetailTab = switchProjectDetailTab;
    window.renderProjectCalendarView = renderProjectCalendarView;
    window.setProjectCalendarView = setProjectCalendarView;
    window.navigateProjectCalendarMonth = navigateProjectCalendarMonth;
    window.setProjectCalendarCategoryFilter = setProjectCalendarCategoryFilter;
    window.toggleCurrentProjectShowInMainCalendar = toggleCurrentProjectShowInMainCalendar;
    window.triggerImportProjectCalendarIcs = triggerImportProjectCalendarIcs;
    window.handleProjectCalendarIcsFileSelected = handleProjectCalendarIcsFileSelected;
    window.exportCurrentProjectCalendarIcs = exportCurrentProjectCalendarIcs;
    window.getProjectsList = getProjectsList;
    window.getProjectStakeholdersForCalendar = getProjectStakeholdersForCalendar;
    window.setFormCalendarView = setFormCalendarView;
    window.navigateFormCalendarMonth = navigateFormCalendarMonth;
    window.getFormProjectId = getFormProjectId;
    window.renderFormCalendarEvents = renderFormCalendarEvents;
    window.triggerImportProjectCalendarIcsForForm = triggerImportProjectCalendarIcsForForm;
    window.handleFormProjectCalendarIcsImport = handleFormProjectCalendarIcsImport;
    window.handleFormShowInMainCalToggleChanged = handleFormShowInMainCalToggleChanged;
  }

  return {
    renderProjectColorPicker,
    selectProjectCalendarColor,
    renderUserProjectsSection,
    renderAdminProjectsSection,
    openProjectDetailModal,
    closeProjectDetailModal,
    openAdminProjectEditModal,
    closeAdminProjectEditModal,
    addRepeaterItem,
    removeRepeaterItem,
    clearAllRepeaterMembers,
    clearAllProjectDetailMembers,
    getMemberDepartments,
    upsertMembersList,
    openEditProjectMemberModal,
    openAddProjectMemberModal,
    closeProjectMemberEditModal,
    saveProjectMemberFromModal,
    handleMemberEditModalFileUpload,
    triggerCropForMemberEditModal,
    resetMemberEditModalPhotoToCute,
    matchPhotoForMemberEditModal,
    openEditProjectMemberModalFromPreview,
    deleteProjectMemberFromPreview,
    switchProjectDetailTab,
    renderProjectCalendarView,
    setProjectCalendarView,
    navigateProjectCalendarMonth,
    setProjectCalendarCategoryFilter,
    toggleCurrentProjectShowInMainCalendar,
    triggerImportProjectCalendarIcs,
    handleProjectCalendarIcsFileSelected,
    exportCurrentProjectCalendarIcs,
    getProjectsList,
    getProjectStakeholdersForCalendar,
    setFormCalendarView,
    navigateFormCalendarMonth,
    getFormProjectId,
    renderFormCalendarEvents,
    triggerImportProjectCalendarIcsForForm,
    handleFormProjectCalendarIcsImport,
    handleFormShowInMainCalToggleChanged,
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
    findPhotoInCatalog,
    openPersonPhotoPreviewModal,
    closePersonPhotoPreviewModal
  };
});
