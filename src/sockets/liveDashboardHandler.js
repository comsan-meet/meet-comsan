const stateService = require('../services/stateService');

module.exports = function registerLiveDashboardHandlers(io, socket) {
  const state = stateService.getState();

  // Admin remote configuration for Live Dashboard
  socket.on('admin:updateLiveDashboardConfig', (newConfig) => {
    if (!state.liveDashboardConfig) {
      state.liveDashboardConfig = {
        concurrencyMode: 'BOTH',
        showRaiseHandPopup: true,
        showPermissionPopup: true,
        showRandomizerPopup: true,
        theme: 'DARK',
        clockFormat: '24H'
      };
    }
    state.liveDashboardConfig = {
      ...state.liveDashboardConfig,
      ...(newConfig || {})
    };
    stateService.persistAndBroadcast();
    io.emit('liveDashboard:configUpdated', state.liveDashboardConfig);
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
};
