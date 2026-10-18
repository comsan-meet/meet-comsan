const stateService = require('../services/stateService');

module.exports = function registerChatHandlers(io, socket) {
  const state = stateService.getState();

  socket.on('chat:send', (msgPayload) => {
    if (!msgPayload) return;
    const hasText = msgPayload.text && String(msgPayload.text).trim().length > 0;
    const hasMedia = msgPayload.mediaUrl && String(msgPayload.mediaUrl).length > 0;
    if (!hasText && !hasMedia) return;

    const now = Date.now();
    const newMsg = {
      id: msgPayload.id || (now + Math.floor(Math.random() * 1000)),
      timestamp: msgPayload.timestamp || now,
      sender: msgPayload.sender,
      senderId: msgPayload.senderId || null,
      target: msgPayload.target || 'ALL',
      text: hasText ? String(msgPayload.text).trim() : '',
      mediaUrl: hasMedia ? msgPayload.mediaUrl : null,
      mediaType: hasMedia ? (msgPayload.mediaType || 'image') : null,
      mediaName: hasMedia ? (msgPayload.mediaName || '') : null,
      time: msgPayload.time || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };
    state.chats.push(newMsg);

    // Record persistent chat log (never removed even if user deletes message)
    state.chatLogs = state.chatLogs || [];
    state.chatLogs.push({
      id: 'LOG-' + newMsg.id,
      msgId: String(newMsg.id),
      timestamp: newMsg.timestamp,
      sender: newMsg.sender,
      senderId: newMsg.senderId || null,
      target: newMsg.target || 'ALL',
      text: newMsg.text || '',
      mediaUrl: newMsg.mediaUrl || null,
      mediaType: newMsg.mediaType || null,
      mediaName: newMsg.mediaName || null,
      time: newMsg.time,
      dateStr: new Date(newMsg.timestamp).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
      deleted: false,
      deletedAt: null
    });

    stateService.persistAndBroadcast();
    io.emit('notify:chat', newMsg);
  });

  socket.on('chat:delete', (msgId) => {
    state.chats = (state.chats || []).filter(c => String(c.id) !== String(msgId));
    state.chatLogs = state.chatLogs || [];
    const targetLog = state.chatLogs.find(l => String(l.msgId) === String(msgId));
    if (targetLog) {
      targetLog.deleted = true;
      targetLog.deletedAt = Date.now();
      targetLog.deletedTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
    stateService.persistAndBroadcast();
  });

  socket.on('admin:getChatLogs', (callback) => {
    if (typeof callback === 'function') {
      callback(state.chatLogs || []);
    }
  });

  socket.on('user:statusNote', (payload) => {
    if (!payload || !payload.userId) return;
    const user = (state.users || []).find(u => u.id === payload.userId);
    if (user) {
      user.statusNote = payload.statusNote ? String(payload.statusNote).trim().slice(0, 60) : '';
      user.statusNoteUpdatedAt = user.statusNote ? Date.now() : null;
      stateService.persistAndBroadcast();
    }
  });
};

