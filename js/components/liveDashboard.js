/**
 * COMSAN Meeting System - Apple tvOS 26 Style Live Dashboard & Remote Component
 */

window.isLiveDashboardOpen = false;
window.isLiveRemoteOpen = false;
window.liveDashboardClockTimer = null;
window.liveDashWallpaperTimer = null;
window.liveDashActiveApp = null; // null (Home Dock) | 'VOTE' | 'CHECKIN' | 'RANDOM' | 'FILES' | 'STREAM' | 'SETTINGS'
window.isLiveControlCenterOpen = false;

window.liveRemoteMode = (typeof localStorage !== 'undefined' && localStorage.getItem('comsan_remote_mode')) || 'TOUCHPAD'; // 'TOUCHPAD' | 'DPAD'
window.liveRemoteEnteredPin = '';
window.liveDashFocusedAppIndex = 0;
window.liveDashDockApps = ['vote', 'checkin', 'random', 'files', 'stream', 'settings'];
window.liveDashCursorHideTimer = null;

// High-resolution nature wallpapers for slideshow
const NATURE_WALLPAPERS = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80', // Yosemite Valley & Lake
  'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1920&q=80', // Misty Pine Forest
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80', // Majestic Mountains Fog
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80', // Tropical Sunset Coast
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80'  // Northern Lights Aurora
];
window.currentNatureWallpaperIndex = 0;

// =========================================================================
// 1. LIVE DASHBOARD CORE & FULLSCREEN
// =========================================================================

function openLiveDashboard() {
  const container = document.getElementById('liveDashboardContainer');
  if (!container) return;

  container.classList.remove('hidden');
  container.classList.add('flex');
  window.isLiveDashboardOpen = true;

  // Request browser full-screen automatically
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  } catch (e) {}

  startLiveDashboardClock();
  startWallpaperCycle();
  renderLiveDashboard();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function closeLiveDashboard() {
  const container = document.getElementById('liveDashboardContainer');
  if (container) {
    container.classList.add('hidden');
    container.classList.remove('flex');
  }
  window.isLiveDashboardOpen = false;
  window.liveDashActiveApp = null;
  window.isLiveControlCenterOpen = false;

  if (window.liveDashboardClockTimer) {
    clearInterval(window.liveDashboardClockTimer);
    window.liveDashboardClockTimer = null;
  }
  if (window.liveDashWallpaperTimer) {
    clearInterval(window.liveDashWallpaperTimer);
    window.liveDashWallpaperTimer = null;
  }

  // Only exit fullscreen if container or document was in fullscreen
  if (document.fullscreenElement) {
    try {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  }
}

function startLiveDashboardClock() {
  if (window.liveDashboardClockTimer) clearInterval(window.liveDashboardClockTimer);
  updateLiveDashboardClock();
  window.liveDashboardClockTimer = setInterval(updateLiveDashboardClock, 1000);
}

function updateLiveDashboardClock() {
  const timeEl = document.getElementById('liveDashPillClock');
  const centerTimeEl = document.getElementById('liveDashClockTime');
  const centerSecEl = document.getElementById('liveDashClockSeconds');
  const centerDateEl = document.getElementById('liveDashClockDate');

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
  const formattedHours = String(hours).padStart(2, '0');

  if (timeEl) {
    timeEl.textContent = `${formattedHours}:${minutes}${period}`;
  }
  if (centerTimeEl) {
    centerTimeEl.textContent = `${formattedHours}:${minutes}`;
  }
  if (centerSecEl) {
    centerSecEl.textContent = `:${seconds}${period}`;
  }
  if (centerDateEl) {
    try {
      centerDateEl.textContent = now.toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {}
  }
}

// =========================================================================
// 2. WALLPAPERS (BUBBLES, NATURE SLIDESHOW, CUSTOM)
// =========================================================================

function startWallpaperCycle() {
  if (window.liveDashWallpaperTimer) clearInterval(window.liveDashWallpaperTimer);
  updateLiveWallpaperDisplay();

  window.liveDashWallpaperTimer = setInterval(() => {
    const cfg = window.appState?.liveDashboardConfig || {};
    if (cfg.wallpaperMode === 'NATURE') {
      window.currentNatureWallpaperIndex = (window.currentNatureWallpaperIndex + 1) % NATURE_WALLPAPERS.length;
      updateLiveWallpaperDisplay();
    }
  }, 14000);
}

function updateLiveWallpaperDisplay() {
  const bgImg = document.getElementById('liveDashNatureBg');
  const bubblesBg = document.getElementById('liveDashBubblesBg');
  const customBg = document.getElementById('liveDashCustomBg');
  if (!bgImg && !bubblesBg) return;

  const cfg = window.appState?.liveDashboardConfig || {};
  const mode = cfg.wallpaperMode || 'BUBBLES';

  if (mode === 'NATURE') {
    if (bubblesBg) bubblesBg.classList.add('hidden');
    if (customBg) customBg.classList.add('hidden');
    if (bgImg) {
      bgImg.classList.remove('hidden');
      const nextUrl = NATURE_WALLPAPERS[window.currentNatureWallpaperIndex] || NATURE_WALLPAPERS[0];
      bgImg.style.backgroundImage = `url('${nextUrl}')`;
    }
  } else if (mode === 'CUSTOM') {
    if (bubblesBg) bubblesBg.classList.add('hidden');
    if (bgImg) bgImg.classList.add('hidden');
    if (customBg) {
      customBg.classList.remove('hidden');
      const url = cfg.customWallpaperUrl || NATURE_WALLPAPERS[0];
      customBg.style.backgroundImage = `url('${url}')`;
    }
  } else {
    // Default BUBBLES
    if (bgImg) bgImg.classList.add('hidden');
    if (customBg) customBg.classList.add('hidden');
    if (bubblesBg) bubblesBg.classList.remove('hidden');
  }
}

function setLiveWallpaperMode(mode, customUrl) {
  if (!window.appState) window.appState = {};
  if (!window.appState.liveDashboardConfig) window.appState.liveDashboardConfig = {};
  window.appState.liveDashboardConfig.wallpaperMode = mode;
  if (customUrl !== undefined) {
    window.appState.liveDashboardConfig.customWallpaperUrl = customUrl;
  }
  if (typeof window.saveLocalState === 'function') window.saveLocalState();
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:updateLiveDashboardConfig', window.appState.liveDashboardConfig);
  }
  updateLiveWallpaperDisplay();
  if (typeof showToast === 'function') {
    showToast(`เปลี่ยนภาพพื้นหลังเป็น: ${mode === 'NATURE' ? 'สไลด์โชว์ธรรมชาติ' : mode === 'CUSTOM' ? 'รูปภาพกำหนดเอง' : 'ฟองอากาศ tvOS'}`, 'success');
  }
}

function promptSetCustomWallpaper() {
  const currentUrl = window.appState?.liveDashboardConfig?.customWallpaperUrl || '';
  const url = prompt('ป้อน URL รูปภาพพื้นหลังที่ต้องการ (Direct image URL):', currentUrl);
  if (url && url.trim()) {
    setLiveWallpaperMode('CUSTOM', url.trim());
  }
}

function regenerateLiveDashboardPin() {
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:regenerateRemotePin');
  }
}

// =========================================================================
// 3. APPLE TVOS 26 HOME SCREEN & APPS
// =========================================================================

function renderLiveDashboard() {
  const container = document.getElementById('liveDashboardContainer');
  if (!container || !window.isLiveDashboardOpen) return;

  const state = window.appState || {};
  const cfg = state.liveDashboardConfig || {
    wallpaperMode: 'BUBBLES',
    pairingCode: '8429'
  };

  // Ensure pairing code is displayed in Control Center pill and drawer
  const pinPill = document.getElementById('liveDashPillPin');
  if (pinPill) {
    pinPill.textContent = `📺 PIN: ${cfg.pairingCode || '8429'}`;
  }
  const drawerPin = document.getElementById('liveDashDrawerPin');
  if (drawerPin) {
    drawerPin.textContent = cfg.pairingCode || '8429';
  }

  updateLiveDashboardClock();
  updateLiveWallpaperDisplay();

  // If an App is open, render that app; otherwise render Home Screen (Dock)
  if (window.liveDashActiveApp) {
    renderOpenAppView(window.liveDashActiveApp, state);
  } else {
    renderHomeDockView(state);
  }

  // Render Overlays (Raise Hand, Permission, etc.)
  renderLiveDashboardOverlays(state, cfg);

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Apple tvOS Home View: Hero Title + Floating Glass Dock Shelf
 */
function renderHomeDockView(state) {
  const stage = document.getElementById('liveDashMainStage');
  if (!stage) return;

  const meeting = state.meeting || {};
  const users = Array.isArray(state.users) ? state.users : [];
  const checkedInUsers = users.filter(u => u.checkedIn && !u.isLeave);
  const totalUsers = users.length || 1;
  const attendancePercent = Math.round((checkedInUsers.length / totalUsers) * 100);

  const meetingTitle = meeting.title || 'การประชุมใหญ่สามัญชมรมสันทนาการ (COMSAN)';
  const meetingLocation = meeting.location || (meeting.format === 'ONLINE' ? 'Google Meet (ออนไลน์)' : 'ห้องประชุมชมรมคมสัน');
  const meetingDate = meeting.date || new Date().toISOString().slice(0, 10);
  const isStarted = Boolean(meeting.isStarted && !meeting.isEnded);

  let formattedDate = meetingDate;
  try {
    formattedDate = new Date(meetingDate).toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {}

  stage.innerHTML = `
    <div class="flex-1 flex flex-col justify-between p-8 sm:p-14 w-full h-full relative z-20 select-none overflow-hidden">
      
      <!-- TOP LEFT: PREHISTORIC PLANET STYLE HERO TITLE -->
      <div class="space-y-4 max-w-4xl animate-fade-in mt-4">
        <div class="flex items-center gap-3">
          <span class="px-3.5 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-white/20 text-white border border-white/30 backdrop-blur-md">
            COMSAN MEETING
          </span>
          <span class="px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${isStarted ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' : 'bg-amber-500/30 text-amber-300 border border-amber-400/40'} backdrop-blur-md">
            <span class="w-2 h-2 rounded-full ${isStarted ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}"></span>
            <span>${isStarted ? 'กำลังดำเนินการประชุม' : 'รอเปิดการประชุม'}</span>
          </span>
        </div>

        <h1 class="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase leading-none drop-shadow-2xl font-sans">
          ${meetingTitle}
        </h1>

        <div class="flex items-center gap-4 text-xs sm:text-sm font-semibold text-slate-200 drop-shadow-md flex-wrap pt-1">
          <span class="flex items-center gap-1.5"><i data-lucide="map-pin" class="w-4 h-4 text-cyan-400"></i> ${meetingLocation}</span>
          <span>•</span>
          <span class="flex items-center gap-1.5"><i data-lucide="calendar" class="w-4 h-4 text-indigo-400"></i> ${formattedDate} (${meeting.startTime || '17:00'} - ${meeting.endTime || '19:00'})</span>
          <span>•</span>
          <span class="flex items-center gap-1.5"><i data-lucide="users" class="w-4 h-4 text-emerald-400"></i> เข้าร่วมแล้ว ${checkedInUsers.length}/${totalUsers} คน (${attendancePercent}%)</span>
        </div>
      </div>

      <!-- BOTTOM: APPLE TVOS APP SHELF (DOCK) -->
      <div class="w-full flex flex-col items-center justify-center pb-2">
        <div class="backdrop-blur-3xl bg-black/40 border border-white/15 rounded-[36px] p-3 sm:p-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex items-center justify-center gap-4 sm:gap-6 max-w-full overflow-x-auto no-scrollbar">
          
          <!-- App 1: Voting App -->
          <div id="tvApp_vote" onclick="openLiveApp('VOTE')" class="tvos-app-card group relative flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-110">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] bg-gradient-to-tr from-purple-700 via-indigo-600 to-blue-500 shadow-xl border border-white/20 flex items-center justify-center text-white text-3xl font-black transition-all duration-300 group-hover:ring-4 group-hover:ring-white group-hover:shadow-[0_15px_30px_rgba(255,255,255,0.35)]">
              <i data-lucide="vote" class="w-10 h-10"></i>
            </div>
            <span class="tvos-app-label text-xs sm:text-sm font-bold text-white mt-2 drop-shadow-md opacity-90 transition">การลงมติ</span>
          </div>

          <!-- App 2: Check-in QR App -->
          <div id="tvApp_checkin" onclick="openLiveApp('CHECKIN')" class="tvos-app-card group relative flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-110">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 shadow-xl border border-white/20 flex items-center justify-center text-white text-3xl font-black transition-all duration-300 group-hover:ring-4 group-hover:ring-white group-hover:shadow-[0_15px_30px_rgba(255,255,255,0.35)]">
              <i data-lucide="qr-code" class="w-10 h-10"></i>
            </div>
            <span class="tvos-app-label text-xs sm:text-sm font-bold text-white mt-2 drop-shadow-md opacity-90 transition">เช็คชื่อ QR</span>
          </div>

          <!-- App 3: Randomizer App -->
          <div id="tvApp_random" onclick="openLiveApp('RANDOM')" class="tvos-app-card group relative flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-110">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 shadow-xl border border-white/20 flex items-center justify-center text-white text-3xl font-black transition-all duration-300 group-hover:ring-4 group-hover:ring-white group-hover:shadow-[0_15px_30px_rgba(255,255,255,0.35)]">
              <i data-lucide="dices" class="w-10 h-10"></i>
            </div>
            <span class="tvos-app-label text-xs sm:text-sm font-bold text-white mt-2 drop-shadow-md opacity-90 transition">การสุ่มหรรษา</span>
          </div>

          <!-- App 4: Files & Docs App -->
          <div id="tvApp_files" onclick="openLiveApp('FILES')" class="tvos-app-card group relative flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-110">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-700 shadow-xl border border-white/20 flex items-center justify-center text-white text-3xl font-black transition-all duration-300 group-hover:ring-4 group-hover:ring-white group-hover:shadow-[0_15px_30px_rgba(255,255,255,0.35)]">
              <i data-lucide="folder" class="w-10 h-10"></i>
            </div>
            <span class="tvos-app-label text-xs sm:text-sm font-bold text-white mt-2 drop-shadow-md opacity-90 transition">คลังเอกสาร</span>
          </div>

          <!-- App 5: Stream & Camera App -->
          <div id="tvApp_stream" onclick="openLiveApp('STREAM')" class="tvos-app-card group relative flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-110">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] bg-gradient-to-tr from-lime-600 via-emerald-600 to-teal-700 shadow-xl border border-white/20 flex items-center justify-center text-white text-3xl font-black transition-all duration-300 group-hover:ring-4 group-hover:ring-white group-hover:shadow-[0_15px_30px_rgba(255,255,255,0.35)]">
              <i data-lucide="video" class="w-10 h-10"></i>
            </div>
            <span class="tvos-app-label text-xs sm:text-sm font-bold text-white mt-2 drop-shadow-md opacity-90 transition">ถ่ายทอดสด</span>
          </div>

          <!-- App 6: Control Center / Settings App -->
          <div id="tvApp_settings" onclick="toggleLiveControlCenter()" class="tvos-app-card group relative flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-110">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] bg-gradient-to-tr from-zinc-700 via-zinc-800 to-zinc-900 shadow-xl border border-white/20 flex items-center justify-center text-white text-3xl font-black transition-all duration-300 group-hover:ring-4 group-hover:ring-white group-hover:shadow-[0_15px_30px_rgba(255,255,255,0.35)]">
              <i data-lucide="sliders" class="w-10 h-10"></i>
            </div>
            <span class="tvos-app-label text-xs sm:text-sm font-bold text-white mt-2 drop-shadow-md opacity-90 transition">Control Center</span>
          </div>

        </div>
      </div>

    </div>
  `;

  updateDockFocusUI();
}

/**
 * Open tvOS App view
 */
function openLiveApp(appId) {
  window.liveDashActiveApp = appId;
  window.isLiveControlCenterOpen = false;
  renderLiveDashboard();

  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('remote:openApp', appId);
  }
}

/**
 * Close tvOS App view and return to Home Dock
 */
function closeLiveApp() {
  window.liveDashActiveApp = null;
  renderLiveDashboard();

  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('remote:closeApp');
  }
}

/**
 * Render Content inside an opened Apple tvOS App
 */
function renderOpenAppView(appId, state) {
  const stage = document.getElementById('liveDashMainStage');
  if (!stage) return;

  let bodyHtml = '';

  if (appId === 'VOTE') {
    bodyHtml = renderTvVotingApp(state);
  } else if (appId === 'CHECKIN') {
    bodyHtml = renderTvCheckinApp(state);
  } else if (appId === 'RANDOM') {
    bodyHtml = renderTvRandomizerApp(state);
  } else if (appId === 'FILES') {
    bodyHtml = renderTvFilesApp(state);
  } else if (appId === 'STREAM') {
    bodyHtml = renderTvStreamApp(state);
  } else {
    bodyHtml = `<div class="p-10 text-center text-white">กำลังโหลด...</div>`;
  }

  stage.innerHTML = `
    <div class="flex-1 flex flex-col w-full h-full relative z-20 select-none overflow-hidden animate-zoom-in p-6 sm:p-10">
      <!-- App Header Bar with Back Button -->
      <div class="flex items-center justify-between pb-4 shrink-0">
        <button type="button" onclick="closeLiveApp()" class="px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/30 text-white font-bold text-sm backdrop-blur-xl border border-white/20 flex items-center gap-2 transition active:scale-95 shadow-lg cursor-pointer">
          <i data-lucide="chevron-left" class="w-5 h-5"></i>
          <span>หน้าหลัก (Back)</span>
        </button>
        <span class="text-xs font-bold text-slate-300 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          กดปุ่ม Back (&lt;) บนรีโมตเพื่อปิด
        </span>
      </div>

      <!-- App Viewport Body -->
      <div class="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
        ${bodyHtml}
      </div>
    </div>
  `;

  if (appId === 'CHECKIN') {
    generateTvCheckinQrCode(state);
  }
}

// =========================================================================
// 4. TVOS APPS IMPLEMENTATION
// =========================================================================

/**
 * TV APP 1: VOTING
 */
function renderTvVotingApp(state) {
  const motion = Array.isArray(state.motions) ? state.motions.find(m => m.isOpen) || state.motions[0] : null;
  const users = Array.isArray(state.users) ? state.users : [];
  const checkedInUsers = users.filter(u => u.checkedIn && !u.isLeave);
  const totalUsers = users.length || 1;

  if (!motion) {
    return `
      <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 m-auto max-w-lg">
        <i data-lucide="vote" class="w-16 h-16 text-indigo-400 mb-4 animate-bounce"></i>
        <h2 class="text-2xl font-black text-white">ยังไม่มีญัตติที่เปิดให้ลงมติ</h2>
        <p class="text-slate-300 text-sm mt-1">ผู้ดูแลระบบสามารถเปิดรับคะแนนโหวตได้จากแผงควบคุม</p>
      </div>
    `;
  }

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
    'APPROVE': { bar: 'bg-emerald-500', text: 'text-emerald-400' },
    'REJECT': { bar: 'bg-rose-500', text: 'text-rose-400' },
    'ABSTAIN': { bar: 'bg-slate-400', text: 'text-slate-300' }
  };

  const optionBars = options.map((opt, idx) => {
    const c = counts[opt.id] || 0;
    const pct = totalVotesCast > 0 ? Math.round((c / totalVotesCast) * 100) : 0;
    const col = optionColors[opt.id] || { bar: 'bg-indigo-500', text: 'text-indigo-400' };

    return `
      <div class="p-5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl shadow-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-xl bg-white/20 font-black text-white text-base flex items-center justify-center shrink-0">
              #${idx + 1}
            </span>
            <span class="text-xl sm:text-2xl font-bold text-white">${opt.label}</span>
          </div>
          <div class="text-right">
            <span class="text-3xl sm:text-4xl font-black ${col.text}">${c}</span>
            <span class="text-xs text-slate-300 font-semibold ml-1">คะแนน (${pct}%)</span>
          </div>
        </div>
        <div class="w-full bg-black/40 rounded-full h-3 overflow-hidden">
          <div class="${col.bar} h-3 rounded-full transition-all duration-500 shadow-sm" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="max-w-5xl mx-auto w-full space-y-6">
      <div class="bg-black/50 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-white/15 shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <span class="px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 inline-block mb-2">
            ${motion.isSecret ? '🔒 การลงมติลับ (Secret Vote)' : '🗳️ การลงมติสาธารณะ'}
          </span>
          <h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight">${motion.title}</h2>
        </div>
        <div class="text-right shrink-0">
          <div class="text-xs text-slate-300 uppercase font-semibold">ผู้ใช้สิทธิ์แล้ว</div>
          <div class="text-4xl sm:text-5xl font-black text-emerald-400">${totalVotesCast} <span class="text-lg text-slate-400">/ ${eligibleVoters} คน (${turnOutPercent}%)</span></div>
        </div>
      </div>

      <div class="space-y-3">
        ${optionBars}
      </div>
    </div>
  `;
}

/**
 * TV APP 2: CHECK-IN QR
 */
function renderTvCheckinApp(state) {
  const users = Array.isArray(state.users) ? state.users : [];
  const checkedInUsers = users.filter(u => u.checkedIn && !u.isLeave);
  const totalUsers = users.length || 1;
  const attendancePercent = Math.round((checkedInUsers.length / totalUsers) * 100);

  return `
    <div class="max-w-4xl mx-auto w-full my-auto flex flex-col md:flex-row items-center gap-8 bg-black/50 backdrop-blur-3xl p-8 sm:p-12 rounded-[36px] border border-white/20 shadow-2xl">
      <!-- QR Code Display -->
      <div class="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-2xl shrink-0">
        <div id="tvCheckinQrHolder" class="w-64 h-64 flex items-center justify-center"></div>
        <span class="text-slate-900 font-black text-sm mt-3">สแกนเพื่อเช็คชื่อเข้าประชุมทันที</span>
      </div>

      <!-- Attendance Stats -->
      <div class="flex-1 space-y-5 text-white">
        <div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
            ระบบเช็คชื่ออัตโนมัติ (Live Check-in)
          </span>
          <h2 class="text-3xl sm:text-4xl font-black mt-2">สแกน QR Code ประจำห้อง</h2>
          <p class="text-slate-300 text-sm mt-1">ใช้กล้องมือถือหรือแอป Line สแกนเพื่อยืนยันการเข้าประชุม</p>
        </div>

        <div class="p-5 rounded-2xl bg-white/10 border border-white/15 space-y-2">
          <div class="flex justify-between items-baseline font-bold">
            <span class="text-sm text-slate-300">ยอดสมาชิกเช็คชื่อแล้ว</span>
            <span class="text-2xl font-black text-emerald-400">${checkedInUsers.length} / ${totalUsers} คน (${attendancePercent}%)</span>
          </div>
          <div class="w-full bg-black/40 rounded-full h-3 overflow-hidden">
            <div class="bg-gradient-to-r from-emerald-500 to-cyan-400 h-3 rounded-full" style="width: ${attendancePercent}%"></div>
          </div>
        </div>

        <div class="text-xs text-slate-400 flex items-center gap-2">
          <i data-lucide="info" class="w-4 h-4 text-cyan-400"></i>
          <span>สามารถเช็คชื่อผ่านเมนูโปรไฟล์ในเครื่องของสมาชิกได้เช่นกัน</span>
        </div>
      </div>
    </div>
  `;
}

function generateTvCheckinQrCode(state) {
  setTimeout(() => {
    const holder = document.getElementById('tvCheckinQrHolder');
    if (!holder) return;
    holder.innerHTML = '';

    const checkinToken = state.meeting?.checkinToken;
    const url = checkinToken
      ? `${window.location.origin}${window.location.pathname}?checkin=${encodeURIComponent(checkinToken)}`
      : `${window.location.origin}${window.location.pathname}`;

    if (typeof QRCode !== 'undefined') {
      new QRCode(holder, {
        text: url,
        width: 250,
        height: 250,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  }, 100);
}

/**
 * TV APP 3: RANDOMIZER
 */
function renderTvRandomizerApp(state) {
  const lastWinner = state.randomizer?.lastWinner?.winnerLabel || 'ยังไม่มีการสุ่มในรอบนี้';

  return `
    <div class="max-w-2xl mx-auto w-full my-auto text-center bg-black/50 backdrop-blur-3xl p-8 sm:p-12 rounded-[36px] border border-white/20 shadow-2xl space-y-6">
      <div class="text-6xl animate-bounce">🎰</div>
      <div>
        <span class="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40 uppercase tracking-widest">
          LUCKY WHEEL & RANDOMIZER
        </span>
        <h2 class="text-3xl sm:text-5xl font-black text-white mt-3">การสุ่มหรรษาประจำชมรม</h2>
      </div>

      <div class="p-6 rounded-3xl bg-white/10 border border-white/15">
        <span class="text-xs text-slate-300 uppercase tracking-wider block mb-1">ผู้โชคดีล่าสุด</span>
        <div class="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
          ${lastWinner}
        </div>
      </div>

      <div class="flex items-center justify-center gap-4">
        <button type="button" onclick="triggerAdminSpinFromTv()" class="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base shadow-xl transition active:scale-95 cursor-pointer flex items-center gap-2">
          <i data-lucide="play" class="w-5 h-5"></i>
          <span>หมุนสุ่มเลย (SPIN)</span>
        </button>
      </div>
    </div>
  `;
}

function triggerAdminSpinFromTv() {
  if (typeof window.triggerAdminSpin === 'function') {
    window.triggerAdminSpin();
  } else if (typeof showToast === 'function') {
    showToast('กรุณาสั่งหมุนสุ่มจากแผงสุ่มของผู้ดูแลระบบหรือรีโมต', 'info');
  }
}

/**
 * TV APP 4: FILES & DOCUMENTS
 */
function renderTvFilesApp(state) {
  const files = Array.isArray(state.files) ? state.files : [];

  if (files.length === 0) {
    return `
      <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 m-auto max-w-lg text-white">
        <i data-lucide="folder" class="w-16 h-16 text-sky-400 mb-4 animate-pulse"></i>
        <h2 class="text-2xl font-black">ยังไม่มีเอกสารแนบในที่ประชุม</h2>
        <p class="text-slate-300 text-sm mt-1">สมาชิกและผู้ดูแลสามารถอัปโหลดไฟล์ในระบบเพื่อเปิดดูบนจอนี้ได้</p>
      </div>
    `;
  }

  const fileCards = files.map((f, idx) => `
    <div class="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl flex items-center justify-between text-white hover:bg-white/20 transition">
      <div class="flex items-center gap-3.5 min-w-0">
        <div class="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm shrink-0">
          <i data-lucide="file-text" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0">
          <span class="font-bold text-sm sm:text-base truncate block">${f.name || 'เอกสารการประชุม'}</span>
          <span class="text-xs text-slate-300 block">อัปโหลดโดย ${f.uploaderName || 'ผู้เข้าร่วม'} • ${f.time || ''}</span>
        </div>
      </div>
      ${f.dataUrl ? `<a href="${f.dataUrl}" target="_blank" download="${f.name || 'document'}" class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shrink-0 transition">ดาวน์โหลด</a>` : ''}
    </div>
  `).join('');

  return `
    <div class="max-w-4xl mx-auto w-full space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-white/15 text-white">
        <h2 class="text-2xl font-black">คลังเอกสารและไฟล์แนบ (${files.length} รายการ)</h2>
      </div>
      <div class="space-y-2.5">
        ${fileCards}
      </div>
    </div>
  `;
}

/**
 * TV APP 5: LIVE STREAM
 */
function renderTvStreamApp(state) {
  const activeStream = (state.activeStream && state.activeStream.frameDataUrl) ? state.activeStream : null;

  if (!activeStream) {
    return `
      <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 m-auto max-w-lg text-white">
        <i data-lucide="video" class="w-16 h-16 text-lime-400 mb-4 animate-pulse"></i>
        <h2 class="text-2xl font-black">ไม่มีการถ่ายทอดสดในขณะนี้</h2>
        <p class="text-slate-300 text-sm mt-1">เมื่อมีผู้แชร์หน้าจอหรือเปิดกล้อง ภาพจะปรากฏบนจอใหญ่ทันที</p>
      </div>
    `;
  }

  return `
    <div class="flex-1 bg-black rounded-3xl overflow-hidden border border-white/20 shadow-2xl relative flex items-center justify-center">
      <img id="liveDashStreamViewerImg" src="${activeStream.frameDataUrl}" alt="Live Stream" class="w-full h-full object-contain" />
      <div class="absolute top-4 left-4 flex items-center gap-2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold border border-white/20">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
        <span>${activeStream.streamerName || 'ถ่ายทอดสด'}</span>
      </div>
    </div>
  `;
}

// =========================================================================
// 5. APPLE TV CONTROL CENTER DRAWER
// =========================================================================

function toggleLiveControlCenter() {
  window.isLiveControlCenterOpen = !window.isLiveControlCenterOpen;
  const drawer = document.getElementById('liveDashControlCenterDrawer');
  if (!drawer) return;

  if (window.isLiveControlCenterOpen) {
    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
    const drawerPin = document.getElementById('liveDashDrawerPin');
    if (drawerPin) drawerPin.textContent = window.appState?.liveDashboardConfig?.pairingCode || '8429';
  } else {
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');
  }
}

// Settings Modal Handlers
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

function closeLiveDashboardSettingsModal() {
  const modal = document.getElementById('liveDashboardSettingsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function saveLiveDashboardSettings(e) {
  if (e && e.preventDefault) e.preventDefault();

  const concurrencyMode = document.getElementById('liveDashCfgConcurrency')?.value || 'BOTH';
  const showRaiseHandPopup = document.getElementById('liveDashCfgRaiseHand')?.checked ?? true;
  const showPermissionPopup = document.getElementById('liveDashCfgPermission')?.checked ?? true;
  const showRandomizerPopup = document.getElementById('liveDashCfgRandomizer')?.checked ?? true;
  const clockFormat = document.getElementById('liveDashCfgClockFormat')?.value || '24H';
  const theme = document.getElementById('liveDashCfgTheme')?.value || 'DARK';

  const prevConfig = (window.appState && window.appState.liveDashboardConfig) ? window.appState.liveDashboardConfig : {};
  const newConfig = {
    ...prevConfig,
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

function copyLiveDashboardDirectUrl() {
  const urlBox = document.getElementById('liveDashDirectUrlInput');
  const url = urlBox ? urlBox.value : `${window.location.origin}${window.location.pathname}?live=1`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      if (typeof window.showToast === 'function') {
        window.showToast('คัดลอกลิงก์จอ Live Dashboard สำเร็จแล้ว', 'success');
      }
    }).catch(() => {
      fallbackCopyText(url);
    });
  } else {
    fallbackCopyText(url);
  }
}

function copyLiveRemoteDirectUrl() {
  const urlBox = document.getElementById('liveDashRemoteUrlInput');
  const url = urlBox ? urlBox.value : `${window.location.origin}${window.location.pathname}?remote=1`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      if (typeof window.showToast === 'function') {
        window.showToast('คัดลอกลิงก์รีโมตควบคุมสำเร็จแล้ว', 'success');
      }
    }).catch(() => {
      fallbackCopyText(url);
    });
  } else {
    fallbackCopyText(url);
  }
}

function fallbackCopyText(text) {
  try {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    if (typeof window.showToast === 'function') {
      window.showToast('คัดลอกลิงก์สำเร็จแล้ว', 'success');
    }
  } catch (e) {
    if (typeof window.showToast === 'function') {
      window.showToast('ไม่สามารถคัดลอกได้อัตโนมัติ', 'error');
    }
  }
}

// =========================================================================
// 6. APPLE TV REMOTE & PAIRING PIN VERIFICATION
// =========================================================================

function openLiveRemote() {
  const container = document.getElementById('liveRemoteContainer');
  if (!container) return;

  container.classList.remove('hidden');
  container.classList.add('flex');
  window.isLiveRemoteOpen = true;

  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  } catch (e) {}

  checkAndRenderRemoteUI();
}

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

function isRemotePaired() {
  const savedPin = typeof localStorage !== 'undefined' ? localStorage.getItem('comsan_paired_remote_pin') : null;
  const currentPin = window.appState?.liveDashboardConfig?.pairingCode;
  return Boolean(savedPin && (!currentPin || savedPin === currentPin));
}

function checkAndRenderRemoteUI() {
  const body = document.getElementById('liveRemoteBody');
  if (!body) return;

  if (isRemotePaired()) {
    renderPairedAppleTvRemote(body);
  } else {
    renderRemotePinEntry(body);
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Screen 1: Apple TV PIN Entry Screen
 */
function renderRemotePinEntry(container) {
  const digits = window.liveRemoteEnteredPin || '';
  const d0 = digits[0] || '';
  const d1 = digits[1] || '';
  const d2 = digits[2] || '';
  const d3 = digits[3] || '';

  container.innerHTML = `
    <div class="w-full max-w-[340px] bg-zinc-900 border border-zinc-700/60 rounded-[44px] shadow-2xl p-6 flex flex-col justify-between select-none relative overflow-hidden backdrop-blur-2xl text-center h-[92vh] max-h-[680px]">
      
      <!-- Top Bar -->
      <div class="flex items-center justify-between pb-2">
        <div class="w-8"></div>
        <span class="text-xs font-bold text-zinc-400">Apple TV Remote</span>
        <button type="button" onclick="closeLiveRemote()" class="w-9 h-9 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Icon & Instructions -->
      <div class="space-y-3 my-auto">
        <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white mx-auto shadow-2xl">
          <i data-lucide="tv" class="w-10 h-10"></i>
        </div>
        <h2 class="text-2xl font-black text-white">เชื่อมต่อ Live Dashboard</h2>
        <p class="text-xs text-zinc-400 max-w-xs mx-auto">
          ป้อนรหัสจับคู่ 4 หลักที่แสดงอยู่บนหน้าจอ Live Dashboard (ที่มุมขวาบน)
        </p>

        <!-- 4 Digit Boxes -->
        <div id="remotePinBoxes" class="flex items-center justify-center gap-3 pt-3">
          <div class="w-12 h-14 rounded-2xl bg-zinc-800 border-2 ${d0 ? 'border-indigo-500' : 'border-zinc-700'} flex items-center justify-center text-2xl font-black text-white shadow-inner">${d0}</div>
          <div class="w-12 h-14 rounded-2xl bg-zinc-800 border-2 ${d1 ? 'border-indigo-500' : 'border-zinc-700'} flex items-center justify-center text-2xl font-black text-white shadow-inner">${d1}</div>
          <div class="w-12 h-14 rounded-2xl bg-zinc-800 border-2 ${d2 ? 'border-indigo-500' : 'border-zinc-700'} flex items-center justify-center text-2xl font-black text-white shadow-inner">${d2}</div>
          <div class="w-12 h-14 rounded-2xl bg-zinc-800 border-2 ${d3 ? 'border-indigo-500' : 'border-zinc-700'} flex items-center justify-center text-2xl font-black text-white shadow-inner">${d3}</div>
        </div>
        <span id="remotePinErrorText" class="text-xs text-rose-400 font-bold hidden block"></span>
      </div>

      <!-- Numeric Keypad -->
      <div class="grid grid-cols-3 gap-2.5 pt-4 border-t border-zinc-800">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
          <button type="button" onclick="enterRemotePinDigit('${n}')" class="h-12 rounded-2xl bg-zinc-800/90 active:bg-zinc-700 text-white font-black text-xl flex items-center justify-center transition active:scale-95 shadow-md cursor-pointer">
            ${n}
          </button>
        `).join('')}
        <div class="h-12"></div>
        <button type="button" onclick="enterRemotePinDigit('0')" class="h-12 rounded-2xl bg-zinc-800/90 active:bg-zinc-700 text-white font-black text-xl flex items-center justify-center transition active:scale-95 shadow-md cursor-pointer">
          0
        </button>
        <button type="button" onclick="deleteRemotePinDigit()" class="h-12 rounded-2xl bg-zinc-800/90 active:bg-zinc-700 text-zinc-400 active:text-white flex items-center justify-center transition active:scale-95 shadow-md cursor-pointer">
          <i data-lucide="delete" class="w-5 h-5"></i>
        </button>
      </div>

    </div>
  `;
}

function enterRemotePinDigit(digit) {
  if (window.liveRemoteEnteredPin.length >= 4) return;
  window.liveRemoteEnteredPin += digit;
  checkAndRenderRemoteUI();

  if (window.liveRemoteEnteredPin.length === 4) {
    submitRemotePin();
  }
}

function deleteRemotePinDigit() {
  if (window.liveRemoteEnteredPin.length > 0) {
    window.liveRemoteEnteredPin = window.liveRemoteEnteredPin.slice(0, -1);
    checkAndRenderRemoteUI();
  }
}

function submitRemotePin() {
  const pin = window.liveRemoteEnteredPin;
  const correctPin = window.appState?.liveDashboardConfig?.pairingCode;

  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('remote:verifyPin', { pin }, (res) => {
      handlePinVerifyResult(res && res.success);
    });
  } else {
    // Fallback local check
    handlePinVerifyResult(String(pin) === String(correctPin));
  }
}

function handlePinVerifyResult(isSuccess) {
  if (isSuccess) {
    try {
      localStorage.setItem('comsan_paired_remote_pin', window.liveRemoteEnteredPin);
    } catch (e) {}
    if (typeof showToast === 'function') showToast('เชื่อมต่อ Live Dashboard สำเร็จแล้ว!', 'success');
    window.liveRemoteEnteredPin = '';
    checkAndRenderRemoteUI();
  } else {
    const err = document.getElementById('remotePinErrorText');
    if (err) {
      err.textContent = 'รหัสจับคู่ไม่ถูกต้อง กรุณาดูรหัส 4 หลักบนจอใหญ่';
      err.classList.remove('hidden');
    }
    window.liveRemoteEnteredPin = '';
    setTimeout(checkAndRenderRemoteUI, 1200);
  }
}

function unpairRemote() {
  try {
    localStorage.removeItem('comsan_paired_remote_pin');
  } catch (e) {}
  window.liveRemoteEnteredPin = '';
  checkAndRenderRemoteUI();
}

/**
 * Screen 2: Apple TV Remote Controller (Touchpad & D-Pad)
 */
function renderPairedAppleTvRemote(container) {
  const isTouchpad = window.liveRemoteMode === 'TOUCHPAD';
  const pin = window.appState?.liveDashboardConfig?.pairingCode || '8429';

  container.innerHTML = `
    <div class="w-full max-w-[340px] bg-zinc-900 border border-zinc-700/60 rounded-[44px] shadow-2xl p-5 flex flex-col justify-between select-none relative overflow-hidden backdrop-blur-xl h-[92vh] max-h-[700px]">
      
      <!-- Top Remote Header -->
      <div class="flex items-center justify-between pb-3 shrink-0">
        <button type="button" onclick="unpairRemote()" class="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-400 hover:text-white flex items-center justify-center transition shadow-md cursor-pointer" title="เลิกจับคู่ / เปลี่ยน PIN">
          <i data-lucide="unlink" class="w-4 h-4"></i>
        </button>

        <div class="px-3.5 py-1.5 rounded-full bg-zinc-800/90 border border-zinc-700/80 text-white font-bold text-xs flex items-center gap-1.5 shadow-inner">
          <i data-lucide="tv" class="w-3.5 h-3.5 text-indigo-400"></i>
          <span>Live Dashboard (${pin})</span>
        </div>

        <button type="button" onclick="closeLiveRemote()" class="w-10 h-10 rounded-full bg-zinc-800 hover:bg-rose-600 text-zinc-300 hover:text-white active:scale-95 flex items-center justify-center transition shadow-md cursor-pointer" title="ปิดรีโมต">
          <i data-lucide="power" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Mode Switcher Pill -->
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

      <!-- Main Controller Area -->
      <div class="flex-1 flex items-center justify-center my-3 min-h-0">
        ${isTouchpad ? renderRemoteTouchpadHTML() : renderRemoteDpadHTML()}
      </div>

      <!-- Bottom Controls -->
      <div class="space-y-4 shrink-0 pt-2 border-t border-zinc-800/80">
        
        <div class="flex items-center justify-around px-2 text-zinc-400">
          <button type="button" onclick="sendRemoteAction('BACK_10')" class="p-2 hover:text-white active:scale-90 transition cursor-pointer" title="ย้อนหลัง">
            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
          </button>
          <button type="button" onclick="sendRemoteAction('INFO')" class="p-2 hover:text-white active:scale-90 transition cursor-pointer" title="ข้อมูล">
            <i data-lucide="info" class="w-4 h-4"></i>
          </button>
          <button type="button" onclick="sendRemoteAction('TOGGLE_CC')" class="p-2 hover:text-white active:scale-90 transition cursor-pointer" title="Control Center">
            <i data-lucide="sliders" class="w-4 h-4"></i>
          </button>
          <button type="button" onclick="sendRemoteAction('FORWARD_10')" class="p-2 hover:text-white active:scale-90 transition cursor-pointer" title="ไปข้างหน้า">
            <i data-lucide="rotate-cw" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="flex items-center justify-between px-2">
          <!-- Back Button (<) -->
          <button type="button" onclick="sendRemoteAction('BACK')" class="w-14 h-14 rounded-full bg-zinc-800 active:bg-zinc-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer" title="ย้อนกลับ / ปิดแอป">
            <i data-lucide="chevron-left" class="w-6 h-6"></i>
          </button>

          <!-- Play/Pause -->
          <button type="button" onclick="sendRemoteAction('PLAY_PAUSE')" class="w-14 h-14 rounded-full bg-zinc-800 active:bg-zinc-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer" title="เล่น/หยุด หรือหมุนสุ่ม">
            <i data-lucide="play" class="w-5 h-5"></i>
          </button>

          <!-- TV Button (Control Center) -->
          <button type="button" onclick="sendRemoteAction('TOGGLE_CC')" class="w-14 h-14 rounded-full bg-zinc-800 active:bg-zinc-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer" title="Control Center">
            <i data-lucide="tv" class="w-5 h-5"></i>
          </button>
        </div>

      </div>

    </div>
  `;

  if (isTouchpad) {
    bindTouchpadEvents();
  }
}

function setLiveRemoteMode(mode) {
  window.liveRemoteMode = mode;
  try { localStorage.setItem('comsan_remote_mode', mode); } catch (e) {}
  checkAndRenderRemoteUI();
}

function renderRemoteTouchpadHTML() {
  return `
    <div id="liveRemoteTouchArea" class="w-full h-full max-h-[280px] bg-gradient-to-b from-zinc-800/90 to-zinc-900 border border-zinc-700/80 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center text-zinc-500 shadow-inner touch-none cursor-crosshair active:border-indigo-500 transition">
      <div class="w-12 h-12 rounded-full border border-zinc-700/60 flex items-center justify-center mb-2 pointer-events-none">
        <i data-lucide="hand" class="w-5 h-5 text-zinc-400"></i>
      </div>
      <span class="text-xs font-bold text-zinc-400 pointer-events-none">เลื่อนเพื่อควบคุมเคอร์เซอร์</span>
      <span class="text-[10px] text-zinc-500 mt-0.5 pointer-events-none">แตะเพื่อคลิกเลือก</span>
      <div id="remoteTouchpadDot" class="w-6 h-6 rounded-full bg-indigo-500/80 shadow-lg pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2"></div>
    </div>
  `;
}

function renderRemoteDpadHTML() {
  return `
    <div class="w-64 h-64 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-zinc-700/80 relative shadow-2xl flex items-center justify-center">
      <button type="button" onclick="sendRemoteDpad('UP')" class="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-12 rounded-t-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer">
        <i data-lucide="chevron-up" class="w-6 h-6"></i>
      </button>
      <button type="button" onclick="sendRemoteDpad('DOWN')" class="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-12 rounded-b-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer">
        <i data-lucide="chevron-down" class="w-6 h-6"></i>
      </button>
      <button type="button" onclick="sendRemoteDpad('LEFT')" class="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-16 rounded-l-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer">
        <i data-lucide="chevron-left" class="w-6 h-6"></i>
      </button>
      <button type="button" onclick="sendRemoteDpad('RIGHT')" class="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-16 rounded-r-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer">
        <i data-lucide="chevron-right" class="w-6 h-6"></i>
      </button>
      <button type="button" onclick="sendRemoteDpad('SELECT')" class="w-24 h-24 rounded-full bg-zinc-700/90 active:bg-zinc-600 border border-zinc-600 shadow-inner flex items-center justify-center text-white font-black text-sm active:scale-95 transition cursor-pointer">
        <span>OK</span>
      </button>
    </div>
  `;
}

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

  pad.addEventListener('touchend', () => {
    isTouching = false;
    if (dot) dot.classList.add('hidden');
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

function sendRemoteDpad(direction) {
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('remote:dpad', direction);
  }
  if (navigator.vibrate) navigator.vibrate(20);
}

function sendRemoteAction(action) {
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('remote:action', { action });
  }
  if (navigator.vibrate) navigator.vibrate(30);
}

// =========================================================================
// 7. RECEIVERS ON LIVE DASHBOARD (BIG SCREEN)
// =========================================================================

function initLiveRemoteReceivers() {
  if (!window.socket) return;

  // 1. PIN Verified & Connected
  window.socket.on('liveDashboard:remoteConnected', () => {
    if (!window.isLiveDashboardOpen) return;
    if (typeof showToast === 'function') {
      showToast('📱 รีโมตเชื่อมต่อสำเร็จแล้ว!', 'success');
    }
  });

  // PIN Updated broadcast
  window.socket.on('liveDashboard:pinUpdated', (newPin) => {
    if (window.appState && window.appState.liveDashboardConfig) {
      window.appState.liveDashboardConfig.pairingCode = newPin;
    }
    const pinPill = document.getElementById('liveDashPillPin');
    if (pinPill) pinPill.textContent = `📺 PIN: ${newPin}`;
    const drawerPin = document.getElementById('liveDashDrawerPin');
    if (drawerPin) drawerPin.textContent = newPin;
  });

  // Config Updated broadcast
  window.socket.on('liveDashboard:configUpdated', (cfg) => {
    if (window.appState) {
      window.appState.liveDashboardConfig = cfg;
      updateLiveWallpaperDisplay();
      updateLiveDashboardClock();
      const pinPill = document.getElementById('liveDashPillPin');
      if (pinPill) pinPill.textContent = `📺 PIN: ${cfg.pairingCode || '8429'}`;
      const drawerPin = document.getElementById('liveDashDrawerPin');
      if (drawerPin) drawerPin.textContent = cfg.pairingCode || '8429';
    }
  });

  // Remote PIN Verified response
  window.socket.on('remote:pinVerified', (res) => {
    if (res) handlePinVerifyResult(res.success);
  });

  // Remote Open/Close App
  window.socket.on('liveDashboard:openApp', (appId) => {
    if (window.isLiveDashboardOpen) {
      window.liveDashActiveApp = appId;
      renderLiveDashboard();
    }
  });

  window.socket.on('liveDashboard:closeApp', () => {
    if (window.isLiveDashboardOpen) {
      window.liveDashActiveApp = null;
      renderLiveDashboard();
    }
  });

  // 2. Cursor Movement
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

  // 3. Cursor Click
  window.socket.on('liveDashboard:click', () => {
    if (!window.isLiveDashboardOpen) return;
    const cursor = document.getElementById('liveDashRemoteCursor');
    if (cursor) {
      cursor.classList.add('scale-150');
      setTimeout(() => cursor.classList.remove('scale-150'), 200);

      // Trigger click on element under cursor
      const rect = cursor.getBoundingClientRect();
      const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (el && typeof el.click === 'function') {
        el.click();
      }
    }
  });

  // 4. D-Pad Navigation between tvOS Apps
  window.socket.on('liveDashboard:dpad', (direction) => {
    if (!window.isLiveDashboardOpen) return;

    const apps = window.liveDashDockApps || [];
    let cur = window.liveDashFocusedAppIndex || 0;

    if (direction === 'RIGHT') {
      cur = (cur + 1) % apps.length;
    } else if (direction === 'LEFT') {
      cur = (cur - 1 + apps.length) % apps.length;
    } else if (direction === 'UP') {
      toggleLiveControlCenter();
      return;
    } else if (direction === 'DOWN') {
      if (window.isLiveControlCenterOpen) {
        toggleLiveControlCenter();
        return;
      }
    } else if (direction === 'SELECT') {
      const activeApp = apps[cur];
      if (activeApp === 'settings') {
        toggleLiveControlCenter();
      } else {
        openLiveApp(activeApp.toUpperCase());
      }
      return;
    }

    window.liveDashFocusedAppIndex = cur;
    updateDockFocusUI();
  });

  // 5. Remote Action
  window.socket.on('liveDashboard:action', (payload) => {
    if (!window.isLiveDashboardOpen || !payload) return;
    const act = payload.action;

    if (act === 'BACK') {
      if (window.isLiveControlCenterOpen) {
        toggleLiveControlCenter();
      } else if (window.liveDashActiveApp) {
        closeLiveApp();
      } else {
        closeLiveRandomPopup();
        dismissLiveRaiseHand();
      }
    } else if (act === 'TOGGLE_CC') {
      toggleLiveControlCenter();
    } else if (act === 'PLAY_PAUSE') {
      if (window.liveDashActiveApp === 'RANDOM') {
        triggerAdminSpinFromTv();
      }
    }
  });
}

function updateDockFocusUI() {
  const apps = window.liveDashDockApps || [];
  const cur = window.liveDashFocusedAppIndex || 0;

  apps.forEach((app, idx) => {
    const el = document.getElementById(`tvApp_${app}`);
    if (el) {
      if (idx === cur) {
        el.classList.add('scale-115', 'z-20');
        const iconBox = el.querySelector('div');
        if (iconBox) iconBox.classList.add('ring-4', 'ring-white', 'shadow-[0_20px_35px_rgba(255,255,255,0.4)]');
      } else {
        el.classList.remove('scale-115', 'z-20');
        const iconBox = el.querySelector('div');
        if (iconBox) iconBox.classList.remove('ring-4', 'ring-white', 'shadow-[0_20px_35px_rgba(255,255,255,0.4)]');
      }
    }
  });
}

// =========================================================================
// 8. OVERLAYS (RAISE HAND, RANDOMIZER)
// =========================================================================

function renderLiveDashboardOverlays(state, cfg) {
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

  // 2. Randomizer Overlay (Persists with prominent CLOSE button)
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

function updateLiveDashboardStreamFrame(frameDataUrl) {
  if (!window.isLiveDashboardOpen || !frameDataUrl) return;
  const img = document.getElementById('liveDashStreamViewerImg');
  if (img) {
    img.src = frameDataUrl;
  }
}

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

function dismissLiveRaiseHand() {
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:clearQueue');
  }
  if (window.appState) {
    window.appState.raiseHandQueue = [];
    renderLiveDashboard();
  }
}

// Global attachments
window.openLiveDashboard = openLiveDashboard;
window.closeLiveDashboard = closeLiveDashboard;
window.renderLiveDashboard = renderLiveDashboard;
window.openLiveApp = openLiveApp;
window.closeLiveApp = closeLiveApp;
window.toggleLiveControlCenter = toggleLiveControlCenter;
window.setLiveWallpaperMode = setLiveWallpaperMode;
window.promptSetCustomWallpaper = promptSetCustomWallpaper;
window.regenerateLiveDashboardPin = regenerateLiveDashboardPin;
window.openLiveDashboardSettingsModal = openLiveDashboardSettingsModal;
window.closeLiveDashboardSettingsModal = closeLiveDashboardSettingsModal;
window.saveLiveDashboardSettings = saveLiveDashboardSettings;
window.copyLiveDashboardDirectUrl = copyLiveDashboardDirectUrl;
window.copyLiveRemoteDirectUrl = copyLiveRemoteDirectUrl;
window.updateLiveDashboardStreamFrame = updateLiveDashboardStreamFrame;
window.closeLiveRandomPopup = closeLiveRandomPopup;
window.dismissLiveRaiseHand = dismissLiveRaiseHand;
window.triggerAdminSpinFromTv = triggerAdminSpinFromTv;

window.openLiveRemote = openLiveRemote;
window.closeLiveRemote = closeLiveRemote;
window.setLiveRemoteMode = setLiveRemoteMode;
window.enterRemotePinDigit = enterRemotePinDigit;
window.deleteRemotePinDigit = deleteRemotePinDigit;
window.submitRemotePin = submitRemotePin;
window.unpairRemote = unpairRemote;
window.sendRemoteDpad = sendRemoteDpad;
window.sendRemoteAction = sendRemoteAction;
window.initLiveRemoteReceivers = initLiveRemoteReceivers;

if (typeof window !== 'undefined') {
  setTimeout(initLiveRemoteReceivers, 500);
}
