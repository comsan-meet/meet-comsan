/**
 * COMSAN Meeting System - Live Dashboard & Apple TV Style Remote Component
 */

window.isLiveDashboardOpen = false;
window.isLiveRemoteOpen = false;
window.liveDashboardClockTimer = null;
window.liveDashRandomActive = false;
window.liveDashRandomWinner = null;
window.liveRemoteMode = (typeof localStorage !== 'undefined' && localStorage.getItem('comsan_remote_mode')) || 'TOUCHPAD'; // 'TOUCHPAD' | 'DPAD'
window.liveDashFocusedIndex = 0;
window.liveDashFocusableElements = ['meetingHero', 'statCheckin', 'statOnTime', 'statLate', 'statLeave'];
window.liveDashCursorHideTimer = null;

// =========================================================================
// 1. LIVE DASHBOARD CORE
// =========================================================================

/**
 * Open Live Dashboard in Fullscreen mode
 */
function openLiveDashboard() {
  const container = document.getElementById('liveDashboardContainer');
  if (!container) return;

  container.classList.remove('hidden');
  container.classList.add('flex');
  window.isLiveDashboardOpen = true;

  // Request browser full-screen automatically
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  } catch (e) {}

  // Start real-time digital clock ticker
  startLiveDashboardClock();

  // Initial render
  renderLiveDashboard();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Close Live Dashboard and exit Fullscreen
 */
function closeLiveDashboard() {
  const container = document.getElementById('liveDashboardContainer');
  if (container) {
    container.classList.add('hidden');
    container.classList.remove('flex');
  }
  window.isLiveDashboardOpen = false;

  if (window.liveDashboardClockTimer) {
    clearInterval(window.liveDashboardClockTimer);
    window.liveDashboardClockTimer = null;
  }

  // Only exit fullscreen if container or document was in fullscreen
  if (document.fullscreenElement) {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch (e) {}
  }
}

/**
 * Start 1-second clock & date ticker
 */
function startLiveDashboardClock() {
  if (window.liveDashboardClockTimer) {
    clearInterval(window.liveDashboardClockTimer);
  }
  updateLiveDashboardClock();
  window.liveDashboardClockTimer = setInterval(updateLiveDashboardClock, 1000);
}

/**
 * Update the Clock & Date display
 */
function updateLiveDashboardClock() {
  const timeEl = document.getElementById('liveDashClockTime');
  const secEl = document.getElementById('liveDashClockSeconds');
  const dateEl = document.getElementById('liveDashClockDate');
  if (!timeEl && !dateEl) return;

  const now = new Date();
  const cfg = (window.appState && window.appState.liveDashboardConfig) ? window.appState.liveDashboardConfig : {};
  const is12H = cfg.clockFormat === '12H';

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  let period = '';

  if (is12H) {
    period = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12 || 12;
  }
  const hoursStr = String(hours).padStart(2, '0');

  if (timeEl) timeEl.textContent = `${hoursStr}:${minutes}`;
  if (secEl) secEl.textContent = `:${seconds}${period}`;

  if (dateEl) {
    try {
      const thaiDate = now.toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      dateEl.textContent = thaiDate;
    } catch (e) {
      dateEl.textContent = now.toDateString();
    }
  }
}

/**
 * Open Live Dashboard Settings Modal
 */
function openLiveDashboardSettingsModal() {
  const modal = document.getElementById('liveDashboardSettingsModal');
  if (!modal) return;

  const state = window.appState;
  const cfg = (state && state.liveDashboardConfig) ? state.liveDashboardConfig : {
    concurrencyMode: 'BOTH',
    showRaiseHandPopup: true,
    showPermissionPopup: true,
    showRandomizerPopup: true,
    theme: 'DARK',
    clockFormat: '24H'
  };

  const modeSelect = document.getElementById('liveDashCfgConcurrency');
  if (modeSelect) modeSelect.value = cfg.concurrencyMode || 'BOTH';

  const chkHand = document.getElementById('liveDashCfgRaiseHand');
  if (chkHand) chkHand.checked = cfg.showRaiseHandPopup !== false;

  const chkPerm = document.getElementById('liveDashCfgPermission');
  if (chkPerm) chkPerm.checked = cfg.showPermissionPopup !== false;

  const chkRand = document.getElementById('liveDashCfgRandomizer');
  if (chkRand) chkRand.checked = cfg.showRandomizerPopup !== false;

  const clockFmt = document.getElementById('liveDashCfgClockFormat');
  if (clockFmt) clockFmt.value = cfg.clockFormat || '24H';

  const themeSel = document.getElementById('liveDashCfgTheme');
  if (themeSel) themeSel.value = cfg.theme || 'DARK';

  const urlBox = document.getElementById('liveDashDirectUrlInput');
  if (urlBox) {
    const loc = window.location;
    urlBox.value = `${loc.origin}${loc.pathname}?live=1`;
  }

  const remoteUrlBox = document.getElementById('liveDashRemoteUrlInput');
  if (remoteUrlBox) {
    const loc = window.location;
    remoteUrlBox.value = `${loc.origin}${loc.pathname}?remote=1`;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Close Live Dashboard Settings Modal
 */
function closeLiveDashboardSettingsModal() {
  const modal = document.getElementById('liveDashboardSettingsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/**
 * Save Live Dashboard Settings
 */
function saveLiveDashboardSettings(e) {
  if (e && e.preventDefault) e.preventDefault();

  const concurrencyMode = document.getElementById('liveDashCfgConcurrency')?.value || 'BOTH';
  const showRaiseHandPopup = document.getElementById('liveDashCfgRaiseHand')?.checked ?? true;
  const showPermissionPopup = document.getElementById('liveDashCfgPermission')?.checked ?? true;
  const showRandomizerPopup = document.getElementById('liveDashCfgRandomizer')?.checked ?? true;
  const clockFormat = document.getElementById('liveDashCfgClockFormat')?.value || '24H';
  const theme = document.getElementById('liveDashCfgTheme')?.value || 'DARK';

  const newConfig = {
    concurrencyMode,
    showRaiseHandPopup,
    showPermissionPopup,
    showRandomizerPopup,
    clockFormat,
    theme
  };

  if (!window.appState) window.appState = {};
  window.appState.liveDashboardConfig = newConfig;

  if (typeof window.saveLocalState === 'function') {
    window.saveLocalState();
  }

  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:updateLiveDashboardConfig', newConfig);
  }

  closeLiveDashboardSettingsModal();
  if (typeof window.showToast === 'function') {
    window.showToast('บันทึกการตั้งค่า Live Dashboard เรียบร้อยแล้ว', 'success');
  }

  if (window.isLiveDashboardOpen) {
    renderLiveDashboard();
  }
}

/**
 * Copy Live Dashboard Direct URL
 */
function copyLiveDashboardDirectUrl() {
  const urlBox = document.getElementById('liveDashDirectUrlInput');
  const url = urlBox ? urlBox.value : `${window.location.origin}${window.location.pathname}?live=1`;

  navigator.clipboard.writeText(url).then(() => {
    if (typeof window.showToast === 'function') {
      window.showToast('คัดลอกลิงก์จอ Live Dashboard สำเร็จแล้ว', 'success');
    }
  }).catch(() => {
    if (urlBox) {
      urlBox.select();
      document.execCommand('copy');
      if (typeof window.showToast === 'function') {
        window.showToast('คัดลอกลิงก์จอ Live Dashboard สำเร็จแล้ว', 'success');
      }
    }
  });
}

/**
 * Copy Remote Direct URL
 */
function copyLiveRemoteDirectUrl() {
  const urlBox = document.getElementById('liveDashRemoteUrlInput');
  const url = urlBox ? urlBox.value : `${window.location.origin}${window.location.pathname}?remote=1`;

  navigator.clipboard.writeText(url).then(() => {
    if (typeof window.showToast === 'function') {
      window.showToast('คัดลอกลิงก์รีโมตควบคุมสำเร็จแล้ว นำไปเปิดบนมือถือได้ทันที', 'success');
    }
  }).catch(() => {
    if (urlBox) {
      urlBox.select();
      document.execCommand('copy');
      if (typeof window.showToast === 'function') {
        window.showToast('คัดลอกลิงก์รีโมตสำเร็จแล้ว', 'success');
      }
    }
  });
}

// =========================================================================
// 2. RENDER LIVE DASHBOARD (THEME & VIEWS)
// =========================================================================

/**
 * Main Render function for Live Dashboard
 */
function renderLiveDashboard() {
  const container = document.getElementById('liveDashboardContainer');
  if (!container || !window.isLiveDashboardOpen) return;

  const state = window.appState || {};
  const cfg = state.liveDashboardConfig || {
    concurrencyMode: 'BOTH',
    showRaiseHandPopup: true,
    showPermissionPopup: true,
    showRandomizerPopup: true,
    theme: 'DARK',
    clockFormat: '24H'
  };

  const isLight = cfg.theme === 'LIGHT';

  // Apply Theme Styling on Container
  if (isLight) {
    container.className = 'fixed inset-0 z-[9999] flex flex-col bg-slate-100 text-slate-900 select-none overflow-hidden font-sans';
  } else {
    container.className = 'fixed inset-0 z-[9999] flex flex-col bg-slate-950 text-white select-none overflow-hidden font-sans';
  }

  // Update Clock & Date
  updateLiveDashboardClock();

  // Header styling based on theme
  const header = document.getElementById('liveDashHeader');
  if (header) {
    header.className = isLight
      ? 'h-20 sm:h-24 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 sm:px-10 flex items-center justify-between z-30 shrink-0 shadow-xs'
      : 'h-20 sm:h-24 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 sm:px-10 flex items-center justify-between z-30 shrink-0';
  }

  // Clock text colors based on theme
  const timeEl = document.getElementById('liveDashClockTime');
  const secEl = document.getElementById('liveDashClockSeconds');
  const dateEl = document.getElementById('liveDashClockDate');
  if (timeEl) timeEl.className = isLight ? 'text-3xl sm:text-5xl font-black tracking-tight text-slate-900 font-mono' : 'text-3xl sm:text-5xl font-black tracking-tight text-white font-mono drop-shadow-sm';
  if (secEl) secEl.className = isLight ? 'text-lg sm:text-2xl font-bold text-indigo-600 font-mono' : 'text-lg sm:text-2xl font-bold text-indigo-400 font-mono';
  if (dateEl) dateEl.className = isLight ? 'text-xs sm:text-sm text-slate-500 font-semibold' : 'text-xs sm:text-sm text-slate-400 font-medium';

  // Identify active states
  const activeStream = (state.activeStream && state.activeStream.frameDataUrl) ? state.activeStream : null;
  const activeMotion = Array.isArray(state.motions) ? state.motions.find(m => m.isOpen) : null;
  const concurrencyMode = cfg.concurrencyMode || 'BOTH';

  // Render Stage
  renderLiveDashboardStage(state, activeStream, activeMotion, concurrencyMode, isLight);

  // Render Overlays
  renderLiveDashboardOverlays(state, cfg, isLight);

  // Update Smart TV Focus Ring
  updateLiveDashFocusRing();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Render Stage
 */
function renderLiveDashboardStage(state, activeStream, activeMotion, concurrencyMode, isLight) {
  const stage = document.getElementById('liveDashMainStage');
  if (!stage) return;

  const meeting = state.meeting || {};
  const users = Array.isArray(state.users) ? state.users : [];
  const checkedInUsers = users.filter(u => u.checkedIn && !u.isLeave);
  const onTimeUsers = checkedInUsers.filter(u => !u.isLate);
  const lateUsers = checkedInUsers.filter(u => u.isLate);
  const leaveUsers = users.filter(u => u.isLeave);
  const totalUsers = users.length || 1;
  const attendancePercent = Math.round((checkedInUsers.length / totalUsers) * 100);
  const isMeetingActive = Boolean(meeting.isStarted && !meeting.isEnded);

  const hasStream = Boolean(activeStream);
  const hasVote = Boolean(activeMotion);

  if (hasStream && hasVote) {
    if (concurrencyMode === 'STREAM') {
      stage.innerHTML = renderStreamStage(activeStream, true, activeMotion, isLight);
    } else if (concurrencyMode === 'VOTE') {
      stage.innerHTML = renderVotingStage(activeMotion, checkedInUsers, totalUsers, true, activeStream, isLight);
    } else {
      stage.innerHTML = renderSplitStage(activeStream, activeMotion, checkedInUsers, totalUsers, isLight);
    }
  } else if (hasStream) {
    stage.innerHTML = renderStreamStage(activeStream, false, null, isLight);
  } else if (hasVote) {
    stage.innerHTML = renderVotingStage(activeMotion, checkedInUsers, totalUsers, false, null, isLight);
  } else {
    stage.innerHTML = renderStandbyStage(meeting, checkedInUsers, onTimeUsers, lateUsers, leaveUsers, totalUsers, attendancePercent, isMeetingActive, isLight);
  }
}

/**
 * STANDBY / DEFAULT VIEW (Cleaned up: No red crossed items, perfectly fits viewport without white scrollbar)
 */
function renderStandbyStage(meeting, checkedInUsers, onTimeUsers, lateUsers, leaveUsers, totalUsers, attendancePercent, isMeetingActive, isLight) {
  const meetingTitle = meeting.title || 'การประชุมชมรมสันทนาการ (COMSAN)';
  const meetingLocation = meeting.location || (meeting.format === 'ONLINE' ? 'การประชุมออนไลน์' : 'ห้องประชุมชมรมคมสัน');
  const meetingDate = meeting.date || new Date().toISOString().slice(0, 10);
  const timeRange = `${meeting.startTime || '17:00'} - ${meeting.endTime || '19:00'} น.`;

  let formattedDate = meetingDate;
  try {
    formattedDate = new Date(meetingDate).toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {}

  const cardBg = isLight ? 'bg-white border-slate-200/90 text-slate-800 shadow-md' : 'bg-slate-900/80 border-slate-800/90 text-white shadow-xl';
  const subText = isLight ? 'text-slate-500' : 'text-slate-400';
  const titleColor = isLight ? 'text-slate-900' : 'text-white';

  return `
    <div class="flex-1 flex flex-col justify-between p-6 sm:p-12 max-w-7xl mx-auto w-full h-full min-h-0 overflow-hidden select-none">
      
      <!-- HERO MEETING INFO -->
      <div id="liveDashItem_meetingHero" class="space-y-4 my-auto transition-all duration-200 rounded-3xl p-4 sm:p-6">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${isMeetingActive ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'}">
            <span class="w-2.5 h-2.5 rounded-full ${isMeetingActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}"></span>
            <span>${isMeetingActive ? 'กำลังดำเนินการประชุม' : 'รอเปิดการประชุม'}</span>
          </span>
          <span class="px-4 py-1.5 rounded-full text-xs font-semibold ${isLight ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'} flex items-center gap-1.5">
            <i data-lucide="${meeting.format === 'ONLINE' ? 'video' : 'map-pin'}" class="w-3.5 h-3.5"></i>
            <span>${meetingLocation}</span>
          </span>
          <span class="px-4 py-1.5 rounded-full text-xs font-semibold ${isLight ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-slate-800/80 text-slate-300 border border-slate-700'} flex items-center gap-1.5">
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-500"></i>
            <span>${formattedDate} (${timeRange})</span>
          </span>
        </div>

        <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black ${titleColor} tracking-tight leading-tight">
          ${meetingTitle}
        </h1>
      </div>

      <!-- ATTENDANCE STATS (4 CARDS) -->
      <div class="mt-auto mb-2">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          
          <!-- Total Check-in -->
          <div id="liveDashItem_statCheckin" class="p-5 sm:p-6 rounded-3xl border ${cardBg} flex flex-col justify-between transition-all duration-200">
            <div class="flex items-center justify-between text-indigo-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>ยอดผู้เข้าประชุม</span>
              <i data-lucide="users" class="w-4 h-4"></i>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-5xl font-black ${titleColor}">${checkedInUsers.length}</span>
              <span class="${subText} text-sm sm:text-base font-semibold">/ ${totalUsers} คน</span>
            </div>
            <div class="w-full ${isLight ? 'bg-slate-200' : 'bg-slate-800'} rounded-full h-2.5 mt-3 overflow-hidden">
              <div class="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500" style="width: ${attendancePercent}%"></div>
            </div>
            <span class="text-xs text-emerald-500 font-bold mt-2">${attendancePercent}% เข้าร่วมแล้ว</span>
          </div>

          <!-- On Time -->
          <div id="liveDashItem_statOnTime" class="p-5 sm:p-6 rounded-3xl border ${cardBg} flex flex-col justify-between transition-all duration-200">
            <div class="flex items-center justify-between text-emerald-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>ตรงเวลา</span>
              <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-5xl font-black ${titleColor}">${onTimeUsers.length}</span>
              <span class="${subText} text-sm sm:text-base font-semibold">คน</span>
            </div>
            <span class="text-xs ${subText} mt-4 font-medium">เข้าประชุมก่อนเวลาสาย</span>
          </div>

          <!-- Late -->
          <div id="liveDashItem_statLate" class="p-5 sm:p-6 rounded-3xl border ${cardBg} flex flex-col justify-between transition-all duration-200">
            <div class="flex items-center justify-between text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>มาสาย</span>
              <i data-lucide="clock" class="w-4 h-4"></i>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-5xl font-black ${titleColor}">${lateUsers.length}</span>
              <span class="${subText} text-sm sm:text-base font-semibold">คน</span>
            </div>
            <span class="text-xs ${subText} mt-4 font-medium">เช็คชื่อหลังเวลาที่กำหนด</span>
          </div>

          <!-- Leave -->
          <div id="liveDashItem_statLeave" class="p-5 sm:p-6 rounded-3xl border ${cardBg} flex flex-col justify-between transition-all duration-200">
            <div class="flex items-center justify-between text-sky-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>แจ้งลา</span>
              <i data-lucide="user-x" class="w-4 h-4"></i>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-5xl font-black ${titleColor}">${leaveUsers.length}</span>
              <span class="${subText} text-sm sm:text-base font-semibold">คน</span>
            </div>
            <span class="text-xs ${subText} mt-4 font-medium">ลาติดภารกิจ/ป่วย</span>
          </div>

        </div>
      </div>

    </div>
  `;
}

/**
 * STREAM STAGE
 */
function renderStreamStage(activeStream, hasConcurrentVote, concurrentMotion, isLight) {
  return `
    <div class="flex-1 flex flex-col p-4 sm:p-8 w-full h-full min-h-0 relative overflow-hidden">
      <div class="relative flex-1 bg-black rounded-3xl overflow-hidden border ${isLight ? 'border-slate-300 shadow-xl' : 'border-slate-800 shadow-2xl'} flex items-center justify-center">
        <img id="liveDashStreamViewerImg" src="${activeStream.frameDataUrl || ''}" alt="Live Stream" class="w-full h-full object-contain" />

        <div class="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/80 text-white shadow-lg">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span class="text-xs font-bold tracking-wide">${activeStream.mode === 'SCREEN' ? '🖥️ แชร์หน้าจอสด' : '📹 กล้องถ่ายทอดสด'}</span>
          <span class="text-slate-400 text-xs">•</span>
          <span class="text-xs font-medium text-slate-300">${activeStream.streamerName || 'ผู้ดำเนินการ'}</span>
        </div>

        ${hasConcurrentVote && concurrentMotion ? `
          <div class="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md p-4 rounded-2xl border border-indigo-500/40 text-white shadow-xl max-w-sm">
            <div class="flex items-center gap-2 mb-1.5 text-indigo-400 font-bold text-xs">
              <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>กำลังเปิดการลงมติ: ${concurrentMotion.title}</span>
            </div>
            <div class="text-xs text-slate-300">
              มีผู้ลงมติแล้ว ${Object.keys(concurrentMotion.votes || {}).length} คน
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * VOTING STAGE
 */
function renderVotingStage(motion, checkedInUsers, totalUsers, hasConcurrentStream, concurrentStream, isLight) {
  const votes = motion.votes || {};
  const totalVotesCast = Object.keys(votes).length;
  const eligibleVoters = checkedInUsers.length || totalUsers || 1;
  const turnOutPercent = Math.min(100, Math.round((totalVotesCast / eligibleVoters) * 100));

  const options = motion.options || [
    { id: 'APPROVE', label: 'เห็นชอบ' },
    { id: 'REJECT', label: 'ไม่เห็นชอบ' },
    { id: 'ABSTAIN', label: 'งดออกเสียง' }
  ];

  const counts = {};
  options.forEach(o => { counts[o.id] = 0; });
  Object.values(votes).forEach(choice => {
    if (counts[choice] !== undefined) counts[choice]++;
  });

  const optionColors = {
    'APPROVE': { bar: 'bg-emerald-500', text: 'text-emerald-500' },
    'REJECT': { bar: 'bg-rose-500', text: 'text-rose-500' },
    'ABSTAIN': { bar: 'bg-slate-400', text: 'text-slate-400' }
  };

  const cardBg = isLight ? 'bg-white border-slate-200 text-slate-800 shadow-md' : 'bg-slate-900/80 border-slate-800/80 text-white shadow-md';
  const titleColor = isLight ? 'text-slate-900' : 'text-white';

  const optionBars = options.map((opt, idx) => {
    const c = counts[opt.id] || 0;
    const pct = totalVotesCast > 0 ? Math.round((c / totalVotesCast) * 100) : 0;
    const col = optionColors[opt.id] || { bar: 'bg-indigo-500', text: 'text-indigo-500' };

    return `
      <div class="p-4 sm:p-5 rounded-2xl border ${cardBg} space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-xl ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'} font-bold text-sm flex items-center justify-center shrink-0">
              #${idx + 1}
            </span>
            <span class="text-base sm:text-xl font-bold ${titleColor}">${opt.label}</span>
          </div>
          <div class="text-right">
            <span class="text-2xl sm:text-3xl font-black ${col.text}">${c}</span>
            <span class="text-xs text-slate-400 font-semibold ml-1">คะแนน (${pct}%)</span>
          </div>
        </div>
        <div class="w-full ${isLight ? 'bg-slate-100' : 'bg-slate-800'} rounded-full h-3 overflow-hidden">
          <div class="${col.bar} h-3 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="flex-1 flex flex-col p-6 sm:p-10 max-w-7xl mx-auto w-full h-full min-h-0 overflow-hidden select-none">
      
      <!-- Motion Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/30 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <span>กำลังเปิดให้ลงมติ</span>
            </span>
            ${motion.isSecret ? '<span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-500 border border-purple-500/30">🔒 โหวตลับ</span>' : ''}
          </div>
          <h1 class="text-2xl sm:text-4xl font-black ${titleColor} tracking-tight">${motion.title}</h1>
        </div>

        <div class="${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-800 text-white'} border p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-lg">
          <div class="text-right">
            <div class="text-xs text-slate-400 font-semibold uppercase">ใช้สิทธิ์แล้ว</div>
            <div class="text-2xl sm:text-3xl font-black text-emerald-500">${totalVotesCast} <span class="text-sm text-slate-400">/ ${eligibleVoters} คน</span></div>
          </div>
          <div class="w-12 h-12 rounded-full border-4 ${isLight ? 'border-slate-200' : 'border-slate-800'} border-t-emerald-500 flex items-center justify-center font-bold text-xs ${titleColor}">
            ${turnOutPercent}%
          </div>
        </div>
      </div>

      <!-- Voting Options Breakdown -->
      <div class="my-6 space-y-4 flex-1 overflow-y-auto no-scrollbar">
        ${optionBars}
      </div>

      <!-- PIP Stream if active -->
      ${hasConcurrentStream && concurrentStream ? `
        <div class="fixed bottom-6 right-6 w-64 h-36 bg-black rounded-2xl border-2 border-indigo-500 shadow-2xl overflow-hidden z-20">
          <img id="liveDashStreamViewerImg" src="${concurrentStream.frameDataUrl || ''}" class="w-full h-full object-cover" />
          <div class="absolute bottom-1 left-2 text-[10px] font-bold text-white bg-slate-950/80 px-2 py-0.5 rounded-full">
            📹 สตรีมสด
          </div>
        </div>
      ` : ''}

    </div>
  `;
}

/**
 * SPLIT SCREEN STAGE
 */
function renderSplitStage(activeStream, motion, checkedInUsers, totalUsers, isLight) {
  const votes = motion.votes || {};
  const totalVotesCast = Object.keys(votes).length;
  const eligibleVoters = checkedInUsers.length || totalUsers || 1;

  const options = motion.options || [
    { id: 'APPROVE', label: 'เห็นชอบ' },
    { id: 'REJECT', label: 'ไม่เห็นชอบ' },
    { id: 'ABSTAIN', label: 'งดออกเสียง' }
  ];

  const counts = {};
  options.forEach(o => { counts[o.id] = 0; });
  Object.values(votes).forEach(choice => {
    if (counts[choice] !== undefined) counts[choice]++;
  });

  const optionBars = options.map(opt => {
    const c = counts[opt.id] || 0;
    const pct = totalVotesCast > 0 ? Math.round((c / totalVotesCast) * 100) : 0;
    return `
      <div class="p-3 rounded-xl ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'} border space-y-1.5">
        <div class="flex justify-between text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}">
          <span>${opt.label}</span>
          <span class="text-indigo-500">${c} (${pct}%)</span>
        </div>
        <div class="w-full ${isLight ? 'bg-slate-200' : 'bg-slate-800'} rounded-full h-2 overflow-hidden">
          <div class="bg-indigo-500 h-2 rounded-full" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="flex-1 flex flex-col lg:flex-row p-4 sm:p-6 gap-4 w-full h-full min-h-0 overflow-hidden select-none">
      <div class="flex-1 bg-black rounded-3xl overflow-hidden border ${isLight ? 'border-slate-300' : 'border-slate-800'} shadow-2xl relative flex items-center justify-center min-h-[300px]">
        <img id="liveDashStreamViewerImg" src="${activeStream.frameDataUrl || ''}" alt="Live Stream" class="w-full h-full object-contain" />
        <div class="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-2 border border-slate-700">
          <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>${activeStream.streamerName || 'ถ่ายทอดสด'}</span>
        </div>
      </div>

      <div class="w-full lg:w-[420px] ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-800 text-white'} border rounded-3xl p-5 flex flex-col justify-between shadow-2xl overflow-y-auto no-scrollbar">
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block">การลงมติสด</span>
              <h2 class="text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}">${motion.title}</h2>
            </div>
            <div class="text-right">
              <span class="text-xl font-black text-emerald-500">${totalVotesCast}</span>
              <span class="text-slate-400 text-xs">/ ${eligibleVoters}</span>
            </div>
          </div>

          <div class="space-y-2.5">
            ${optionBars}
          </div>
        </div>

        <div class="pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'} text-[11px] text-slate-400 text-center">
          ● ข้อมูลคะแนนโหวตอัปเดตแบบเรียลไทม์
        </div>
      </div>
    </div>
  `;
}

/**
 * OVERLAYS (Raise Hand, Permission, Randomizer)
 */
function renderLiveDashboardOverlays(state, cfg, isLight) {
  // 1. Raise Hand Overlay
  const handOverlay = document.getElementById('liveDashRaiseHandOverlay');
  const handQueue = Array.isArray(state.raiseHandQueue) ? state.raiseHandQueue : [];
  if (handOverlay) {
    if (cfg.showRaiseHandPopup !== false && handQueue.length > 0) {
      handOverlay.classList.remove('hidden');
      handOverlay.innerHTML = `
        <div class="bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 text-slate-950 px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-white/20 flex items-center justify-between gap-4 animate-bounce-subtle">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-white text-slate-950 font-black text-xl flex items-center justify-center shrink-0 shadow-md">
              ✋
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black uppercase tracking-wider bg-slate-950 text-white px-2 py-0.5 rounded-md">ยกมือถาม</span>
                <span class="text-xs font-bold text-slate-900">${handQueue.length} คน</span>
              </div>
              <div class="text-base font-black truncate text-slate-950">
                ${handQueue.map((q, idx) => `#${idx + 1} ${q.nickname || q.fullName}`).join(', ')}
              </div>
            </div>
          </div>
          <button type="button" onclick="dismissLiveRaiseHand()" class="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition shrink-0 cursor-pointer">
            ปิด
          </button>
        </div>
      `;
    } else {
      handOverlay.classList.add('hidden');
      handOverlay.innerHTML = '';
    }
  }

  // 2. Permission Requests Overlay
  const permOverlay = document.getElementById('liveDashPermissionOverlay');
  const pendingUsers = (Array.isArray(state.users) ? state.users : []).filter(u => u.streamPermission === 'PENDING' || u.filePermission === 'PENDING');
  if (permOverlay) {
    if (cfg.showPermissionPopup !== false && pendingUsers.length > 0) {
      permOverlay.classList.remove('hidden');
      permOverlay.innerHTML = `
        <div class="${isLight ? 'bg-white border-indigo-200 text-slate-900' : 'bg-slate-900/95 border-indigo-500/50 text-white'} border px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-sm shrink-0">
            🔔
          </div>
          <div class="text-xs min-w-0">
            <span class="font-bold text-indigo-500 block">คำขอใช้สิทธิ์ใหม่ (${pendingUsers.length})</span>
            <span class="${isLight ? 'text-slate-600' : 'text-slate-300'} truncate block">
              ${pendingUsers.map(u => `${u.nickname} (${u.streamPermission === 'PENDING' ? 'กล้อง/หน้าจอ' : 'ดรอปไฟล์'})`).join(', ')}
            </span>
          </div>
        </div>
      `;
    } else {
      permOverlay.classList.add('hidden');
      permOverlay.innerHTML = '';
    }
  }

  // 3. Randomizer Overlay (Persists with prominent CLOSE button)
  const randOverlay = document.getElementById('liveDashRandomizerOverlay');
  if (randOverlay) {
    const isRandomActive = window.liveDashRandomActive || (state.randomizer && state.randomizer.activePopup);
    const winnerLabel = window.liveDashRandomWinner || (state.randomizer && state.randomizer.lastWinner ? state.randomizer.lastWinner.winnerLabel : null);

    if (cfg.showRandomizerPopup !== false && isRandomActive && winnerLabel) {
      randOverlay.classList.remove('hidden');
      randOverlay.classList.add('flex');
      randOverlay.innerHTML = `
        <div class="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border-2 border-amber-400 p-8 sm:p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center relative overflow-hidden animate-zoom-in">
          <div class="text-5xl sm:text-6xl mb-4 animate-bounce">
            🎉
          </div>
          <span class="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase tracking-widest inline-block mb-3">
            ✨ ผลการสุ่มเลือกผู้โชคดี ✨
          </span>
          <h2 class="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 mb-6 tracking-tight drop-shadow-md">
            ${winnerLabel}
          </h2>
          <button type="button" onclick="closeLiveRandomPopup()" class="px-6 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition shadow-lg active:scale-95 cursor-pointer inline-flex items-center gap-2">
            <i data-lucide="x" class="w-4 h-4"></i>
            <span>ปิดหน้าต่างการสุ่ม</span>
          </button>
        </div>
      `;
    } else if (!isRandomActive) {
      randOverlay.classList.add('hidden');
      randOverlay.classList.remove('flex');
      randOverlay.innerHTML = '';
    }
  }
}

/**
 * Handle fast stream frame updates
 */
function updateLiveDashboardStreamFrame(frameDataUrl) {
  if (!window.isLiveDashboardOpen || !frameDataUrl) return;
  const img = document.getElementById('liveDashStreamViewerImg');
  if (img) {
    img.src = frameDataUrl;
  }
}

/**
 * Close Live Random Popup
 */
function closeLiveRandomPopup() {
  window.liveDashRandomActive = false;
  window.liveDashRandomWinner = null;

  if (window.appState?.randomizer) {
    window.appState.randomizer.activePopup = false;
  }

  const randOverlay = document.getElementById('liveDashRandomizerOverlay');
  if (randOverlay) {
    randOverlay.classList.add('hidden');
    randOverlay.classList.remove('flex');
    randOverlay.innerHTML = '';
  }

  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:closeRandomPopup');
  }
}

/**
 * Dismiss Live Raise Hand from Live Dashboard
 */
function dismissLiveRaiseHand() {
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:clearQueue');
  }
  if (window.appState) {
    window.appState.raiseHandQueue = [];
    renderLiveDashboard();
  }
}

// =========================================================================
// 3. APPLE TV STYLE LIVE REMOTE CONTROL
// =========================================================================

/**
 * Open Apple TV style Remote
 */
function openLiveRemote() {
  const container = document.getElementById('liveRemoteContainer');
  if (!container) return;

  container.classList.remove('hidden');
  container.classList.add('flex');
  window.isLiveRemoteOpen = true;

  // Request fullscreen automatically
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  } catch (e) {}

  renderLiveRemoteUI();
}

/**
 * Close Apple TV style Remote
 */
function closeLiveRemote() {
  const container = document.getElementById('liveRemoteContainer');
  if (container) {
    container.classList.add('hidden');
    container.classList.remove('flex');
  }
  window.isLiveRemoteOpen = false;

  if (document.fullscreenElement) {
    try {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  }
}

/**
 * Switch Remote Mode (TOUCHPAD vs DPAD)
 */
function setLiveRemoteMode(mode) {
  window.liveRemoteMode = mode;
  try {
    localStorage.setItem('comsan_remote_mode', mode);
  } catch (e) {}
  renderLiveRemoteUI();
}

/**
 * Render Apple TV style Remote UI
 */
function renderLiveRemoteUI() {
  const body = document.getElementById('liveRemoteBody');
  if (!body) return;

  const isTouchpad = window.liveRemoteMode === 'TOUCHPAD';

  body.innerHTML = `
    <!-- Remote Enclosure -->
    <div class="w-full max-w-[340px] bg-zinc-900 border border-zinc-700/60 rounded-[44px] shadow-2xl p-5 flex flex-col justify-between select-none relative overflow-hidden backdrop-blur-xl h-[92vh] max-h-[700px]">
      
      <!-- Top Remote Header -->
      <div class="flex items-center justify-between pb-3 shrink-0">
        <!-- Mute Button -->
        <button type="button" onclick="sendRemoteAction('MUTE')" class="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 flex items-center justify-center transition shadow-md cursor-pointer" title="ปิด/เปิดเสียง">
          <i data-lucide="volume-x" class="w-4 h-4"></i>
        </button>

        <!-- Room Indicator Dropdown Pill -->
        <div class="px-3.5 py-1.5 rounded-full bg-zinc-800/90 border border-zinc-700/80 text-white font-bold text-xs flex items-center gap-1.5 shadow-inner">
          <i data-lucide="tv" class="w-3.5 h-3.5 text-indigo-400"></i>
          <span>Live Dashboard</span>
          <i data-lucide="chevron-right" class="w-3 h-3 text-zinc-400"></i>
        </div>

        <!-- Power Button (Closes Remote / Fullscreen) -->
        <button type="button" onclick="closeLiveRemote()" class="w-10 h-10 rounded-full bg-zinc-800 hover:bg-rose-600 text-zinc-300 hover:text-white active:scale-95 flex items-center justify-center transition shadow-md cursor-pointer" title="ปิดรีโมต">
          <i data-lucide="power" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Mode Switcher Pill (Touchpad vs D-Pad) -->
      <div class="grid grid-cols-2 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 shrink-0 my-1">
        <button type="button" onclick="setLiveRemoteMode('TOUCHPAD')" class="py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${isTouchpad ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'}">
          <i data-lucide="mouse-pointer" class="w-3.5 h-3.5"></i>
          <span>Touchpad</span>
        </button>
        <button type="button" onclick="setLiveRemoteMode('DPAD')" class="py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${!isTouchpad ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'}">
          <i data-lucide="disc" class="w-3.5 h-3.5"></i>
          <span>ปุ่ม Smart TV</span>
        </button>
      </div>

      <!-- Main Interactive Controller Area -->
      <div class="flex-1 flex items-center justify-center my-3 min-h-0">
        ${isTouchpad ? renderRemoteTouchpadHTML() : renderRemoteDpadHTML()}
      </div>

      <!-- Bottom Remote Controls (Apple TV style) -->
      <div class="space-y-4 shrink-0 pt-2 border-t border-zinc-800/80">
        
        <!-- Secondary Mini Action Row -->
        <div class="flex items-center justify-around px-2 text-zinc-400">
          <button type="button" onclick="sendRemoteAction('BACK_10')" class="p-2 hover:text-white active:scale-90 transition cursor-pointer" title="ย้อนหลัง">
            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
          </button>
          <button type="button" onclick="sendRemoteAction('INFO')" class="p-2 hover:text-white active:scale-90 transition cursor-pointer" title="ข้อมูล">
            <i data-lucide="info" class="w-4 h-4"></i>
          </button>
          <button type="button" onclick="sendRemoteAction('TOGGLE_VIEW')" class="p-2 hover:text-white active:scale-90 transition cursor-pointer" title="สลับมุมมอง">
            <i data-lucide="layout-grid" class="w-4 h-4"></i>
          </button>
          <button type="button" onclick="sendRemoteAction('FORWARD_10')" class="p-2 hover:text-white active:scale-90 transition cursor-pointer" title="ไปข้างหน้า">
            <i data-lucide="rotate-cw" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Primary 3 Big Circular Buttons -->
        <div class="flex items-center justify-between px-2">
          <!-- Back Button -->
          <button type="button" onclick="sendRemoteAction('BACK')" class="w-14 h-14 rounded-full bg-zinc-800 active:bg-zinc-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer" title="ย้อนกลับ">
            <i data-lucide="chevron-left" class="w-6 h-6"></i>
          </button>

          <!-- Play/Pause Button -->
          <button type="button" onclick="sendRemoteAction('PLAY_PAUSE')" class="w-14 h-14 rounded-full bg-zinc-800 active:bg-zinc-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer" title="เล่น / หยุด">
            <i data-lucide="play" class="w-5 h-5"></i>
          </button>

          <!-- TV / Dashboard View Button -->
          <button type="button" onclick="sendRemoteAction('CYCLE_VIEW')" class="w-14 h-14 rounded-full bg-zinc-800 active:bg-zinc-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer" title="สลับหน้าจอใหญ่">
            <i data-lucide="tv" class="w-5 h-5"></i>
          </button>
        </div>

      </div>

    </div>
  `;

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  if (isTouchpad) {
    bindTouchpadEvents();
  }
}

/**
 * Render Touchpad HTML
 */
function renderRemoteTouchpadHTML() {
  return `
    <div id="liveRemoteTouchArea" class="w-full h-full max-h-[280px] bg-gradient-to-b from-zinc-800/90 to-zinc-900 border border-zinc-700/80 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center text-zinc-500 shadow-inner touch-none cursor-crosshair active:border-indigo-500 transition">
      <div class="w-12 h-12 rounded-full border border-zinc-700/60 flex items-center justify-center mb-2 pointer-events-none">
        <i data-lucide="hand" class="w-5 h-5 text-zinc-400"></i>
      </div>
      <span class="text-xs font-bold text-zinc-400 pointer-events-none">เลื่อนเพื่อควบคุมเคอร์เซอร์</span>
      <span class="text-[10px] text-zinc-500 mt-0.5 pointer-events-none">แตะเพื่อคลิกเลือก</span>
      
      <!-- Visual cursor tracker dot -->
      <div id="remoteTouchpadDot" class="w-6 h-6 rounded-full bg-indigo-500/80 shadow-lg pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2"></div>
    </div>
  `;
}

/**
 * Render D-Pad HTML (Smart TV style directional controller)
 */
function renderRemoteDpadHTML() {
  return `
    <div class="w-64 h-64 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-zinc-700/80 relative shadow-2xl flex items-center justify-center">
      
      <!-- UP -->
      <button type="button" onclick="sendRemoteDpad('UP')" class="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-12 rounded-t-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer">
        <i data-lucide="chevron-up" class="w-6 h-6"></i>
      </button>

      <!-- DOWN -->
      <button type="button" onclick="sendRemoteDpad('DOWN')" class="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-12 rounded-b-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer">
        <i data-lucide="chevron-down" class="w-6 h-6"></i>
      </button>

      <!-- LEFT -->
      <button type="button" onclick="sendRemoteDpad('LEFT')" class="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-16 rounded-l-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer">
        <i data-lucide="chevron-left" class="w-6 h-6"></i>
      </button>

      <!-- RIGHT -->
      <button type="button" onclick="sendRemoteDpad('RIGHT')" class="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-16 rounded-r-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer">
        <i data-lucide="chevron-right" class="w-6 h-6"></i>
      </button>

      <!-- CENTER SELECT BUTTON -->
      <button type="button" onclick="sendRemoteDpad('SELECT')" class="w-24 h-24 rounded-full bg-zinc-700/90 active:bg-zinc-600 border border-zinc-600 shadow-inner flex items-center justify-center text-white font-black text-sm active:scale-95 transition cursor-pointer">
        <span>OK</span>
      </button>

    </div>
  `;
}

/**
 * Bind touch & drag events for remote touchpad
 */
function bindTouchpadEvents() {
  const pad = document.getElementById('liveRemoteTouchArea');
  const dot = document.getElementById('remoteTouchpadDot');
  if (!pad) return;

  let isTouching = false;

  function handleMove(clientX, clientY) {
    const rect = pad.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const xPercent = Math.round((x / rect.width) * 100);
    const yPercent = Math.round((y / rect.height) * 100);

    if (dot) {
      dot.classList.remove('hidden');
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
    }

    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('remote:cursorMove', { x: xPercent, y: yPercent });
    }
  }

  pad.addEventListener('touchstart', (e) => {
    isTouching = true;
    const t = e.touches[0];
    if (t) handleMove(t.clientX, t.clientY);
  }, { passive: true });

  pad.addEventListener('touchmove', (e) => {
    if (!isTouching) return;
    const t = e.touches[0];
    if (t) handleMove(t.clientX, t.clientY);
  }, { passive: true });

  pad.addEventListener('touchend', (e) => {
    isTouching = false;
    if (dot) dot.classList.add('hidden');
    // Tap click
    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('remote:click');
    }
  });

  pad.addEventListener('mousedown', (e) => {
    isTouching = true;
    handleMove(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isTouching || !window.isLiveRemoteOpen) return;
    handleMove(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', () => {
    if (isTouching) {
      isTouching = false;
      if (dot) dot.classList.add('hidden');
      if (window.socket && typeof window.socket.emit === 'function') {
        window.socket.emit('remote:click');
      }
    }
  });
}

/**
 * Send D-pad direction to socket
 */
function sendRemoteDpad(direction) {
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('remote:dpad', direction);
  }
  // Local vibration feedback if supported
  if (navigator.vibrate) {
    navigator.vibrate(20);
  }
}

/**
 * Send action from remote
 */
function sendRemoteAction(action) {
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('remote:action', { action });
  }
  if (navigator.vibrate) {
    navigator.vibrate(30);
  }
}

// =========================================================================
// 4. REMOTE RECEIVER ON LIVE DASHBOARD
// =========================================================================

/**
 * Initialize Remote Receiver Listeners on Live Dashboard
 */
function initLiveRemoteReceivers() {
  if (!window.socket) return;

  // 1. Cursor Movement
  window.socket.on('liveDashboard:cursorMove', (coords) => {
    if (!window.isLiveDashboardOpen || !coords) return;
    const cursor = document.getElementById('liveDashRemoteCursor');
    if (!cursor) return;

    cursor.classList.remove('hidden');
    cursor.style.left = `${coords.x}%`;
    cursor.style.top = `${coords.y}%`;

    if (window.liveDashCursorHideTimer) clearTimeout(window.liveDashCursorHideTimer);
    window.liveDashCursorHideTimer = setTimeout(() => {
      cursor.classList.add('hidden');
    }, 3000);
  });

  // 2. Cursor Click
  window.socket.on('liveDashboard:click', () => {
    if (!window.isLiveDashboardOpen) return;
    const cursor = document.getElementById('liveDashRemoteCursor');
    if (cursor) {
      cursor.classList.add('scale-150');
      setTimeout(() => cursor.classList.remove('scale-150'), 200);
    }
  });

  // 3. D-Pad Navigation (Smart TV Focus Box)
  window.socket.on('liveDashboard:dpad', (direction) => {
    if (!window.isLiveDashboardOpen) return;

    const list = window.liveDashFocusableElements || [];
    let cur = window.liveDashFocusedIndex || 0;

    if (direction === 'DOWN' || direction === 'RIGHT') {
      cur = (cur + 1) % list.length;
    } else if (direction === 'UP' || direction === 'LEFT') {
      cur = (cur - 1 + list.length) % list.length;
    } else if (direction === 'SELECT') {
      // Trigger select action on focused element
      const focusedId = list[cur];
      if (focusedId === 'statCheckin') {
        if (typeof showToast === 'function') showToast('สถิติผู้เข้าประชุม', 'info');
      }
    }

    window.liveDashFocusedIndex = cur;
    updateLiveDashFocusRing();
  });

  // 4. Remote Actions
  window.socket.on('liveDashboard:action', (payload) => {
    if (!window.isLiveDashboardOpen || !payload) return;
    const act = payload.action;

    if (act === 'BACK') {
      closeLiveRandomPopup();
      dismissLiveRaiseHand();
    } else if (act === 'CYCLE_VIEW') {
      const cfg = window.appState?.liveDashboardConfig || {};
      const modes = ['BOTH', 'STREAM', 'VOTE'];
      const nextIdx = (modes.indexOf(cfg.concurrencyMode || 'BOTH') + 1) % modes.length;
      cfg.concurrencyMode = modes[nextIdx];
      renderLiveDashboard();
      if (typeof showToast === 'function') showToast(`สลับโหมด: ${cfg.concurrencyMode}`, 'info');
    }
  });
}

/**
 * Highlight focused element with Smart TV focus ring
 */
function updateLiveDashFocusRing() {
  const list = window.liveDashFocusableElements || [];
  const cur = window.liveDashFocusedIndex || 0;

  list.forEach((id, idx) => {
    const el = document.getElementById(`liveDashItem_${id}`);
    if (el) {
      if (idx === cur) {
        el.classList.add('ring-4', 'ring-indigo-500', 'scale-[1.02]', 'shadow-2xl');
      } else {
        el.classList.remove('ring-4', 'ring-indigo-500', 'scale-[1.02]', 'shadow-2xl');
      }
    }
  });
}

// Global attachments
window.openLiveDashboard = openLiveDashboard;
window.closeLiveDashboard = closeLiveDashboard;
window.startLiveDashboardClock = startLiveDashboardClock;
window.updateLiveDashboardClock = updateLiveDashboardClock;
window.openLiveDashboardSettingsModal = openLiveDashboardSettingsModal;
window.closeLiveDashboardSettingsModal = closeLiveDashboardSettingsModal;
window.saveLiveDashboardSettings = saveLiveDashboardSettings;
window.copyLiveDashboardDirectUrl = copyLiveDashboardDirectUrl;
window.copyLiveRemoteDirectUrl = copyLiveRemoteDirectUrl;
window.renderLiveDashboard = renderLiveDashboard;
window.updateLiveDashboardStreamFrame = updateLiveDashboardStreamFrame;
window.closeLiveRandomPopup = closeLiveRandomPopup;
window.dismissLiveRaiseHand = dismissLiveRaiseHand;

window.openLiveRemote = openLiveRemote;
window.closeLiveRemote = closeLiveRemote;
window.setLiveRemoteMode = setLiveRemoteMode;
window.sendRemoteDpad = sendRemoteDpad;
window.sendRemoteAction = sendRemoteAction;
window.initLiveRemoteReceivers = initLiveRemoteReceivers;

// Initialize receivers when script loads
if (typeof window !== 'undefined') {
  setTimeout(initLiveRemoteReceivers, 500);
}
