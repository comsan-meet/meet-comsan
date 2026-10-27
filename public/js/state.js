/**
 * COMSAN Meeting System - Application State Store
 */

const ADMIN_PASSWORD = 'admincomsan26';
window.ADMIN_PASSWORD = ADMIN_PASSWORD;
const LOCAL_STORAGE_KEY = 'COMSAN_HYBRID_STATE_V5';
const localSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('comsan_hybrid_channel_v5') : null;
function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
window.getLocalDateString = getLocalDateString;
const todayISO = getLocalDateString();

const WHEEL_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];
const CUSTOM_PALETTE = [
  { bg: 'bg-emerald-500 text-slate-950 border-emerald-200', dot: 'bg-emerald-500', hex: '#059669' },
  { bg: 'bg-sky-500 text-white border-sky-200', dot: 'bg-sky-500', hex: '#0284c7' },
  { bg: 'bg-amber-400 text-slate-950 border-amber-200', dot: 'bg-amber-400', hex: '#d97706' },
  { bg: 'bg-rose-500 text-white border-rose-200', dot: 'bg-rose-500', hex: '#e11d48' },
  { bg: 'bg-purple-500 text-white border-purple-200', dot: 'bg-purple-500', hex: '#9333ea' },
  { bg: 'bg-pink-500 text-white border-pink-200', dot: 'bg-pink-500', hex: '#db2777' }
];

const defaultState = {
  meeting: {
    title: '',
    location: '',
    date: todayISO,
    endDate: todayISO,
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
      firstName: 'อิทธิพัทธ์ วัฒนสิริเมธากุล',
      lastName: 'พืชผักหวาน',
      nickname: 'แมทธิว',
      year: '2',
      major: 'ปัญญาประดิษฐ์ ภาคปกติ (AI)',
      position: 'ประธานชมรม',
      password: '683380001-0',
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
      id: 'COMSAN-02',
      firstName: 'กมลชนก',
      lastName: 'ใจดี',
      nickname: 'พลอย',
      year: '2',
      major: 'CS',
      position: 'เลขานุการ',
      password: '683380691-2',
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
      password: '683380208-1',
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
      id: 'COMSAN-04',
      firstName: 'ธนกฤต',
      lastName: 'ยอดเยี่ยม',
      nickname: 'บอม',
      year: '2',
      major: 'CS',
      position: 'ฝ่ายกิจกรรม',
      password: '683380576-2',
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
      id: 'COMSAN-05',
      firstName: 'ศุภกร',
      lastName: 'มีสุข',
      nickname: 'ฟีฟ่า',
      year: '1',
      major: 'IT',
      position: 'ฝ่ายเทคโนโลยีสารสนเทศ',
      password: '683380404-1',
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
  chatLogs: [],
  randomizer: { lastWinner: null, history: [] },
  activeStream: null,
  liveDashboardConfig: {
    concurrencyMode: 'BOTH',
    showRaiseHandPopup: true,
    showPermissionPopup: true,
    showRandomizerPopup: true,
    theme: 'DARK',
    clockFormat: '24H'
  },
  lastMeetingSummary: null,
  meetingHistory: [],
  calendarEvents: [],
  projects: [],
  systemVersion: '2.0.1',
  versionNotes: null
};

function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(defaultState));
  const meeting = { ...defaultState.meeting, ...(raw.meeting || {}) };
  const rawMotions = Array.isArray(raw.motions) ? raw.motions : [];
  const motions = meeting.isEnded
    ? rawMotions.map(m => (m.isOpen ? { ...m, isOpen: false } : m))
    : rawMotions;

  const rawUsers = (Array.isArray(raw.users) && raw.users.length > 0 ? raw.users : defaultState.users).map(u => ({
    isLeave: false,
    leaveReason: '',
    filePermission: 'NONE',
    streamPermission: 'NONE',
    ...u
  }));

  // ตรวจสอบให้มั่นใจว่าสมาชิกพื้นฐาน (บอม, พลอย, ฟีฟ่า, แมทธิว, เจมส์) มีอยู่ในระบบเสมอ
  defaultState.users.forEach(defU => {
    if (!rawUsers.some(u => (u.nickname && u.nickname.trim() === defU.nickname) || u.id === defU.id)) {
      rawUsers.push(JSON.parse(JSON.stringify(defU)));
    }
  });

  const sampleProjectIds = new Set(['PRJ-2569-01', 'PRJ-2568-02', 'PRJ-2569-03']);

  // Universal Safe Project Merger: ensures local created/edited projects are never lost
  let deletedProjectIds = new Set();
  try {
    const rawDel = typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_deleted_project_ids') : null;
    if (rawDel) {
      const parsedDel = JSON.parse(rawDel);
      if (Array.isArray(parsedDel)) deletedProjectIds = new Set(parsedDel);
    }
  } catch (e) {}

  // Gather existing projects from local active memory or local storage
  let existingProjects = [];
  if (typeof window !== 'undefined' && window.appState && Array.isArray(window.appState.projects) && window.appState.projects.length > 0) {
    existingProjects = window.appState.projects;
  } else if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.projects)) existingProjects = parsed.projects;
      }
    } catch (e) {}
  }

  const rawProjects = Array.isArray(raw.projects) ? raw.projects : [];
  const projectMap = new Map();

  function mergeProjectIntoMap(p) {
    if (!p || !p.id) return;
    const pid = String(p.id).trim();
    if (sampleProjectIds.has(pid) || deletedProjectIds.has(pid)) return;

    if (!projectMap.has(pid)) {
      projectMap.set(pid, { ...p });
    } else {
      const current = projectMap.get(pid);
      const currentTime = new Date(current.updatedAt || current.createdAt || 0).getTime();
      const incomingTime = new Date(p.updatedAt || p.createdAt || 0).getTime();

      if (incomingTime >= currentTime) {
        projectMap.set(pid, {
          ...current,
          ...p,
          photoFolderUrl: p.photoFolderUrl || current.photoFolderUrl || '',
          photoCatalog: (Array.isArray(p.photoCatalog) && p.photoCatalog.length > 0) ? p.photoCatalog : (current.photoCatalog || []),
          projectDocument: p.projectDocument || current.projectDocument,
          budgetDocument: p.budgetDocument || current.budgetDocument
        });
      } else {
        projectMap.set(pid, {
          ...p,
          ...current,
          photoFolderUrl: current.photoFolderUrl || p.photoFolderUrl || '',
          photoCatalog: (Array.isArray(current.photoCatalog) && current.photoCatalog.length > 0) ? current.photoCatalog : (p.photoCatalog || []),
          projectDocument: current.projectDocument || p.projectDocument,
          budgetDocument: current.budgetDocument || p.budgetDocument
        });
      }
    }
  }

  // If raw has explicit project list, merge both local and raw
  existingProjects.forEach(mergeProjectIntoMap);
  rawProjects.forEach(mergeProjectIntoMap);

  const uniqueProjects = Array.from(projectMap.values());

  return {
    meeting,
    users: rawUsers,
    raiseHandQueue: Array.isArray(raw.raiseHandQueue) ? raw.raiseHandQueue : [],
    motions,
    chats: Array.isArray(raw.chats) ? raw.chats : [],
    files: Array.isArray(raw.files) ? raw.files : [],
    chatLogs: Array.isArray(raw.chatLogs) ? raw.chatLogs : [],
    randomizer: (function () {
      const r = raw.randomizer || { lastWinner: null, history: [] };
      const rawHist = Array.isArray(r.history) ? r.history : [];
      const seen = new Set();
      const cleanHist = rawHist.filter(h => {
        if (!h || !h.winnerLabel) return false;
        const key = (h.winnerLabel || '') + '_' + (h.time || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return {
        lastWinner: r.lastWinner || null,
        history: cleanHist.slice(0, 15)
      };
    })(),
    activeStream: raw.activeStream || null,
    liveDashboardConfig: {
      concurrencyMode: 'BOTH',
      showRaiseHandPopup: true,
      showPermissionPopup: true,
      showRandomizerPopup: true,
      theme: 'DARK',
      clockFormat: '24H',
      ...(raw.liveDashboardConfig || {})
    },
    lastMeetingSummary: raw.lastMeetingSummary || null,
    meetingHistory: Array.isArray(raw.meetingHistory) ? raw.meetingHistory : [],
    calendarEvents: Array.isArray(raw.calendarEvents) ? raw.calendarEvents : (defaultState.calendarEvents || []),
    projects: uniqueProjects,
    systemVersion: raw.systemVersion || defaultState.systemVersion || '2.0.1',
    versionNotes: raw.versionNotes || defaultState.versionNotes || null
  };
}

let appState = (function () {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return normalizeState(JSON.parse(saved));
  } catch (e) {}
  return normalizeState(defaultState);
})();

function saveLocalState() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
    if (localSyncChannel) localSyncChannel.postMessage({ type: 'SYNC', state: appState });
    const isBridge = window.socket && (window.socket.isHttpBridge || (window.socket.engine && window.socket.engine.isHttpBridge));
    if (isBridge) {
      if (typeof window.socket.syncStateToServer === 'function') {
        window.socket.syncStateToServer('saveLocalState', appState);
      } else if (window.socket.engine && typeof window.socket.engine.syncStateToServer === 'function') {
        window.socket.engine.syncStateToServer('saveLocalState', appState);
      }
    }
  } catch (e) {}
}

async function emergencyResetCache() {
  const confirmed = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: 'ล้างแคชระบบ',
        message: 'ต้องการล้างแคชหน้าเว็บและรีเฟรชหน้าจอใหม่หรือไม่? (ข้อมูลบนเซิร์ฟเวอร์จะไม่หาย)',
        confirmText: 'ล้างแคชและรีเฟรช',
        cancelText: 'ยกเลิก',
        isDanger: true,
        icon: 'rotate-ccw'
      })
    : false;
  if (!confirmed) return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem('COMSAN_HYBRID_STATE_V4');
  localStorage.removeItem('COMSAN_HYBRID_STATE_V3');
  location.reload();
}

if (localSyncChannel) {
  localSyncChannel.onmessage = (ev) => {
    if (ev.data && ev.data.state) {
      appState = normalizeState(ev.data.state);
      if (typeof window.renderAll === 'function') window.renderAll();
    }
  };
}

// Session restoration from localStorage
const savedUserAuth = typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_user_auth') === 'true' : false;
const savedAdminAuth = typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_admin_auth') === 'true' : false;
const savedUserId = (savedUserAuth && typeof localStorage !== 'undefined') ? localStorage.getItem('comsan_user_id') : null;
const savedRole = typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_role') : null;

// Global active UI state
let isUserAuthenticated = savedUserAuth && Boolean(savedUserId);
let isAdminAuthenticated = savedAdminAuth;
let currentUserId = isUserAuthenticated ? savedUserId : null;
let currentRole = savedRole || (isAdminAuthenticated ? 'ADMIN' : (isUserAuthenticated ? 'USER' : null));
let isSidebarCollapsed = false;
let isMobileSidebarOpen = false;

function setSessionUser(userId, isAuthenticated = true) {
  currentUserId = userId || null;
  window.currentUserId = currentUserId;
  isUserAuthenticated = Boolean(userId && isAuthenticated);
  window.isUserAuthenticated = isUserAuthenticated;
  if (typeof localStorage !== 'undefined') {
    if (userId && isAuthenticated) {
      localStorage.setItem('comsan_user_id', userId);
      localStorage.setItem('comsan_user_auth', 'true');
    } else {
      localStorage.removeItem('comsan_user_id');
      localStorage.removeItem('comsan_user_auth');
    }
  }
}

function setSessionRole(role) {
  currentRole = role || null;
  window.currentRole = currentRole;
  if (typeof localStorage !== 'undefined') {
    if (role) localStorage.setItem('comsan_role', role);
    else localStorage.removeItem('comsan_role');
  }
}

function setSessionAdmin(auth) {
  isAdminAuthenticated = Boolean(auth);
  window.isAdminAuthenticated = Boolean(auth);
  if (typeof localStorage !== 'undefined') {
    if (auth) localStorage.setItem('comsan_admin_auth', 'true');
    else localStorage.removeItem('comsan_admin_auth');
  }
}

let activeUserTab = 'HOME'; // 'HOME' | 'VOTE' | 'RAISE' | 'CHAT' | 'PROFILE'
let activeUserToolSubTab = 'FILES'; // 'FILES' | 'STREAM' | 'NOTE' | 'CALENDAR' | 'PROJECTS' | 'SEATS' | 'RANDOM'
let activeAdminTab = 'DASHBOARD';
let parliamentMode = 'ATTENDANCE';
let summaryFilterMode = 'ALL';

let isUserSeatingCollapsed = false;
let isAdminSeatingCollapsed = false;

let isMemberDropdownOpen = false;
let activeChatPartner = 'ALL';
let adminSelectedChatPartner = 'ALL';

let pendingVoteChoices = {};
let seenOpenMotionIds = new Set((appState && appState.motions ? appState.motions : []).filter(m => m.isOpen).map(m => m.id));
let currentPopupMotionId = null;

let html5QrScanner = null;
let isScannerRunning = false;
let noteSyncTimeout = null;

let draftCustomOptions = [
  { id: 'OPT-1', label: '', image: null },
  { id: 'OPT-2', label: '', image: null }
];

let randomizerMode = 'WHEEL';
let randomizerSource = 'MEMBERS';
let selectedRolesForRandom = null;
let isSecretBiasOpen = false;
let randomPool = [];
let customRandomItems = [
  { id: 'C-1', label: 'รางวัลที่ 1', weight: 1, enabled: true },
  { id: 'C-2', label: 'รางวัลที่ 2', weight: 1, enabled: true },
  { id: 'C-3', label: 'ร้องเพลงหมอลำ 1 เพลง', weight: 1, enabled: true }
];

let localMediaStream = null;
let streamInterval = null;
let currentStreamMode = null;
let selectedCameraDeviceId = 'user';
let selectedStreamRes = 640;
let selectedStreamFps = 5;
let currentQrSizePx = 180;
let activeFullscreenSourceId = null;

// Expose on window for global modular access
window.ADMIN_PASSWORD = ADMIN_PASSWORD;
window.LOCAL_STORAGE_KEY = LOCAL_STORAGE_KEY;
window.WHEEL_COLORS = WHEEL_COLORS;
window.CUSTOM_PALETTE = CUSTOM_PALETTE;
window.defaultState = defaultState;
window.normalizeState = normalizeState;
window.mergeProjectsSafely = function (localProjects, incomingProjects) {
  const sampleProjectIds = new Set(['PRJ-2569-01', 'PRJ-2568-02', 'PRJ-2569-03']);
  let deletedProjectIds = new Set();
  try {
    const rawDel = typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_deleted_project_ids') : null;
    if (rawDel) {
      const parsedDel = JSON.parse(rawDel);
      if (Array.isArray(parsedDel)) deletedProjectIds = new Set(parsedDel);
    }
  } catch (e) {}

  const map = new Map();
  function processP(p) {
    if (!p || !p.id) return;
    const pid = String(p.id).trim();
    if (sampleProjectIds.has(pid) || deletedProjectIds.has(pid)) return;
    if (!map.has(pid)) {
      map.set(pid, { ...p });
    } else {
      const current = map.get(pid);
      const currentTime = new Date(current.updatedAt || current.createdAt || 0).getTime();
      const incomingTime = new Date(p.updatedAt || p.createdAt || 0).getTime();
      if (incomingTime >= currentTime) {
        map.set(pid, {
          ...current,
          ...p,
          photoFolderUrl: p.photoFolderUrl || current.photoFolderUrl || '',
          photoCatalog: (Array.isArray(p.photoCatalog) && p.photoCatalog.length > 0) ? p.photoCatalog : (current.photoCatalog || []),
          projectDocument: p.projectDocument || current.projectDocument,
          budgetDocument: p.budgetDocument || current.budgetDocument,
          departmentColorConfig: p.departmentColorConfig || current.departmentColorConfig || null
        });
      } else {
        map.set(pid, {
          ...p,
          ...current,
          photoFolderUrl: current.photoFolderUrl || p.photoFolderUrl || '',
          photoCatalog: (Array.isArray(current.photoCatalog) && current.photoCatalog.length > 0) ? current.photoCatalog : (p.photoCatalog || []),
          projectDocument: current.projectDocument || p.projectDocument,
          budgetDocument: current.budgetDocument || p.budgetDocument,
          departmentColorConfig: current.departmentColorConfig || p.departmentColorConfig || null
        });
      }
    }
  }
  if (Array.isArray(localProjects)) localProjects.forEach(processP);
  if (Array.isArray(incomingProjects)) incomingProjects.forEach(processP);
  return Array.from(map.values());
};
window.saveLocalState = saveLocalState;
window.emergencyResetCache = emergencyResetCache;

window.appState = appState;
window.getAppState = () => appState;
window.setAppState = (newState) => { appState = normalizeState(newState); window.appState = appState; };

window.currentRole = currentRole;
window.isAdminAuthenticated = isAdminAuthenticated;
window.isUserAuthenticated = isUserAuthenticated;
window.currentUserId = currentUserId;
window.isSidebarCollapsed = isSidebarCollapsed;
window.isMobileSidebarOpen = isMobileSidebarOpen;

window.setSessionUser = setSessionUser;
window.setSessionRole = setSessionRole;
window.setSessionAdmin = setSessionAdmin;

window.activeUserTab = activeUserTab;
window.activeUserToolSubTab = activeUserToolSubTab;
window.activeAdminTab = activeAdminTab;
window.parliamentMode = parliamentMode;
window.summaryFilterMode = summaryFilterMode;

window.isUserSeatingCollapsed = isUserSeatingCollapsed;
window.isAdminSeatingCollapsed = isAdminSeatingCollapsed;

window.isMemberDropdownOpen = isMemberDropdownOpen;
window.activeChatPartner = activeChatPartner;
window.adminSelectedChatPartner = adminSelectedChatPartner;

window.pendingVoteChoices = pendingVoteChoices;
window.seenOpenMotionIds = seenOpenMotionIds;
window.currentPopupMotionId = currentPopupMotionId;

window.html5QrScanner = html5QrScanner;
window.isScannerRunning = isScannerRunning;
window.noteSyncTimeout = noteSyncTimeout;

window.draftCustomOptions = draftCustomOptions;
window.randomizerMode = randomizerMode;
window.randomizerSource = randomizerSource;
window.selectedRolesForRandom = selectedRolesForRandom;
window.isSecretBiasOpen = isSecretBiasOpen;
window.randomPool = randomPool;
window.customRandomItems = customRandomItems;

window.localMediaStream = localMediaStream;
window.streamInterval = streamInterval;
window.currentStreamMode = currentStreamMode;
window.selectedCameraDeviceId = selectedCameraDeviceId;
window.selectedStreamRes = selectedStreamRes;
window.selectedStreamFps = selectedStreamFps;
window.currentQrSizePx = currentQrSizePx;
window.activeFullscreenSourceId = activeFullscreenSourceId;
