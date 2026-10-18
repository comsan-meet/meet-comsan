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
app.use(express.static(config.PUBLIC_DIR));
app.use(express.static(config.ROOT_DIR));

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