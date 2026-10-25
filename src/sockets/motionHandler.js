const stateService = require('../services/stateService');

module.exports = function registerMotionHandlers(io, socket) {
  const state = stateService.getState();

  socket.on('admin:createMotion', (motionPayload) => {
    if (!motionPayload || !motionPayload.title) return;
    const defaultStandardOptions = [
      { id: 'APPROVE', label: 'เห็นด้วย', image: null },
      { id: 'REJECT', label: 'ไม่เห็นด้วย', image: null },
      { id: 'ABSTAIN', label: 'งดออกเสียง', image: null }
    ];
    const newMotion = {
      id: motionPayload.id || `M-${Date.now().toString().slice(-4)}`,
      title: String(motionPayload.title).trim(),
      type: motionPayload.type === 'CUSTOM' ? 'CUSTOM' : 'STANDARD',
      isSecret: Boolean(motionPayload.isSecret),
      options: (motionPayload.type === 'CUSTOM' && Array.isArray(motionPayload.options) && motionPayload.options.length > 0)
        ? motionPayload.options
        : defaultStandardOptions,
      isOpen: true,
      votes: {}
    };
    state.motions.push(newMotion);
    stateService.persistAndBroadcast();
    io.emit('notify:event', {
      type: 'motion',
      text: `🗳️ เปิดญัตติโหวตใหม่${newMotion.isSecret ? ' (โหวตลับ)' : ''}: "${newMotion.title}"`
    });
  });

  socket.on('admin:deleteMotion', (motionId) => {
    state.motions = state.motions.filter(m => m.id !== motionId);
    stateService.persistAndBroadcast();
  });

  socket.on('admin:toggleMotion', (payload) => {
    const payloadObj = (typeof payload === 'object' && payload !== null) ? payload : { motionId: payload };
    const motionId = payloadObj.motionId;
    const targetOpen = payloadObj.isOpen;
    const m = (state.motions || []).find(item => item.id === motionId);
    if (m) {
      const nextState = (targetOpen !== undefined) ? Boolean(targetOpen) : !m.isOpen;
      if (nextState && state.meeting && state.meeting.isEnded) {
        return; // Don't allow re-opening votes if meeting is ended
      }
      m.isOpen = nextState;
      stateService.persistAndBroadcast();
    }
  });

  socket.on('admin:toggleRealtime', (realtimeVoting) => {
    state.meeting.realtimeVoting = Boolean(realtimeVoting);
    stateService.persistAndBroadcast();
  });

  socket.on('user:vote', ({ userId, motionId, choice }) => {
    const user = (state.users || []).find(u => u.id === userId);
    if (!user || !user.checkedIn) return;
    const m = state.motions.find(item => item.id === motionId);
    if (m && m.isOpen && userId) {
      if (!m.votes) m.votes = {};
      m.votes[userId] = choice;
      stateService.persistAndBroadcast();
    }
  });

  socket.on('user:raiseHand', (userId) => {
    const user = state.users.find(u => u.id === userId);
    if (!user || !user.checkedIn) return;
    user.raiseHandCount = (user.raiseHandCount || 0) + 1;
    const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const alertData = {
      queueId: Date.now() + Math.floor(Math.random() * 1000),
      userId: user.id,
      nickname: user.nickname,
      fullName: `${user.firstName} ${user.lastName}`,
      position: user.position,
      time: nowStr
    };
    state.raiseHandQueue.push(alertData);
    stateService.persistAndBroadcast();
    io.emit('alert:raiseHand', alertData);
  });

  socket.on('admin:removeQueue', (queueId) => {
    state.raiseHandQueue = state.raiseHandQueue.filter(q => q.queueId !== queueId);
    stateService.persistAndBroadcast();
  });

  socket.on('admin:clearQueue', () => {
    state.raiseHandQueue = [];
    stateService.persistAndBroadcast();
  });

  socket.on('user:lowerHand', (userId) => {
    state.raiseHandQueue = state.raiseHandQueue.filter(q => q.userId !== userId);
    stateService.persistAndBroadcast();
  });
};
