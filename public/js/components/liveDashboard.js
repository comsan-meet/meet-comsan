/**
 * COMSAN Meeting System - Live Dashboard Component (Big Screen / TV / Projector Display)
 */

window.isLiveDashboardOpen = false;
window.liveDashboardClockTimer = null;
window.liveDashRandomActive = false;
window.liveDashRandomWinner = null;
window.liveDashRandomMode = 'WHEEL';

/**
 * Open Live Dashboard in Fullscreen mode
 */
function openLiveDashboard(forceOpen) {
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

  // If icons available, refresh icons
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
 * Toggle Fullscreen state of browser
 */
function toggleLiveDashboardFullscreen() {
  if (!document.fullscreenElement) {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    } catch (e) {}
  } else {
    try {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
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

  // Populate form
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

  // Live direct URL preview
  const urlBox = document.getElementById('liveDashDirectUrlInput');
  if (urlBox) {
    const loc = window.location;
    urlBox.value = `${loc.origin}${loc.pathname}?live=1`;
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

  // Persist locally
  if (typeof window.saveLocalState === 'function') {
    window.saveLocalState();
  }

  // Broadcast to all clients / Live Dashboard devices via Socket
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:updateLiveDashboardConfig', newConfig);
  }

  closeLiveDashboardSettingsModal();
  if (typeof window.showToast === 'function') {
    window.showToast('บันทึกการตั้งค่า Live Dashboard และซิงก์ทุกจอเรียบร้อยแล้ว', 'success');
  }

  if (window.isLiveDashboardOpen) {
    renderLiveDashboard();
  }
}

/**
 * Copy Live Dashboard Direct URL to Clipboard
 */
function copyLiveDashboardDirectUrl() {
  const urlBox = document.getElementById('liveDashDirectUrlInput');
  const url = urlBox ? urlBox.value : `${window.location.origin}${window.location.pathname}?live=1`;

  navigator.clipboard.writeText(url).then(() => {
    if (typeof window.showToast === 'function') {
      window.showToast('คัดลอกลิงก์จอ Live Dashboard สำเร็จแล้ว สามารถนำไปเปิดบน Smart TV ได้ทันที', 'success');
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
 * Render Live Dashboard Stage and Overlays
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

  // Apply theme class
  if (cfg.theme === 'LIGHT') {
    container.classList.remove('dark');
    container.setAttribute('data-theme', 'light');
  } else {
    container.classList.add('dark');
    container.setAttribute('data-theme', 'dark');
  }

  // Update clock & date
  updateLiveDashboardClock();

  // 1. Identify active events
  const activeStream = state.activeStream && state.activeStream.frameDataUrl ? state.activeStream : null;
  const activeMotion = Array.isArray(state.motions) ? state.motions.find(m => m.isOpen) : null;
  const concurrencyMode = cfg.concurrencyMode || 'BOTH';

  // 2. Render Main Stage
  renderLiveDashboardStage(state, activeStream, activeMotion, concurrencyMode);

  // 3. Render Overlays (Raise Hand, Permission, Randomizer)
  renderLiveDashboardOverlays(state, cfg);

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Render the main viewport stage based on stream & voting states
 */
function renderLiveDashboardStage(state, activeStream, activeMotion, concurrencyMode) {
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

  // Determine view mode
  const hasStream = Boolean(activeStream);
  const hasVote = Boolean(activeMotion);

  if (hasStream && hasVote) {
    if (concurrencyMode === 'STREAM') {
      stage.innerHTML = renderStreamStage(activeStream, true, activeMotion);
    } else if (concurrencyMode === 'VOTE') {
      stage.innerHTML = renderVotingStage(activeMotion, checkedInUsers, totalUsers, true, activeStream);
    } else {
      // 'BOTH' -> Split Screen 55/45
      stage.innerHTML = renderSplitStage(activeStream, activeMotion, checkedInUsers, totalUsers);
    }
  } else if (hasStream) {
    stage.innerHTML = renderStreamStage(activeStream, false, null);
  } else if (hasVote) {
    stage.innerHTML = renderVotingStage(activeMotion, checkedInUsers, totalUsers, false, null);
  } else {
    // Standby / Default Stage
    stage.innerHTML = renderStandbyStage(meeting, checkedInUsers, onTimeUsers, lateUsers, leaveUsers, totalUsers, attendancePercent, isMeetingActive);
  }
}

/**
 * STANDBY / DEFAULT VIEW (When no stream and no vote are active)
 */
function renderStandbyStage(meeting, checkedInUsers, onTimeUsers, lateUsers, leaveUsers, totalUsers, attendancePercent, isMeetingActive) {
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

  // Attendees pills / cards
  const attendeeBadges = checkedInUsers.slice(0, 20).map(u => `
    <div class="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2 shadow-xs transition hover:scale-105">
      <div class="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
        ${(u.nickname || u.firstName || 'C').slice(0, 1)}
      </div>
      <span class="text-xs font-semibold text-slate-200">${u.nickname || u.firstName}</span>
      ${u.isLate ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">สาย</span>' : ''}
    </div>
  `).join('');

  return `
    <div class="flex-1 flex flex-col justify-between p-6 sm:p-10 max-w-7xl mx-auto w-full h-full min-h-0 animate-fade-in overflow-y-auto">
      
      <!-- HERO MEETING INFO -->
      <div class="space-y-4 my-auto">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${isMeetingActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}">
            <span class="w-2.5 h-2.5 rounded-full ${isMeetingActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}"></span>
            <span>${isMeetingActive ? 'กำลังดำเนินการประชุม' : 'รอเปิดการประชุม'}</span>
          </span>
          <span class="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
            <i data-lucide="${meeting.format === 'ONLINE' ? 'video' : 'map-pin'}" class="w-3.5 h-3.5"></i>
            <span>${meetingLocation}</span>
          </span>
          <span class="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-400"></i>
            <span>${formattedDate} (${timeRange})</span>
          </span>
        </div>

        <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
          ${meetingTitle}
        </h1>
        <p class="text-slate-400 text-sm sm:text-lg max-w-3xl">
          ระบบแสดงผลการประชุมสดสำหรับจอภาพส่วนกลาง • ทุกข้อมูลและสถิติจะอัปเดตแบบเรียลไทม์อัตโนมัติ
        </p>
      </div>

      <!-- ATTENDANCE STATS & PRESENCE MARQUEE -->
      <div class="mt-8 space-y-6">
        <!-- Main Stats 4 Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <!-- Total Check-in -->
          <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-900/80 border border-indigo-500/30 backdrop-blur-md shadow-lg flex flex-col justify-between">
            <div class="flex items-center justify-between text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>ยอดผู้เข้าประชุม</span>
              <i data-lucide="users" class="w-4 h-4"></i>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black text-white">${checkedInUsers.length}</span>
              <span class="text-slate-400 text-sm font-semibold">/ ${totalUsers} คน</span>
            </div>
            <!-- Progress Bar -->
            <div class="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div class="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500" style="width: ${attendancePercent}%"></div>
            </div>
            <span class="text-[11px] text-emerald-400 font-bold mt-1.5">${attendancePercent}% เข้าร่วมแล้ว</span>
          </div>

          <!-- On Time -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col justify-between">
            <div class="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>ตรงเวลา</span>
              <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black text-white">${onTimeUsers.length}</span>
              <span class="text-slate-400 text-sm font-semibold">คน</span>
            </div>
            <span class="text-[11px] text-slate-400 mt-3 font-medium">เข้าประชุมก่อนเวลาสาย</span>
          </div>

          <!-- Late -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col justify-between">
            <div class="flex items-center justify-between text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>มาสาย</span>
              <i data-lucide="clock" class="w-4 h-4"></i>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black text-white">${lateUsers.length}</span>
              <span class="text-slate-400 text-sm font-semibold">คน</span>
            </div>
            <span class="text-[11px] text-slate-400 mt-3 font-medium">เช็คชื่อหลังเวลาที่กำหนด</span>
          </div>

          <!-- Leave -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col justify-between">
            <div class="flex items-center justify-between text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>แจ้งลา</span>
              <i data-lucide="user-x" class="w-4 h-4"></i>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black text-white">${leaveUsers.length}</span>
              <span class="text-slate-400 text-sm font-semibold">คน</span>
            </div>
            <span class="text-[11px] text-slate-400 mt-3 font-medium">ลาติดภารกิจ/ป่วย</span>
          </div>
        </div>

        <!-- Present Attendees Grid -->
        <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-slate-300 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>สมาชิกที่อยู่ในห้องประชุม (${checkedInUsers.length} คน)</span>
            </span>
            <span class="text-[11px] text-slate-400">อัปเดตแบบสด</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap max-h-32 overflow-y-auto">
            ${attendeeBadges || '<span class="text-xs text-slate-500 py-2">ยังไม่มีสมาชิกเช็คชื่อเข้าประชุม</span>'}
          </div>
        </div>
      </div>

    </div>
  `;
}

/**
 * LIVE STREAM / CAMERA VIEW
 */
function renderStreamStage(activeStream, hasConcurrentVote, concurrentMotion) {
  return `
    <div class="flex-1 flex flex-col p-4 sm:p-6 w-full h-full min-h-0 relative animate-fade-in">
      <div class="relative flex-1 bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
        <!-- Live Video Image -->
        <img id="liveDashStreamViewerImg" src="${activeStream.frameDataUrl || ''}" alt="Live Stream" class="w-full h-full object-contain" />

        <!-- Streamer Header Badge -->
        <div class="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 text-white shadow-lg">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span class="text-xs font-bold tracking-wide">${activeStream.mode === 'SCREEN' ? '🖥️ แชร์หน้าจอสด' : '📹 กล้องถ่ายทอดสด'}</span>
          <span class="text-slate-400 text-xs">•</span>
          <span class="text-xs font-medium text-slate-300">${activeStream.streamerName || 'ผู้ดำเนินการ'}</span>
        </div>

        <!-- Concurrent Voting Pill (If Concurrency is set to STREAM) -->
        ${hasConcurrentVote && concurrentMotion ? `
          <div class="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/40 text-white shadow-xl max-w-sm">
            <div class="flex items-center gap-2 mb-1.5 text-indigo-400 font-bold text-xs">
              <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>กำลังเปิดการลงมติ: ${concurrentMotion.title}</span>
            </div>
            <div class="text-[11px] text-slate-300">
              มีผู้ลงมติแล้ว ${Object.keys(concurrentMotion.votes || {}).length} คน
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * LIVE VOTING VIEW
 */
function renderVotingStage(motion, checkedInUsers, totalUsers, hasConcurrentStream, concurrentStream) {
  const votes = motion.votes || {};
  const totalVotesCast = Object.keys(votes).length;
  const eligibleVoters = checkedInUsers.length || totalUsers || 1;
  const turnOutPercent = Math.min(100, Math.round((totalVotesCast / eligibleVoters) * 100));

  const options = motion.options || [
    { id: 'APPROVE', label: 'เห็นชอบ' },
    { id: 'REJECT', label: 'ไม่เห็นชอบ' },
    { id: 'ABSTAIN', label: 'งดออกเสียง' }
  ];

  // Count votes per option
  const counts = {};
  options.forEach(o => { counts[o.id] = 0; });
  Object.values(votes).forEach(choice => {
    if (counts[choice] !== undefined) counts[choice]++;
  });

  const optionColors = {
    'APPROVE': { bg: 'from-emerald-600 to-teal-500', bar: 'bg-emerald-500', text: 'text-emerald-400' },
    'REJECT': { bg: 'from-rose-600 to-pink-500', bar: 'bg-rose-500', text: 'text-rose-400' },
    'ABSTAIN': { bg: 'from-slate-600 to-slate-500', bar: 'bg-slate-400', text: 'text-slate-300' }
  };

  const optionBars = options.map((opt, idx) => {
    const c = counts[opt.id] || 0;
    const pct = totalVotesCast > 0 ? Math.round((c / totalVotesCast) * 100) : 0;
    const col = optionColors[opt.id] || {
      bar: 'bg-indigo-500',
      text: 'text-indigo-400'
    };

    return `
      <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-md space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-xl bg-slate-800 font-bold text-sm text-slate-300 flex items-center justify-center shrink-0">
              #${idx + 1}
            </span>
            <span class="text-base sm:text-xl font-bold text-white">${opt.label}</span>
          </div>
          <div class="text-right">
            <span class="text-2xl sm:text-3xl font-black ${col.text}">${c}</span>
            <span class="text-xs text-slate-400 font-semibold ml-1">คะแนน (${pct}%)</span>
          </div>
        </div>
        <!-- Animated Bar -->
        <div class="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div class="${col.bar} h-3 rounded-full transition-all duration-500 shadow-sm" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  // Voters ticker (Showing who voted)
  const allUsers = window.appState?.users || [];
  const votersList = Object.keys(votes).map(uId => {
    const u = allUsers.find(user => user.id === uId);
    return u ? (u.nickname || u.firstName) : uId;
  });

  return `
    <div class="flex-1 flex flex-col p-6 sm:p-10 max-w-7xl mx-auto w-full h-full min-h-0 animate-fade-in overflow-y-auto">
      
      <!-- Motion Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>กำลังเปิดให้ลงมติ</span>
            </span>
            ${motion.isSecret ? '<span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">🔒 โหวตลับ</span>' : ''}
          </div>
          <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight">${motion.title}</h1>
        </div>

        <!-- Participation Ticker -->
        <div class="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-lg">
          <div class="text-right">
            <div class="text-xs text-slate-400 font-semibold uppercase">ใช้สิทธิ์แล้ว</div>
            <div class="text-2xl sm:text-3xl font-black text-emerald-400">${totalVotesCast} <span class="text-sm text-slate-400">/ ${eligibleVoters} คน</span></div>
          </div>
          <div class="w-12 h-12 rounded-full border-4 border-slate-800 border-t-emerald-400 flex items-center justify-center font-bold text-xs text-white">
            ${turnOutPercent}%
          </div>
        </div>
      </div>

      <!-- Voting Options Breakdown -->
      <div class="my-6 space-y-4 flex-1">
        ${optionBars}
      </div>

      <!-- Who has voted (Live Ticker) -->
      <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div class="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
          <span>รายชื่อผู้ที่ลงมติแล้ว (${votersList.length} คน)</span>
          <span class="text-emerald-400">● อัปเดตสด</span>
        </div>
        <div class="flex items-center gap-2 flex-wrap max-h-24 overflow-y-auto">
          ${votersList.map(name => `
            <span class="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
              ${name} ✓
            </span>
          `).join('') || '<span class="text-xs text-slate-500">ยังไม่มีผู้ลงคะแนน</span>'}
        </div>
      </div>

      <!-- Floating Stream PIP (If concurrency is VOTE and stream is active) -->
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
 * SPLIT SCREEN VIEW (When both Live Stream AND Voting are active simultaneously)
 */
function renderSplitStage(activeStream, motion, checkedInUsers, totalUsers) {
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

  const optionColors = {
    'APPROVE': { bar: 'bg-emerald-500', text: 'text-emerald-400' },
    'REJECT': { bar: 'bg-rose-500', text: 'text-rose-400' },
    'ABSTAIN': { bar: 'bg-slate-400', text: 'text-slate-300' }
  };

  const optionBars = options.map(opt => {
    const c = counts[opt.id] || 0;
    const pct = totalVotesCast > 0 ? Math.round((c / totalVotesCast) * 100) : 0;
    const col = optionColors[opt.id] || { bar: 'bg-indigo-500', text: 'text-indigo-400' };
    return `
      <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
        <div class="flex justify-between text-xs font-bold text-white">
          <span>${opt.label}</span>
          <span class="${col.text}">${c} (${pct}%)</span>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div class="${col.bar} h-2 rounded-full" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="flex-1 flex flex-col lg:flex-row p-4 sm:p-6 gap-4 w-full h-full min-h-0 animate-fade-in overflow-hidden">
      <!-- Left 60%: Live Stream -->
      <div class="flex-1 bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative flex items-center justify-center min-h-[300px]">
        <img id="liveDashStreamViewerImg" src="${activeStream.frameDataUrl || ''}" alt="Live Stream" class="w-full h-full object-contain" />
        <div class="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-2 border border-slate-700">
          <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>${activeStream.streamerName || 'ถ่ายทอดสด'}</span>
        </div>
      </div>

      <!-- Right 40%: Live Voting -->
      <div class="w-full lg:w-[420px] bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-2xl backdrop-blur-md overflow-y-auto">
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">การลงมติสด</span>
              <h2 class="text-lg font-black text-white">${motion.title}</h2>
            </div>
            <div class="text-right">
              <span class="text-xl font-black text-emerald-400">${totalVotesCast}</span>
              <span class="text-slate-400 text-xs">/ ${eligibleVoters}</span>
            </div>
          </div>

          <div class="space-y-2.5">
            ${optionBars}
          </div>
        </div>

        <div class="pt-4 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          ● ข้อมูลคะแนนโหวตอัปเดตแบบเรียลไทม์
        </div>
      </div>
    </div>
  `;
}

/**
 * RENDER OVERLAYS (Raise Hand, Permission Requests, Randomizer)
 */
function renderLiveDashboardOverlays(state, cfg) {
  // 1. Raise Hand Overlay
  const handOverlay = document.getElementById('liveDashRaiseHandOverlay');
  const handQueue = Array.isArray(state.raiseHandQueue) ? state.raiseHandQueue : [];
  if (handOverlay) {
    if (cfg.showRaiseHandPopup !== false && handQueue.length > 0) {
      handOverlay.classList.remove('hidden');
      handOverlay.innerHTML = `
        <div class="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-slate-950 px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-white/20 flex items-center gap-4 animate-bounce-subtle">
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
        <div class="bg-slate-900/95 border border-indigo-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
            🔔
          </div>
          <div class="text-xs">
            <span class="font-bold text-indigo-300 block">คำขอใช้สิทธิ์ใหม่ (${pendingUsers.length})</span>
            <span class="text-slate-300 truncate block">
              ${pendingUsers.map(u => `${u.nickname} (${u.streamPermission === 'PENDING' ? 'กล้อง/แชร์หน้าจอ' : 'ดรอปไฟล์'})`).join(', ')}
            </span>
          </div>
        </div>
      `;
    } else {
      permOverlay.classList.add('hidden');
      permOverlay.innerHTML = '';
    }
  }

  // 3. Randomizer Overlay (Persists until Admin closes it)
  const randOverlay = document.getElementById('liveDashRandomizerOverlay');
  if (randOverlay) {
    const isRandomActive = window.liveDashRandomActive || (state.randomizer && state.randomizer.activePopup);
    const winnerLabel = window.liveDashRandomWinner || (state.randomizer && state.randomizer.lastWinner ? state.randomizer.lastWinner.winnerLabel : null);

    if (cfg.showRandomizerPopup !== false && isRandomActive && winnerLabel) {
      randOverlay.classList.remove('hidden');
      randOverlay.classList.add('flex');
      randOverlay.innerHTML = `
        <div class="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border-2 border-amber-400 p-8 sm:p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center relative overflow-hidden animate-zoom-in">
          <!-- Confetti / Glow effect -->
          <div class="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-12 -left-12 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div class="text-5xl sm:text-6xl mb-4 animate-bounce">
            🎉
          </div>
          <span class="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase tracking-widest inline-block mb-3">
            ✨ ผลการสุ่มเลือกผู้โชคดี ✨
          </span>
          <h2 class="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 mb-4 tracking-tight drop-shadow-md">
            ${winnerLabel}
          </h2>
          <p class="text-xs sm:text-sm text-slate-300">
            ระบบจะแสดงป๊อปอัปนี้บนจอใหญ่ จนกว่าผู้ดูแลระบบจะปิดหน้าต่างสุ่ม
          </p>
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
 * Handle fast stream frame updates without full re-render
 */
function updateLiveDashboardStreamFrame(frameDataUrl) {
  if (!window.isLiveDashboardOpen || !frameDataUrl) return;
  const img = document.getElementById('liveDashStreamViewerImg');
  if (img) {
    img.src = frameDataUrl;
  }
}

/**
 * Close Live Random Popup on Live Dashboard
 */
function closeLiveRandomPopup() {
  window.liveDashRandomActive = false;
  window.liveDashRandomWinner = null;
  const randOverlay = document.getElementById('liveDashRandomizerOverlay');
  if (randOverlay) {
    randOverlay.classList.add('hidden');
    randOverlay.classList.remove('flex');
    randOverlay.innerHTML = '';
  }
}

// Global attachments
window.openLiveDashboard = openLiveDashboard;
window.closeLiveDashboard = closeLiveDashboard;
window.toggleLiveDashboardFullscreen = toggleLiveDashboardFullscreen;
window.startLiveDashboardClock = startLiveDashboardClock;
window.updateLiveDashboardClock = updateLiveDashboardClock;
window.openLiveDashboardSettingsModal = openLiveDashboardSettingsModal;
window.closeLiveDashboardSettingsModal = closeLiveDashboardSettingsModal;
window.saveLiveDashboardSettings = saveLiveDashboardSettings;
window.copyLiveDashboardDirectUrl = copyLiveDashboardDirectUrl;
window.renderLiveDashboard = renderLiveDashboard;
window.updateLiveDashboardStreamFrame = updateLiveDashboardStreamFrame;
window.closeLiveRandomPopup = closeLiveRandomPopup;
