const stateService = require('../services/stateService');

module.exports = function registerStreamHandlers(io, socket) {
  const state = stateService.getState();

  // ข้อ 8: คืนสถานะสิทธิ์กลับที่เดิมเมื่อใช้งานเสร็จสิ้น
  socket.on('user:finishPermission', ({ userId, permType }) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    if (permType === 'STREAM') {
      user.streamPermission = 'NONE';
      if (state.activeStream && state.activeStream.streamerId === userId) {
        state.activeStream = null;
        io.emit('stream:stopped');
      }
      io.emit('stream:permission', { userId, status: 'NONE' });
    } else if (permType === 'FILE') {
      user.filePermission = 'NONE';
      io.emit('file:permission', { userId, status: 'NONE' });
    }
    stateService.persistAndBroadcast();
  });

  // ระบบขออนุญาตเปิดกล้อง / แชร์หน้าจอ (Live Camera & Screen Share)
  socket.on('stream:requestPermission', (userId) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.streamPermission = 'PENDING';
    stateService.persistAndBroadcast();
    io.emit('stream:permission', { userId, status: 'PENDING' });
    io.emit('notify:event', {
      type: 'info',
      targetRole: 'ADMIN',
      text: `🎥 ${user.nickname} (${user.firstName}) ขออนุญาตเปิดกล้อง/แชร์หน้าจอ`
    });
  });

  socket.on('admin:setStreamPermission', ({ userId, status }) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.streamPermission = status;
    if (status !== 'APPROVED' && state.activeStream && state.activeStream.streamerId === userId) {
      state.activeStream = null;
      io.emit('stream:stopped');
    }
    stateService.persistAndBroadcast();
    io.emit('stream:permission', { userId, status: user.streamPermission });
    io.emit('notify:event', {
      type: status === 'APPROVED' ? 'success' : 'warning',
      targetUserId: user.id,
      text: status === 'APPROVED'
        ? '✅ ADMIN อนุมัติให้คุณเปิดกล้องและแชร์หน้าจอได้แล้ว!'
        : '⚠️ สิทธิ์การเปิดกล้อง/แชร์หน้าจอถูกยกเลิก'
    });
  });

  socket.on('stream:frame', (framePayload) => {
    if (!framePayload || !framePayload.frameDataUrl) return;
    state.activeStream = {
      streamerId: framePayload.streamerId,
      streamerName: framePayload.streamerName,
      mode: framePayload.mode || 'CAMERA',
      frameDataUrl: framePayload.frameDataUrl,
      updatedAt: Date.now()
    };
    io.emit('stream:frameUpdate', state.activeStream);
  });

  socket.on('stream:stop', () => {
    state.activeStream = null;
    stateService.persistAndBroadcast();
    io.emit('stream:stopped');
  });
};
