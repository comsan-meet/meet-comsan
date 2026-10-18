const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  STATE_FILE: path.join(__dirname, '..', '..', 'meeting_state_v5.json'),
  PUBLIC_DIR: path.join(__dirname, '..', '..', 'public'),
  ROOT_DIR: path.join(__dirname, '..', '..'),
  SOCKET_CONFIG: {
    cors: { origin: '*' },
    maxHttpBufferSize: 50 * 1024 * 1024 // 50MB for files/frames
  },
  ATTENDANCE_TICK_MS: 5000
};
