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
  socket.on('admin:regenerateRemotePin', () => {
    state.liveDashboardConfig.pairingCode = String(Math.floor(1000 + Math.random() * 9000));
    stateService.persistAndBroadcast();
    io.emit('liveDashboard:pinUpdated', state.liveDashboardConfig.pairingCode);
    io.emit('liveDashboard:configUpdated', state.liveDashboardConfig);
  });

  // Verify Remote PIN from mobile
  socket.on('remote:verifyPin', ({ pin }, callback) => {
    const correctPin = state.liveDashboardConfig?.pairingCode || '1234';
    const isMatch = String(pin).trim() === String(correctPin).trim();
    if (isMatch) {
      if (typeof callback === 'function') callback({ success: true, pairingCode: correctPin });
      socket.emit('remote:pinVerified', { success: true, pairingCode: correctPin });
      io.emit('liveDashboard:remoteConnected', { time: Date.now() });
    } else {
      if (typeof callback === 'function') callback({ success: false, message: 'รหัสจับคู่ไม่ถูกต้อง' });
      socket.emit('remote:pinVerified', { success: false, message: 'รหัสจับคู่ไม่ถูกต้อง' });
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
