const fs = require('fs');
const config = require('../config/app.config');
const defaultState = require('../config/defaultState');

class StateService {
  constructor() {
    this.state = this.loadState();
    this.timer = null;
    this.io = null;
    // Ensure state file on disk is immediately synchronized with valid structure
    this.scheduleSave();
  }

  loadState() {
    try {
      if (fs.existsSync(config.STATE_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(config.STATE_FILE, 'utf-8'));
        parsed.meeting = { ...defaultState.meeting, ...(parsed.meeting || {}) };
        parsed.motions = Array.isArray(parsed.motions) ? parsed.motions : [];
        parsed.files = Array.isArray(parsed.files) ? parsed.files : [];
        parsed.chats = Array.isArray(parsed.chats) ? parsed.chats : [];
        parsed.chatLogs = Array.isArray(parsed.chatLogs) ? parsed.chatLogs : [];
        if (parsed.chatLogs.length === 0 && parsed.chats.length > 0) {
          parsed.chatLogs = parsed.chats.map(c => {
            const ts = c.timestamp || Date.now();
            return {
              id: 'LOG-' + c.id,
              msgId: String(c.id),
              timestamp: ts,
              sender: c.sender || 'ผู้ใช้งาน',
              senderId: c.senderId || null,
              target: c.target || 'ALL',
              text: c.text || '',
              mediaUrl: c.mediaUrl || null,
              mediaType: c.mediaType || null,
              mediaName: c.mediaName || null,
              time: c.time || '00:00',
              dateStr: new Date(ts).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
              deleted: false,
              deletedAt: null
            };
          });
        }
        parsed.raiseHandQueue = Array.isArray(parsed.raiseHandQueue) ? parsed.raiseHandQueue : [];
        parsed.randomizer = parsed.randomizer || { lastWinner: null, history: [] };
        parsed.users = (Array.isArray(parsed.users) ? parsed.users : defaultState.users).map(u => ({
          isLeave: false,
          leaveReason: '',
          filePermission: 'NONE',
          streamPermission: 'NONE',
          ...u
        }));
        parsed.systemVersion = parsed.systemVersion || defaultState.systemVersion || '2.0.1';
        parsed.versionNotes = parsed.versionNotes || defaultState.versionNotes;
        parsed.lastMeetingSummary = parsed.lastMeetingSummary || null;
        parsed.meetingHistory = Array.isArray(parsed.meetingHistory) ? parsed.meetingHistory : [];
        parsed.liveDashboardConfig = {
          concurrencyMode: 'BOTH',
          showRaiseHandPopup: true,
          showPermissionPopup: true,
          showRandomizerPopup: true,
          theme: 'DARK',
          clockFormat: '24H',
          ...(parsed.liveDashboardConfig || {})
        };
        parsed.calendarEvents = Array.isArray(parsed.calendarEvents)
          ? parsed.calendarEvents
          : (defaultState.calendarEvents || []);

        const rawProjects = Array.isArray(parsed.projects)
          ? parsed.projects
          : (defaultState.projects || []);

        // Deduplicate projects to guarantee no duplicate cards ever exist on server
        const uniqueProjects = [];
        const seenPrjIds = new Set();
        rawProjects.forEach(p => {
          if (p && p.id && !seenPrjIds.has(p.id)) {
            seenPrjIds.add(p.id);
            uniqueProjects.push(p);
          }
        });
        parsed.projects = uniqueProjects;
        return parsed;
      }
    } catch (err) {
      console.error('Error loading state:', err);
    }
    return JSON.parse(JSON.stringify(defaultState));
  }

  getState() {
    return this.state;
  }

  setIO(io) {
    this.io = io;
  }

  persistAndBroadcast() {
    this.scheduleSave();
    if (this.io) {
      this.io.emit('state:update', this.state);
    }
  }

  scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const stateToSave = { ...this.state, activeStream: null };
        fs.writeFile(config.STATE_FILE, JSON.stringify(stateToSave), 'utf-8', (err) => {
          if (err) console.error('Failed to save state:', err);
        });
      } catch (err) {
        console.error('Failed to save state:', err);
      }
    }, 400);
  }

  isCurrentlyAfterCutoff(cutoffHHMM) {
    if (!cutoffHHMM) return false;
    const now = new Date();
    const [cutH, cutM] = cutoffHHMM.split(':').map(Number);
    const cutoffDate = new Date();
    cutoffDate.setHours(cutH, cutM, 0, 0);
    return now > cutoffDate;
  }

  startAttendanceTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.state.meeting.isStarted && !this.state.meeting.isEnded) {
        const nowMs = Date.now();
        let changed = false;
        this.state.users.forEach(u => {
          if (u.checkedIn && u.checkInTimestamp && !u.isLeave) {
            const baseTime = Math.max(u.checkInTimestamp, this.state.meeting.startedAtMs || u.checkInTimestamp);
            const mins = Math.max(1, Math.floor((nowMs - baseTime) / 60000));
            if (u.attendedMinutes !== mins) {
              u.attendedMinutes = mins;
              changed = true;
            }
          }
        });
        if (changed) {
          this.persistAndBroadcast();
        }
      }
    }, config.ATTENDANCE_TICK_MS);
  }
}

// Singleton instance
const stateService = new StateService();
module.exports = stateService;
