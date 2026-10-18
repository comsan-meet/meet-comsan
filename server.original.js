const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 50 * 1024 * 1024
});

const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'meeting_state_v5.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

const todayISO = new Date().toISOString().slice(0, 10);

const defaultState = {
  meeting: {
    title: '',
    location: '',
    date: todayISO,
    startTime: '17:00',
    lateTime: '17:15',
    endTime: '19:00',
    startedAtMs: null,
    isStarted: false,
    isEnded: false,
    realtimeVoting: true,
    showSeatsToUsers: true
  },
  users: [
    {
      id: 'COMSAN-01',
      firstName: 'อิทธิพัทธ์',
      lastName: 'พืชผักหวาน',
      nickname: 'ประธานคมสัน',
      year: '2',
      major: 'AI',
      position: 'ประธานชมรม',
      password: '123',
      checkedIn: false,
      checkInTimeStr: '-',
      checkInTimestamp: null,
      isLate: false,
      isLeave: false,
      leaveReason: '',
      attendedMinutes: 0,
      raiseHandCount: 0,
      note: '',
      noteSubmitted: false,
      filePermission: 'NONE',
      streamPermission: 'NONE' // 'NONE' | 'PENDING' | 'APPROVED'
    },
    {
      id: 'COMSAN-02',
      firstName: 'กมลชนก',
      lastName: 'ใจดี',
      nickname: 'พลอย',
      year: '2',
      major: 'CS',
      position: 'เลขานุการ',
      password: '123',
      checkedIn: false,
      checkInTimeStr: '-',
      checkInTimestamp: null,
      isLate: false,
      isLeave: false,
      leaveReason: '',
      attendedMinutes: 0,
      raiseHandCount: 0,
      note: '',
      noteSubmitted: false,
      filePermission: 'NONE',
      streamPermission: 'NONE'
    },
    {
      id: 'COMSAN-03',
      firstName: 'ณัฐพงศ์',
      lastName: 'สายฮา',
      nickname: 'เจมส์',
      year: '1',
      major: 'IT',
      position: 'ฝ่ายสันทนาการ',
      password: '123',
      checkedIn: false,
      checkInTimeStr: '-',
      checkInTimestamp: null,
      isLate: false,
      isLeave: false,
      leaveReason: '',
      attendedMinutes: 0,
      raiseHandCount: 0,
      note: '',
      noteSubmitted: false,
      filePermission: 'NONE',
      streamPermission: 'NONE'
    }
  ],
  raiseHandQueue: [],
  motions: [],
  chats: [],
  files: [],
  randomizer: {
    lastWinner: null,
    history: []
  },
  activeStream: null // { streamerId, streamerName, mode: 'CAMERA'|'SCREEN', frameDataUrl }
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      parsed.meeting = { ...defaultState.meeting, ...(parsed.meeting || {}) };
      parsed.motions = Array.isArray(parsed.motions) ? parsed.motions : [];
      parsed.files = Array.isArray(parsed.files) ? parsed.files : [];
      parsed.chats = Array.isArray(parsed.chats) ? parsed.chats : [];
      parsed.raiseHandQueue = Array.isArray(parsed.raiseHandQueue) ? parsed.raiseHandQueue : [];
      parsed.randomizer = parsed.randomizer || { lastWinner: null, history: [] };
      parsed.users = (Array.isArray(parsed.users) ? parsed.users : defaultState.users).map(u => ({
        isLeave: false,
        leaveReason: '',
        filePermission: 'NONE',
        streamPermission: 'NONE',
        ...u
      }));
      return parsed;
    }
  } catch (err) {
    console.error('Error loading state:', err);
  }
  return JSON.parse(JSON.stringify(defaultState));
}

let state = loadState();

function persistAndBroadcast() {
  try {
    const stateToSave = { ...state, activeStream: null };
    fs.writeFileSync(STATE_FILE, JSON.stringify(stateToSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save state:', err);
  }
  io.emit('state:update', state);
}

function isCurrentlyAfterCutoff(cutoffHHMM) {
  if (!cutoffHHMM) return false;
  const now = new Date();
  const [cutH, cutM] = cutoffHHMM.split(':').map(Number);
  const cutoffDate = new Date();
  cutoffDate.setHours(cutH, cutM, 0, 0);
  return now > cutoffDate;
}

setInterval(() => {
  if (state.meeting.isStarted && !state.meeting.isEnded) {
    const nowMs = Date.now();
    let changed = false;
    state.users.forEach(u => {
      if (u.checkedIn && u.checkInTimestamp && !u.isLeave) {
        const baseTime = Math.max(u.checkInTimestamp, state.meeting.startedAtMs || u.checkInTimestamp);
        const mins = Math.max(1, Math.floor((nowMs - baseTime) / 60000));
        if (u.attendedMinutes !== mins) {
          u.attendedMinutes = mins;
          changed = true;
        }
      }
    });
    if (changed) persistAndBroadcast();
  }
}, 5000);

io.on('connection', (socket) => {
  socket.emit('state:update', state);
  io.emit('clients:count', io.engine.clientsCount);

  // 1. เปิด/ปิด/ตั้งค่าการประชุม
  socket.on('admin:startMeeting', (info) => {
    state.meeting.title = (info && info.title) ? String(info.title).trim() : 'การประชุมชมรมสันทนาการ (COMSAN)';
    state.meeting.location = (info && info.location) ? String(info.location).trim() : '-';
    state.meeting.date = (info && info.date) ? info.date : todayISO;
    state.meeting.startTime = (info && info.startTime) || '17:00';
    state.meeting.lateTime = (info && info.lateTime) || '17:15';
    state.meeting.endTime = (info && info.endTime) || '19:00';
    if (!state.meeting.isStarted) {
      state.meeting.startedAtMs = Date.now();
    }
    state.meeting.isStarted = true;
    state.meeting.isEnded = false;
    persistAndBroadcast();
    io.emit('notify:event', {
      type: 'success',
      text: `🟢 เปิดการประชุม: "${state.meeting.title}" ณ ${state.meeting.location}`
    });
  });

  socket.on('admin:resetMeetingStatus', () => {
    state.meeting.isStarted = false;
    state.meeting.isEnded = false;
    state.meeting.startedAtMs = null;
    persistAndBroadcast();
  });

  socket.on('admin:endMeeting', () => {
    state.meeting.isEnded = true;
    state.activeStream = null;
    state.users.forEach(u => {
      if (u.note && u.note.trim() !== '') u.noteSubmitted = true;
    });
    persistAndBroadcast();
    io.emit('notify:event', {
      type: 'warning',
      text: '🏁 ผู้ดูแลระบบได้สั่งจบการประชุมแล้ว'
    });
  });

  socket.on('admin:toggleShowSeats', (showSeats) => {
    state.meeting.showSeatsToUsers = Boolean(showSeats);
    persistAndBroadcast();
  });

  // 2. นำเข้าสมาชิก & เช็คชื่อ & แจ้งลา
  socket.on('admin:importUsers', (newUsers) => {
    if (Array.isArray(newUsers) && newUsers.length > 0) {
      state.users = newUsers.map(u => ({
        isLeave: false,
        leaveReason: '',
        filePermission: 'NONE',
        streamPermission: 'NONE',
        ...u
      }));
      state.raiseHandQueue = [];
      persistAndBroadcast();
    }
  });

  socket.on('admin:checkIn', (identifier, callback) => {
    const cleanId = String(identifier || '').trim().toLowerCase();
    const user = state.users.find(
      u => u.id.toLowerCase() === cleanId ||
           u.nickname.toLowerCase() === cleanId ||
           u.firstName.toLowerCase() === cleanId
    );
    if (!user) {
      if (callback) callback({ ok: false, message: `ไม่พบข้อมูลสมาชิก: "${identifier}"` });
      return;
    }
    const now = new Date();
    const late = state.meeting.isStarted ? isCurrentlyAfterCutoff(state.meeting.lateTime) : false;
    user.checkedIn = true;
    user.isLeave = false;
    user.checkInTimestamp = now.getTime();
    user.checkInTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    user.isLate = late;
    user.attendedMinutes = state.meeting.isStarted ? 1 : 0;

    persistAndBroadcast();
    if (callback) {
      callback({ ok: true, message: `เช็คชื่อสำเร็จ: ${user.nickname} (${late ? 'มาสาย' : 'มาทันเวลา'})` });
    }
  });

  socket.on('user:requestLeave', ({ userId, reason }) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.isLeave = true;
    user.checkedIn = false;
    user.isLate = false;
    user.leaveReason = reason || 'ติดภารกิจส่วนตัว';
    user.checkInTimeStr = 'แจ้งลา';
    persistAndBroadcast();
    io.emit('notify:event', {
      type: 'info',
      targetRole: 'ADMIN',
      text: `📋 ${user.nickname} (${user.firstName}) แจ้งลาประชุม: ${user.leaveReason}`
    });
  });

  socket.on('admin:setAttendanceStatus', ({ userId, status, reason }) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    if (status === 'LEAVE') {
      user.isLeave = true;
      user.checkedIn = false;
      user.isLate = false;
      user.leaveReason = reason || 'ผู้ดูแลระบบบันทึกสถานะลา';
      user.checkInTimeStr = 'ลาประชุม';
    } else if (status === 'ABSENT') {
      user.isLeave = false;
      user.checkedIn = false;
      user.isLate = false;
      user.leaveReason = '';
      user.checkInTimeStr = '-';
      user.attendedMinutes = 0;
    } else if (status === 'ONTIME') {
      user.isLeave = false;
      user.checkedIn = true;
      user.isLate = false;
      if (!user.checkInTimestamp) user.checkInTimestamp = Date.now();
      if (['-', 'ลาประชุม', 'แจ้งลา'].includes(user.checkInTimeStr)) {
        user.checkInTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      }
    } else if (status === 'LATE') {
      user.isLeave = false;
      user.checkedIn = true;
      user.isLate = true;
      if (!user.checkInTimestamp) user.checkInTimestamp = Date.now();
      if (['-', 'ลาประชุม', 'แจ้งลา'].includes(user.checkInTimeStr)) {
        user.checkInTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      }
    }
    persistAndBroadcast();
  });

  // 3. ญัตติโหวต & ยกมือ
  socket.on('admin:createMotion', (motionPayload) => {
    if (!motionPayload || !motionPayload.title) return;
    const defaultStandardOptions = [
      { id: 'APPROVE', label: 'เห็นด้วย', image: null },
      { id: 'REJECT', label: 'ไม่เห็นด้วย', image: null },
      { id: 'ABSTAIN', label: 'งดออกเสียง', image: null }
    ];
    const newMotion = {
      id: motionPayload.id || `M-${Date.now().toString().slice(-4)}`,
      title: String(motionPayload.title).trim(),
      type: motionPayload.type === 'CUSTOM' ? 'CUSTOM' : 'STANDARD',
      isSecret: Boolean(motionPayload.isSecret),
      options: (motionPayload.type === 'CUSTOM' && Array.isArray(motionPayload.options) && motionPayload.options.length > 0)
        ? motionPayload.options
        : defaultStandardOptions,
      isOpen: true,
      votes: {}
    };
    state.motions.push(newMotion);
    persistAndBroadcast();
    io.emit('notify:event', {
      type: 'motion',
      text: `🗳️ เปิดญัตติโหวตใหม่${newMotion.isSecret ? ' (โหวตลับ)' : ''}: "${newMotion.title}"`
    });
  });

  socket.on('admin:deleteMotion', (motionId) => {
    state.motions = state.motions.filter(m => m.id !== motionId);
    persistAndBroadcast();
  });

  socket.on('admin:toggleMotion', (motionId) => {
    const m = state.motions.find(item => item.id === motionId);
    if (m) {
      m.isOpen = !m.isOpen;
      persistAndBroadcast();
    }
  });

  socket.on('admin:toggleRealtime', (realtimeVoting) => {
    state.meeting.realtimeVoting = Boolean(realtimeVoting);
    persistAndBroadcast();
  });

  socket.on('user:vote', ({ userId, motionId, choice }) => {
    const m = state.motions.find(item => item.id === motionId);
    if (m && m.isOpen && userId) {
      if (!m.votes) m.votes = {};
      m.votes[userId] = choice;
      persistAndBroadcast();
    }
  });

  socket.on('user:raiseHand', (userId) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.raiseHandCount = (user.raiseHandCount || 0) + 1;
    const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const alertData = {
      queueId: Date.now() + Math.floor(Math.random() * 1000),
      userId: user.id,
      nickname: user.nickname,
      fullName: `${user.firstName} ${user.lastName}`,
      position: user.position,
      time: nowStr
    };
    state.raiseHandQueue.push(alertData);
    persistAndBroadcast();
    io.emit('alert:raiseHand', alertData);
  });

  socket.on('admin:removeQueue', (queueId) => {
    state.raiseHandQueue = state.raiseHandQueue.filter(q => q.queueId !== queueId);
    persistAndBroadcast();
  });

  socket.on('admin:clearQueue', () => {
    state.raiseHandQueue = [];
    persistAndBroadcast();
  });

  // ข้อ 9: ผู้ใช้งานกดเอามือลงด้วยตัวเอง
  socket.on('user:lowerHand', (userId) => {
    state.raiseHandQueue = state.raiseHandQueue.filter(q => q.userId !== userId);
    persistAndBroadcast();
  });

  // ข้อ 8: คืนสถานะสิทธิ์กลับที่เดิมเมื่อใช้งานเสร็จสิ้น
  socket.on('user:finishPermission', ({ userId, permType }) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    if (permType === 'STREAM') {
      user.streamPermission = 'NONE';
      if (state.activeStream && state.activeStream.streamerId === userId) {
        state.activeStream = null;
        io.emit('stream:stopped');
      }
    } else if (permType === 'FILE') {
      user.filePermission = 'NONE';
    }
    persistAndBroadcast();
  });

  // 4. โน้ต, แชท, ดรอปไฟล์
  socket.on('user:updateNote', ({ userId, note }) => {
    const user = state.users.find(u => u.id === userId);
    if (user) {
      user.note = note;
      user.noteSubmitted = true;
      persistAndBroadcast();
    }
  });

  socket.on('chat:send', (msgPayload) => {
    if (!msgPayload || !msgPayload.text || !String(msgPayload.text).trim()) return;
    const newMsg = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      sender: msgPayload.sender,
      senderId: msgPayload.senderId || null,
      target: msgPayload.target || 'ALL',
      text: String(msgPayload.text).trim(),
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };
    state.chats.push(newMsg);
    persistAndBroadcast();
    io.emit('notify:chat', newMsg);
  });

  // ลบข้อความแชท
  socket.on('chat:delete', (msgId) => {
    state.chats = (state.chats || []).filter(c => String(c.id) !== String(msgId));
    persistAndBroadcast();
  });

  socket.on('file:requestPermission', (userId) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.filePermission = 'PENDING';
    persistAndBroadcast();
    io.emit('notify:event', {
      type: 'fileReq',
      targetRole: 'ADMIN',
      text: `📁 ${user.nickname} ส่งคำขออนุญาตดรอปไฟล์`
    });
  });

  socket.on('admin:setFilePermission', ({ userId, status }) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.filePermission = status;
    persistAndBroadcast();
    io.emit('notify:event', {
      type: status === 'APPROVED' ? 'success' : 'warning',
      targetUserId: user.id,
      text: status === 'APPROVED' ? '✅ ADMIN อนุมัติให้คุณดรอปไฟล์ได้แล้ว!' : '⚠️ สิทธิ์การดรอปไฟล์ถูกยกเลิก'
    });
  });

  socket.on('file:upload', (fileObj) => {
    if (!fileObj || !fileObj.name || !fileObj.dataUrl) return;
    const item = {
      id: 'FILE-' + Date.now(),
      name: fileObj.name,
      size: fileObj.size || 0,
      type: fileObj.type || 'application/octet-stream',
      dataUrl: fileObj.dataUrl,
      uploaderId: fileObj.uploaderId || 'ADMIN',
      uploaderName: fileObj.uploaderName || 'ADMIN',
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };
    state.files.push(item);
    persistAndBroadcast();
    io.emit('notify:event', {
      type: 'fileDrop',
      text: `📎 ${item.uploaderName} ดรอปไฟล์ใหม่: "${item.name}"`
    });
  });

  socket.on('file:delete', (fileId) => {
    state.files = state.files.filter(f => f.id !== fileId);
    persistAndBroadcast();
  });

  // 5. ระบบสุ่มหรรษา (Randomizer Spin Broadcast -> เด้ง Pop-up บนหน้าจอ User ทันที)
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
    state.randomizer.history.unshift(record);
    state.randomizer.history = state.randomizer.history.slice(0, 15);
    persistAndBroadcast();
    io.emit('random:spin', spinPayload);
  });

  // 6. ระบบขออนุญาตเปิดกล้อง / แชร์หน้าจอ (Live Camera & Screen Share)
  socket.on('stream:requestPermission', (userId) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.streamPermission = 'PENDING';
    persistAndBroadcast();
    io.emit('notify:event', {
      type: 'info',
      targetRole: 'ADMIN',
      text: `🎥 ${user.nickname} (${user.firstName}) ขออนุญาตเปิดกล้อง/แชร์หน้าจอ`
    });
  });

  socket.on('admin:setStreamPermission', ({ userId, status }) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.streamPermission = status;
    if (status !== 'APPROVED' && state.activeStream && state.activeStream.streamerId === userId) {
      state.activeStream = null;
      io.emit('stream:stopped');
    }
    persistAndBroadcast();
    io.emit('notify:event', {
      type: status === 'APPROVED' ? 'success' : 'warning',
      targetUserId: user.id,
      text: status === 'APPROVED'
        ? '✅ ADMIN อนุมัติให้คุณเปิดกล้องและแชร์หน้าจอได้แล้ว!'
        : '⚠️ สิทธิ์การเปิดกล้อง/แชร์หน้าจอถูกยกเลิก'
    });
  });

  socket.on('stream:frame', (framePayload) => {
    if (!framePayload || !framePayload.frameDataUrl) return;
    state.activeStream = {
      streamerId: framePayload.streamerId,
      streamerName: framePayload.streamerName,
      mode: framePayload.mode || 'CAMERA',
      frameDataUrl: framePayload.frameDataUrl,
      updatedAt: Date.now()
    };
    io.emit('stream:frameUpdate', state.activeStream);
  });

  socket.on('stream:stop', () => {
    state.activeStream = null;
    persistAndBroadcast();
    io.emit('stream:stopped');
  });

  socket.on('disconnect', () => {
    io.emit('clients:count', io.engine.clientsCount);
  });
});

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('====================================================');
  console.log('🎭 ระบบการประชุมชมรมคมสัน (COMSAN SERVER V5) เปิดทำงานแล้ว!');
  console.log(`💻 เปิดบนคอมพิวเตอร์เครื่องนี้ (ADMIN): http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`📱 เปิดบนมือถือสมาชิก (Wi-Fi เดียวกัน): http://${ip}:${PORT}`);
  });
  console.log('====================================================');
});