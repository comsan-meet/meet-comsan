const stateService = require('../services/stateService');

module.exports = function registerAttendanceHandlers(io, socket) {
  const state = stateService.getState();

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
      stateService.persistAndBroadcast();
    }
  });

  socket.on('admin:checkIn', (identifier, callback) => {
    if (!state.meeting || !state.meeting.isStarted) {
      if (callback) callback({ ok: false, message: 'การประชุมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้' });
      return;
    }
    if (state.meeting && state.meeting.isEnded) {
      if (callback) callback({ ok: false, message: 'การประชุมสิ้นสุดลงแล้ว ไม่สามารถเช็คชื่อได้' });
      return;
    }

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
    const late = stateService.isCurrentlyAfterCutoff(state.meeting.lateTime);
    user.checkedIn = true;
    user.isLeave = false;
    user.checkInTimestamp = now.getTime();
    user.checkInTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    user.isLate = late;
    user.attendedMinutes = 1;

    stateService.persistAndBroadcast();
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
    stateService.persistAndBroadcast();
    io.emit('notify:event', {
      type: 'info',
      targetRole: 'ADMIN',
      text: `📋 ${user.nickname} (${user.firstName}) แจ้งลาประชุม: ${user.leaveReason}`
    });
  });

  socket.on('admin:setAttendanceStatus', ({ userId, status, reason }) => {
    const user = state.users.find(u => u.id === userId);
    const summaryUser = (state.lastMeetingSummary && Array.isArray(state.lastMeetingSummary.users))
      ? state.lastMeetingSummary.users.find(u => u.id === userId)
      : null;

    if (!user && !summaryUser) return;

    const targets = [user, summaryUser].filter(Boolean);

    targets.forEach(tgt => {
      if (status === 'LEAVE') {
        tgt.isLeave = true;
        tgt.checkedIn = false;
        tgt.isLate = false;
        tgt.leaveReason = reason || 'ผู้ดูแลระบบบันทึกสถานะลา';
        tgt.checkInTimeStr = 'ลาประชุม';
      } else if (status === 'ABSENT') {
        tgt.isLeave = false;
        tgt.checkedIn = false;
        tgt.isLate = false;
        tgt.leaveReason = '';
        tgt.checkInTimeStr = '-';
        tgt.attendedMinutes = 0;
      } else if (status === 'ONTIME') {
        tgt.isLeave = false;
        tgt.checkedIn = true;
        tgt.isLate = false;
        if (!tgt.checkInTimestamp) tgt.checkInTimestamp = Date.now();
        if (['-', 'ลาประชุม', 'แจ้งลา'].includes(tgt.checkInTimeStr)) {
          tgt.checkInTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        }
      } else if (status === 'LATE') {
        tgt.isLeave = false;
        tgt.checkedIn = true;
        tgt.isLate = true;
        if (!tgt.checkInTimestamp) tgt.checkInTimestamp = Date.now();
        if (['-', 'ลาประชุม', 'แจ้งลา'].includes(tgt.checkInTimeStr)) {
          tgt.checkInTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        }
      }
    });

    stateService.persistAndBroadcast();
  });

  socket.on('user:updateNote', ({ userId, note }) => {
    const user = state.users.find(u => u.id === userId);
    if (user) {
      user.note = note;
      user.noteSubmitted = true;
      stateService.persistAndBroadcast();
    }
  });

  // เช็คชื่อเข้าประชุมออนไลน์โดยการสแกน QR Code หรือกรอกรหัสของ Admin
  socket.on('user:checkInWithAdminQr', ({ userId, token }, callback) => {
    if (!state.meeting || !state.meeting.isStarted) {
      if (callback) callback({ ok: false, message: 'การประชุมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้' });
      return;
    }
    if (state.meeting && state.meeting.isEnded) {
      if (callback) callback({ ok: false, message: 'การประชุมสิ้นสุดลงแล้ว ไม่สามารถเช็คชื่อได้' });
      return;
    }
    if (state.meeting.format !== 'ONLINE') {
      if (callback) callback({ ok: false, message: 'การประชุมนี้เป็นแบบ On-site กรุณาแสดง QR Code ประจำตัวให้ผู้ดูแลระบบสแกน' });
      return;
    }

    let cleanToken = String(token || '').trim().toUpperCase();
    const expectedToken = String(state.meeting.checkinToken || '').trim().toUpperCase();

    if (cleanToken.includes('CHECKIN=')) {
      const match = cleanToken.match(/CHECKIN=([^&]+)/);
      if (match) cleanToken = decodeURIComponent(match[1]).trim().toUpperCase();
    }
    const cleanDigits = cleanToken.replace(/^CS-/, '');
    const expectedDigits = expectedToken.replace(/^CS-/, '');

    if (!cleanToken || (cleanToken !== expectedToken && cleanDigits !== expectedDigits)) {
      if (callback) callback({ ok: false, message: 'รหัสเช็คชื่อหรือ QR Code ไม่ถูกต้อง หรือไม่ใช่ของการประชุมรอบนี้' });
      return;
    }

    const cleanId = String(userId || '').trim().toLowerCase();
    const user = state.users.find(
      u => u.id.toLowerCase() === cleanId ||
           u.nickname.toLowerCase() === cleanId
    );

    if (!user) {
      if (callback) callback({ ok: false, message: 'ไม่พบข้อมูลสมาชิกของคุณในระบบ' });
      return;
    }

    if (user.checkedIn) {
      if (callback) callback({ ok: true, already: true, message: `คุณได้เช็คชื่อไปแล้วเมื่อ ${user.checkInTimeStr} น.` });
      return;
    }

    const now = new Date();
    const late = stateService.isCurrentlyAfterCutoff(state.meeting.lateTime);
    user.checkedIn = true;
    user.isLeave = false;
    user.checkInTimestamp = now.getTime();
    user.checkInTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    user.isLate = late;
    user.attendedMinutes = 1;

    stateService.persistAndBroadcast();

    if (callback) {
      callback({
        ok: true,
        message: `เช็คชื่อเข้าประชุมออนไลน์สำเร็จ! (${late ? 'มาสาย' : 'มาทันเวลา'})`,
        user: { id: user.id, nickname: user.nickname, time: user.checkInTimeStr, isLate: late }
      });
    }

    io.emit('notify:event', {
      type: 'success',
      text: `✅ ${user.nickname} (${user.firstName}) สแกนเช็คชื่อเข้าประชุมออนไลน์แล้ว (${late ? 'มาสาย' : 'ทันเวลา'})`
    });
  });
};
