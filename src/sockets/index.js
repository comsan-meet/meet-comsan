const stateService = require('../services/stateService');
const registerMeetingHandlers = require('./meetingHandler');
const registerAttendanceHandlers = require('./attendanceHandler');
const registerMotionHandlers = require('./motionHandler');
const registerChatHandlers = require('./chatHandler');
const registerFileHandlers = require('./fileHandler');
const registerRandomizerHandlers = require('./randomizerHandler');
const registerStreamHandlers = require('./streamHandler');
const registerCalendarHandlers = require('./calendarHandler');
const registerProjectHandlers = require('./projectHandler');
const registerLiveDashboardHandlers = require('./liveDashboardHandler');

function initializeSockets(io) {
  stateService.setIO(io);
  stateService.startAttendanceTimer();

  io.on('connection', (socket) => {
    // Send initial full state to newly connected client
    socket.emit('state:update', stateService.getState());
    io.emit('clients:count', io.engine.clientsCount);

    // Register modular feature handlers
    registerMeetingHandlers(io, socket);
    registerAttendanceHandlers(io, socket);
    registerMotionHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerFileHandlers(io, socket);
    registerRandomizerHandlers(io, socket);
    registerStreamHandlers(io, socket);
    registerCalendarHandlers(io, socket);
    registerProjectHandlers(io, socket);
    registerLiveDashboardHandlers(io, socket);

    socket.on('disconnect', () => {
      io.emit('clients:count', io.engine.clientsCount);
    });
  });
}

module.exports = initializeSockets;
