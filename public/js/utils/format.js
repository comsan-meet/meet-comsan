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

// Window attachments for backward compatibility
window.escapeHtml = escapeHtml;
window.formatFileSize = formatFileSize;
window.dataURLToBlob = dataURLToBlob;
window.isIOSDevice = isIOSDevice;
window.triggerUniversalBlobDownload = triggerUniversalBlobDownload;
