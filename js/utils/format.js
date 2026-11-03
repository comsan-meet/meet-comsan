function formatMeetingDateThai(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '-';
  const trimmed = dateStr.trim();
  if (trimmed.includes('พ.ย.') || trimmed.includes('ม.ค.') || trimmed.includes('ก.พ.') || trimmed.includes('มี.ค.') || trimmed.includes('เม.ย.') || trimmed.includes('พ.ค.') || trimmed.includes('มิ.ย.') || trimmed.includes('ก.ค.') || trimmed.includes('ส.ค.') || trimmed.includes('ก.ย.') || trimmed.includes('ต.ค.') || trimmed.includes('ธ.ค.')) {
    return trimmed;
  }
  try {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const thaiYear = y < 2500 ? y + 543 : y;
      if (!isNaN(d) && months[m]) {
        return `${d} ${months[m]} ${thaiYear}`;
      }
    }
  } catch (e) {}
  return trimmed;
}

/**
 * COMSAN Meeting System - Format & Helper Utilities
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function dataURLToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

async function triggerUniversalBlobDownload(blob, filename) {
  if (isIOSDevice() && navigator.canShare) {
    try {
      const fileObj = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      if (navigator.canShare({ files: [fileObj] })) {
        await navigator.share({ files: [fileObj], title: filename });
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  if (isIOSDevice()) {
    setTimeout(() => window.open(blobUrl, '_blank'), 300);
  }
  setTimeout(() => {
    if (a.parentNode) document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 15000);
}

/**
 * Authentication and User Matching Utilities
 */
function normalizeThaiIdentifier(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/gi, '')
    .replace(/\s+/g, ' ');
}

function isUserPasswordMatch(user, passInput) {
  if (!user || passInput === undefined || passInput === null) return false;
  const pInput = String(passInput).trim();
  if (!pInput) return false;
  const pClean = pInput.replace(/[-\s]/g, '').toLowerCase();

  const userPass = String(user.password || '').trim();
  const userPassClean = userPass.replace(/[-\s]/g, '').toLowerCase();

  const studentId = String(user.studentId || '').trim();
  const studentIdClean = studentId.replace(/[-\s]/g, '').toLowerCase();

  if (userPass && (pInput === userPass || pClean === userPassClean)) return true;
  if (studentId && (pInput.toLowerCase() === studentId.toLowerCase() || pClean === studentIdClean)) return true;

  return false;
}

function isUserNameMatch(user, nameInput) {
  if (!user || !nameInput) return false;
  const rawInput = String(nameInput).trim().toLowerCase();
  const normInput = normalizeThaiIdentifier(nameInput);
  const inputNoDash = rawInput.replace(/[-\s]/g, '');

  // 1. Nickname (exact or normalized)
  if (user.nickname) {
    const nick = String(user.nickname).trim().toLowerCase();
    const nickNorm = normalizeThaiIdentifier(user.nickname);
    if (nick === rawInput || nickNorm === normInput || nick === normInput) return true;
  }

  // 2. First name
  if (user.firstName) {
    const fn = String(user.firstName).trim().toLowerCase();
    const fnNorm = normalizeThaiIdentifier(user.firstName);
    if (fn === rawInput || fnNorm === normInput || fn === normInput) return true;
  }

  // 3. Full name: firstName + lastName
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
  const fullNameNorm = normalizeThaiIdentifier(fullName);
  if (fullName && (fullName === rawInput || fullNameNorm === normInput)) return true;

  // 4. Nickname + First name combination (e.g. "แก้ม สุณิชา" or "สุณิชา แก้ม")
  if (user.nickname && user.firstName) {
    const n1 = `${user.nickname} ${user.firstName}`.toLowerCase();
    const n2 = `${user.firstName} ${user.nickname}`.toLowerCase();
    if (n1 === rawInput || n2 === rawInput || normalizeThaiIdentifier(n1) === normInput || normalizeThaiIdentifier(n2) === normInput) return true;
  }

  // 5. User ID (COMSAN-35, comsan-35, 35)
  if (user.id) {
    const uid = String(user.id).trim().toLowerCase();
    if (uid === rawInput) return true;
    const numPart = uid.replace(/[^0-9]/g, '');
    if (numPart && (numPart === rawInput || `comsan-${rawInput}` === uid || `comsan-${rawInput.padStart(2, '0')}` === uid)) return true;
  }

  // 6. Student ID
  if (user.studentId) {
    const sid = String(user.studentId).trim().toLowerCase();
    const sidClean = sid.replace(/[-\s]/g, '');
    if (sid === rawInput || sidClean === inputNoDash) return true;
  }

  // 7. Password treated as Student ID if in numeric format
  if (user.password && /^\d{8,12}/.test(user.password)) {
    const passClean = String(user.password).replace(/[-\s]/g, '');
    if (passClean === inputNoDash) return true;
  }

  return false;
}

// Window & Node attachments for backward compatibility and testing
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.formatFileSize = formatFileSize;
  window.dataURLToBlob = dataURLToBlob;
  window.isIOSDevice = isIOSDevice;
  window.triggerUniversalBlobDownload = triggerUniversalBlobDownload;
  window.normalizeThaiIdentifier = normalizeThaiIdentifier;
  window.isUserPasswordMatch = isUserPasswordMatch;
  window.isUserNameMatch = isUserNameMatch;
  window.formatMeetingDateThai = formatMeetingDateThai;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    formatFileSize,
    dataURLToBlob,
    isIOSDevice,
    triggerUniversalBlobDownload,
    normalizeThaiIdentifier,
    isUserPasswordMatch,
    isUserNameMatch,
    formatMeetingDateThai
  };
}
