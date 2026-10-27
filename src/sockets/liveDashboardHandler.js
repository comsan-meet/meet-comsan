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
};
