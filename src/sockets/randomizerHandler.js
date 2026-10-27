const stateService = require('../services/stateService');

module.exports = function registerRandomizerHandlers(io, socket) {
  const state = stateService.getState();

  // ระบบสุ่มหรรษา (Randomizer Spin Broadcast -> เด้ง Pop-up บนหน้าจอ User ทันที)
  socket.on('admin:startRandomSpin', (spinPayload) => {
    if (!spinPayload || !Array.isArray(spinPayload.items) || spinPayload.items.length === 0) return;
    const record = {
      id: Date.now(),
      mode: spinPayload.mode || 'WHEEL',
      winnerLabel: spinPayload.winnerLabel,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    if (!state.randomizer) state.randomizer = { lastWinner: null, history: [] };
    state.randomizer.lastWinner = record;
    state.randomizer.activePopup = true;
    state.randomizer.history.unshift(record);
    state.randomizer.history = state.randomizer.history.slice(0, 15);
    stateService.persistAndBroadcast();
    io.emit('random:spin', spinPayload);
  });

  socket.on('admin:closeRandomPopup', () => {
    if (state.randomizer) {
      state.randomizer.activePopup = false;
    }
    stateService.persistAndBroadcast();
    io.emit('random:closePopup');
  });
};
