const stateService = require('../services/stateService');

function resetAllUsersAttendance(users) {
  if (!Array.isArray(users)) return;
  users.forEach(u => {
    u.checkedIn = false;
    u.checkInTimeStr = '-';
    u.checkInTimestamp = null;
    u.isLate = false;
    u.isLeave = false;
    u.leaveReason = '';
    u.attendedMinutes = 0;
    u.raiseHandCount = 0;
    u.note = '';
    u.noteSubmitted = false;
  });
}

module.exports = function registerMeetingHandlers(io, socket) {
  const state = stateService.getState();
  const todayISO = new Date().toISOString().slice(0, 10);

  socket.on('admin:startMeeting', (info) => {
    // Starting a new meeting session -> Clear previous attendance records
    resetAllUsersAttendance(state.users);
    state.raiseHandQueue = [];

    const format = (info && info.format === 'ONLINE') ? 'ONLINE' : 'ONSITE';
    state.meeting.format = format;
    state.meeting.title = (info && info.title) ? String(info.title).trim() : 'การประชุมชมรมสันทนาการ (COMSAN)';
    state.meeting.date = (info && info.date) ? info.date : todayISO;
    state.meeting.startTime = (info && info.startTime) || '17:00';
    state.meeting.lateTime = (info && info.lateTime) || '17:15';
    state.meeting.endTime = (info && info.endTime) || '19:00';

    const platformDisplayNames = {
      'GOOGLE_MEET': 'Google Meet',
      'ZOOM': 'Zoom',
      'MS_TEAMS': 'Microsoft Teams',
      'TEAMS': 'Microsoft Teams',
      'DISCORD': 'Discord',
      'LINE_MEETING': 'LINE Meeting',
      'OTHER': 'ออนไลน์'
    };

    if (format === 'ONLINE') {
      state.meeting.onlinePlatform = (info && info.onlinePlatform) ? info.onlinePlatform : 'GOOGLE_MEET';
      state.meeting.onlineUrl = (info && info.onlineUrl) ? String(info.onlineUrl).trim() : '';
      state.meeting.onlinePasscode = (info && info.onlinePasscode) ? String(info.onlinePasscode).trim() : '';
      const platformLabel = platformDisplayNames[state.meeting.onlinePlatform] || state.meeting.onlinePlatform;
      state.meeting.location = platformLabel && platformLabel !== 'ออนไลน์' ? `ออนไลน์ (${platformLabel})` : 'ออนไลน์';
      // สร้าง Check-in Token ประจำการประชุมรอบนี้ เช่น CS-742918
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      state.meeting.checkinToken = `CS-${randomDigits}`;
    } else {
      state.meeting.format = 'ONSITE';
      state.meeting.location = (info && info.location) ? String(info.location).trim() : 'ห้องประชุมชมรมคมสัน';
      state.meeting.onlinePlatform = 'GOOGLE_MEET';
      state.meeting.onlineUrl = '';
      state.meeting.onlinePasscode = '';
      state.meeting.checkinToken = null;
    }

    state.meeting.startedAtMs = Date.now();
    state.meeting.isStarted = true;
    state.meeting.isEnded = false;
    resetAllUsersAttendance(state.users);
    state.raiseHandQueue = [];
    (state.motions || []).forEach(m => {
      m.isOpen = false;
    });
    stateService.persistAndBroadcast();

    const locationText = format === 'ONLINE' ? state.meeting.location : `ณ ${state.meeting.location}`;
    io.emit('notify:event', {
      type: 'success',
      text: `🟢 เปิดการประชุม: "${state.meeting.title}" ${locationText}`
    });
  });

  socket.on('admin:resetMeetingStatus', () => {
    state.meeting.isStarted = false;
    state.meeting.isEnded = false;
    state.meeting.startedAtMs = null;
    state.meeting.checkinToken = null;
    resetAllUsersAttendance(state.users);
    state.raiseHandQueue = [];
    (state.motions || []).forEach(m => {
      m.isOpen = false;
    });
    stateService.persistAndBroadcast();
  });

  socket.on('admin:endMeeting', () => {
    state.meeting.isEnded = true;
    state.activeStream = null;
    (state.motions || []).forEach(m => {
      m.isOpen = false;
    });
    state.users.forEach(u => {
      if (u.note && u.note.trim() !== '') u.noteSubmitted = true;
    });

    const endedAt = Date.now();
    const nowObj = new Date(endedAt);
    const dateStr = nowObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = nowObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const totalUsers = state.users.length;
    const onTimeCount = state.users.filter(u => u.checkedIn && !u.isLate && !u.isLeave).length;
    const lateCount = state.users.filter(u => u.checkedIn && u.isLate && !u.isLeave).length;
    const leaveCount = state.users.filter(u => u.isLeave).length;
    const absentCount = state.users.filter(u => !u.checkedIn && !u.isLeave).length;

    // Save final summary snapshot of the finished meeting
    const summaryRecord = {
      id: 'MTG-' + endedAt,
      title: state.meeting.title || 'การประชุมชมรมสันทนาการ',
      meetingTitle: state.meeting.title || 'การประชุมชมรมสันทนาการ',
      date: state.meeting.date || todayISO,
      meetingDate: state.meeting.date || todayISO,
      location: state.meeting.location || '-',
      format: state.meeting.format || 'ONSITE',
      onlinePlatform: state.meeting.onlinePlatform || null,
      onlineUrl: state.meeting.onlineUrl || '',
      startTime: state.meeting.startTime || '17:00',
      endTime: state.meeting.endTime || '19:00',
      lateTime: state.meeting.lateTime || '17:15',
      startedAtMs: state.meeting.startedAtMs,
      endedAtMs: endedAt,
      endedDateStr: dateStr,
      endedTimeStr: timeStr,
      stats: {
        total: totalUsers,
        onTime: onTimeCount,
        late: lateCount,
        leave: leaveCount,
        absent: absentCount
      },
      users: JSON.parse(JSON.stringify(state.users || [])),
      motions: JSON.parse(JSON.stringify(state.motions || []))
    };

    state.lastMeetingSummary = summaryRecord;

    if (!Array.isArray(state.meetingHistory)) {
      state.meetingHistory = [];
    }
    state.meetingHistory.unshift(summaryRecord);
    if (state.meetingHistory.length > 100) {
      state.meetingHistory = state.meetingHistory.slice(0, 100);
    }

    // Reset live attendance records for next meeting
    resetAllUsersAttendance(state.users);
    state.raiseHandQueue = [];
    state.meeting.checkinToken = null;

    stateService.persistAndBroadcast();
    io.emit('notify:event', {
      type: 'warning',
      text: '🏁 ผู้ดูแลระบบได้สั่งจบการประชุม และบันทึกประวัติสรุปการประชุมย้อนหลังเรียบร้อยแล้ว'
    });
  });

  socket.on('admin:deleteMeetingHistory', (meetingId) => {
    if (!meetingId || !Array.isArray(state.meetingHistory)) return;
    state.meetingHistory = state.meetingHistory.filter(m => m.id !== meetingId);
    if (state.lastMeetingSummary && state.lastMeetingSummary.id === meetingId) {
      state.lastMeetingSummary = state.meetingHistory[0] || null;
    }
    stateService.persistAndBroadcast();
    io.emit('notify:event', {
      type: 'info',
      text: '🗑️ ลบประวัติการประชุมออกจากระบบเรียบร้อยแล้ว'
    });
  });

  socket.on('admin:updateMeetingHistory', (updatedRecord) => {
    if (!updatedRecord || !updatedRecord.id || !Array.isArray(state.meetingHistory)) return;
    const idx = state.meetingHistory.findIndex(m => m.id === updatedRecord.id);
    if (idx !== -1) {
      state.meetingHistory[idx] = updatedRecord;
      if (state.lastMeetingSummary && state.lastMeetingSummary.id === updatedRecord.id) {
        state.lastMeetingSummary = updatedRecord;
      }
      stateService.persistAndBroadcast();
    }
  });

  socket.on('admin:toggleShowSeats', (showSeats) => {
    state.meeting.showSeatsToUsers = Boolean(showSeats);
    stateService.persistAndBroadcast();
  });

  socket.on('admin:updateSystemVersion', ({ version, features, bugFixes, password }, callback) => {
    if (password !== 'comsanentertainer') {
      if (callback) callback({ ok: false, message: 'รหัสผ่านความปลอดภัยไม่ถูกต้อง' });
      return;
    }
    const cleanVersion = String(version || '').trim();
    if (!cleanVersion) {
      if (callback) callback({ ok: false, message: 'กรุณาระบุเลขเวอร์ชันที่ถูกต้อง' });
      return;
    }
    state.systemVersion = cleanVersion;
    if (!state.versionNotes) state.versionNotes = {};
    state.versionNotes.version = cleanVersion;
    state.versionNotes.releaseDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    if (Array.isArray(features)) {
      state.versionNotes.features = features.map(f => ({
        title: String(f.title || '').trim(),
        desc: String(f.desc || '').trim(),
        visible: f.visible !== false
      })).filter(f => f.title !== '' || f.desc !== '');
    }

    if (Array.isArray(bugFixes)) {
      state.versionNotes.bugFixes = bugFixes.map(b => ({
        title: String(b.title || '').trim(),
        desc: String(b.desc || '').trim(),
        visible: b.visible !== false
      })).filter(b => b.title !== '' || b.desc !== '');
    }

    stateService.persistAndBroadcast();
    if (callback) callback({ ok: true, version: cleanVersion, versionNotes: state.versionNotes });
    io.emit('notify:event', {
      type: 'info',
      text: `🚀 ระบบได้รับการอัปเดตข้อมูลเป็นเวอร์ชัน ${cleanVersion}`
    });
  });
};
