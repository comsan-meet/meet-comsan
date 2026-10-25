/**
 * COMSAN Meeting System - Unified Action Reducer
 * Pure reducer function for all meeting mutations across Client (Supabase) and Server (Node.js)
 */

(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  }
  if (typeof root !== 'undefined') {
    root.ActionReducer = mod;
  }
  if (typeof window !== 'undefined') {
    window.ActionReducer = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function isCurrentlyAfterCutoff(cutoffHHMM) {
    if (!cutoffHHMM) return false;
    const now = new Date();
    const parts = cutoffHHMM.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
    const cutoffDate = new Date();
    cutoffDate.setHours(parts[0], parts[1], 0, 0);
    return now > cutoffDate;
  }

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

  /**
   * Applies an action to the current state.
   * @param {Object} state - The current application state.
   * @param {string} action - Action name (e.g. 'admin:checkIn', 'chat:send', etc.)
   * @param {any} payload - The action payload.
   * @param {Function} [emitBroadcast] - Callback to broadcast specific events: emitBroadcast(eventName, eventPayload)
   * @returns {{ state: Object, result: any, shouldPersist: boolean }}
   */
  function applyAction(state, action, payload, emitBroadcast) {
    const notify = typeof emitBroadcast === 'function' ? emitBroadcast : () => {};
    let result = undefined;
    let shouldPersist = true;

    if (!state) return { state, result: null, shouldPersist: false };

    // Ensure array safeguards
    state.users = Array.isArray(state.users) ? state.users : [];
    state.motions = Array.isArray(state.motions) ? state.motions : [];
    state.chats = Array.isArray(state.chats) ? state.chats : [];
    state.chatLogs = Array.isArray(state.chatLogs) ? state.chatLogs : [];
    state.files = Array.isArray(state.files) ? state.files : [];
    state.raiseHandQueue = Array.isArray(state.raiseHandQueue) ? state.raiseHandQueue : [];
    state.calendarEvents = Array.isArray(state.calendarEvents) ? state.calendarEvents : [];
    state.projects = Array.isArray(state.projects) ? state.projects : [];
    state.meetingHistory = Array.isArray(state.meetingHistory) ? state.meetingHistory : [];
    state.meeting = state.meeting || {};
    state.randomizer = state.randomizer || { lastWinner: null, history: [] };

    const todayISO = (typeof window !== 'undefined' && typeof window.getLocalDateString === 'function')
      ? window.getLocalDateString()
      : (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();

    switch (action) {
      // ==========================================
      // 1. MEETING MANAGEMENT
      // ==========================================
      case 'admin:startMeeting': {
        const info = payload || {};
        resetAllUsersAttendance(state.users);
        state.raiseHandQueue = [];

        const format = (info && info.format === 'ONLINE') ? 'ONLINE' : 'ONSITE';
        state.meeting.format = format;
        state.meeting.title = (info.title && String(info.title).trim()) ? String(info.title).trim() : 'การประชุมชมรมสันทนาการ (COMSAN)';
        state.meeting.date = info.date || todayISO;
        state.meeting.endDate = info.endDate || state.meeting.date;
        state.meeting.startTime = info.startTime || '17:00';
        state.meeting.lateTime = info.lateTime || '17:15';
        state.meeting.endTime = info.endTime || '19:00';

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
          state.meeting.onlinePlatform = info.onlinePlatform || 'GOOGLE_MEET';
          state.meeting.onlineUrl = info.onlineUrl ? String(info.onlineUrl).trim() : '';
          state.meeting.onlinePasscode = info.onlinePasscode ? String(info.onlinePasscode).trim() : '';
          const platformLabel = platformDisplayNames[state.meeting.onlinePlatform] || state.meeting.onlinePlatform;
          state.meeting.location = platformLabel && platformLabel !== 'ออนไลน์' ? `ออนไลน์ (${platformLabel})` : 'ออนไลน์';
          state.meeting.locationDetail = '';
          const randomDigits = Math.floor(100000 + Math.random() * 900000);
          state.meeting.checkinToken = `CS-${randomDigits}`;
        } else {
          state.meeting.format = 'ONSITE';
          state.meeting.location = info.location ? String(info.location).trim() : 'ห้องประชุมชมรมคมสัน';
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
        state.motions.forEach(m => { m.isOpen = false; });

        notify('notify:event', {
          type: 'info',
          text: `🚀 ผู้ดูแลระบบได้เริ่มการประชุมรอบใหม่แล้ว (${state.meeting.title})`
        });
        result = { ok: true };
        break;
      }

      case 'admin:resetMeetingStatus': {
        state.meeting.isStarted = false;
        state.meeting.isEnded = false;
        state.meeting.startedAtMs = null;
        state.meeting.checkinToken = null;
        resetAllUsersAttendance(state.users);
        state.raiseHandQueue = [];
        state.motions.forEach(m => { m.isOpen = false; });
        notify('notify:event', {
          type: 'warning',
          text: '🔄 ผู้ดูแลระบบได้รีเซ็ตสถานะการประชุมกลับเป็นค่าเริ่มต้น'
        });
        result = { ok: true };
        break;
      }

      case 'admin:endMeeting': {
        state.meeting.isEnded = true;
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

        const summaryRecord = {
          id: 'MTG-' + endedAt,
          title: state.meeting.title || 'การประชุมชมรมสันทนาการ',
          meetingTitle: state.meeting.title || 'การประชุมชมรมสันทนาการ',
          date: state.meeting.date || todayISO,
          endDate: state.meeting.endDate || state.meeting.date || todayISO,
          meetingDate: state.meeting.date || todayISO,
          meetingEndDate: state.meeting.endDate || state.meeting.date || todayISO,
          location: state.meeting.location || '-',
          format: state.meeting.format || 'ONSITE',
          onlinePlatform: state.meeting.onlinePlatform || null,
          onlineUrl: state.meeting.onlineUrl || '',
          startTime: state.meeting.startTime || '17:00',
          endTime: state.meeting.endTime || '19:00',
          scheduledEndTime: state.meeting.endTime || '19:00',
          actualEndTime: timeStr,
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
        state.meetingHistory.unshift(summaryRecord);
        if (state.meetingHistory.length > 100) {
          state.meetingHistory = state.meetingHistory.slice(0, 100);
        }

        resetAllUsersAttendance(state.users);
        state.raiseHandQueue = [];
        state.meeting.checkinToken = null;

        notify('notify:event', {
          type: 'warning',
          text: '🏁 ผู้ดูแลระบบได้สั่งจบการประชุม และบันทึกประวัติสรุปการประชุมย้อนหลังเรียบร้อยแล้ว'
        });
        result = { ok: true, summary: summaryRecord };
        break;
      }

      case 'admin:toggleShowSeats': {
        state.meeting.showSeatsToUsers = Boolean(payload);
        result = { ok: true };
        break;
      }

      case 'admin:deleteMeetingHistory': {
        const meetingId = payload;
        if (!meetingId) break;
        state.meetingHistory = state.meetingHistory.filter(m => m.id !== meetingId);
        if (state.lastMeetingSummary && state.lastMeetingSummary.id === meetingId) {
          state.lastMeetingSummary = state.meetingHistory[0] || null;
        }
        notify('notify:event', {
          type: 'info',
          text: '🗑️ ลบประวัติการประชุมออกจากระบบเรียบร้อยแล้ว'
        });
        result = { ok: true };
        break;
      }

      case 'admin:updateMeetingHistory': {
        const updatedRecord = payload;
        if (!updatedRecord || !updatedRecord.id) break;
        const idx = state.meetingHistory.findIndex(m => m.id === updatedRecord.id);
        if (idx !== -1) {
          state.meetingHistory[idx] = { ...state.meetingHistory[idx], ...updatedRecord };
          if (state.lastMeetingSummary && state.lastMeetingSummary.id === updatedRecord.id) {
            state.lastMeetingSummary = state.meetingHistory[idx];
          }
        }
        result = { ok: true };
        break;
      }

      case 'admin:updateSystemVersion': {
        if (payload && payload.version) {
          state.systemVersion = String(payload.version).trim();
          state.versionNotes = payload.notes || null;
        }
        result = { ok: true };
        break;
      }

      // ==========================================
      // 2. ATTENDANCE & CHECK-IN
      // ==========================================
      case 'admin:importUsers': {
        const newUsers = payload;
        if (Array.isArray(newUsers) && newUsers.length > 0) {
          state.users = newUsers.map(u => ({
            isLeave: false,
            leaveReason: '',
            filePermission: 'NONE',
            streamPermission: 'NONE',
            ...u
          }));
          state.raiseHandQueue = [];
        }
        result = { ok: true, count: state.users.length };
        break;
      }

      case 'admin:checkIn': {
        const identifier = payload;
        if (!state.meeting || !state.meeting.isStarted) {
          result = { ok: false, message: 'การประชุมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้' };
          shouldPersist = false;
          break;
        }
        if (state.meeting && state.meeting.isEnded) {
          result = { ok: false, message: 'การประชุมสิ้นสุดลงแล้ว ไม่สามารถเช็คชื่อได้' };
          shouldPersist = false;
          break;
        }

        const cleanId = String(identifier || '').trim().toLowerCase();
        const user = state.users.find(
          u => (u.id && u.id.toLowerCase() === cleanId) ||
               (u.nickname && u.nickname.toLowerCase() === cleanId) ||
               (u.firstName && u.firstName.toLowerCase() === cleanId)
        );

        if (!user) {
          result = { ok: false, message: `ไม่พบข้อมูลสมาชิก: "${identifier}"` };
          shouldPersist = false;
          break;
        }

        const now = new Date();
        const late = isCurrentlyAfterCutoff(state.meeting.lateTime);
        user.checkedIn = true;
        user.isLeave = false;
        user.checkInTimestamp = now.getTime();
        user.checkInTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        user.isLate = late;
        user.attendedMinutes = 1;

        result = { ok: true, message: `เช็คชื่อสำเร็จ: ${user.nickname} (${late ? 'มาสาย' : 'มาทันเวลา'})`, user };
        break;
      }

      case 'user:checkInWithAdminQr': {
        const { userId, token } = payload || {};
        if (!state.meeting || !state.meeting.isStarted) {
          result = { ok: false, message: 'การประชุมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้' };
          shouldPersist = false;
          break;
        }
        if (state.meeting && state.meeting.isEnded) {
          result = { ok: false, message: 'การประชุมสิ้นสุดลงแล้ว ไม่สามารถเช็คชื่อได้' };
          shouldPersist = false;
          break;
        }
        if (state.meeting.format !== 'ONLINE') {
          result = { ok: false, message: 'การประชุมนี้เป็นแบบ On-site กรุณาแสดง QR Code ประจำตัวให้ผู้ดูแลระบบสแกน' };
          shouldPersist = false;
          break;
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
          result = { ok: false, message: 'รหัสเช็คชื่อหรือ QR Code ไม่ถูกต้อง หรือไม่ใช่ของการประชุมรอบนี้' };
          shouldPersist = false;
          break;
        }

        const cleanId = String(userId || '').trim().toLowerCase();
        const user = state.users.find(
          u => (u.id && u.id.toLowerCase() === cleanId) ||
               (u.nickname && u.nickname.toLowerCase() === cleanId)
        );

        if (!user) {
          result = { ok: false, message: 'ไม่พบข้อมูลสมาชิกของคุณในระบบ' };
          shouldPersist = false;
          break;
        }

        if (user.checkedIn) {
          result = { ok: true, already: true, message: `คุณได้เช็คชื่อไปแล้วเมื่อ ${user.checkInTimeStr} น.` };
          shouldPersist = false;
          break;
        }

        const now = new Date();
        const late = isCurrentlyAfterCutoff(state.meeting.lateTime);
        user.checkedIn = true;
        user.isLeave = false;
        user.checkInTimestamp = now.getTime();
        user.checkInTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        user.isLate = late;
        user.attendedMinutes = 1;

        notify('notify:event', {
          type: 'success',
          text: `✅ ${user.nickname} (${user.firstName}) สแกนเช็คชื่อเข้าประชุมออนไลน์แล้ว (${late ? 'มาสาย' : 'ทันเวลา'})`
        });

        result = {
          ok: true,
          message: `เช็คชื่อเข้าประชุมออนไลน์สำเร็จ! (${late ? 'มาสาย' : 'มาทันเวลา'})`,
          user: { id: user.id, nickname: user.nickname, time: user.checkInTimeStr, isLate: late }
        };
        break;
      }

      case 'user:requestLeave': {
        const { userId, reason } = payload || {};
        const user = state.users.find(u => u.id === userId);
        if (user) {
          user.isLeave = true;
          user.checkedIn = false;
          user.isLate = false;
          user.leaveReason = reason || 'ติดภารกิจส่วนตัว';
          user.checkInTimeStr = 'แจ้งลา';
          notify('notify:event', {
            type: 'info',
            targetRole: 'ADMIN',
            text: `📋 ${user.nickname} (${user.firstName}) แจ้งลาประชุม: ${user.leaveReason}`
          });
        }
        result = { ok: true };
        break;
      }

      case 'admin:setAttendanceStatus': {
        const { userId, status, reason } = payload || {};
        const user = state.users.find(u => u.id === userId);
        const summaryUser = (state.lastMeetingSummary && Array.isArray(state.lastMeetingSummary.users))
          ? state.lastMeetingSummary.users.find(u => u.id === userId)
          : null;

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
        result = { ok: true };
        break;
      }

      case 'user:updateNote': {
        const { userId, note } = payload || {};
        const user = state.users.find(u => u.id === userId);
        if (user) {
          user.note = note || '';
          user.noteSubmitted = true;
        }
        result = { ok: true };
        break;
      }

      case 'user:statusNote': {
        const { userId, statusNote } = payload || {};
        const user = state.users.find(u => u.id === userId);
        if (user) {
          user.statusNote = statusNote ? String(statusNote).trim().slice(0, 60) : '';
          user.statusNoteUpdatedAt = user.statusNote ? Date.now() : null;
        }
        notify('user:statusNote', {
          userId,
          statusNote: user ? user.statusNote : '',
          updatedAt: user ? user.statusNoteUpdatedAt : null
        });
        result = { ok: true, userId, statusNote: user ? user.statusNote : '' };
        break;
      }

      case 'user:raiseHand': {
        const userId = payload;
        const user = state.users.find(u => u.id === userId);
        if (user) {
          if (!user.checkedIn) {
            shouldPersist = false;
            result = { ok: false, error: 'User not checked in' };
            break;
          }
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
          if (!state.raiseHandQueue.some(q => q.userId === user.id)) {
            state.raiseHandQueue.push(alertData);
          }
          notify('alert:raiseHand', alertData);
        }
        result = { ok: true };
        break;
      }

      case 'user:lowerHand': {
        const userId = payload;
        state.raiseHandQueue = state.raiseHandQueue.filter(q => q.userId !== userId);
        result = { ok: true };
        break;
      }

      case 'admin:removeQueue': {
        const queueId = payload;
        state.raiseHandQueue = state.raiseHandQueue.filter(q => q.queueId !== queueId);
        result = { ok: true };
        break;
      }

      case 'admin:clearQueue': {
        state.raiseHandQueue = [];
        result = { ok: true };
        break;
      }

      // ==========================================
      // 3. MOTIONS & VOTING
      // ==========================================
      case 'admin:createMotion': {
        const motionPayload = payload || {};
        if (!motionPayload.title) {
          shouldPersist = false;
          break;
        }
        if (!state.meeting || !state.meeting.isStarted || state.meeting.isEnded) {
          notify('notify:event', {
            type: 'warning',
            text: '⚠️ กรุณาเปิดการประชุมก่อน จึงจะสามารถสร้างและเปิดญัตติได้'
          });
          shouldPersist = false;
          result = { ok: false, error: 'Meeting not started or ended' };
          break;
        }
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
        state.motions = Array.isArray(state.motions) ? state.motions : [];
        const existingIdx = state.motions.findIndex(m => m.id === newMotion.id);
        if (existingIdx !== -1) {
          state.motions[existingIdx] = newMotion;
        } else {
          state.motions.push(newMotion);
        }
        notify('notify:event', {
          type: 'motion',
          text: `🗳️ เปิดญัตติโหวตใหม่${newMotion.isSecret ? ' (โหวตลับ)' : ''}: "${newMotion.title}"`
        });
        result = { ok: true, motion: newMotion };
        break;
      }

      case 'admin:deleteMotion': {
        const motionId = payload;
        state.motions = state.motions.filter(m => m.id !== motionId);
        result = { ok: true };
        break;
      }

      case 'admin:toggleMotion': {
        const payloadObj = (typeof payload === 'object' && payload !== null) ? payload : { motionId: payload };
        const motionId = payloadObj.motionId;
        const targetOpen = payloadObj.isOpen;
        const m = (state.motions || []).find(item => item.id === motionId);
        if (m) {
          const nextState = (targetOpen !== undefined) ? Boolean(targetOpen) : !m.isOpen;
          if (nextState && (!state.meeting || !state.meeting.isStarted || state.meeting.isEnded)) {
            notify('notify:event', {
              type: 'warning',
              text: '⚠️ กรุณาเปิดการประชุมก่อน จึงจะสามารถเปิดรับคะแนนโหวตญัตติได้'
            });
            shouldPersist = false;
            result = { ok: false, error: 'Meeting not started or ended' };
            break;
          }
          m.isOpen = nextState;
        }
        result = { ok: true };
        break;
      }

      case 'admin:toggleRealtime': {
        state.meeting.realtimeVoting = Boolean(payload);
        result = { ok: true };
        break;
      }

      case 'user:vote': {
        const { userId, motionId, choice } = payload || {};
        const user = state.users.find(u => u.id === userId);
        if (!user || !user.checkedIn) {
          shouldPersist = false;
          result = { ok: false, error: 'User not checked in' };
          break;
        }
        const m = state.motions.find(item => item.id === motionId);
        if (m && m.isOpen && userId) {
          if (!m.votes) m.votes = {};
          m.votes[userId] = choice;
        }
        result = { ok: true };
        break;
      }

      // ==========================================
      // 4. CHAT SYSTEM
      // ==========================================
      case 'chat:send': {
        const msgPayload = payload;
        if (!msgPayload) {
          shouldPersist = false;
          break;
        }
        const hasText = msgPayload.text && String(msgPayload.text).trim().length > 0;
        const hasMedia = msgPayload.mediaUrl && String(msgPayload.mediaUrl).length > 0;
        if (!hasText && !hasMedia) {
          shouldPersist = false;
          break;
        }

        const now = Date.now();
        const newMsg = {
          id: msgPayload.id || (now + Math.floor(Math.random() * 1000)),
          timestamp: msgPayload.timestamp || now,
          sender: msgPayload.sender,
          senderId: msgPayload.senderId || null,
          target: msgPayload.target || 'ALL',
          text: hasText ? String(msgPayload.text).trim() : '',
          mediaUrl: hasMedia ? msgPayload.mediaUrl : null,
          mediaType: hasMedia ? (msgPayload.mediaType || 'image') : null,
          mediaName: hasMedia ? (msgPayload.mediaName || '') : null,
          time: msgPayload.time || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        };
        state.chats = Array.isArray(state.chats) ? state.chats : [];
        if (!state.chats.some(c => String(c.id) === String(newMsg.id))) {
          state.chats.push(newMsg);
        }

        state.chatLogs = Array.isArray(state.chatLogs) ? state.chatLogs : [];
        if (!state.chatLogs.some(l => String(l.msgId) === String(newMsg.id))) {
          state.chatLogs.push({
            id: 'LOG-' + newMsg.id,
            msgId: String(newMsg.id),
            timestamp: newMsg.timestamp,
            sender: newMsg.sender,
            senderId: newMsg.senderId || null,
            target: newMsg.target || 'ALL',
            text: newMsg.text || '',
            mediaUrl: newMsg.mediaUrl || null,
            mediaType: newMsg.mediaType || null,
            mediaName: newMsg.mediaName || null,
            time: newMsg.time,
            dateStr: new Date(newMsg.timestamp).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
            deleted: false,
            deletedAt: null
          });
        }

        notify('notify:chat', newMsg);
        result = { ok: true, message: newMsg };
        break;
      }

      case 'chat:delete': {
        const msgId = payload;
        state.chats = state.chats.filter(c => String(c.id) !== String(msgId));
        const targetLog = state.chatLogs.find(l => String(l.msgId) === String(msgId));
        if (targetLog) {
          targetLog.deleted = true;
          targetLog.deletedAt = Date.now();
          targetLog.deletedTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        }
        result = { ok: true };
        break;
      }

      case 'admin:getChatLogs': {
        result = state.chatLogs || [];
        shouldPersist = false;
        break;
      }

      // ==========================================
      // 5. RANDOMIZER WHEEL
      // ==========================================
      case 'admin:startRandomSpin': {
        const spinPayload = payload;
        if (!spinPayload || !Array.isArray(spinPayload.items) || spinPayload.items.length === 0) {
          shouldPersist = false;
          break;
        }
        const record = {
          id: Date.now(),
          mode: spinPayload.mode || 'WHEEL',
          winnerLabel: spinPayload.winnerLabel,
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        state.randomizer.lastWinner = record;
        state.randomizer.history.unshift(record);
        state.randomizer.history = state.randomizer.history.slice(0, 15);
        notify('random:spin', spinPayload);
        result = { ok: true, record };
        break;
      }

      // ==========================================
      // 6. FILES & STREAM
      // ==========================================
      case 'file:requestPermission': {
        const userId = typeof payload === 'string' ? payload : (payload && payload.userId);
        const user = state.users.find(u => u.id === userId);
        if (user) {
          user.filePermission = 'PENDING';
          notify('file:permission', { userId, status: 'PENDING' });
          notify('notify:event', {
            type: 'fileReq',
            targetRole: 'ADMIN',
            text: `📁 ${user.nickname} ส่งคำขออนุญาตดรอปไฟล์`
          });
        }
        result = { ok: true, userId, status: 'PENDING' };
        break;
      }

      case 'admin:setFilePermission': {
        const { userId, status } = payload || {};
        const user = state.users.find(u => u.id === userId);
        if (user) {
          user.filePermission = status || 'NONE';
          notify('file:permission', { userId, status: user.filePermission });
          notify('notify:event', {
            type: status === 'APPROVED' ? 'success' : 'warning',
            targetUserId: user.id,
            text: status === 'APPROVED' ? '✅ ADMIN อนุมัติให้คุณดรอปไฟล์ได้แล้ว!' : '⚠️ สิทธิ์การดรอปไฟล์ถูกยกเลิก'
          });
        }
        result = { ok: true, userId, status: user ? user.filePermission : 'NONE' };
        break;
      }

      case 'file:upload': {
        const fileObj = payload;
        if (!fileObj || !fileObj.name || (!fileObj.dataUrl && !fileObj.hasContent)) {
          shouldPersist = false;
          break;
        }
        const now = Date.now();
        const item = {
          id: fileObj.id || ('FILE-' + now),
          name: fileObj.name,
          size: fileObj.size || 0,
          type: fileObj.type || 'application/octet-stream',
          dataUrl: fileObj.dataUrl || null,
          hasContent: Boolean(fileObj.dataUrl || fileObj.hasContent),
          uploaderId: fileObj.uploaderId || 'ADMIN',
          uploaderName: fileObj.uploaderName || 'ADMIN',
          time: fileObj.time || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          uploadedAt: fileObj.uploadedAt || now,
          isPinned: Boolean(fileObj.isPinned),
          pinnedAt: fileObj.pinnedAt || null
        };
        state.files = Array.isArray(state.files) ? state.files : [];
        const existingIdx = state.files.findIndex(f => f.id === item.id);
        if (existingIdx !== -1) {
          state.files[existingIdx] = {
            ...state.files[existingIdx],
            ...item,
            dataUrl: item.dataUrl || state.files[existingIdx].dataUrl
          };
        } else {
          state.files.push(item);
        }
        notify('file:upload', item);
        notify('notify:event', {
          type: 'fileDrop',
          text: `📎 ${item.uploaderName} ดรอปไฟล์ใหม่: "${item.name}"`
        });
        result = { ok: true, file: item };
        break;
      }

      case 'admin:togglePinFile': {
        const fileId = (typeof payload === 'object' && payload && payload.fileId) ? payload.fileId : payload;
        const targetPinned = (typeof payload === 'object' && payload && payload.isPinned !== undefined) ? payload.isPinned : null;
        state.files = Array.isArray(state.files) ? state.files : [];
        const file = state.files.find(f => f.id === fileId);
        if (file) {
          file.isPinned = targetPinned !== null ? targetPinned : !file.isPinned;
          file.pinnedAt = file.isPinned ? Date.now() : null;
          if (file.isPinned) {
            notify('notify:event', {
              type: 'info',
              text: `📌 ผู้ดูแลระบบได้ปักหมุดเอกสาร: "${file.name}" ไว้ด้านบนสุด`
            });
          }
        }
        result = { ok: true };
        break;
      }

      case 'file:delete': {
        const fileId = payload;
        state.files = state.files.filter(f => f.id !== fileId);
        result = { ok: true };
        break;
      }

      case 'stream:requestPermission': {
        const userId = typeof payload === 'string' ? payload : (payload && payload.userId);
        const user = state.users.find(u => u.id === userId);
        if (user) {
          user.streamPermission = 'PENDING';
          notify('stream:permission', { userId, status: 'PENDING' });
          notify('notify:event', {
            type: 'info',
            targetRole: 'ADMIN',
            text: `🎥 ${user.nickname} (${user.firstName}) ขออนุญาตเปิดกล้อง/แชร์หน้าจอ`
          });
        }
        result = { ok: true, userId, status: 'PENDING' };
        break;
      }

      case 'admin:setStreamPermission': {
        const { userId, status } = payload || {};
        const user = state.users.find(u => u.id === userId);
        if (user) {
          user.streamPermission = status || 'NONE';
          if (status !== 'APPROVED') {
            if (state.activeStream && (state.activeStream.streamerId === userId || !state.activeStream.streamerId)) {
              state.activeStream = null;
              notify('stream:stopped');
              notify('stream:forceStop');
            }
          }
          notify('stream:permission', { userId, status: user.streamPermission });
          notify('notify:event', {
            type: status === 'APPROVED' ? 'success' : 'warning',
            targetUserId: user.id,
            text: status === 'APPROVED'
              ? '✅ ADMIN อนุมัติให้คุณเปิดกล้องและแชร์หน้าจอได้แล้ว!'
              : '⚠️ สิทธิ์การเปิดกล้อง/แชร์หน้าจอถูกยกเลิก'
          });
        }
        result = { ok: true, userId, status: user ? user.streamPermission : 'NONE' };
        break;
      }

      case 'admin:stopAllStreams': {
        state.activeStream = null;
        if (Array.isArray(state.users)) {
          state.users.forEach(u => {
            if (u.streamPermission === 'APPROVED' || u.streamPermission === 'PENDING') {
              u.streamPermission = 'NONE';
            }
          });
        }
        notify('stream:stopped');
        notify('stream:forceStop');
        result = { ok: true };
        break;
      }

      case 'stream:frame': {
        const framePayload = payload;
        if (!framePayload || !framePayload.frameDataUrl) {
          shouldPersist = false;
          break;
        }
        if (framePayload.streamerId && framePayload.streamerId !== 'ADMIN') {
          const streamer = state.users.find(u => u.id === framePayload.streamerId);
          if (!streamer || streamer.streamPermission !== 'APPROVED') {
            shouldPersist = false;
            break; // Reject unauthorized streamer frames
          }
        }
        state.activeStream = {
          streamerId: framePayload.streamerId,
          streamerName: framePayload.streamerName,
          mode: framePayload.mode || 'CAMERA',
          frameDataUrl: framePayload.frameDataUrl,
          updatedAt: Date.now()
        };
        notify('stream:frameUpdate', state.activeStream);
        shouldPersist = false; // Don't save transient video frames to DB
        result = { ok: true };
        break;
      }

      case 'stream:stop': {
        state.activeStream = null;
        notify('stream:stopped');
        notify('stream:forceStop');
        shouldPersist = false;
        result = { ok: true };
        break;
      }

      case 'user:finishPermission': {
        const { userId, permType } = payload || {};
        const user = state.users.find(u => u.id === userId);
        if (user) {
          if (permType === 'STREAM') {
            user.streamPermission = 'NONE';
            if (state.activeStream && (state.activeStream.streamerId === userId || !state.activeStream.streamerId)) {
              state.activeStream = null;
              notify('stream:stopped');
              notify('stream:forceStop');
            }
            notify('stream:permission', { userId, status: 'NONE' });
          } else if (permType === 'FILE') {
            user.filePermission = 'NONE';
            notify('file:permission', { userId, status: 'NONE' });
          }
        }
        result = { ok: true };
        break;
      }

      // ==========================================
      // 7. CALENDAR & EVENTS
      // ==========================================
      case 'admin:addCalendarEvent': {
        const data = payload || {};
        const newEvent = {
          id: data.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: (data.title || 'กิจกรรมใหม่').trim(),
          description: (data.description || '').trim(),
          startDate: data.startDate || todayISO,
          startTime: data.startTime || '09:00',
          endDate: data.endDate || data.startDate || todayISO,
          endTime: data.endTime || '12:00',
          isAllDay: Boolean(data.isAllDay),
          location: (data.location || '').trim(),
          category: data.category || 'EVENT',
          color: data.color || 'indigo',
          assignees: Array.isArray(data.assignees) ? data.assignees : [],
          createdSource: data.createdSource || 'MANUAL',
          createdAt: new Date().toISOString()
        };
        state.calendarEvents.unshift(newEvent);
        result = { success: true, event: newEvent };
        break;
      }

      case 'admin:updateCalendarEvent': {
        const data = payload || {};
        const idx = state.calendarEvents.findIndex(e => e.id === data.id);
        if (idx !== -1) {
          state.calendarEvents[idx] = {
            ...state.calendarEvents[idx],
            title: (data.title || state.calendarEvents[idx].title).trim(),
            description: (data.description !== undefined ? data.description : state.calendarEvents[idx].description).trim(),
            startDate: data.startDate || state.calendarEvents[idx].startDate,
            startTime: data.startTime || state.calendarEvents[idx].startTime,
            endDate: data.endDate || state.calendarEvents[idx].endDate,
            endTime: data.endTime || state.calendarEvents[idx].endTime,
            isAllDay: data.isAllDay !== undefined ? Boolean(data.isAllDay) : state.calendarEvents[idx].isAllDay,
            location: (data.location !== undefined ? data.location : state.calendarEvents[idx].location).trim(),
            category: data.category || state.calendarEvents[idx].category,
            color: data.color || state.calendarEvents[idx].color,
            assignees: Array.isArray(data.assignees) ? data.assignees : state.calendarEvents[idx].assignees,
            updatedAt: new Date().toISOString()
          };
          result = { success: true, event: state.calendarEvents[idx] };
        } else {
          result = { success: false, message: 'ไม่พบกิจกรรมที่ต้องการแก้ไข' };
          shouldPersist = false;
        }
        break;
      }

      case 'admin:deleteCalendarEvent': {
        const { eventId } = payload || {};
        state.calendarEvents = state.calendarEvents.filter(e => e.id !== eventId);
        result = { success: true, eventId };
        break;
      }

      case 'admin:importCalendarEvents': {
        const { events } = payload || {};
        if (Array.isArray(events)) {
          events.forEach(raw => {
            if (!raw || !raw.title) return;
            state.calendarEvents.push({
              id: raw.id || `evt_ics_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              title: String(raw.title || 'กิจกรรมชมรม').trim(),
              description: String(raw.description || '').trim(),
              startDate: raw.startDate || todayISO,
              startTime: raw.startTime || '09:00',
              endDate: raw.endDate || raw.startDate || todayISO,
              endTime: raw.endTime || '10:00',
              isAllDay: Boolean(raw.isAllDay),
              location: String(raw.location || '').trim(),
              category: raw.category || 'EVENT',
              color: raw.color || 'indigo',
              assignees: Array.isArray(raw.assignees) ? raw.assignees : [],
              createdSource: 'ICS_IMPORT',
              createdAt: new Date().toISOString()
            });
          });
          result = { success: true, addedCount: events.length };
        } else {
          result = { success: false };
          shouldPersist = false;
        }
        break;
      }

      case 'admin:clearAllCalendarEvents': {
        state.calendarEvents = [];
        result = { success: true };
        break;
      }

      // ==========================================
      // 8. PROJECTS MANAGEMENT
      // ==========================================
      case 'admin:createProject': {
        const data = payload || {};
        const newProject = {
          id: data.id || `PRJ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: (data.title || 'โครงการใหม่').trim(),
          code: (data.code || '').trim(),
          academicYear: (data.academicYear || '').trim(),
          status: data.status || 'IN_PROGRESS', // 'IN_PROGRESS' | 'COMPLETED' | 'PLANNING'
          startDate: data.startDate || todayISO,
          endDate: data.endDate || data.startDate || todayISO,
          location: (data.location || '').trim(),
          budget: (data.budget || '').trim(),
          summary: (data.summary || '').trim(),
          description: (data.description || '').trim(),
          googleDriveUrl: (data.googleDriveUrl || '').trim(),
          projectDocument: data.projectDocument || { title: '', url: '', updatedAt: todayISO },
          budgetDocument: data.budgetDocument || { title: '', url: '', totalBudget: '', updatedAt: todayISO },
          leaders: Array.isArray(data.leaders) ? data.leaders : [],
          members: Array.isArray(data.members) ? data.members : [],
          advisors: Array.isArray(data.advisors) ? data.advisors : [],
          smoOfficers: Array.isArray(data.smoOfficers) ? data.smoOfficers : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        state.projects.unshift(newProject);
        result = { success: true, project: newProject };
        break;
      }

      case 'admin:updateProject': {
        const data = payload || {};
        const idx = state.projects.findIndex(p => p.id === data.id);
        if (idx !== -1) {
          state.projects[idx] = {
            ...state.projects[idx],
            title: data.title !== undefined ? String(data.title).trim() : state.projects[idx].title,
            code: data.code !== undefined ? String(data.code).trim() : state.projects[idx].code,
            academicYear: data.academicYear !== undefined ? String(data.academicYear).trim() : state.projects[idx].academicYear,
            status: data.status || state.projects[idx].status,
            startDate: data.startDate || state.projects[idx].startDate,
            endDate: data.endDate || state.projects[idx].endDate,
            location: data.location !== undefined ? String(data.location).trim() : state.projects[idx].location,
            budget: data.budget !== undefined ? String(data.budget).trim() : state.projects[idx].budget,
            summary: data.summary !== undefined ? String(data.summary).trim() : state.projects[idx].summary,
            description: data.description !== undefined ? String(data.description).trim() : state.projects[idx].description,
            googleDriveUrl: data.googleDriveUrl !== undefined ? String(data.googleDriveUrl).trim() : state.projects[idx].googleDriveUrl,
            projectDocument: data.projectDocument || state.projects[idx].projectDocument,
            budgetDocument: data.budgetDocument || state.projects[idx].budgetDocument,
            leaders: Array.isArray(data.leaders) ? data.leaders : state.projects[idx].leaders,
            members: Array.isArray(data.members) ? data.members : state.projects[idx].members,
            advisors: Array.isArray(data.advisors) ? data.advisors : state.projects[idx].advisors,
            smoOfficers: Array.isArray(data.smoOfficers) ? data.smoOfficers : state.projects[idx].smoOfficers,
            updatedAt: new Date().toISOString()
          };
          result = { success: true, project: state.projects[idx] };
        } else {
          result = { success: false, message: 'ไม่พบโครงการที่ต้องการแก้ไข' };
          shouldPersist = false;
        }
        break;
      }

      case 'admin:deleteProject': {
        const { projectId } = payload || {};
        state.projects = state.projects.filter(p => p.id !== projectId);
        result = { success: true, projectId };
        break;
      }

      default:
        console.warn('Unknown action:', action);
        shouldPersist = false;
        break;
    }

    return { state, result, shouldPersist };
  }

  return {
    applyAction,
    reduce: function(state, actionObj, emitBroadcast) {
      if (!actionObj) return { state, result: null, shouldPersist: false };
      return applyAction(state, actionObj.type || actionObj.action, actionObj.payload, emitBroadcast);
    },
    isCurrentlyAfterCutoff,
    resetAllUsersAttendance
  };
});
