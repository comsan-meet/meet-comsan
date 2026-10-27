const stateService = require('../services/stateService');
const { getLocalIpAddresses } = require('../utils/network');
const config = require('../config/app.config');

// Active paired remote sockets tracking across the server
const activePairedRemotes = new Set();

function getLanInfo(pairingCode) {
  const lanIps = getLocalIpAddresses();
  const primaryIp = lanIps[0] || 'localhost';
  const lanBaseUrl = `http://${primaryIp}:${config.PORT}`;
  const pairingUrl = `${lanBaseUrl}/?remote=1&pair=${pairingCode || ''}`;
  return { lanIp: primaryIp, port: config.PORT, lanBaseUrl, pairingUrl };
}

module.exports = function registerLiveDashboardHandlers(io, socket) {
  const state = stateService.getState();

  // Helper to broadcast current remote connection status
  const broadcastRemoteStatus = () => {
    const isConn = activePairedRemotes.size > 0;
    const lanInfo = getLanInfo(state.liveDashboardConfig?.pairingCode);
    io.emit('liveDashboard:remoteStatusUpdate', {
      connected: isConn,
      activeRemotes: activePairedRemotes.size,
      pairingCode: state.liveDashboardConfig?.pairingCode,
      ...lanInfo
    });
  };

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

  // Send current remote status immediately upon socket connection
  const initialLanInfo = getLanInfo(state.liveDashboardConfig?.pairingCode);
  socket.emit('liveDashboard:remoteStatusUpdate', {
    connected: activePairedRemotes.size > 0,
    activeRemotes: activePairedRemotes.size,
    pairingCode: state.liveDashboardConfig?.pairingCode,
    ...initialLanInfo
  });

  // Register active TV PIN (guarantees server knows the exact PIN displayed on TV screen)
  socket.on('liveDashboard:registerTv', (data) => {
    const pin = (data && data.pairingCode) ? String(data.pairingCode).trim() : (typeof data === 'string' ? data.trim() : null);
    if (pin && pin.length >= 4) {
      state.liveDashboardConfig.pairingCode = pin;
      stateService.scheduleSave();
      console.log(`[LiveDashboard] Registered TV PIN on server: ${pin}`);
      broadcastRemoteStatus();
    }
  });

  // Query remote connection status (used by Live Dashboard on TV when opened/reloaded)
  socket.on('liveDashboard:getRemoteStatus', (callback) => {
    const lanInfo = getLanInfo(state.liveDashboardConfig?.pairingCode);
    const status = {
      connected: activePairedRemotes.size > 0,
      activeRemotes: activePairedRemotes.size,
      pairingCode: state.liveDashboardConfig?.pairingCode,
      ...lanInfo
    };
    if (typeof callback === 'function') callback(status);
    socket.emit('liveDashboard:remoteStatusUpdate', status);
  });

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
    
    // Invalidate currently active remotes since PIN changed
    activePairedRemotes.clear();
    socket.isPairedRemote = false;

    io.emit('liveDashboard:pinUpdated', pin);
    io.emit('liveDashboard:configUpdated', state.liveDashboardConfig);
    console.log(`[LiveDashboard] Pairing PIN updated/regenerated: ${pin}`);
    if (typeof callback === 'function') callback({ success: true, pairingCode: pin });
    broadcastRemoteStatus();
  });

  // Verify Remote PIN from mobile
  socket.on('remote:verifyPin', (payload, callback) => {
    const pin = (typeof payload === 'object' && payload !== null) ? payload.pin : payload;
    const correctPin = state.liveDashboardConfig?.pairingCode || '1234';
    const cleanEntered = String(pin || '').trim();
    const cleanCorrect = String(correctPin).trim();
    const isMatch = Boolean(cleanEntered && cleanEntered === cleanCorrect);
    console.log(`[LiveDashboard] PIN check: entered='${cleanEntered}', expected='${cleanCorrect}', isMatch=${isMatch}, socket=${socket.id}`);
    
    if (isMatch) {
      socket.isPairedRemote = true;
      activePairedRemotes.add(socket.id);
      console.log(`[LiveDashboard] Paired remote added: ${socket.id}, total active: ${activePairedRemotes.size}`);
      if (typeof callback === 'function') callback({ success: true, pairingCode: cleanCorrect });
      socket.emit('remote:pinVerified', { success: true, pairingCode: cleanCorrect });
      io.emit('liveDashboard:remoteConnected', { time: Date.now(), socketId: socket.id });
      broadcastRemoteStatus();
    } else {
      socket.isPairedRemote = false;
      activePairedRemotes.delete(socket.id);
      if (typeof callback === 'function') callback({ success: false, message: 'รหัสจับคู่ไม่ถูกต้อง' });
      socket.emit('remote:pinVerified', { success: false, message: 'รหัสจับคู่ไม่ถูกต้อง' });
      broadcastRemoteStatus();
    }
  });

  // Remote unpairing from mobile
  socket.on('remote:unpair', () => {
    if (socket.isPairedRemote || activePairedRemotes.has(socket.id)) {
      activePairedRemotes.delete(socket.id);
      socket.isPairedRemote = false;
      console.log(`[LiveDashboard] Paired remote explicitly unpaired: ${socket.id}, remaining: ${activePairedRemotes.size}`);
      if (activePairedRemotes.size === 0) {
        io.emit('liveDashboard:remoteDisconnected', { time: Date.now(), socketId: socket.id });
      }
      broadcastRemoteStatus();
    }
  });

  // Handle socket disconnection
  socket.on('disconnect', () => {
    if (socket.isPairedRemote || activePairedRemotes.has(socket.id)) {
      activePairedRemotes.delete(socket.id);
      socket.isPairedRemote = false;
      console.log(`[LiveDashboard] Paired remote disconnected: ${socket.id}, remaining active: ${activePairedRemotes.size}`);
      if (activePairedRemotes.size === 0) {
        io.emit('liveDashboard:remoteDisconnected', { time: Date.now(), socketId: socket.id });
      }
      broadcastRemoteStatus();
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
