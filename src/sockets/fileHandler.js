const stateService = require('../services/stateService');

module.exports = function registerFileHandlers(io, socket) {
  const state = stateService.getState();

  socket.on('file:requestPermission', (userId) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.filePermission = 'PENDING';
    stateService.persistAndBroadcast();
    io.emit('file:permission', { userId, status: 'PENDING' });
    io.emit('notify:event', {
      type: 'fileReq',
      targetRole: 'ADMIN',
      text: `📁 ${user.nickname} ส่งคำขออนุญาตดรอปไฟล์`
    });
  });

  socket.on('admin:setFilePermission', ({ userId, status }) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.filePermission = status;
    stateService.persistAndBroadcast();
    io.emit('file:permission', { userId, status: user.filePermission });
    io.emit('notify:event', {
      type: status === 'APPROVED' ? 'success' : 'warning',
      targetUserId: user.id,
      text: status === 'APPROVED' ? '✅ ADMIN อนุมัติให้คุณดรอปไฟล์ได้แล้ว!' : '⚠️ สิทธิ์การดรอปไฟล์ถูกยกเลิก'
    });
  });

  socket.on('file:upload', (fileObj) => {
    if (!fileObj || !fileObj.name || (!fileObj.dataUrl && !fileObj.hasContent)) return;
    const now = Date.now();
    const item = {
      id: fileObj.id || ('FILE-' + now),
      name: fileObj.name,
      size: fileObj.size || 0,
      type: fileObj.type || 'application/octet-stream',
      dataUrl: fileObj.dataUrl || null,
      hasContent: Boolean(fileObj.dataUrl || fileObj.hasContent),
      uploaderId: fileObj.uploaderId || 'ADMIN',
      uploaderName: fileObj.uploaderName || 'ADMIN',
      time: fileObj.time || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      uploadedAt: fileObj.uploadedAt || now,
      isPinned: Boolean(fileObj.isPinned),
      pinnedAt: fileObj.pinnedAt || null
    };

    state.files = Array.isArray(state.files) ? state.files : [];
    const existingIdx = state.files.findIndex(f => f.id === item.id);
    if (existingIdx !== -1) {
      state.files[existingIdx] = {
        ...state.files[existingIdx],
        ...item,
        dataUrl: item.dataUrl || state.files[existingIdx].dataUrl
      };
    } else {
      state.files.push(item);
    }

    stateService.persistAndBroadcast();
    io.emit('file:upload', item);
    io.emit('notify:event', {
      type: 'fileDrop',
      text: `📎 ${item.uploaderName} ดรอปไฟล์ใหม่: "${item.name}"`
    });
  });

  socket.on('admin:togglePinFile', (fileId) => {
    const file = (state.files || []).find(f => f.id === fileId);
    if (!file) return;
    file.isPinned = !file.isPinned;
    file.pinnedAt = file.isPinned ? Date.now() : null;
    stateService.persistAndBroadcast();
    if (file.isPinned) {
      io.emit('notify:event', {
        type: 'info',
        text: `📌 ผู้ดูแลระบบได้ปักหมุดเอกสาร: "${file.name}" ไว้ด้านบนสุด`
      });
    }
  });

  socket.on('file:delete', (fileId) => {
    state.files = (state.files || []).filter(f => f.id !== fileId);
    stateService.persistAndBroadcast();
    io.emit('file:delete', fileId);
  });
};
