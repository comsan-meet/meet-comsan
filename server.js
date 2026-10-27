const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./src/config/app.config');
const { getLocalIpAddresses } = require('./src/utils/network');
const initializeSockets = require('./src/sockets');

const app = express();
const server = http.createServer(app);
const io = new Server(server, config.SOCKET_CONFIG);

// Middleware
app.use(express.json());
app.use(express.static(config.PUBLIC_DIR));
app.use(express.static(config.ROOT_DIR));

// API: Server Info (Wi-Fi LAN IP & URL for Live Dashboard Remote Pairing)
app.get('/api/server-info', (req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips[0] || 'localhost';
  res.json({
    ips,
    primaryIp,
    port: config.PORT,
    lanUrl: `http://${primaryIp}:${config.PORT}`
  });
});

// API: Direct Remote Pairing Endpoint (Fast HTTP bridge fallback)
const stateService = require('./src/services/stateService');
app.post('/api/remote-pair', (req, res) => {
  const { pin } = req.body || {};
  const state = stateService.getState();
  const correctPin = state.liveDashboardConfig?.pairingCode || '1234';
  const cleanEntered = String(pin || '').trim();
  const cleanCorrect = String(correctPin).trim();
  const isMatch = Boolean(cleanEntered && cleanEntered === cleanCorrect);

  if (isMatch) {
    io.emit('liveDashboard:remoteConnected', { time: Date.now(), method: 'HTTP_PAIR' });
    io.emit('liveDashboard:remoteStatusUpdate', {
      connected: true,
      activeRemotes: 1,
      pairingCode: cleanCorrect
    });
    res.json({ success: true, pairingCode: cleanCorrect });
  } else {
    res.status(400).json({ success: false, message: 'รหัสจับคู่ไม่ถูกต้อง' });
  }
});

// Initialize Socket.io architecture
initializeSockets(io);

// Start Server
server.listen(config.PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('====================================================');
  console.log('🎭 ระบบการประชุมชมรมคมสัน (COMSAN SERVER V6 Modular)');
  console.log(`💻 เข้าใช้งานบนคอมพิวเตอร์ (ADMIN/HOST): http://localhost:${config.PORT}`);
  ips.forEach(ip => {
    console.log(`📱 เข้าใช้งานบนมือถือสมาชิก (Wi-Fi): http://${ip}:${config.PORT}`);
  });
  console.log('====================================================');
});

module.exports = { app, server, io };