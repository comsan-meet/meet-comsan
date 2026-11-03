/**
 * COMSAN Meeting System - Files Component
 * ระบบเอกสารการประชุมและจัดเก็บไฟล์บน Google Drive
 */

// =========================================================================
// UNIFIED GOOGLE APPS SCRIPT (GAS) BRIDGE CODE
// =========================================================================
const UNIFIED_GAS_SCRIPT = `/**
 * COMSAN Meeting System - Unified Google Drive Bridge
 * สคริปต์เชื่อมต่อ Google Drive สำหรับจัดเก็บไฟล์เอกสารการประชุมและรูปภาพโครงการ
 * รองรับ: 1) อัปโหลดไฟล์ (POST) 2) ลบไฟล์/ย้ายลงถังขยะ (POST/GET) 3) สแกนอ่านรูปภาพในโฟลเดอร์ (GET)
 */

// 1. รับการอัปโหลดไฟล์ และคำสั่งลบไฟล์ (POST)
function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var action = (data && data.action) || '';

    // ==========================================
    // คำสั่งลบไฟล์ใน Google Drive (ย้ายลงถังขยะ)
    // ==========================================
    if (action === 'delete') {
      var fileIdToDelete = data.fileId;
      if (!fileIdToDelete && data.url) {
        var matchId = data.url.match(new RegExp('folders/([a-zA-Z0-9_-]+)')) || data.url.match(new RegExp('/d/([a-zA-Z0-9_-]+)'));
        if (matchId) fileIdToDelete = matchId[1];
      }
      if (!fileIdToDelete) {
        return ContentService.createTextOutput(JSON.stringify({
          ok: false,
          status: 'error',
          message: 'Missing fileId for deletion'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      try {
        var targetFile = DriveApp.getFileById(fileIdToDelete);
        targetFile.setTrashed(true);
        return ContentService.createTextOutput(JSON.stringify({
          ok: true,
          status: 'success',
          action: 'delete',
          fileId: fileIdToDelete,
          message: 'File moved to Google Drive trash successfully'
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (delErr) {
        return ContentService.createTextOutput(JSON.stringify({
          ok: false,
          status: 'error',
          message: delErr.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ==========================================
    // คำสั่งอัปโหลดไฟล์ใหม่เข้าสู่ Google Drive
    // ==========================================
    var fileName = data.name || ('document_' + new Date().getTime());
    var mimeType = data.type || 'application/octet-stream';
    var folderId = data.folderId;
    var base64Data = '';

    if (data.dataUrl && data.dataUrl.indexOf('base64,') !== -1) {
      base64Data = data.dataUrl.split('base64,')[1];
    } else if (data.dataUrl) {
      base64Data = data.dataUrl;
    } else if (data.base64) {
      base64Data = data.base64;
    }

    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        status: 'error',
        message: 'No file content received'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // เลือกโฟลเดอร์ปลายทาง
    var folder;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (fErr) {
        folder = DriveApp.getRootFolder();
      }
    } else {
      folder = DriveApp.getRootFolder();
    }

    // ถอดรหัส Base64 และสร้างไฟล์ใน Google Drive
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    var file = folder.createFile(blob);

    // กำหนดสิทธิ์ให้ทุกคนที่มีลิงก์เปิดดูและดาวน์โหลดได้
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {}

    var fileId = file.getId();
    var result = {
      ok: true,
      status: 'success',
      fileId: fileId,
      name: file.getName(),
      size: file.getSize(),
      type: file.getMimeType(),
      url: file.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId,
      previewUrl: 'https://drive.google.com/file/d/' + fileId + '/preview'
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. รับการเรียกดูข้อมูล / ทดสอบเชื่อมต่อ / สแกนโฟลเดอร์ / ลบไฟล์ (GET)
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';

  // Ping Test เพื่อทดสอบว่า Web App ใช้งานได้
  if (action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      status: 'success',
      message: 'Comsan Google Drive Bridge is active and ready!'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // คำสั่งลบไฟล์ทาง GET fallback
  if (action === 'delete') {
    var fileId = e && e.parameter && e.parameter.fileId;
    if (fileId) {
      try {
        var f = DriveApp.getFileById(fileId);
        f.setTrashed(true);
        return ContentService.createTextOutput(JSON.stringify({
          ok: true,
          status: 'success',
          action: 'delete',
          fileId: fileId
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
          ok: false,
          status: 'error',
          message: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  var folderId = e && e.parameter && e.parameter.folderId;
  if (!folderId && e && e.parameter && e.parameter.url) {
    var match = e.parameter.url.match(new RegExp('folders/([a-zA-Z0-9_-]+)'));
    if (match) folderId = match[1];
  }

  if (!folderId) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      status: 'error',
      message: 'Missing folderId parameter'
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
      list.push({
        id: id,
        name: name,
        size: file.getSize(),
        type: mime,
        url: 'https://lh3.googleusercontent.com/d/' + id,
        driveUrl: file.getUrl(),
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id
      });
    }
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      status: 'success',
      folderName: folder.getName(),
      totalFiles: list.length,
      files: list
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

// =========================================================================
// GOOGLE DRIVE HELPER FUNCTIONS
// =========================================================================

function getGoogleDriveConfig() {
  const state = window.appState || {};
  const gdrive = state.googleDrive || {};
  let scriptUrl = (gdrive.scriptUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_drive_bridge_url') : '') || '').trim();
  let folderId = (gdrive.folderId || (typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_drive_meeting_folder') || localStorage.getItem('comsan_drive_folder_id') : '') || '').trim();
  let folderUrl = (gdrive.folderUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_drive_meeting_folder_url') : '') || '').trim();

  if (folderId && !folderUrl) {
    folderUrl = 'https://drive.google.com/drive/folders/' + folderId;
  }
  return { scriptUrl, folderId, folderUrl };
}

function extractDriveFileId(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  const dMatch = trimmed.match(new RegExp('/d/([a-zA-Z0-9_-]+)'));
  if (dMatch && dMatch[1]) return dMatch[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return '';
}

function extractDriveFolderId(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  const fMatch = trimmed.match(new RegExp('folders/([a-zA-Z0-9_-]+)'));
  if (fMatch && fMatch[1]) return fMatch[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return '';
}

function detectDocumentInfoFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const fileId = extractDriveFileId(trimmed);

  if (trimmed.includes('docs.google.com/document')) {
    return {
      type: 'application/vnd.google-apps.document',
      label: 'Google Docs',
      icon: 'file-text',
      colorClass: 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400',
      fileId,
      previewUrl: fileId ? 'https://docs.google.com/document/d/' + fileId + '/preview' : trimmed,
      downloadUrl: fileId ? 'https://docs.google.com/document/d/' + fileId + '/export?format=pdf' : trimmed
    };
  }
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    return {
      type: 'application/vnd.google-apps.spreadsheet',
      label: 'Google Sheets',
      icon: 'file-spreadsheet',
      colorClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
      fileId,
      previewUrl: fileId ? 'https://docs.google.com/spreadsheets/d/' + fileId + '/preview' : trimmed,
      downloadUrl: fileId ? 'https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=xlsx' : trimmed
    };
  }
  if (trimmed.includes('docs.google.com/presentation')) {
    return {
      type: 'application/vnd.google-apps.presentation',
      label: 'Google Slides',
      icon: 'presentation',
      colorClass: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
      fileId,
      previewUrl: fileId ? 'https://docs.google.com/presentation/d/' + fileId + '/preview' : trimmed,
      downloadUrl: fileId ? 'https://docs.google.com/presentation/d/' + fileId + '/export/pdf' : trimmed
    };
  }
  if (trimmed.includes('canva.com')) {
    return {
      type: 'application/x-canva',
      label: 'Canva',
      icon: 'palette',
      colorClass: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-600 dark:text-cyan-400',
      fileId: '',
      previewUrl: trimmed,
      downloadUrl: trimmed
    };
  }
  if (trimmed.includes('drive.google.com') || fileId) {
    return {
      type: 'application/vnd.google-apps.file',
      label: 'Google Drive',
      icon: 'hard-drive',
      colorClass: 'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
      fileId,
      previewUrl: fileId ? 'https://drive.google.com/file/d/' + fileId + '/preview' : trimmed,
      downloadUrl: fileId ? 'https://drive.google.com/uc?export=download&id=' + fileId : trimmed
    };
  }
  return null;
}

// =========================================================================
// UPLOAD FILE DIRECTLY TO GOOGLE DRIVE VIA GAS
// =========================================================================
async function uploadFileToGoogleDrive(file, { scriptUrl, folderId }, onProgress) {
  if (!scriptUrl) {
    throw new Error('ยังไม่ได้กำหนด URL ของ Google Apps Script Web App');
  }

  if (typeof onProgress === 'function') {
    onProgress(20, 'กำลังอ่านและประมวลผลไฟล์...');
  }

  const base64DataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  if (typeof onProgress === 'function') {
    onProgress(50, 'กำลังอัปโหลดไฟล์ขึ้น Google Drive...');
  }

  const payload = {
    name: file.name,
    type: file.type || 'application/octet-stream',
    dataUrl: base64DataUrl,
    folderId: folderId || ''
  };

  // ส่งด้วย text/plain เพื่อป้องกัน CORS preflight (OPTIONS) ใน Google Apps Script
  const response = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Google Apps Script ส่งคืนสถานะข้อผิดพลาด: ' + response.status);
  }

  const result = await response.json();
  if (!result || !result.ok) {
    throw new Error((result && result.message) || 'ไม่สามารถบันทึกไฟล์ลง Google Drive ได้');
  }

  if (typeof onProgress === 'function') {
    onProgress(100, 'อัปโหลดเข้า Google Drive สำเร็จเรียบร้อย!');
  }

  return result;
}

// =========================================================================
// DOWNLOAD SHARED FILE
// =========================================================================
async function downloadSharedFile(fileId) {
  const state = window.appState;
  const f = (state.files || []).find(item => item.id === fileId);
  if (!f) return showToast('ไม่พบข้อมูลไฟล์', 'error');

  // 1. Google Drive / External Link
  if (f.driveFileId || f.downloadUrl || f.driveUrl) {
    const dlUrl = f.downloadUrl || (f.driveFileId ? 'https://drive.google.com/uc?export=download&id=' + f.driveFileId : f.driveUrl);
    showToast('กำลังเปิดดาวน์โหลด "' + f.name + '" จาก Google Drive...', 'info');
    window.open(dlUrl, '_blank');
    return;
  }

  // 2. Legacy Base64 DataURL
  if (!f.dataUrl && typeof window.fetchFileContentFromCloud === 'function') {
    showToast('กำลังโหลดข้อมูลไฟล์ "' + f.name + '"...', 'info');
    f.dataUrl = await window.fetchFileContentFromCloud(fileId);
  }

  if (!f.dataUrl) {
    showToast('ไม่พบข้อมูลเนื้อหาของไฟล์ในระบบ กำลังเปิดหน้าต่างตัวอย่าง...', 'warning');
    previewSharedFile(fileId);
    return;
  }

  try {
    triggerUniversalBlobDownload(dataURLToBlob(f.dataUrl), f.name);
    showToast('กำลังดาวน์โหลด "' + f.name + '"...', 'info');
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์', 'error');
  }
}

// =========================================================================
// FILE PERMISSIONS
// =========================================================================
function requestFileDropPermission() {
  const userId = window.currentUserId || localStorage.getItem('comsan_current_user_id');
  if (!userId) {
    if (typeof showToast === 'function') showToast('กรุณาเข้าสู่ระบบก่อนขอสิทธิ์อัปโหลดเอกสาร', 'warning');
    return;
  }
  const me = (window.appState?.users || []).find(u => u.id === userId);
  if (me) me.filePermission = 'PENDING';
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('file:requestPermission', userId);
  }
  renderFileDropSection();
  if (typeof showToast === 'function') showToast('ส่งคำขออนุญาตอัปโหลดเอกสารแล้ว', 'info');
}

function adminSetFilePermission(userId, status) {
  const user = (window.appState?.users || []).find(u => u.id === userId);
  if (user) user.filePermission = status;
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('admin:setFilePermission', { userId, status });
  }
  if (typeof window.updateAdminSidebarBadges === 'function' && window.appState) {
    window.updateAdminSidebarBadges(window.appState);
  }
  renderFileDropSection();
  if (user && typeof showToast === 'function') {
    showToast(status === 'APPROVED' ? 'อนุมัติให้ ' + user.nickname + ' อัปโหลดเอกสารแล้ว' : 'คืนสถานะสิทธิ์ของ ' + user.nickname + ' แล้ว', 'success');
  }
}

function releaseFilePermission() {
  const userId = window.currentUserId || localStorage.getItem('comsan_current_user_id');
  if (!userId) return;
  const me = (window.appState?.users || []).find(u => u.id === userId);
  if (me) me.filePermission = 'NONE';
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('admin:setFilePermission', { userId, status: 'NONE' });
  }
  renderFileDropSection();
  if (typeof showToast === 'function') showToast('คืนสิทธิ์อัปโหลดเอกสารเรียบร้อยแล้ว', 'info');
}

function setFileUploadProgress(roleType, { visible, percent = 0, fileName = '', status = '' }) {
  const prefix = roleType === 'USER' ? 'user' : 'admin';
  const container = document.getElementById(prefix + 'FileUploadProgressContainer');
  const bar = document.getElementById(prefix + 'FileUploadProgressBar');
  const nameEl = document.getElementById(prefix + 'FileUploadName');
  const pctEl = document.getElementById(prefix + 'FileUploadPercent');
  const statusEl = document.getElementById(prefix + 'FileUploadStatusText');

  if (!container) return;

  if (!visible) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  if (bar) bar.style.width = Math.min(100, Math.max(0, percent)) + '%';
  if (pctEl) pctEl.textContent = Math.round(percent) + '%';
  if (nameEl && fileName) nameEl.textContent = fileName;
  if (statusEl && status) statusEl.textContent = status;
}

// =========================================================================
// HANDLE FILE UPLOAD (PRIMARY: GOOGLE DRIVE)
// =========================================================================
async function handleFileUpload(e, roleType) {
  const file = e && e.target && e.target.files && e.target.files[0];
  if (!file) return;

  let uploaderId = 'ADMIN', uploaderName = 'ผู้ดำเนินการ (ADMIN)';
  if (roleType === 'USER') {
    const me = (window.appState.users || []).find(u => u.id === window.currentUserId);
    uploaderId = me ? me.id : (window.currentUserId || 'USER');
    const pos = (me && me.position) ? ' (' + me.position + ')' : '';
    uploaderName = me ? ((me.nickname || me.firstName || 'สมาชิก') + pos) : 'ผู้เข้าร่วมประชุม';
  }

  const driveConfig = getGoogleDriveConfig();

  // หากยังไม่ได้ตั้งค่า Google Apps Script Web App -> แนะนำตั้งค่าหรือแนบผ่านลิงก์ Drive
  if (!driveConfig.scriptUrl) {
    e.target.value = '';
    const shouldSetup = (typeof window.showConfirmDialog === 'function')
      ? await window.showConfirmDialog({
          title: 'ตั้งค่า Google Drive สำหรับจัดเก็บไฟล์',
          message: 'ระบบจัดเก็บไฟล์ถูกเปลี่ยนเป็น Google Drive (ฟรี ไม่จำกัดพื้นที่) เพื่อความเสถียรและรวดเร็ว กรุณาตั้งค่า Google Apps Script หรือแนบด้วยลิงก์ Google Drive โดยตรง',
          confirmText: 'ตั้งค่า Google Drive (แนะนำ)',
          cancelText: 'แนบด้วยลิงก์ Drive แทน',
          icon: 'hard-drive'
        })
      : false;

    if (shouldSetup) {
      openGoogleDriveSetupModal();
    } else {
      openAttachDriveLinkModal(roleType);
    }
    return;
  }

  // แสดงแถบความคืบหน้า
  setFileUploadProgress(roleType, {
    visible: true,
    percent: 15,
    fileName: file.name,
    status: 'กำลังเตรียมส่งไฟล์เข้า Google Drive...'
  });

  try {
    const res = await uploadFileToGoogleDrive(file, driveConfig, (pct, statusText) => {
      setFileUploadProgress(roleType, {
        visible: true,
        percent: pct,
        fileName: file.name,
        status: statusText
      });
    });

    const now = Date.now();
    const fileObj = {
      id: 'FILE-' + now,
      name: res.name || file.name,
      size: res.size || file.size,
      type: res.type || file.type || 'application/octet-stream',
      storageType: 'GOOGLE_DRIVE',
      driveFileId: res.fileId,
      driveUrl: res.url,
      downloadUrl: res.downloadUrl,
      previewUrl: res.previewUrl,
      hasContent: true,
      uploaderId,
      uploaderName,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      uploadedAt: now,
      isPinned: false,
      pinnedAt: null
    };

    // ส่งเข้าสู่ห้องประชุมผ่าน Socket และบันทึกลง State
    if (window.socket) {
      window.socket.emit('file:upload', fileObj);
    } else if (window.ActionReducer) {
      window.ActionReducer.dispatch(window.appState, { type: 'file:upload', payload: fileObj });
    }

    e.target.value = '';

    setFileUploadProgress(roleType, {
      visible: true,
      percent: 100,
      fileName: file.name,
      status: 'บันทึกเข้า Google Drive สำเร็จเรียบร้อย!'
    });

    renderFileDropSection();
    if (typeof showToast === 'function') {
      showToast('อัปโหลดไฟล์ "' + file.name + '" เข้า Google Drive สำเร็จแล้ว', 'success');
    }

    setTimeout(() => {
      setFileUploadProgress(roleType, { visible: false });
    }, 1800);

  } catch (err) {
    console.error('Google Drive Upload Error:', err);
    setFileUploadProgress(roleType, {
      visible: true,
      percent: 0,
      fileName: file.name,
      status: 'เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถอัปโหลดไฟล์ได้')
    });
    if (typeof showToast === 'function') {
      showToast('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message, 'error');
    }
    setTimeout(() => {
      setFileUploadProgress(roleType, { visible: false });
    }, 3500);
  }
}

// =========================================================================
// ATTACH DOCUMENT BY GOOGLE DRIVE LINK
// =========================================================================
window.currentAttachLinkRole = 'USER';

function openAttachDriveLinkModal(roleType = 'USER') {
  window.currentAttachLinkRole = roleType;
  const modal = document.getElementById('attachDriveLinkModal');
  const urlInput = document.getElementById('attachDriveLinkUrl');
  const titleInput = document.getElementById('attachDriveLinkTitle');
  const badge = document.getElementById('attachDriveLinkDetectedBadge');

  if (urlInput) urlInput.value = '';
  if (titleInput) titleInput.value = '';
  if (badge) badge.classList.add('hidden');

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (urlInput) urlInput.focus();
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function closeAttachDriveLinkModal() {
  const modal = document.getElementById('attachDriveLinkModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function onDriveLinkInputChange(val) {
  const badge = document.getElementById('attachDriveLinkDetectedBadge');
  const badgeText = document.getElementById('attachDriveLinkDetectedText');
  const titleInput = document.getElementById('attachDriveLinkTitle');

  if (!val || !val.trim()) {
    if (badge) badge.classList.add('hidden');
    return;
  }

  const docInfo = detectDocumentInfoFromUrl(val.trim());
  if (docInfo && badge && badgeText) {
    badgeText.textContent = 'ตรวจพบ: ' + docInfo.label;
    badge.className = 'flex items-center gap-2 p-2 rounded-xl text-xs font-semibold ' + docInfo.colorClass;
    badge.classList.remove('hidden');

    if (titleInput && !titleInput.value) {
      titleInput.placeholder = 'เช่น ' + docInfo.label + ' ประกอบการประชุม';
    }
  } else if (badge) {
    badge.classList.add('hidden');
  }
}

function submitAttachDriveLink() {
  const urlInput = document.getElementById('attachDriveLinkUrl');
  const titleInput = document.getElementById('attachDriveLinkTitle');
  const rawUrl = urlInput ? urlInput.value.trim() : '';
  let title = titleInput ? titleInput.value.trim() : '';

  if (!rawUrl) {
    if (typeof showToast === 'function') showToast('กรุณาระบุลิงก์เอกสาร Google Drive', 'warning');
    return;
  }

  const docInfo = detectDocumentInfoFromUrl(rawUrl) || {
    type: 'application/vnd.google-apps.file',
    label: 'Google Drive',
    fileId: extractDriveFileId(rawUrl),
    previewUrl: rawUrl,
    downloadUrl: rawUrl
  };

  if (!title) {
    title = docInfo.label + ' (' + new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ')';
  }

  let uploaderId = 'ADMIN', uploaderName = 'ผู้ดำเนินการ (ADMIN)';
  if (window.currentAttachLinkRole === 'USER') {
    const me = (window.appState?.users || []).find(u => u.id === window.currentUserId);
    uploaderId = me ? me.id : (window.currentUserId || 'USER');
    const pos = (me && me.position) ? ' (' + me.position + ')' : '';
    uploaderName = me ? ((me.nickname || me.firstName || 'สมาชิก') + pos) : 'ผู้เข้าร่วมประชุม';
  }

  const now = Date.now();
  const fileObj = {
    id: 'FILE-' + now,
    name: title,
    size: 0,
    type: docInfo.type,
    storageType: 'GOOGLE_DRIVE',
    driveFileId: docInfo.fileId || '',
    driveUrl: rawUrl,
    downloadUrl: docInfo.downloadUrl || rawUrl,
    previewUrl: docInfo.previewUrl || rawUrl,
    hasContent: true,
    uploaderId,
    uploaderName,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    uploadedAt: now,
    isPinned: false,
    pinnedAt: null
  };

  if (window.socket) {
    window.socket.emit('file:upload', fileObj);
  } else if (window.ActionReducer) {
    window.ActionReducer.dispatch(window.appState, { type: 'file:upload', payload: fileObj });
  }

  closeAttachDriveLinkModal();
  renderFileDropSection();
  if (typeof showToast === 'function') {
    showToast('แนบเอกสาร "' + title + '" เรียบร้อยแล้ว', 'success');
  }
}

// =========================================================================
// GOOGLE DRIVE SETUP MODAL & CONFIG MANAGEMENT
// =========================================================================
function openGoogleDriveSetupModal() {
  const config = getGoogleDriveConfig();
  const scriptInput = document.getElementById('gdriveScriptUrlInput');
  const folderInput = document.getElementById('gdriveFolderInput');
  const codeBlock = document.getElementById('unifiedGasScriptCodeBlock');

  if (scriptInput) scriptInput.value = config.scriptUrl || '';
  if (folderInput) folderInput.value = config.folderUrl || config.folderId || '';
  if (codeBlock) codeBlock.textContent = UNIFIED_GAS_SCRIPT;

  const modal = document.getElementById('googleDriveSetupModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function closeGoogleDriveSetupModal() {
  const modal = document.getElementById('googleDriveSetupModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function copyUnifiedGasScriptToClipboard() {
  const lbl = document.getElementById('btnCopyUnifiedGasScriptLabel');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(UNIFIED_GAS_SCRIPT).then(() => {
      if (lbl) lbl.textContent = 'คัดลอกเรียบร้อย!';
      if (typeof showToast === 'function') showToast('คัดลอกโค้ดสคริปต์ Google Apps Script แล้ว! นำไปวางใน script.google.com ได้เลย', 'success');
      setTimeout(() => { if (lbl) lbl.textContent = 'คัดลอกโค้ดสคริปต์'; }, 3000);
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = UNIFIED_GAS_SCRIPT;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (lbl) lbl.textContent = 'คัดลอกเรียบร้อย!';
    if (typeof showToast === 'function') showToast('คัดลอกโค้ดสคริปต์ Google Apps Script แล้ว', 'success');
    setTimeout(() => { if (lbl) lbl.textContent = 'คัดลอกโค้ดสคริปต์'; }, 3000);
  }
}

function saveGoogleDriveConfigFromModal() {
  const scriptInput = document.getElementById('gdriveScriptUrlInput');
  const folderInput = document.getElementById('gdriveFolderInput');
  let scriptUrl = scriptInput ? scriptInput.value.trim() : '';
  let folderVal = folderInput ? folderInput.value.trim() : '';

  if (scriptUrl.includes('/edit')) {
    scriptUrl = scriptUrl.replace(new RegExp('/edit.*$'), '/exec');
    if (scriptInput) scriptInput.value = scriptUrl;
  }

  const folderId = extractDriveFolderId(folderVal) || folderVal;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('comsan_drive_bridge_url', scriptUrl);
      localStorage.setItem('comsan_drive_meeting_folder', folderId);
      localStorage.setItem('comsan_drive_meeting_folder_url', folderVal);
    } catch (e) {}
  }

  const googleDrive = {
    scriptUrl,
    folderId,
    folderUrl: folderVal
  };

  if (!window.appState) window.appState = {};
  window.appState.googleDrive = googleDrive;
  if (typeof window.saveLocalState === 'function') window.saveLocalState();

  if (window.socket) {
    window.socket.emit('admin:updateGoogleDriveConfig', googleDrive);
  }

  if (typeof window.scheduleSaveToSupabase === 'function') {
    window.scheduleSaveToSupabase(window.appState);
  }

  closeGoogleDriveSetupModal();
  renderFileDropSection();
  if (typeof showToast === 'function') {
    showToast('บันทึกการตั้งค่า Google Drive สำเร็จเรียบร้อย!', 'success');
  }
}

async function testGoogleDriveConnectionFromModal() {
  const scriptInput = document.getElementById('gdriveScriptUrlInput');
  let scriptUrl = scriptInput ? scriptInput.value.trim() : '';
  if (!scriptUrl) {
    if (typeof showToast === 'function') showToast('กรุณาระบุ URL เว็บแอป Google Apps Script ก่อนทดสอบ', 'warning');
    return;
  }

  if (typeof showToast === 'function') showToast('กำลังทดสอบเชื่อมต่อ Google Apps Script...', 'info');

  try {
    const testUrl = scriptUrl + (scriptUrl.includes('?') ? '&' : '?') + 'action=ping';
    const resp = await fetch(testUrl, { mode: 'cors' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data && data.ok) {
      if (typeof showToast === 'function') showToast('✅ เชื่อมต่อ Google Apps Script สำเร็จและพร้อมใช้งาน!', 'success');
    } else {
      throw new Error((data && data.message) || 'คำขอไม่สำเร็จ');
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast('⚠️ ไม่สามารถเชื่อมต่อกับสคริปต์ได้: ตรวจสอบว่าเลือก "ทุกคน (Anyone)" ในการ Deploy', 'error');
    }
  }
}

function openMeetingGoogleDriveFolder() {
  if (window.currentRole !== 'ADMIN' || !window.isAdminAuthenticated) {
    if (typeof showToast === 'function') showToast('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเปิดไดรฟ์ได้', 'warning');
    return;
  }
  const config = getGoogleDriveConfig();
  if (config.folderUrl) {
    window.open(config.folderUrl, '_blank');
  } else if (config.folderId) {
    window.open('https://drive.google.com/drive/folders/' + config.folderId, '_blank');
  } else {
    if (typeof showToast === 'function') showToast('ยังไม่ได้ระบุโฟลเดอร์ Google Drive ของห้องประชุม', 'info');
    openGoogleDriveSetupModal();
  }
}

// =========================================================================
// PIN & DELETE FILES
// =========================================================================
function togglePinSharedFile(fileId) {
  if (window.currentRole !== 'ADMIN' || !window.isAdminAuthenticated) return;
  const file = (window.appState?.files || []).find(f => f.id === fileId);
  if (!file) return;
  const targetPinned = !file.isPinned;
  file.isPinned = targetPinned;
  file.pinnedAt = targetPinned ? Date.now() : null;
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('admin:togglePinFile', { fileId, isPinned: targetPinned });
  }
  renderFileDropSection();
  showToast(targetPinned ? '📌 ปักหมุดเอกสาร "' + file.name + '" ไว้บนสุดแล้ว' : 'เลิกปักหมุดเอกสาร "' + file.name + '" แล้ว', 'info');
}

async function deleteFileFromGoogleDrive(fileId) {
  if (!fileId) return false;
  const config = getGoogleDriveConfig();
  if (!config.scriptUrl) return false;

  try {
    const payload = {
      action: 'delete',
      fileId: fileId
    };

    const response = await fetch(config.scriptUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      return Boolean(data && data.ok);
    }
  } catch (err) {
    console.warn('Google Drive delete error (attempting GET fallback):', err);
    try {
      const getUrl = config.scriptUrl + (config.scriptUrl.includes('?') ? '&' : '?') + 'action=delete&fileId=' + encodeURIComponent(fileId);
      const getResp = await fetch(getUrl, { mode: 'cors' });
      if (getResp.ok) {
        const getData = await getResp.json();
        return Boolean(getData && getData.ok);
      }
    } catch (getErr) {
      console.warn('Google Drive delete fallback error:', getErr);
    }
  }
  return false;
}

async function deleteSharedFile(fileId) {
  const f = (window.appState?.files || []).find(item => item.id === fileId);
  const name = f ? f.name : 'เอกสารนี้';
  const isDrive = Boolean(f && (f.storageType === 'GOOGLE_DRIVE' || f.driveFileId || f.driveUrl));
  const targetDriveId = f ? (f.driveFileId || extractDriveFileId(f.driveUrl)) : '';

  const confirmMsg = isDrive
    ? 'คุณต้องการลบเอกสาร "' + name + '" ออกจากห้องประชุม และย้ายไฟล์ลงถังขยะใน Google Drive หรือไม่?'
    : 'คุณต้องการลบเอกสาร "' + name + '" ออกจากห้องประชุมหรือไม่?';

  const confirmed = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: 'ยืนยันการลบเอกสาร',
        message: confirmMsg,
        confirmText: isDrive ? 'ลบเอกสารและไฟล์ใน Drive' : 'ลบเอกสาร',
        isDanger: true,
        icon: 'trash-2'
      })
    : false;
  if (!confirmed) return;

  // 1. ลบ/ย้ายไฟล์ลงถังขยะใน Google Drive
  if (targetDriveId) {
    if (typeof showToast === 'function') {
      showToast('กำลังลบไฟล์ "' + name + '" ออกจาก Google Drive...', 'info');
    }
    deleteFileFromGoogleDrive(targetDriveId).then(success => {
      if (success) {
        console.log('Successfully trashed file in Google Drive:', targetDriveId);
      }
    }).catch(err => {
      console.warn('Failed to trash file in Google Drive:', err);
    });
  }

  // 2. นำออกจากรายการเอกสารในห้องประชุม
  window.appState.files = (window.appState.files || []).filter(item => item.id !== fileId);
  window.saveLocalState();

  // 3. ลบข้อมูลจาก Cloud Cache เดิม (ถ้ามี)
  if (typeof window.deleteFileContentFromCloud === 'function') {
    window.deleteFileContentFromCloud(fileId).catch(() => {});
  }

  // 4. กระจายคำสั่งลบให้ทุกอุปกรณ์
  if (window.socket) {
    window.socket.emit('file:delete', fileId);
  } else if (window.ActionReducer) {
    window.ActionReducer.dispatch(window.appState, { type: 'file:delete', payload: fileId });
  }

  renderFileDropSection();
  if (typeof showToast === 'function') {
    showToast(isDrive ? 'ลบเอกสาร "' + name + '" และย้ายลงถังขยะ Google Drive แล้ว' : 'ลบเอกสาร "' + name + '" เรียบร้อยแล้ว', 'info');
  }
}

function formatFileUploadStamp(f) {
  if (f && f.uploadedAt) {
    const d = new Date(f.uploadedAt);
    const date = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return date + ' ' + time + ' น.';
  }
  return ((f && f.time) || '-') + ' น.';
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
  if (!bytes) return 'Google Drive';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? mb.toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

// =========================================================================
// GET VISUAL INFO
// =========================================================================
function getFileVisualInfo(fileName, mimeType) {
  const name = (fileName || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop().trim() : '';
  const mime = (mimeType || '').toLowerCase();

  // 1. Google Docs / Word Documents
  if (mime.includes('google-apps.document') || ['docx', 'doc', 'rtf', 'odt'].includes(ext) || mime.includes('word') || mime.includes('document')) {
    return {
      icon: 'file-text',
      colorClass: 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400',
      label: mime.includes('google-apps.document') ? 'Google Docs' : 'Word'
    };
  }

  // 2. Google Sheets / Excel Spreadsheets
  if (mime.includes('google-apps.spreadsheet') || ['xlsx', 'xls', 'csv', 'ods', 'tsv'].includes(ext) || mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) {
    return {
      icon: 'file-spreadsheet',
      colorClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
      label: mime.includes('google-apps.spreadsheet') ? 'Google Sheets' : 'Excel'
    };
  }

  // 3. Google Slides / PowerPoint
  if (mime.includes('google-apps.presentation') || ['pptx', 'ppt', 'pps', 'ppsx', 'odp', 'key'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    return {
      icon: 'presentation',
      colorClass: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
      label: mime.includes('google-apps.presentation') ? 'Google Slides' : 'PowerPoint'
    };
  }

  // 4. Canva
  if (mime.includes('canva') || name.includes('canva')) {
    return {
      icon: 'palette',
      colorClass: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-600 dark:text-cyan-400',
      label: 'Canva'
    };
  }

  // 5. PDF Documents
  if (ext === 'pdf' || mime.includes('pdf')) {
    return {
      icon: 'file-text',
      colorClass: 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400',
      label: 'PDF'
    };
  }

  // 6. Video
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'wmv', 'flv', '3gp'].includes(ext) || mime.startsWith('video/')) {
    return {
      icon: 'video',
      colorClass: 'bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400',
      label: 'วิดีโอ'
    };
  }

  // 7. Images / Photos
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(ext) || mime.startsWith('image/')) {
    return {
      icon: 'image',
      colorClass: 'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
      label: 'รูปภาพ'
    };
  }

  // 8. Audio
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'opus'].includes(ext) || mime.startsWith('audio/')) {
    return {
      icon: 'music',
      colorClass: 'bg-pink-500/10 border-pink-500/25 text-pink-600 dark:text-pink-400',
      label: 'เสียง'
    };
  }

  // 9. Generic Google Drive File
  if (mime.includes('google-apps') || mime.includes('drive')) {
    return {
      icon: 'hard-drive',
      colorClass: 'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
      label: 'Google Drive'
    };
  }

  // 10. Default fallback
  return {
    icon: 'file',
    colorClass: 'bg-primary/10 border-primary/20 text-primary',
    label: 'เอกสาร'
  };
}

// =========================================================================
// PREVIEW SHARED FILE
// =========================================================================
async function previewSharedFile(fileId) {
  const state = window.appState;
  const f = (state.files || []).find(item => item.id === fileId);
  if (!f) return showToast('ไม่พบข้อมูลไฟล์', 'error');

  const modal = document.getElementById('filePreviewModal');
  const titleEl = document.getElementById('filePreviewTitle');
  const metaEl = document.getElementById('filePreviewMeta');
  const iconWrap = document.getElementById('filePreviewIconWrap');
  const bodyEl = document.getElementById('filePreviewBody');
  const dlBtn = document.getElementById('filePreviewDownloadBtn');
  const typeLabelEl = document.getElementById('filePreviewTypeLabel');

  if (!modal || !bodyEl) return;

  const visual = getFileVisualInfo(f.name, f.type);
  const sizeText = f.size ? formatFileSize(f.size) : (f.driveUrl ? 'Google Drive' : '-');
  if (titleEl) titleEl.textContent = f.name;
  if (metaEl) metaEl.textContent = visual.label + ' • ' + sizeText + ' • อัปโหลดโดย ' + (f.uploaderName || '-') + ' • ' + formatFileUploadStamp(f);
  if (typeLabelEl) typeLabelEl.textContent = 'ไฟล์ประเภท: ' + visual.label + ' (' + sizeText + ')';

  if (iconWrap && visual.colorClass) {
    iconWrap.className = 'w-10 h-10 rounded-xl ' + visual.colorClass + ' border flex items-center justify-center text-lg shrink-0';
  }
  if (iconWrap && visual.icon) {
    iconWrap.innerHTML = window.lucideSvg ? window.lucideSvg(visual.icon, 'w-5 h-5') : '<i data-lucide="' + visual.icon + '" class="w-5 h-5"></i>';
  }

  if (dlBtn) {
    dlBtn.onclick = () => downloadSharedFile(f.id);
  }

  // เพิ่ม/อัปเดตปุ่มเปิดไฟล์ด้านบน (เฉพาะ ADMIN เท่านั้นที่จะเปิดไฟล์บนไดรฟ์ได้)
  const isUserAdmin = (window.currentRole === 'ADMIN' && window.isAdminAuthenticated);
  let driveBtn = document.getElementById('filePreviewOpenDriveBtn');
  if (isUserAdmin && (f.driveUrl || f.driveFileId)) {
    const targetUrl = f.driveUrl || ('https://drive.google.com/file/d/' + f.driveFileId + '/view');
    if (!driveBtn && dlBtn && dlBtn.parentElement) {
      driveBtn = document.createElement('a');
      driveBtn.id = 'filePreviewOpenDriveBtn';
      driveBtn.target = '_blank';
      driveBtn.className = 'px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs shrink-0 cursor-pointer';
      driveBtn.innerHTML = '<i data-lucide="external-link" class="w-3.5 h-3.5"></i> <span>เปิดไฟล์</span>';
      dlBtn.parentElement.insertBefore(driveBtn, dlBtn);
    }
    if (driveBtn) {
      driveBtn.href = targetUrl;
      driveBtn.innerHTML = '<i data-lucide="external-link" class="w-3.5 h-3.5"></i> <span>เปิดไฟล์</span>';
      driveBtn.classList.remove('hidden');
    }
  } else if (driveBtn) {
    driveBtn.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // 1. Google Drive Embed Preview (PDF, Docs, Sheets, Slides, Videos, Images)
  if (f.storageType === 'GOOGLE_DRIVE' || f.driveFileId || f.driveUrl) {
    const embedUrl = f.previewUrl || (f.driveFileId ? 'https://drive.google.com/file/d/' + f.driveFileId + '/preview' : f.driveUrl);
    const adminOpenBtn = isUserAdmin ? `
      <a href="${f.driveUrl || embedUrl}" target="_blank" class="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-2xs" title="เปิดไฟล์ต้นฉบับ">
        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
        <span>เปิดไฟล์</span>
      </a>
    ` : '';

    bodyEl.innerHTML = `
      <div class="w-full flex-1 flex flex-col h-[65vh] rounded-2xl overflow-hidden border border-border bg-slate-900/50 relative">
        <div class="p-2.5 bg-muted/60 border-b border-border flex items-center justify-between text-xs gap-2 shrink-0">
          <div class="flex items-center gap-2 text-foreground font-semibold truncate">
            <span class="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">${visual.label}</span>
            <span class="truncate">${escapeFileHtml(f.name)}</span>
          </div>
          ${adminOpenBtn}
        </div>
        <div class="flex-1 w-full relative">
          <iframe src="${embedUrl}" class="w-full h-full border-0 rounded-b-2xl bg-card" allow="autoplay"></iframe>
        </div>
      </div>
    `;
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    return;
  }

  // 2. Legacy DataURL Handling
  if (!f.dataUrl && typeof window.fetchFileContentFromCloud === 'function') {
    bodyEl.innerHTML = `
      <div class="py-16 px-4 text-center space-y-4">
        <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h4 class="text-sm font-bold text-foreground">กำลังดาวน์โหลดข้อมูลไฟล์...</h4>
        <p class="text-xs text-muted-foreground">${escapeFileHtml(f.name)} (${formatFileSize(f.size)})</p>
      </div>
    `;
    f.dataUrl = await window.fetchFileContentFromCloud(fileId);
    if (f.dataUrl) f.hasContent = true;
  }

  // If still missing
  if (!f.dataUrl) {
    bodyEl.innerHTML = `
      <div class="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
          <i data-lucide="alert-triangle" class="w-8 h-8"></i>
        </div>
        <div>
          <h4 class="text-base font-bold text-foreground">ไม่พบข้อมูลไฟล์ในระบบเดิม</h4>
          <p class="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            ไฟล์นี้เป็นไฟล์ที่อัปโหลดก่อนปรับปรุงเป็น Google Drive คุณสามารถแนบด้วยลิงก์ Google Drive หรือเลือกไฟล์เพื่ออัปโหลดใหม่ได้ทันที
          </p>
        </div>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button type="button" onclick="closeFilePreview(); openAttachDriveLinkModal();" class="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
            <i data-lucide="link" class="w-3.5 h-3.5"></i> แนบด้วยลิงก์ Google Drive
          </button>
        </div>
      </div>
    `;
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    return;
  }

  const name = (f.name || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop().trim() : '';
  const mime = (f.type || '').toLowerCase();

  const isVideo = ['mp4', 'webm', 'mov', 'm4v', 'ogv', 'mkv'].includes(ext) || mime.startsWith('video/');
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext) || mime.startsWith('image/');
  const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'flac'].includes(ext) || mime.startsWith('audio/');
  const isPdf = ext === 'pdf' || mime.includes('pdf');

  if (isVideo) {
    bodyEl.innerHTML = `
      <div class="w-full flex-1 flex flex-col items-center justify-center bg-black/95 rounded-2xl overflow-hidden p-1">
        <video controls autoplay playsinline class="max-w-full max-h-[62vh] w-auto h-auto rounded-xl">
          <source src="${f.dataUrl}" type="${f.type || 'video/mp4'}">
        </video>
      </div>
    `;
  } else if (isImage) {
    bodyEl.innerHTML = `
      <div class="w-full flex-1 flex items-center justify-center bg-black/90 dark:bg-black/60 rounded-2xl overflow-hidden p-2">
        <img src="${f.dataUrl}" alt="${escapeFileHtml(f.name)}" class="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg select-none" />
      </div>
    `;
  } else if (isAudio) {
    bodyEl.innerHTML = `
      <div class="w-full py-12 px-6 flex flex-col items-center justify-center text-center space-y-6 bg-muted/40 rounded-2xl border border-border/60">
        <div class="w-20 h-20 rounded-2xl bg-pink-500/15 text-pink-600 border border-pink-500/25 flex items-center justify-center text-4xl shadow-inner">
          <i data-lucide="music" class="w-10 h-10 animate-pulse"></i>
        </div>
        <div class="max-w-md">
          <h4 class="text-base font-bold text-foreground truncate">${escapeFileHtml(f.name)}</h4>
          <p class="text-xs text-muted-foreground mt-1">${formatFileSize(f.size)} • กำลังเล่นไฟล์เสียง</p>
        </div>
        <audio controls autoplay class="w-full max-w-md shadow-xs" src="${f.dataUrl}"></audio>
      </div>
    `;
  } else if (isPdf) {
    bodyEl.innerHTML = `
      <div class="w-full h-[65vh] rounded-2xl overflow-hidden border border-border bg-card">
        <iframe src="${f.dataUrl}" class="w-full h-full border-0 rounded-2xl" title="${escapeFileHtml(f.name)}"></iframe>
      </div>
    `;
  } else {
    bodyEl.innerHTML = `
      <div class="w-full py-12 px-6 flex flex-col items-center justify-center text-center space-y-4 bg-muted/30 rounded-2xl border border-border/60">
        <div class="w-20 h-20 rounded-2xl ${visual.colorClass} border flex items-center justify-center text-4xl shadow-sm">
          <i data-lucide="${visual.icon}"></i>
        </div>
        <div class="max-w-md space-y-1.5">
          <h4 class="text-base font-bold text-foreground">${escapeFileHtml(f.name)}</h4>
          <p class="text-xs text-muted-foreground">ไฟล์ประเภท ${visual.label} (${formatFileSize(f.size)})</p>
        </div>
        <button type="button" onclick="downloadSharedFile('${f.id}')" class="px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold text-xs flex items-center gap-2 hover:opacity-90 transition shadow-xs mt-2">
          <i data-lucide="download" class="w-4 h-4"></i> ดาวน์โหลดไฟล์นี้ทันที
        </button>
      </div>
    `;
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
}

function closeFilePreview() {
  const modal = document.getElementById('filePreviewModal');
  if (modal) {
    const vid = modal.querySelector('video');
    if (vid) { try { vid.pause(); vid.src = ''; } catch(e) {} }
    const aud = modal.querySelector('audio');
    if (aud) { try { aud.pause(); aud.src = ''; } catch(e) {} }
    const ifr = modal.querySelector('iframe');
    if (ifr) { try { ifr.src = ''; } catch(e) {} }
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeFilePreview();
});

// =========================================================================
// BUILD FILE CARDS
// =========================================================================
function buildCards(files, isAdmin) {
  if (!files || files.length === 0) {
    return '<div class="py-12 text-center bg-card rounded-2xl border border-border text-xs text-muted-foreground">ยังไม่มีเอกสารประกอบการประชุมในขณะนี้</div>';
  }

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
    const isDrive = Boolean(f.storageType === 'GOOGLE_DRIVE' || f.driveUrl || f.driveFileId);
    const cardBorderClass = isPinned
      ? 'border-amber-500/50 bg-amber-500/[0.04] ring-1 ring-amber-500/20 hover:border-amber-500/70'
      : 'border-border bg-card hover:border-primary/40';

    const openDriveLinkBtn = (isAdmin && isDrive && f.driveUrl)
      ? '<a href="' + f.driveUrl + '" target="_blank" onclick="event.stopPropagation()" title="เปิดไฟล์ต้นฉบับ" class="h-8 sm:w-9 sm:h-9 px-2 sm:px-0 rounded-xl border border-border bg-muted/40 sm:bg-card hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30 text-muted-foreground flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"><i data-lucide="external-link" class="w-3.5 h-3.5"></i><span class="sm:hidden text-[11px] font-semibold">เปิด</span></a>'
      : '';

    if (isAdmin) {
      return `
      <div class="group p-3.5 sm:p-4 rounded-2xl ${cardBorderClass} border shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
        <div onclick="previewSharedFile('${f.id}')" class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/file select-none" title="คลิกเพื่อดูตัวอย่างไฟล์ (${visual.label})">
          <div class="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${visual.colorClass} border flex items-center justify-center text-base sm:text-lg shrink-0 shadow-xs transition-transform group-hover/file:scale-105" title="${visual.label}">
            <i data-lucide="${visual.icon}"></i>
            ${isPinned ? '<span class="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-white text-[8px] sm:text-[9px] flex items-center justify-center shadow-sm ring-2 ring-card" title="ปักหมุดไว้บนสุด"><i data-lucide="pin" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i></span>' : ''}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs sm:text-sm font-bold text-foreground truncate group-hover/file:text-primary transition-colors" title="${escapeFileHtml(f.name)}">
              ${escapeFileHtml(f.name)}
            </p>
            <p class="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              <span class="font-semibold text-foreground/80">${formatFileSize(f.size)}</span> • โดย ${escapeFileHtml(f.uploaderName || '')} • <span class="text-emerald-600 dark:text-emerald-400 font-medium">${formatFileUploadStamp(f)}</span>
            </p>
          </div>
        </div>

        <div class="grid grid-cols-4 sm:flex items-center gap-1.5 pt-2.5 border-t border-border/60 sm:pt-0 sm:border-t-0 shrink-0">
          <button type="button" onclick="event.stopPropagation(); togglePinSharedFile('${f.id}')" title="${isPinned ? 'เลิกปักหมุด' : 'ปักหมุด'}"
            class="h-8 sm:w-9 sm:h-9 px-2 sm:px-0 rounded-xl border flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer ${isPinned ? 'bg-amber-500 border-amber-500 text-white' : 'border-border bg-muted/40 sm:bg-card hover:bg-amber-500/10 hover:text-amber-600 text-muted-foreground'}">
            <i data-lucide="pin" class="w-3.5 h-3.5"></i>
            <span class="sm:hidden text-[11px] font-semibold">${isPinned ? 'เลิกหมุด' : 'ปักหมุด'}</span>
          </button>
          ${openDriveLinkBtn}
          <button type="button" onclick="event.stopPropagation(); previewSharedFile('${f.id}')" title="ดูตัวอย่างไฟล์ (${visual.label})"
            class="h-8 sm:w-9 sm:h-9 px-2 sm:px-0 rounded-xl border border-border bg-muted/40 sm:bg-card hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            <span class="sm:hidden text-[11px] font-semibold">ดู</span>
          </button>
          <button type="button" onclick="event.stopPropagation(); downloadSharedFile('${f.id}')" title="ดาวน์โหลดไฟล์ (${visual.label})"
            class="h-8 sm:w-9 sm:h-9 px-2 sm:px-0 rounded-xl border border-border bg-muted/40 sm:bg-card hover:bg-muted text-foreground flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span class="sm:hidden text-[11px] font-semibold">โหลด</span>
          </button>
          <button type="button" onclick="event.stopPropagation(); deleteSharedFile('${f.id}')" title="ลบไฟล์"
            class="h-8 sm:w-9 sm:h-9 px-2 sm:px-0 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center gap-1 transition cursor-pointer">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            <span class="sm:hidden text-[11px] font-semibold">ลบ</span>
          </button>
        </div>
      </div>
      `;
    }

    return `
    <div class="group p-3.5 sm:p-4 rounded-2xl ${cardBorderClass} border shadow-card flex items-center justify-between gap-2.5 sm:gap-3 transition">
      <div onclick="previewSharedFile('${f.id}')" class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/file select-none" title="คลิกเพื่อดูตัวอย่างไฟล์ (${visual.label})">
        <div class="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${visual.colorClass} border flex items-center justify-center text-base sm:text-lg shrink-0 shadow-xs transition-transform group-hover/file:scale-105" title="${visual.label}">
          <i data-lucide="${visual.icon}"></i>
          ${isPinned ? '<span class="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-white text-[8px] sm:text-[9px] flex items-center justify-center shadow-sm ring-2 ring-card" title="ปักหมุดไว้บนสุด"><i data-lucide="pin" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i></span>' : ''}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs sm:text-sm font-semibold text-foreground truncate group-hover/file:text-primary transition-colors" title="${escapeFileHtml(f.name)}">
            ${escapeFileHtml(f.name)}
          </p>
          <p class="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">${formatFileSize(f.size)} • โดย ${escapeFileHtml(f.uploaderName || '')} • <span class="text-emerald-600 dark:text-emerald-400 font-medium">${formatFileUploadStamp(f)}</span></p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        ${openDriveLinkBtn}
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

// =========================================================================
// RENDER FILE DROP SECTION
// =========================================================================
function renderFileDropSection() {
  const state = window.appState;
  if (!state) return;
  const files = state.files || [];
  const uCount = document.getElementById('userFilesCount');
  const aCount = document.getElementById('adminFilesCount');
  if (uCount) uCount.textContent = files.length;
  if (aCount) aCount.textContent = files.length;

  const driveConfig = getGoogleDriveConfig();
  const isDriveConfigured = Boolean(driveConfig.scriptUrl);

  // Update Admin Google Drive Status Bar
  const gdriveBadge = document.getElementById('gdriveStatusBadge');
  const gdriveMeta = document.getElementById('gdriveFolderMetaText');
  const openDriveFolderBtn = document.getElementById('btnAdminOpenGDriveFolder');

  if (gdriveBadge) {
    const chainSvg = (window.getLucideSvg && typeof window.getLucideSvg === 'function')
      ? window.getLucideSvg('link-2', 'w-3.5 h-3.5')
      : '<i data-lucide="link-2" class="w-3.5 h-3.5"></i>';
    const brokenChainSvg = (window.getLucideSvg && typeof window.getLucideSvg === 'function')
      ? window.getLucideSvg('link-2-off', 'w-3.5 h-3.5')
      : '<i data-lucide="link-2-off" class="w-3.5 h-3.5"></i>';

    if (isDriveConfigured) {
      gdriveBadge.className = 'w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-2xs transition';
      gdriveBadge.title = 'เชื่อมต่อแล้ว';
      gdriveBadge.setAttribute('aria-label', 'เชื่อมต่อแล้ว');
      gdriveBadge.innerHTML = chainSvg;
    } else {
      gdriveBadge.className = 'w-7 h-7 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-2xs transition';
      gdriveBadge.title = 'ยังไม่ได้ตั้งค่า';
      gdriveBadge.setAttribute('aria-label', 'ยังไม่ได้ตั้งค่า');
      gdriveBadge.innerHTML = brokenChainSvg;
    }
  }

  if (gdriveMeta) {
    if (driveConfig.folderId) {
      gdriveMeta.textContent = 'โฟลเดอร์: ' + (driveConfig.folderId.length > 25 ? driveConfig.folderId.slice(0, 25) + '...' : driveConfig.folderId);
      gdriveMeta.title = driveConfig.folderId;
    } else if (isDriveConfigured) {
      gdriveMeta.textContent = 'บันทึกเข้า My Drive หลัก (ระบุโฟลเดอร์ได้ในการตั้งค่า)';
      gdriveMeta.title = 'บันทึกเข้า My Drive หลัก';
    } else {
      gdriveMeta.textContent = 'จัดเก็บเอกสารเข้า Google Drive (ฟรี ไม่จำกัดพื้นที่)';
      gdriveMeta.title = 'จัดเก็บเอกสารเข้า Google Drive (ฟรี ไม่จำกัดพื้นที่)';
    }
  }

  if (openDriveFolderBtn) {
    if (driveConfig.folderId || driveConfig.folderUrl) {
      openDriveFolderBtn.classList.remove('hidden');
      openDriveFolderBtn.classList.add('flex');
    } else {
      openDriveFolderBtn.classList.add('hidden');
      openDriveFolderBtn.classList.remove('flex');
    }
  }



  // User Dropzone & Permissions
  if (window.currentUserId) {
    const me = (state.users || []).find(u => u.id === window.currentUserId);
    const permBox = document.getElementById('userFilePermissionBox');
    const dropzone = document.getElementById('userFileDropzone');
    if (me && permBox && dropzone) {
      if (me.filePermission === 'APPROVED') {
        permBox.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[11px] font-bold">พร้อมแนบไฟล์</span>
            <button type="button" onclick="releaseFilePermission()" class="px-2.5 sm:px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 text-[11px] sm:text-xs font-bold hover:bg-rose-600 hover:text-white transition whitespace-nowrap shrink-0 cursor-pointer" title="คืนสิทธิ์การอัปโหลดไฟล์">
              คืนสิทธิ์
            </button>
          </div>
        `;
        dropzone.classList.remove('hidden');
      } else if (me.filePermission === 'PENDING') {
        permBox.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 text-[11px] sm:text-xs font-bold animate-pulse whitespace-nowrap shrink-0 inline-block">รออนุมัติ...</span>
            <button type="button" onclick="releaseFilePermission()" class="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] hover:bg-rose-500 hover:text-white transition whitespace-nowrap shrink-0 cursor-pointer">
              ยกเลิก
            </button>
          </div>
        `;
        dropzone.classList.add('hidden');
      } else {
        permBox.innerHTML = '<button type="button" onclick="requestFileDropPermission()" class="px-3 py-1 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-[11px] sm:text-xs font-bold hover:bg-indigo-600 hover:text-white transition whitespace-nowrap shrink-0 cursor-pointer">+ ขอแนบไฟล์</button>';
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
    const q = (searchEl && searchEl.value) ? String(searchEl.value).trim().toLowerCase() : '';

    const sortedWithOriginalIndex = (state.users || [])
      .map((u, originalIdx) => ({ u, originalIdx }))
      .filter(({ u, originalIdx }) => {
        if (!q) return true;
        const seatStr = '#' + (originalIdx + 1);
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
      permListEl.innerHTML = '<div class="py-6 text-center text-xs text-muted-foreground">ไม่พบรายชื่อสมาชิกที่ค้นหา</div>';
    } else {
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
              <div class="w-8 h-8 rounded-full ${st === 'PENDING' ? 'bg-amber-500 text-white' : st === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'} font-bold text-[11px] flex items-center justify-center shrink-0">
                #${originalIdx + 1}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-foreground truncate">${escapeFileHtml(u.nickname || u.firstName || '')}</p>
                <p class="text-[10px] truncate ${st === 'PENDING' ? 'text-amber-600 dark:text-amber-400 font-bold' : st === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground'}">
                  ${st === 'PENDING' ? 'ขออนุญาตอัปโหลดไฟล์' : st === 'APPROVED' ? 'กำลังได้รับสิทธิ์อัปโหลด' : 'ลำดับปกติ'}
                </p>
              </div>
            </div>
            <div class="shrink-0">
              ${st === 'APPROVED'
                ? '<button type="button" onclick="adminSetFilePermission(\'' + u.id + '\', \'NONE\')" class="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition shadow-2xs whitespace-nowrap cursor-pointer">เสร็จสิ้น</button>'
                : st === 'PENDING'
                ? '<div class="flex items-center gap-1.5"><button type="button" onclick="adminSetFilePermission(\'' + u.id + '\', \'NONE\')" class="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-500/30 text-[11px] font-bold transition inline-flex items-center justify-center shrink-0 cursor-pointer" title="ไม่อนุญาต"><i data-lucide="x" class="h-4 w-4"></i></button><button type="button" onclick="adminSetFilePermission(\'' + u.id + '\', \'APPROVED\')" class="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-2xs inline-flex items-center justify-center shrink-0 cursor-pointer" title="อนุญาต"><i data-lucide="check" class="h-4 w-4"></i></button></div>'
                : '<button type="button" onclick="adminSetFilePermission(\'' + u.id + '\', \'APPROVED\')" class="w-8 h-8 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-border text-foreground text-[11px] font-semibold transition inline-flex items-center justify-center shrink-0 cursor-pointer" title="ให้สิทธิ์"><i data-lucide="check" class="h-4 w-4"></i></button>'
              }
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// =========================================================================
// WINDOW EXPORTS
// =========================================================================
window.UNIFIED_GAS_SCRIPT = UNIFIED_GAS_SCRIPT;
window.getGoogleDriveConfig = getGoogleDriveConfig;
window.extractDriveFileId = extractDriveFileId;
window.extractDriveFolderId = extractDriveFolderId;
window.detectDocumentInfoFromUrl = detectDocumentInfoFromUrl;
window.uploadFileToGoogleDrive = uploadFileToGoogleDrive;
window.downloadSharedFile = downloadSharedFile;
window.previewSharedFile = previewSharedFile;
window.closeFilePreview = closeFilePreview;
window.formatFileSize = formatFileSize;
window.requestFileDropPermission = requestFileDropPermission;
window.releaseFilePermission = releaseFilePermission;
window.adminSetFilePermission = adminSetFilePermission;
window.formatFileUploadStamp = formatFileUploadStamp;
window.handleFileUpload = handleFileUpload;
window.togglePinSharedFile = togglePinSharedFile;
window.deleteFileFromGoogleDrive = deleteFileFromGoogleDrive;
window.deleteSharedFile = deleteSharedFile;
window.renderFileDropSection = renderFileDropSection;
window.getFileVisualInfo = getFileVisualInfo;
window.openGoogleDriveSetupModal = openGoogleDriveSetupModal;
window.closeGoogleDriveSetupModal = closeGoogleDriveSetupModal;
window.saveGoogleDriveConfigFromModal = saveGoogleDriveConfigFromModal;
window.testGoogleDriveConnectionFromModal = testGoogleDriveConnectionFromModal;
window.copyUnifiedGasScriptToClipboard = copyUnifiedGasScriptToClipboard;
window.openAttachDriveLinkModal = openAttachDriveLinkModal;
window.closeAttachDriveLinkModal = closeAttachDriveLinkModal;
window.onDriveLinkInputChange = onDriveLinkInputChange;
window.submitAttachDriveLink = submitAttachDriveLink;
window.openMeetingGoogleDriveFolder = openMeetingGoogleDriveFolder;
