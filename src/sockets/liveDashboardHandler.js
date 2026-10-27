const stateService = require('../services/stateService');

module.exports = function registerLiveDashboardHandlers(io, socket) {
  const state = stateService.getState();

  // Ensure pairing code exists
  if (!state.liveDashboardConfig) {
    state.liveDashboardConfig = {
      concurrencyMode: 'BOTH',
      showRaiseHandPopup: true,
      showPermissionPopup: true,
      showRandomizerPopup: true,
      theme: 'DARK',
      clockFormat: '24H',
      wallpaperMode: 'BUBBLES',
      customWallpaperUrl: '',
      pairingCode: String(Math.floor(1000 + Math.random() * 9000))
    };
  } else if (!state.liveDashboardConfig.pairingCode) {
    state.liveDashboardConfig.pairingCode = String(Math.floor(1000 + Math.random() * 9000));
  }

  // Admin remote configuration for Live Dashboard
  socket.on('admin:updateLiveDashboardConfig', (newConfig) => {
    state.liveDashboardConfig = {
      ...state.liveDashboardConfig,
      ...(newConfig || {})
    };
    stateService.persistAndBroadcast();
    io.emit('liveDashboard:configUpdated', state.liveDashboardConfig);
  });

  // Regenerate Pairing PIN
  socket.on('admin:regenerateRemotePin', (data, callback) => {
    if (typeof data === 'function') {
      callback = data;
      data = null;
    }
    const pin = (data && data.pairingCode) ? String(data.pairingCode) : String(Math.floor(1000 + Math.random() * 9000));
    state.liveDashboardConfig.pairingCode = pin;
    stateService.persistAndBroadcast();
    io.emit('liveDashboard:pinUpdated', pin);
    io.emit('liveDashboard:configUpdated', state.liveDashboardConfig);
    console.log(`[LiveDashboard] Pairing PIN updated/regenerated: ${pin}`);
    if (typeof callback === 'function') callback({ success: true, pairingCode: pin });
  });

  // Verify Remote PIN from mobile
  socket.on('remote:verifyPin', (payload, callback) => {
    const pin = (typeof payload === 'object' && payload !== null) ? payload.pin : payload;
    const correctPin = state.liveDashboardConfig?.pairingCode || '1234';
    const cleanEntered = String(pin || '').trim();
    const cleanCorrect = String(correctPin).trim();
    const isMatch = Boolean(cleanEntered && cleanEntered === cleanCorrect);
    console.log(`[LiveDashboard] PIN check: entered='${cleanEntered}', expected='${cleanCorrect}', isMatch=${isMatch}`);
    if (isMatch) {
      socket.isPairedRemote = true;
      if (typeof callback === 'function') callback({ success: true, pairingCode: cleanCorrect });
      socket.emit('remote:pinVerified', { success: true, pairingCode: cleanCorrect });
      io.emit('liveDashboard:remoteConnected', { time: Date.now(), socketId: socket.id });
      io.emit('liveDashboard:remoteStatusUpdate', { connected: true, activeRemotes: 1 });
    } else {
      if (typeof callback === 'function') callback({ success: false, message: 'รหัสจับคู่ไม่ถูกต้อง' });
      socket.emit('remote:pinVerified', { success: false, message: 'รหัสจับคู่ไม่ถูกต้อง' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.isPairedRemote) {
      console.log(`[LiveDashboard] Paired remote disconnected: ${socket.id}`);
      io.emit('liveDashboard:remoteDisconnected', { time: Date.now(), socketId: socket.id });
      io.emit('liveDashboard:remoteStatusUpdate', { connected: false, activeRemotes: 0 });
    }
  });

  // Apple TV Style Live Remote Control Events
  socket.on('remote:cursorMove', (coords) => {
    io.emit('liveDashboard:cursorMove', coords);
  });

  socket.on('remote:cursorHide', () => {
    io.emit('liveDashboard:cursorHide');
  });

  socket.on('remote:click', (coords) => {
    io.emit('liveDashboard:click', coords);
  });

  socket.on('remote:dpad', (direction) => {
    io.emit('liveDashboard:dpad', direction);
  });

  socket.on('remote:action', (actionPayload) => {
    io.emit('liveDashboard:action', actionPayload);
  });

  socket.on('remote:openApp', (appId) => {
    io.emit('liveDashboard:openApp', appId);
  });

  socket.on('remote:closeApp', () => {
    io.emit('liveDashboard:closeApp');
  });
};
