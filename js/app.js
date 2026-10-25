/**
 * COMSAN Meeting System - Application Main Bootstrap
 */

function ensureDummyCheckinSpan() {
  if (!document.getElementById('userCheckinTimeDisplay')) {
    const dummy = document.createElement('span');
    dummy.id = 'userCheckinTimeDisplay';
    dummy.className = 'hidden';
    dummy.textContent = '-';
    document.body.appendChild(dummy);
  }
}

function isMeetingBeforeScheduledTime(m) {
  if (!m || !m.isStarted || m.isEnded) return false;
  if (!m.startTime) return false;
  const now = new Date();
  const localTodayStr = (typeof window.getLocalDateString === 'function')
    ? window.getLocalDateString(now)
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parts = String(m.startTime).split(':');
  const startHour = Number(parts[0]);
  const startMin = Number(parts[1]);
  if (isNaN(startHour) || isNaN(startMin)) return false;
  const startMinutes = startHour * 60 + startMin;

  // 1. If meeting date is in the future
  if (m.date && m.date > localTodayStr) {
    return true;
  }

  // 2. If meeting date is today, compare minutes directly
  if (m.date && m.date === localTodayStr) {
    return currentMinutes < startMinutes;
  }

  // 3. Fallback: If current time is earlier than start time (e.g. 04:00 < 07:00), it is before scheduled time
  if (currentMinutes < startMinutes) {
    return true;
  }

  return false;
}

function updateMeetingTimersAndBanners() {
  const state = window.appState;
  if (!state || !state.meeting) return;
  const m = state.meeting;
  const nowMs = Date.now();
  const todayISO = (typeof window.getLocalDateString === 'function')
    ? window.getLocalDateString()
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const stateBadge = document.getElementById('meetingStateBadge');
  const pulseDot = document.getElementById('meetingPulseDot');
  const sbElapsed = document.getElementById('sidebarElapsedTimer');
  const uElapsed = document.getElementById('timerMeetingElapsed');
  const voteElapsed = document.getElementById('voteElapsedTimerText');
  const adminSetupBadge = document.getElementById('adminSetupStatusBadge');
  const adminNotStartedBanner = document.getElementById('adminNotStartedBanner');

  const userBannerStatusPill = document.getElementById('userBannerStatusPill');
  const heroDot = document.getElementById('heroStatusDot');
  const heroStatusWrapper = document.getElementById('heroStatusWrapper');
  const heroCard = document.getElementById('userMeetingHeroCard');
  const userBannerTitle = document.getElementById('userBannerTitle');
  const userBannerDateTime = document.getElementById('userBannerDateTime');
  const userBannerLocation = document.getElementById('userBannerLocation');
  const homeBottomAgenda = document.getElementById('homeBottomAgendaText');
  const raiseBannerAgenda = document.getElementById('raiseBannerAgendaTitle');
  const raiseBannerBox = document.getElementById('raiseTopBannerBox');
  const raiseBannerIcon = document.getElementById('raiseTopBannerIcon');
  const raiseBannerStatusSub = document.getElementById('raiseBannerStatusSub');
  const raiseBannerCounterWrap = document.getElementById('raiseBannerCounterWrapper');

  // Top Header Branding & Greeting (Desktop Main Header)
  if (typeof window.updateDesktopHeader === 'function') {
    window.updateDesktopHeader();
  }

  const isMeetingActive = Boolean(m.isStarted && !m.isEnded);

  if (!m.isStarted) {
    if (stateBadge) stateBadge.textContent = 'การประชุมยังไม่เริ่ม';
    if (pulseDot) pulseDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
    if (sbElapsed) sbElapsed.textContent = 'ยังไม่เริ่ม';
    if (uElapsed) uElapsed.textContent = 'ยังไม่เริ่ม';
    if (voteElapsed) voteElapsed.textContent = 'ยังไม่เริ่ม';
    if (adminSetupBadge) adminSetupBadge.textContent = 'ยังไม่เริ่มประชุม';
    if (adminNotStartedBanner) adminNotStartedBanner.classList.remove('hidden');
    if (userBannerStatusPill) userBannerStatusPill.textContent = 'ยังไม่มีการประชุม';
    if (heroDot) heroDot.className = 'w-2 h-2 rounded-full bg-slate-300';
    if (heroStatusWrapper) heroStatusWrapper.className = 'inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300';
    if (raiseBannerBox) raiseBannerBox.className = 'bg-muted/40 border border-border rounded-2xl p-4 flex items-center justify-between gap-3';
    if (raiseBannerIcon) {
      if (typeof window.updateIcon === 'function') {
        window.updateIcon(raiseBannerIcon, 'clock', 'text-muted-foreground text-lg shrink-0');
      } else {
        raiseBannerIcon.setAttribute('data-lucide', 'clock');
        raiseBannerIcon.className = 'text-muted-foreground text-lg shrink-0';
      }
    }
    if (raiseBannerStatusSub) {
      raiseBannerStatusSub.textContent = 'การประชุมยังไม่เริ่ม';
      raiseBannerStatusSub.className = 'text-[11px] font-bold text-muted-foreground';
    }
    if (raiseBannerAgenda) {
      raiseBannerAgenda.textContent = 'ยังไม่มีวาระที่กำลังพิจารณา (รอเปิดประชุม)';
      raiseBannerAgenda.className = 'text-xs sm:text-sm font-semibold text-muted-foreground truncate';
    }
    if (raiseBannerCounterWrap) raiseBannerCounterWrap.className = 'text-xs font-bold text-muted-foreground shrink-0';
  } else if (m.isEnded) {
    if (stateBadge) stateBadge.textContent = 'จบการประชุมแล้ว';
    if (pulseDot) pulseDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    if (sbElapsed) sbElapsed.textContent = 'จบการประชุม';
    if (uElapsed) uElapsed.textContent = 'จบการประชุม';
    if (voteElapsed) voteElapsed.textContent = 'จบการประชุม';
    if (adminSetupBadge) adminSetupBadge.textContent = 'จบการประชุมแล้ว';
    if (adminNotStartedBanner) adminNotStartedBanner.classList.add('hidden');
    if (userBannerStatusPill) userBannerStatusPill.textContent = 'จบการประชุมแล้ว';
    if (heroDot) heroDot.className = 'w-2 h-2 rounded-full bg-rose-400';
    if (heroStatusWrapper) heroStatusWrapper.className = 'inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300';
    if (raiseBannerBox) raiseBannerBox.className = 'bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between gap-3';
    if (raiseBannerIcon) {
      if (typeof window.updateIcon === 'function') {
        window.updateIcon(raiseBannerIcon, 'check-circle-2', 'text-rose-500 text-lg shrink-0');
      } else {
        raiseBannerIcon.setAttribute('data-lucide', 'check-circle-2');
        raiseBannerIcon.className = 'text-rose-500 text-lg shrink-0';
      }
    }
    if (raiseBannerStatusSub) {
      raiseBannerStatusSub.textContent = 'จบการประชุมแล้ว';
      raiseBannerStatusSub.className = 'text-[11px] font-bold text-rose-500';
    }
    if (raiseBannerAgenda) {
      raiseBannerAgenda.textContent = m.title || 'การประชุมเสร็จสิ้นแล้ว';
      raiseBannerAgenda.className = 'text-xs sm:text-sm font-semibold text-foreground truncate';
    }
    if (raiseBannerCounterWrap) raiseBannerCounterWrap.className = 'text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0';
  } else {
    const startMs = m.startedAtMs || nowMs;
    const elapsedMin = Math.max(0, Math.floor((nowMs - startMs) / 60000));
    const isBeforeTime = isMeetingBeforeScheduledTime(m);
    const startDisplayTime = m.startTime || '07:00';

    if (isBeforeTime) {
      if (stateBadge) stateBadge.textContent = `เปิดห้องล่วงหน้า (เริ่มประชุม ${startDisplayTime} น.)`;
      if (pulseDot) pulseDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
      if (sbElapsed) sbElapsed.textContent = `รอเริ่ม (${startDisplayTime} น.)`;
      if (uElapsed) uElapsed.textContent = `รอเริ่ม (${startDisplayTime} น.)`;
      if (voteElapsed) voteElapsed.textContent = `รอเริ่ม (${startDisplayTime} น.)`;
      if (adminSetupBadge) adminSetupBadge.textContent = `เปิดห้องล่วงหน้า (เริ่ม ${startDisplayTime} น.)`;
      if (adminNotStartedBanner) adminNotStartedBanner.classList.add('hidden');
      if (userBannerStatusPill) userBannerStatusPill.textContent = `ยังไม่ถึงเวลาประชุม (เริ่ม ${startDisplayTime} น.)`;
      if (heroDot) heroDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping';
      if (heroStatusWrapper) {
        heroStatusWrapper.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30';
        heroStatusWrapper.innerHTML = `<span id="heroStatusDot" class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> <span>เปิดห้องล่วงหน้า (เริ่ม ${startDisplayTime} น.)</span>`;
      }
    } else {
      if (stateBadge) stateBadge.textContent = 'กำลังดำเนินการประชุม';
      if (pulseDot) pulseDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse';
      if (sbElapsed) sbElapsed.textContent = `${elapsedMin} นาที`;
      if (uElapsed) uElapsed.textContent = `${elapsedMin} นาที`;
      if (voteElapsed) voteElapsed.textContent = `${elapsedMin} นาที`;
      if (adminSetupBadge) adminSetupBadge.textContent = 'กำลังดำเนินการประชุม';
      if (adminNotStartedBanner) adminNotStartedBanner.classList.add('hidden');
      if (userBannerStatusPill) userBannerStatusPill.textContent = 'กำลังประชุม';
      if (heroDot) heroDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
      if (heroStatusWrapper) {
        heroStatusWrapper.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
        heroStatusWrapper.innerHTML = '<span id="heroStatusDot" class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> <span>กำลังประชุม</span>';
      }
    }

    const activeMot = (state.motions || []).find(mot => mot.isOpen);
    if (isBeforeTime) {
      if (raiseBannerBox) raiseBannerBox.className = 'bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3';
      if (raiseBannerIcon) {
        if (typeof window.updateIcon === 'function') {
          window.updateIcon(raiseBannerIcon, 'clock', 'text-amber-500 text-lg shrink-0');
        } else {
          raiseBannerIcon.setAttribute('data-lucide', 'clock');
          raiseBannerIcon.className = 'text-amber-500 text-lg shrink-0';
        }
      }
      if (raiseBannerStatusSub) {
        raiseBannerStatusSub.textContent = `เปิดห้องล่วงหน้า (เริ่มประชุม ${startDisplayTime} น.) - เช็คชื่อล่วงหน้าได้`;
        raiseBannerStatusSub.className = 'text-[11px] font-bold text-amber-600 dark:text-amber-400';
      }
      if (raiseBannerAgenda) {
        raiseBannerAgenda.textContent = activeMot ? `ญัตติ: ${activeMot.title}` : (m.title || 'การประชุมชมรมสันทนาการ (COMSAN)');
        raiseBannerAgenda.className = 'text-xs sm:text-sm font-bold text-foreground truncate';
      }
      if (raiseBannerCounterWrap) raiseBannerCounterWrap.className = 'text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0';
    } else {
      if (raiseBannerBox) raiseBannerBox.className = 'bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3';
      if (raiseBannerIcon) {
        if (typeof window.updateIcon === 'function') {
          window.updateIcon(raiseBannerIcon, 'activity', 'text-emerald-600 dark:text-emerald-400 text-lg shrink-0');
        } else {
          raiseBannerIcon.setAttribute('data-lucide', 'activity');
          raiseBannerIcon.className = 'text-emerald-600 dark:text-emerald-400 text-lg shrink-0';
        }
      }
      if (raiseBannerStatusSub) {
        raiseBannerStatusSub.textContent = activeMot ? 'กำลังพิจารณาในที่ประชุม' : 'กำลังดำเนินการประชุม';
        raiseBannerStatusSub.className = 'text-[11px] font-bold text-emerald-600 dark:text-emerald-400';
      }
      if (raiseBannerAgenda) {
        raiseBannerAgenda.textContent = activeMot ? `ญัตติ: ${activeMot.title}` : (m.title || 'การประชุมชมรมสันทนาการ (COMSAN)');
        raiseBannerAgenda.className = 'text-xs sm:text-sm font-bold text-foreground truncate';
      }
      if (raiseBannerCounterWrap) raiseBannerCounterWrap.className = 'text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0';
    }
  }

  // Synchronize Admin Meeting Setup Toggle Switch & Label
  const adminMeetingToggleSwitch = document.getElementById('adminMeetingToggleSwitch');
  const adminMeetingToggleLabel = document.getElementById('adminMeetingToggleLabel');
  if (adminMeetingToggleSwitch) {
    adminMeetingToggleSwitch.checked = isMeetingActive;
  }
  if (adminMeetingToggleLabel) {
    if (isMeetingActive) {
      if (isMeetingBeforeScheduledTime(m)) {
        adminMeetingToggleLabel.textContent = `เปิดห้องล่วงหน้า (เริ่มประชุม ${m.startTime || '07:00'} น.)`;
        adminMeetingToggleLabel.className = 'text-xs font-bold text-amber-600 dark:text-amber-400 select-none';
      } else {
        adminMeetingToggleLabel.textContent = 'กำลังประชุม (เปิดอยู่)';
        adminMeetingToggleLabel.className = 'text-xs font-bold text-emerald-600 dark:text-emerald-400 select-none';
      }
    } else if (m.isEnded) {
      adminMeetingToggleLabel.textContent = 'จบการประชุมแล้ว';
      adminMeetingToggleLabel.className = 'text-xs font-bold text-rose-500 select-none';
    } else {
      adminMeetingToggleLabel.textContent = 'เปิดการประชุม';
      adminMeetingToggleLabel.className = 'text-xs font-bold text-foreground select-none';
    }
  }

  // Hero Card UI elements (Unified for Online & On-site)
  const onlineContainer = document.getElementById('userBannerOnlineContainer');
  const onlineBtn = document.getElementById('userBannerOnlineBtn');
  const onlineIcon = document.getElementById('userBannerOnlineIcon');
  const onlineLabel = document.getElementById('userBannerOnlineLabel');
  const passcodeTag = document.getElementById('userBannerPasscodeTag');
  const passcodeText = document.getElementById('userBannerPasscodeText');
  const onsiteLocationTag = document.getElementById('userBannerOnsiteLocationTag');
  const onsiteLocationText = document.getElementById('userBannerOnsiteLocationText');

  const heroOnsiteQrWrapper = document.getElementById('heroOnsiteQrWrapper');
  const heroOnlineCheckinAction = document.getElementById('heroOnlineCheckinAction');
  const heroOnlineNotCheckedInBox = document.getElementById('heroOnlineNotCheckedInBox');
  const heroOnlineCheckedInBox = document.getElementById('heroOnlineCheckedInBox');
  const heroOnlineCheckinTime = document.getElementById('heroOnlineCheckinTime');
  const heroOnlineCheckinBtn = document.getElementById('heroOnlineCheckinBtn');
  const heroOnsiteCheckinBtn = document.getElementById('heroOnsiteCheckinBtn');

  function getOnlinePlatformInfo(platform) {
    switch (platform) {
      case 'ZOOM':
        return { name: 'Zoom Meeting', icon: '<i data-lucide="video" class="w-4 h-4 text-blue-500"></i>' };
      case 'TEAMS':
        return { name: 'Microsoft Teams', icon: '<i data-lucide="users" class="w-4 h-4 text-indigo-500"></i>' };
      case 'DISCORD':
        return { name: 'Discord', icon: '<i data-lucide="message-square" class="w-4 h-4 text-violet-500"></i>' };
      case 'OTHER':
        return { name: 'ห้องประชุมออนไลน์', icon: '<i data-lucide="globe" class="w-4 h-4 text-amber-500"></i>' };
      case 'GOOGLE_MEET':
      default:
        return { name: 'Google Meet', icon: '<i data-lucide="video" class="w-4 h-4 text-emerald-500"></i>' };
    }
  }

  // Hero Card Display Logic (Active vs Inactive)
  if (isMeetingActive) {
    if (heroCard) {
      heroCard.classList.add('gradient-hero');
      heroCard.classList.remove('hero-card-gray');
    }
    if (userBannerTitle) userBannerTitle.textContent = m.title || 'การประชุมชมรมสันทนาการ (COMSAN)';
    if (userBannerDateTime) userBannerDateTime.textContent = `${m.date || todayISO} • ${m.startTime || '17:00'}–${m.endTime || '19:00'} น. (ตัดสาย ${m.lateTime || '17:15'} น.)`;

    const heroUserCheckinPill = document.getElementById('heroUserCheckinPill');
    if (heroUserCheckinPill) heroUserCheckinPill.classList.remove('hidden');

    const heroOnlineBadge = document.getElementById('heroOnlineBadge');
    const heroOnlinePlatformLabel = document.getElementById('heroOnlinePlatformLabel');

    // Show the bottom action container in both formats
    if (onlineContainer) {
      onlineContainer.classList.remove('hidden');
      onlineContainer.classList.add('flex');
    }

    if (m.format === 'ONLINE') {
      if (userBannerLocation) {
        userBannerLocation.classList.add('hidden');
        userBannerLocation.textContent = '';
      }
      if (onsiteLocationTag) onsiteLocationTag.classList.add('hidden');
      if (onlineBtn) {
        onlineBtn.classList.remove('hidden');
        onlineBtn.classList.add('inline-flex');
        const pInfo = getOnlinePlatformInfo(m.onlinePlatform);
        if (onlineIcon) onlineIcon.innerHTML = pInfo.icon;
        if (onlineLabel) onlineLabel.textContent = `เข้าสู่การประชุม (${pInfo.name})`;
        onlineBtn.href = m.onlineUrl || '#';
        onlineBtn.setAttribute('title', `เปิดลิงก์การประชุม: ${m.onlineUrl}`);
      }
      if (heroOnlineBadge) {
        heroOnlineBadge.classList.remove('hidden');
        heroOnlineBadge.classList.add('inline-flex');
      }
      if (heroOnlinePlatformLabel) {
        const pInfo = getOnlinePlatformInfo(m.onlinePlatform);
        heroOnlinePlatformLabel.textContent = pInfo.name;
      }
      if (m.onlinePasscode && passcodeTag && passcodeText) {
        passcodeTag.classList.remove('hidden');
        passcodeTag.classList.add('inline-flex');
        passcodeText.textContent = m.onlinePasscode;
      } else if (passcodeTag) {
        passcodeTag.classList.add('hidden');
        passcodeTag.classList.remove('inline-flex');
      }
      if (heroOnlineCheckinBtn) heroOnlineCheckinBtn.classList.remove('hidden');
      if (heroOnsiteCheckinBtn) heroOnsiteCheckinBtn.classList.add('hidden');
    } else {
      // On-site format: รายละเอียดสถานที่เต็มอยู่ใต้หัวข้อ ส่วนชื่อห้องอยู่บนปุ่มด้านล่าง
      if (userBannerLocation) {
        userBannerLocation.classList.remove('hidden');
        const fullDetail = (m.locationDetail || m.location || 'ห้องประชุมชมรมคมสัน').trim();
        userBannerLocation.textContent = `สถานที่: ${fullDetail}`;
      }
      if (onlineBtn) {
        onlineBtn.classList.add('hidden');
        onlineBtn.classList.remove('inline-flex');
      }
      if (passcodeTag) {
        passcodeTag.classList.add('hidden');
        passcodeTag.classList.remove('inline-flex');
      }
      if (heroOnlineBadge) {
        heroOnlineBadge.classList.add('hidden');
        heroOnlineBadge.classList.remove('inline-flex');
      }
      if (onsiteLocationTag) {
        onsiteLocationTag.classList.remove('hidden');
        onsiteLocationTag.classList.add('inline-flex');
        if (onsiteLocationText) {
          const roomName = (m.location || 'ห้องประชุมชมรมคมสัน').trim();
          onsiteLocationText.textContent = roomName.startsWith('ห้องประชุม') ? roomName : `ห้องประชุม: ${roomName}`;
        }
      }
      if (heroOnlineCheckinBtn) heroOnlineCheckinBtn.classList.add('hidden');
      if (heroOnsiteCheckinBtn) heroOnsiteCheckinBtn.classList.remove('hidden');
    }

    // Hide old large QR wrapper and quick actions row for onsite too
    if (heroOnsiteQrWrapper) heroOnsiteQrWrapper.classList.add('hidden');
    const heroQuickActionsRow = document.getElementById('heroQuickActionsRow');
    if (heroQuickActionsRow) heroQuickActionsRow.classList.add('hidden');

    // Show check-in action box
    if (heroOnlineCheckinAction) {
      heroOnlineCheckinAction.classList.remove('hidden');
      heroOnlineCheckinAction.classList.add('flex');
    }

    // Check-in state evaluation (shared for both Online & On-site)
    const meUser = (state.users || []).find(u => u.id === window.currentUserId);
    if (meUser && meUser.checkedIn) {
      if (heroOnlineNotCheckedInBox) heroOnlineNotCheckedInBox.classList.add('hidden');
      if (heroOnlineCheckedInBox) {
        heroOnlineCheckedInBox.classList.remove('hidden');
        heroOnlineCheckedInBox.classList.add('inline-flex');
        if (meUser.isLate) {
          heroOnlineCheckedInBox.className = 'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/25 border border-amber-400/50 text-amber-200 text-xs font-semibold backdrop-blur-xs';
          heroOnlineCheckedInBox.innerHTML = `
            <i data-lucide="clock" class="h-4 w-4 text-amber-300"></i>
            <span>เช็คชื่อแล้ว (มาสาย)</span>
            <span id="heroOnlineCheckinTime" class="font-mono text-[11px] opacity-90">${meUser.checkInTimeStr ? `(${meUser.checkInTimeStr} น.)` : ''}</span>
          `;
        } else {
          heroOnlineCheckedInBox.className = 'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold backdrop-blur-xs';
          heroOnlineCheckedInBox.innerHTML = `
            <i data-lucide="check-circle-2" class="h-4 w-4 text-emerald-400"></i>
            <span>เช็คชื่อเรียบร้อย</span>
            <span id="heroOnlineCheckinTime" class="font-mono text-[11px] opacity-80">${meUser.checkInTimeStr ? `(${meUser.checkInTimeStr} น.)` : ''}</span>
          `;
        }
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      }
      if (heroUserCheckinPill) {
        if (meUser.isLate) {
          heroUserCheckinPill.textContent = 'เช็คชื่อแล้ว (มาสาย)';
          heroUserCheckinPill.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/25 text-amber-200 border border-amber-400/50 backdrop-blur-xs';
        } else {
          heroUserCheckinPill.textContent = 'เช็คชื่อแล้ว';
          heroUserCheckinPill.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-xs';
        }
      }
    } else {
      if (heroOnlineNotCheckedInBox) {
        heroOnlineNotCheckedInBox.classList.remove('hidden');
        heroOnlineNotCheckedInBox.classList.add('flex');
      }
      if (heroOnlineCheckedInBox) {
        heroOnlineCheckedInBox.classList.add('hidden');
        heroOnlineCheckedInBox.classList.remove('inline-flex');
      }
      if (heroUserCheckinPill) {
        heroUserCheckinPill.textContent = 'ยังไม่เช็คชื่อ';
        heroUserCheckinPill.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-xs';
      }
    }
  } else {
    // When no meeting is active
    if (heroCard) {
      heroCard.classList.remove('gradient-hero');
      heroCard.classList.add('hero-card-gray');
    }
    const heroOnlineBadge = document.getElementById('heroOnlineBadge');
    if (heroOnlineBadge) heroOnlineBadge.classList.add('hidden');
    const heroUserCheckinPill = document.getElementById('heroUserCheckinPill');
    if (heroUserCheckinPill) heroUserCheckinPill.classList.add('hidden');
    if (userBannerTitle) userBannerTitle.textContent = 'ยังไม่มีการประชุมในขณะนี้';
    if (userBannerDateTime) userBannerDateTime.textContent = `การประชุมล่าสุด: ${m.title || '-'}`;
    if (userBannerLocation) {
      userBannerLocation.classList.remove('hidden');
      userBannerLocation.textContent = `วันเวลาที่จัด: ${m.date || todayISO} • ${m.startTime || '17:00'}–${m.endTime || '19:00'} น.`;
    }
    if (onlineContainer) {
      onlineContainer.classList.add('hidden');
      onlineContainer.classList.remove('flex');
    }
    if (heroOnsiteQrWrapper) heroOnsiteQrWrapper.classList.add('hidden');
    const heroQuickActionsRow = document.getElementById('heroQuickActionsRow');
    if (heroQuickActionsRow) heroQuickActionsRow.classList.add('hidden');
    if (heroOnlineCheckinAction) heroOnlineCheckinAction.classList.add('hidden');
  }

  const openMot = (state.motions || []).find(mot => mot.isOpen);
  const agendaLabel = openMot ? `ญัตติ: ${openMot.title}` : (m.title || 'การประชุมชมรมสันทนาการ (COMSAN)');
  if (homeBottomAgenda) homeBottomAgenda.textContent = agendaLabel;

  if (typeof updateUserActiveEventsBanner === 'function') {
    updateUserActiveEventsBanner(state);
  }

  if (window.currentUserId) {
    const me = (state.users || []).find(u => u.id === window.currentUserId);
    const elUserAttended = document.getElementById('timerUserAttended');
    if (me && elUserAttended) {
      if (m.isStarted && !m.isEnded && me.checkedIn && me.checkInTimestamp && !me.isLeave) {
        const baseTime = Math.max(me.checkInTimestamp, m.startedAtMs || me.checkInTimestamp);
        me.attendedMinutes = Math.max(1, Math.floor((nowMs - baseTime) / 60000));
      }
      elUserAttended.textContent = me.checkedIn ? `${me.attendedMinutes || 1} นาที` : '0 นาที';
    }
  }

  // Admin notes list
  const notesListEl = document.getElementById('adminNotesList');
  const notesCountBadge = document.getElementById('adminNotesCountBadge');
  if (notesListEl) {
    const usersWithNotes = (state.users || []).filter(u => u.note && u.note.trim() !== '');
    if (notesCountBadge) notesCountBadge.textContent = `${usersWithNotes.length} โน้ต`;
    notesListEl.innerHTML = usersWithNotes.length === 0
      ? `<p class="text-xs text-muted-foreground text-center py-12"><i data-lucide="sticky-note" class="w-8 h-8 mb-2 text-muted-foreground/40 block mx-auto"></i>ยังไม่มีโน้ตที่บันทึกเข้ามา</p>`
      : usersWithNotes.map(u => `
          <div class="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs hover:border-primary/40 transition">
            <div class="flex items-center gap-3 overflow-hidden min-w-0">
              <div onclick="openMemberProfilePopup('${u.id}')" class="cursor-pointer shrink-0 hover:scale-105 transition" title="คลิกดูข้อมูล ${u.nickname}">
                ${typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u, 'w-10 h-10 rounded-full') : `<div class="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">${(u.nickname || u.firstName || 'U')[0]}</div>`}
              </div>
              <div class="overflow-hidden min-w-0">
                <div class="flex items-center gap-2">
                  <span onclick="openMemberProfilePopup('${u.id}')" class="text-xs font-bold text-foreground cursor-pointer hover:underline">${u.nickname}</span>
                  <span class="text-[11px] text-muted-foreground truncate">(${u.firstName} ${u.lastName})</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">${u.position}</span>
                </div>
                <p class="text-xs text-muted-foreground mt-1 line-clamp-2">${u.note}</p>
              </div>
            </div>
            <button type="button" onclick="generatePDFForUser('${u.id}')" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shrink-0 shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="file-text" class="w-3.5 h-3.5"></i> <span>PDF</span>
            </button>
          </div>
        `).join('');
  }

  // Today's Calendar Event Banner (above recommended card)
  if (typeof window.renderTodayEventsBanner === 'function') {
    window.renderTodayEventsBanner();
  }
}

/**
 * Real-time Active Events Banner (ย้ายมาไว้บนสุด แสดงเฉพาะเมื่อมีเหตุการณ์สำคัญ เช่น กำลังเปิดโหวต หรือกำลังถ่ายทอดสด)
 */
function handleGoToStream() {
  if (typeof window.switchUserTab === 'function') {
    window.switchUserTab('HOME');
  }
  if (typeof window.switchUserToolSubTab === 'function') {
    window.switchUserToolSubTab('STREAM');
  }
  setTimeout(() => {
    const streamSec = document.getElementById('uToolSec_STREAM');
    if (streamSec) {
      streamSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

function updateUserActiveEventsBanner(state) {
  const container = document.getElementById('userActiveEventsContainer');
  if (!container) return;

  if (!state) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  const items = [];

  // 1. ตรวจสอบว่ามีการเปิดโหวต / ลงมติอยู่หรือไม่ (Active Motions)
  const openMotions = (state.motions || []).filter(mot => mot.isOpen);
  if (openMotions.length > 0) {
    const activeMot = openMotions[openMotions.length - 1];
    const moreCount = openMotions.length - 1;
    const moreBadge = moreCount > 0 
      ? ` <span class="text-[11px] font-normal text-muted-foreground">(และอีก ${moreCount} ญัตติที่เปิดอยู่)</span>` 
      : '';

    items.push(`
      <div onclick="switchUserTab('VOTE')" class="cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 transition shadow-xs active:scale-[0.99] group">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <i data-lucide="activity" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>สถานะวาระปัจจุบัน • คลิกเพื่อไปหน้าลงเสียง</span>
            </p>
            <p id="homeBottomAgendaText" class="text-xs sm:text-sm font-bold text-foreground truncate mt-0.5">ญัตติ: ${activeMot.title}${moreBadge}</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
          <span class="hidden sm:inline text-[11px] font-semibold">ลงคะแนน</span>
          <i data-lucide="chevron-right" class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"></i>
        </div>
      </div>
    `);
  }

  // 2. ตรวจสอบว่ากำลังมีคนถ่ายทอดสดหรือแชร์หน้าจออยู่หรือไม่ (Live Streaming / Screen Sharing)
  const actStream = state.activeStream;
  const isStreaming = Boolean(actStream && (actStream.frameDataUrl || actStream.streamerName));
  if (isStreaming) {
    const isScreen = actStream.mode === 'SCREEN';
    const streamer = actStream.streamerName || 'ผู้ดำเนินการ';
    const streamTitle = `${streamer} กำลัง${isScreen ? 'แชร์หน้าจอคอมพิวเตอร์' : 'ถ่ายทอดสดกล้อง'}`;

    items.push(`
      <div onclick="handleGoToStream()" class="cursor-pointer bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 transition shadow-xs active:scale-[0.99] group">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <i data-lucide="${isScreen ? 'monitor' : 'video'}" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <p class="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>กำลังมีการถ่ายทอดสด • คลิกเพื่อรับชม</span>
            </p>
            <p class="text-xs sm:text-sm font-bold text-foreground truncate mt-0.5">${streamTitle}</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs shrink-0">
          <span class="hidden sm:inline text-[11px] font-semibold">รับชมสัญญาณสด</span>
          <i data-lucide="chevron-right" class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"></i>
        </div>
      </div>
    `);
  }

  if (items.length > 0) {
    container.innerHTML = items.join('');
    container.classList.remove('hidden');
  } else {
    container.innerHTML = '';
    container.classList.add('hidden');
  }
}

function renderAll() {
  try {
    ensureDummyCheckinSpan();
    const state = window.appState;
    if (!state || !state.meeting) return;
    const m = state.meeting;
    const todayISO = (typeof window.getLocalDateString === 'function')
    ? window.getLocalDateString()
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    const sbCutoff = document.getElementById('sidebarCutoffTime');
    if (sbCutoff) sbCutoff.textContent = `${m.lateTime} น.`;

    const titleIn = document.getElementById('cfgMeetingTitle');
    const locIn = document.getElementById('cfgMeetingLocation');
    const locDetailIn = document.getElementById('cfgMeetingLocationDetail');
    const onlineDetailIn = document.getElementById('cfgOnlineMeetingDetail');
    const dateIn = document.getElementById('cfgMeetingDate');
    const startIn = document.getElementById('cfgStartTime');
    const lateIn = document.getElementById('cfgLateTime');
    const endIn = document.getElementById('cfgEndTime');

    if (titleIn && document.activeElement !== titleIn) titleIn.value = m.title || '';
    if (locIn && document.activeElement !== locIn) locIn.value = m.location || '';
    if (locDetailIn && document.activeElement !== locDetailIn) locDetailIn.value = m.locationDetail || '';
    if (onlineDetailIn && document.activeElement !== onlineDetailIn) onlineDetailIn.value = m.locationDetail || '';
    if (dateIn && document.activeElement !== dateIn) dateIn.value = m.date || todayISO;
    if (startIn && document.activeElement !== startIn) startIn.value = m.startTime || '17:00';
    if (lateIn && document.activeElement !== lateIn) lateIn.value = m.lateTime || '17:15';
    if (endIn && document.activeElement !== endIn) endIn.value = m.endTime || '19:00';

    const totalUsersEl = document.getElementById('totalImportedUsers');
    if (totalUsersEl) totalUsersEl.textContent = (state.users || []).length;

    const rtVoteEl = document.getElementById('toggleRealtimeVote');
    if (rtVoteEl) rtVoteEl.checked = Boolean(m.realtimeVoting);

    const showSeatsEl = document.getElementById('toggleShowSeatsToUsers');
    if (showSeatsEl) showSeatsEl.checked = m.showSeatsToUsers !== false;

    const openMotionsCount = (state.motions || []).filter(mot => mot.isOpen).length;
    const uBadgeVote = document.getElementById('uBadge_VOTE');
    if (uBadgeVote) uBadgeVote.textContent = openMotionsCount;
    const mBadgeVote = document.getElementById('mBadge_VOTE');
    if (mBadgeVote) {
      mBadgeVote.textContent = openMotionsCount;
      mBadgeVote.classList.toggle('hidden', openMotionsCount === 0);
      if (openMotionsCount > 0) mBadgeVote.classList.add('flex');
    }

    const aQueueBadge = document.getElementById('aBadge_QUEUE');
    if (aQueueBadge) aQueueBadge.textContent = (state.raiseHandQueue || []).length;

    // Randomizer history
    if (state.randomizer && state.randomizer.lastWinner) {
      const lw = state.randomizer.lastWinner;
      const uRandText = document.getElementById('userRandomLastWinnerText');
      if (uRandText) uRandText.textContent = `🎉 ${lw.winnerLabel} (${lw.time})`;
    }
    const historyHTML = (state.randomizer && Array.isArray(state.randomizer.history) && state.randomizer.history.length > 0)
      ? state.randomizer.history.map((h, idx) => `<div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"><span class="font-bold"><span class="text-indigo-600 mr-1">#${idx + 1}</span> 🎉 ${h.winnerLabel}</span><span class="text-[11px] text-slate-400">${h.time}</span></div>`).join('')
      : `<p class="text-slate-400 text-center py-4">ยังไม่มีประวัติการสุ่มในรอบนี้</p>`;
    const adminRandList = document.getElementById('adminRandomHistoryList');
    const userRandList = document.getElementById('userRandomHistoryList');
    if (adminRandList) adminRandList.innerHTML = historyHTML;
    if (userRandList) userRandList.innerHTML = historyHTML;

    // Component renders
    if (typeof window.renderParliamentSeats === 'function') window.renderParliamentSeats();
    if (typeof window.renderUserProfile === 'function') window.renderUserProfile();
    if (typeof window.renderFloatingChat === 'function') window.renderFloatingChat(false);
    if (typeof window.renderAdminChatSection === 'function') window.renderAdminChatSection(false);
    if (typeof window.renderFileDropSection === 'function') window.renderFileDropSection();
    if (typeof window.renderStreamSection === 'function') window.renderStreamSection();
    if (typeof window.renderSummarySection === 'function') window.renderSummarySection();
    if (typeof window.updateRaiseHandUserUI === 'function') window.updateRaiseHandUserUI();
    if (typeof window.checkOpenMotionsPopup === 'function') window.checkOpenMotionsPopup();
    if (typeof window.renderAdminAnalyticsChart === 'function' && window.currentRole === 'ADMIN') window.renderAdminAnalyticsChart();
    if (typeof window.renderTodayEventsBanner === 'function') window.renderTodayEventsBanner();

    // Admin motions list
    const adminMotionsEl = document.getElementById('adminMotionsList');
    if (adminMotionsEl) {
      const rawMotions = state.motions || [];
      const sortedAdminMotions = [...rawMotions].sort((a, b) => {
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        return 0;
      });
      adminMotionsEl.innerHTML = rawMotions.length === 0
        ? `<p class="text-xs text-slate-400 text-center py-6">ยังไม่มีญัตติในการประชุมนี้</p>`
        : sortedAdminMotions.map(mot => {
            const opts = typeof window.getMotionOptions === 'function' ? window.getMotionOptions(mot) : (mot.options || []);
            const votesVals = Object.values(mot.votes || {});
            const showScore = m.realtimeVoting || !mot.isOpen;
            return `
              <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 ${!mot.isOpen ? 'opacity-70' : ''}">
                <div class="flex justify-between items-center gap-2">
                  <h4 class="text-sm font-bold text-slate-900 dark:text-white">${mot.title} ${mot.isSecret ? '<span class="text-xs text-purple-500 font-bold ml-1">(โหวตลับ)</span>' : ''}</h4>
                  <div class="flex gap-1.5 shrink-0">
                    <button type="button" onclick="toggleMotionStatus('${mot.id}')"
                      class="px-3 py-1.5 rounded-xl ${mot.isOpen ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'} text-xs transition shadow-2xs active:scale-95 flex items-center gap-1.5 cursor-pointer">
                      <i data-lucide="${mot.isOpen ? 'lock' : 'unlock'}" class="w-3.5 h-3.5"></i>
                      <span>${mot.isOpen ? 'ปิดโหวต' : 'เปิดอีกครั้ง'}</span>
                    </button>
                    <button type="button" onclick="deleteMotion('${mot.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 text-xs transition active:scale-95 flex items-center justify-center cursor-pointer" title="ลบญัตติ"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline-block"></i></button>
                  </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  ${opts.map(o => `<div class="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center"><span class="truncate">${o.label}</span><strong class="text-indigo-600 font-bold">${showScore ? votesVals.filter(v => v === o.id).length : 'ซ่อน'}</strong></div>`).join('')}
                </div>
              </div>
            `;
          }).join('');
    }

    // Admin Raise Hand Queue List
    const queueCountEl = document.getElementById('queueCount');
    const queueListEl = document.getElementById('raiseHandQueueList');
    if (queueCountEl) queueCountEl.textContent = (state.raiseHandQueue || []).length;
    if (queueListEl) {
      queueListEl.innerHTML = (state.raiseHandQueue || []).length === 0
        ? `<p class="text-xs text-muted-foreground text-center py-12"><i data-lucide="hand" class="w-8 h-8 mb-2 mx-auto text-muted-foreground/40 block"></i>ขณะนี้ยังไม่มีผู้ยกมือในคิว</p>`
        : (state.raiseHandQueue || []).map((q, i) => `
          <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center text-xs shadow-2xs">
            <div class="flex items-center gap-2.5">
              <span class="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[11px] shrink-0">#${i + 1}</span>
              <div>
                <span class="font-bold text-foreground">${q.nickname}</span>
                <span class="text-muted-foreground ml-1">(${q.position || 'สมาชิก'})</span>
                <p class="text-[10px] text-muted-foreground mt-0.5"><i data-lucide="clock" class="w-3 h-3 mr-1 inline-block"></i>${q.time}</p>
              </div>
            </div>
            <button type="button" onclick="removeQueueItem(${q.queueId})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-xs active:scale-95">
              <i data-lucide="mic" class="w-3.5 h-3.5 mr-1 inline-block"></i> เรียกพูดแล้ว
            </button>
          </div>
        `).join('');
    }

    // Admin Check-in tab controls (Active vs Locked)
    const isMeetingActive = Boolean(m.isStarted && !m.isEnded);
    const checkinLockedCard = document.getElementById('adminCheckinLockedCard');
    const checkinActiveContainer = document.getElementById('adminCheckinActiveContainer');
    const lockedTitle = document.getElementById('adminCheckinLockedTitle');
    const lockedDesc = document.getElementById('adminCheckinLockedDesc');

    if (!isMeetingActive) {
      // HIDE ALL CHECK-IN TOOLS (ON-SITE & ONLINE) COMPLETELY
      if (checkinActiveContainer) checkinActiveContainer.classList.add('hidden');
      if (checkinLockedCard) {
        checkinLockedCard.classList.remove('hidden');
        if (m.isEnded) {
          if (lockedTitle) lockedTitle.textContent = 'การประชุมจบลงแล้ว — ปิดระบบเช็คชื่อ';
          if (lockedDesc) lockedDesc.textContent = 'การประชุมรอบนี้สิ้นสุดลงแล้ว ระบบจึงปิดส่วนการเช็คชื่อทั้งหมด หากต้องการเช็คชื่อใหม่ กรุณาเปิดการประชุมรอบใหม่ในการตั้งค่า';
        } else {
          if (lockedTitle) lockedTitle.textContent = 'ต้องเปิดการประชุมก่อนจึงจะสามารถเช็คชื่อเข้าประชุมได้';
          if (lockedDesc) lockedDesc.textContent = 'ส่วนของการเช็คชื่อทั้งแบบ On-site และแบบ Online ถูกระงับไว้ กรุณาเปิดการประชุมก่อนจึงจะสามารถเช็คชื่อเข้าประชุมได้';
        }
      }
      // Stop scanner if running
      if (window.isScannerRunning && typeof window.toggleCameraScanner === 'function') {
        window.toggleCameraScanner();
      }
    } else {
      // MEETING IS ACTIVE -> SHOW CHECK-IN TOOLS
      if (checkinLockedCard) checkinLockedCard.classList.add('hidden');
      if (checkinActiveContainer) checkinActiveContainer.classList.remove('hidden');

      const adminOnsitePanel = document.getElementById('adminCheckinOnsitePanel');
      const adminOnlinePanel = document.getElementById('adminCheckinOnlinePanel');
      const isOnlineMeeting = m.format === 'ONLINE';

      if (adminOnsitePanel) adminOnsitePanel.classList.toggle('hidden', isOnlineMeeting);
      if (adminOnlinePanel) {
        adminOnlinePanel.classList.toggle('hidden', !isOnlineMeeting);
        if (isOnlineMeeting) {
          const tokenDisplay = document.getElementById('adminCheckinTokenDisplay');
          if (tokenDisplay) tokenDisplay.textContent = m.checkinToken || 'CS-XXXXXX';
          if (typeof window.renderAdminOnlineMeetingQr === 'function') {
            window.renderAdminOnlineMeetingQr();
          }
        }
      }

      const manualInput = document.getElementById('manualQrInput');
      if (manualInput) {
        manualInput.disabled = false;
        manualInput.placeholder = 'เช่น COMSAN-01 หรือ พลอย...';
      }
    }

    // Live Check-in list in aTab_CHECKIN
    const checkinListEl = document.getElementById('checkinLiveMembersList');
    const checkinCountEl = document.getElementById('checkinAttendeeCountBadge');
    if (checkinListEl) {
      const checkedInUsers = (state.users || []).filter(u => u.checkedIn);
      if (checkinCountEl) checkinCountEl.textContent = `${checkedInUsers.length} คน`;
      checkinListEl.innerHTML = checkedInUsers.length === 0
        ? `<p class="text-xs text-muted-foreground text-center py-10">ยังไม่มีสมาชิกเช็คชื่อเข้าประชุม</p>`
        : checkedInUsers.map(u => `
          <div class="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
            <div class="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition" onclick="openMemberProfilePopup('${u.id}')" title="คลิกดูข้อมูล ${u.nickname}">
              ${typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u, 'w-8 h-8 rounded-full shrink-0') : `<div class="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">${(u.nickname || u.firstName || 'U')[0]}</div>`}
              <div>
                <p class="text-xs font-bold text-foreground hover:underline">${u.nickname} <span class="text-muted-foreground font-normal">(${u.firstName} ${u.lastName})</span></p>
                <p class="text-[10px] text-muted-foreground">${u.position || 'สมาชิก'} • ${u.id}</p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs font-semibold ${u.isLate ? 'text-amber-500' : 'text-emerald-600'}">${u.isLate ? 'มาสาย' : 'มาทันเวลา'}</span>
              <p class="text-[10px] text-muted-foreground">${u.checkInTimeStr || '-'}</p>
            </div>
          </div>
        `).join('');
    }

    // Members Roster list in aTab_MEMBERS
    const rosterEl = document.getElementById('adminMembersRosterList');
    if (rosterEl) {
      const users = state.users || [];
      rosterEl.innerHTML = users.length === 0
        ? `<p class="text-xs text-muted-foreground text-center py-8">ยังไม่มีรายชื่อสมาชิกในระบบ</p>`
        : users.map(u => `
          <div class="p-2.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 transition" onclick="openMemberProfilePopup('${u.id}')" title="คลิกดูข้อมูล ${u.nickname}">
              ${typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u, 'w-8 h-8 rounded-full shrink-0') : `<div class="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">${(u.nickname || u.firstName || 'U')[0]}</div>`}
              <div class="min-w-0 truncate">
                <p class="text-xs font-bold text-foreground truncate hover:underline">${u.id} • ${u.nickname} <span class="font-normal text-muted-foreground">(${u.firstName} ${u.lastName})</span></p>
                <p class="text-[10px] text-muted-foreground truncate">${u.position || 'สมาชิก'} | ${u.major || 'สาขา -'} ปี ${u.year || '-'}</p>
              </div>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${u.checkedIn ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}">
              ${u.checkedIn ? (u.isLate ? 'มาสาย' : 'เช็คชื่อแล้ว') : (u.isLeave ? 'ลา' : 'ยังไม่มา')}
            </span>
          </div>
        `).join('');
    }

    // Render Admin Summary Section if available
    if (typeof window.renderSummarySection === 'function') {
      window.renderSummarySection();
    }

    // Render Calendar sections if available
    if (typeof window.renderUserCalendarSection === 'function') {
      window.renderUserCalendarSection();
    }
    if (typeof window.renderAdminCalendarSection === 'function') {
      window.renderAdminCalendarSection();
    }

    // Render User Meeting History list if modal is open
    const uHistModal = document.getElementById('userMeetingHistoryModal');
    if (uHistModal && !uHistModal.classList.contains('hidden') && typeof window.renderUserMeetingHistoryList === 'function') {
      window.renderUserMeetingHistoryList();
    }

    // User Profile Details
    if (window.currentUserId) {
      const me = (state.users || []).find(u => u.id === window.currentUserId);
      if (me) {
        const avText = document.getElementById('userAvatarText');
        const pTitle = document.getElementById('userProfileTitle');
        const pSub = document.getElementById('userProfileSub');
        const pMemId = document.getElementById('profileMemberIdText');
        const heroMemCode = document.getElementById('heroMemberCodeTop');
        const pMajorYear = document.getElementById('profileMajorYearText');
        const pPos = document.getElementById('profilePositionText');
        const uRaiseCount = document.getElementById('userRaiseCount');
        const uCheckinDisp = document.getElementById('userCheckinTimeDisplay');

        if (avText) {
          if (typeof window.updateAvatarElement === 'function') {
            window.updateAvatarElement(avText, me);
          } else {
            avText.textContent = me.firstName ? me.firstName.charAt(0) : me.nickname.charAt(0);
          }
        }
        if (pTitle) pTitle.textContent = `${me.firstName} ${me.lastName} (${me.nickname})`;
        if (pSub) pSub.textContent = `${me.position} • ชั้นปีที่ ${me.year} สาขา ${me.major}`;
        if (pMemId) pMemId.textContent = me.id;
        if (heroMemCode) heroMemCode.textContent = `CM • ${me.id}`;
        if (pMajorYear) pMajorYear.textContent = `สาขา ${me.major} (ชั้นปีที่ ${me.year})`;
        if (pPos) pPos.textContent = me.position;
        if (uRaiseCount) uRaiseCount.textContent = me.raiseHandCount || 0;
        if (uCheckinDisp) uCheckinDisp.textContent = me.checkInTimeStr || '-';

        const statusBadge = document.getElementById('userStatusBadge');
        const heroCheckPill = document.getElementById('heroUserCheckinPill');
        const pCard = document.getElementById('profileCheckinCard');
        const pIcon = document.getElementById('profileCheckinIcon');
        const pCardTitle = document.getElementById('profileCheckinTitle');
        const pCardSub = document.getElementById('profileCheckinSub');
        const lateBanner = document.getElementById('userLateBanner');

        if (lateBanner) lateBanner.classList.toggle('hidden', !(me.checkedIn && me.isLate && !me.isLeave));

        if (me.isLeave) {
          if (statusBadge) {
            statusBadge.textContent = `แจ้งลา (${me.leaveReason || 'ลา'})`;
            statusBadge.className = 'px-2.5 py-0.5 text-[10px] rounded-full bg-sky-500/20 text-sky-600 font-bold';
          }
          if (heroCheckPill) {
            heroCheckPill.textContent = '📋 แจ้งลาประชุม';
            heroCheckPill.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-400/25 text-sky-200';
          }
          if (pCard) pCard.className = 'bg-sky-500/10 border border-sky-500/30 rounded-[24px] p-4 flex items-center gap-3.5';
          if (pIcon) pIcon.className = 'w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0';
          if (pCardTitle) pCardTitle.textContent = 'บันทึกสถานะแจ้งลาประชุมแล้ว';
          if (pCardSub) pCardSub.textContent = `เหตุผล: ${me.leaveReason || '-'}`;
        } else if (me.checkedIn && me.isLate) {
          if (statusBadge) {
            statusBadge.textContent = `เช็คชื่อแล้ว (มาสาย • ${me.checkInTimeStr})`;
            statusBadge.className = 'px-2.5 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-600 font-bold';
          }
          if (heroCheckPill) {
            heroCheckPill.textContent = 'เช็คชื่อแล้ว (มาสาย)';
            heroCheckPill.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/25 text-amber-200 border border-amber-400/50 backdrop-blur-xs';
          }
          if (pCard) pCard.className = 'bg-amber-500/10 border border-amber-500/30 rounded-[24px] p-4 flex items-center gap-3.5';
          if (pIcon) pIcon.className = 'w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0';
          if (pCardTitle) pCardTitle.textContent = 'เช็คชื่อเข้าประชุมแล้ว (มาสาย)';
          if (pCardSub) pCardSub.textContent = `${m.date || todayISO} • ${me.checkInTimeStr} น. • ${m.location || 'ห้องประชุม'}`;
        } else if (me.checkedIn) {
          if (statusBadge) {
            statusBadge.textContent = `เช็คชื่อแล้ว (${me.checkInTimeStr})`;
            statusBadge.className = 'px-2.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-600 font-bold';
          }
          if (heroCheckPill) {
            heroCheckPill.textContent = 'เช็คชื่อแล้ว';
            heroCheckPill.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-xs';
          }
          if (pCard) pCard.className = 'bg-emerald-500/10 border border-emerald-500/30 rounded-[24px] p-4 flex items-center gap-3.5';
          if (pIcon) pIcon.className = 'w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0';
          if (pCardTitle) pCardTitle.textContent = 'เช็คชื่อเข้าประชุมแล้ว';
          if (pCardSub) pCardSub.textContent = `${m.date || todayISO} • ${me.checkInTimeStr} น. • ${m.location || 'ห้องประชุม'}`;
        } else {
          const isNotStarted = !m.isStarted;
          if (statusBadge) {
            statusBadge.textContent = isNotStarted ? 'ยังไม่เริ่มประชุม' : 'ยังไม่เช็คชื่อ';
            statusBadge.className = 'px-2.5 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold';
          }
          if (heroCheckPill) {
            heroCheckPill.textContent = isNotStarted ? 'ยังไม่เปิดประชุม' : 'ยังไม่เช็คชื่อ';
            heroCheckPill.className = isNotStarted 
              ? 'px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white/80'
              : 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-indigo-100';
          }
          if (pCard) pCard.className = 'bg-slate-200/70 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-[24px] p-4 flex items-center gap-3.5';
          if (pIcon) pIcon.className = 'w-10 h-10 rounded-full bg-slate-400 text-white flex items-center justify-center shrink-0';
          if (pCardTitle) pCardTitle.textContent = isNotStarted ? 'การประชุมยังไม่เริ่ม' : 'ยังไม่ได้เช็คชื่อเข้าประชุม';
          if (pCardSub) pCardSub.textContent = isNotStarted ? 'จะสามารถเช็คชื่อได้เมื่อผู้ดำเนินการเปิดการประชุมแล้ว' : 'กรุณาแสดง QR Code ให้ผู้ดำเนินการสแกนเพื่อเช็คชื่อ';
        }

        // Render user voting cards
        if (typeof window.renderVotingCardsSafe === 'function') window.renderVotingCardsSafe();

        // Render user check-in QR code
        if (typeof window.renderUserQrCode === 'function') window.renderUserQrCode(me.id);
      }
    }

    // Update system version display
    const verText = document.getElementById('settingsAppVersionText');
    if (verText) verText.textContent = state.systemVersion || '2.0.1';
    const notesBadge = document.getElementById('userVersionNotesBadge');
    if (notesBadge) notesBadge.textContent = `เวอร์ชัน ${state.systemVersion || '2.0.1'}`;

    updateMeetingTimersAndBanners();
    if (typeof window.updateSidebarVisibility === 'function') window.updateSidebarVisibility();
    if (typeof window.syncSidebarTopOffset === 'function') window.syncSidebarTopOffset();
  } catch (err) {
    console.error('Error during renderAll():', err);
  }
}

// Socket Events Setup
function setupSocketListeners() {
  const socket = window.socket;
  if (!socket) return;

  socket.on('clients:count', (count) => {
    const el = document.getElementById('onlineCount');
    const chatEl = document.getElementById('chatOnlineUsersCount');
    if (el) el.textContent = count;
    if (chatEl) chatEl.textContent = count;
  });

  let lastHandledQueueIds = new Set();
  let lastHandledChatIds = new Set();
  let lastHandledWinnerId = null;

  // Initialize tracking with current state
  if (window.appState) {
    (window.appState.raiseHandQueue || []).forEach(q => lastHandledQueueIds.add(String(q.queueId || q.userId)));
    (window.appState.chats || []).forEach(c => lastHandledChatIds.add(String(c.id)));
    if (window.appState.randomizer && window.appState.randomizer.lastWinner) {
      lastHandledWinnerId = window.appState.randomizer.lastWinner.id;
    }
  }

  socket.on('state:update', (newState) => {
    if (!newState) return;

    // 1. Deduplicate motions to guarantee no duplicate votes appear
    if (Array.isArray(newState.motions)) {
      const uniqueM = [];
      const seenM = new Set();
      newState.motions.forEach(m => {
        if (m && m.id && !seenM.has(m.id)) {
          seenM.add(m.id);
          uniqueM.push(m);
        }
      });
      newState.motions = uniqueM;
    }

    // 2. Track seen Raise Hand items
    const newQueue = Array.isArray(newState.raiseHandQueue) ? newState.raiseHandQueue : [];
    newQueue.forEach(item => {
      const qKey = String(item.queueId || item.userId);
      lastHandledQueueIds.add(qKey);
    });

    // 3. Track seen Chat messages
    const newChats = Array.isArray(newState.chats) ? newState.chats : [];
    newChats.forEach(msg => {
      const cKey = String(msg.id);
      lastHandledChatIds.add(cKey);
    });

    // 4. Detect new random spin across devices
    if (newState.randomizer && newState.randomizer.lastWinner && newState.randomizer.lastWinner.id !== lastHandledWinnerId) {
      lastHandledWinnerId = newState.randomizer.lastWinner.id;
      const spinModal = document.getElementById('randomPopupModal');
      if (!spinModal || spinModal.classList.contains('hidden')) {
        if (typeof window.finishRandomSpin === 'function') {
          window.finishRandomSpin(newState.randomizer.lastWinner.winnerLabel);
        }
      }
    }

    window.setAppState(newState);
    window.saveLocalState();
    renderAll();
  });

  socket.on('alert:raiseHand', (alertData) => {
    if (!alertData) return;
    const state = window.appState;
    if (state) {
      state.raiseHandQueue = Array.isArray(state.raiseHandQueue) ? state.raiseHandQueue : [];
      if (!state.raiseHandQueue.some(q => q.userId === alertData.userId)) {
        state.raiseHandQueue.push(alertData);
      }
      const user = (state.users || []).find(u => u.id === alertData.userId);
      if (user) {
        user.raiseHandCount = (user.raiseHandCount || 0) + 1;
      }
      if (typeof window.saveLocalState === 'function') window.saveLocalState();
      renderAll();
    }

    if (window.currentRole === 'ADMIN' && window.isAdminAuthenticated) {
      playNotificationSound('hand');
      const nameEl = document.getElementById('popupRaiseHandName');
      const detEl = document.getElementById('popupRaiseHandDetail');
      if (nameEl) nameEl.textContent = `${alertData.nickname || 'สมาชิก'} (${alertData.fullName || ''})`.trim();
      if (detEl) detEl.textContent = `ตำแหน่ง: ${alertData.position || 'สมาชิก'} • เวลา ${alertData.time || ''}`;
      const popup = document.getElementById('raiseHandPopup');
      if (popup) {
        popup.classList.remove('hidden');
        popup.classList.add('flex');
      }
      showToast(`✋ ${alertData.nickname || 'สมาชิก'} ส่งคำขอยกมือขอพูด`, 'warning');
    } else if (window.currentUserId && alertData.userId !== window.currentUserId) {
      showToast(`✋ ${alertData.nickname || 'สมาชิก'} ส่งคำขอยกมือขอพูด`, 'warning');
    }
  });

  socket.on('notify:chat', (msg) => {
    if (!msg) return;
    const state = window.appState;
    if (state) {
      state.chats = Array.isArray(state.chats) ? state.chats : [];
      if (!state.chats.some(c => String(c.id) === String(msg.id))) {
        state.chats.push(msg);
      }
      state.chatLogs = Array.isArray(state.chatLogs) ? state.chatLogs : [];
      if (!state.chatLogs.some(l => String(l.msgId) === String(msg.id))) {
        state.chatLogs.push({
          id: 'LOG-' + msg.id,
          msgId: String(msg.id),
          timestamp: msg.timestamp || Date.now(),
          sender: msg.sender,
          senderId: msg.senderId || null,
          target: msg.target || 'ALL',
          text: msg.text || '',
          mediaUrl: msg.mediaUrl || null,
          mediaType: msg.mediaType || null,
          mediaName: msg.mediaName || null,
          time: msg.time || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          dateStr: new Date(msg.timestamp || Date.now()).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
          deleted: false,
          deletedAt: null
        });
      }
      if (typeof window.saveLocalState === 'function') window.saveLocalState();
    }

    const isAdminMode = window.currentRole === 'ADMIN' && window.isAdminAuthenticated;
    const myViewerId = isAdminMode ? 'ADMIN' : window.currentUserId;

    // Immediately re-render chat sections so message appears in live view!
    if (typeof window.renderFloatingChat === 'function') window.renderFloatingChat(true);
    if (isAdminMode && typeof window.renderAdminChatSection === 'function') {
      window.renderAdminChatSection(true);
    }

    if (myViewerId && msg.senderId !== myViewerId && (msg.target === 'ALL' || msg.target === myViewerId)) {
      playNotificationSound('chat');
      const textPreview = msg.text ? `"${msg.text}"` : (msg.mediaType ? '[รูปภาพแนบ]' : '');
      showToast(`💬 ${msg.sender}: ${textPreview}`, 'info');
      if (isAdminMode && window.activeAdminTab !== 'CHAT') {
        const b = document.getElementById('aBadge_CHAT');
        if (b) b.classList.remove('hidden');
        const mb = document.getElementById('adminMobileChatBadge');
        if (mb) mb.classList.remove('hidden');
      } else if (!isAdminMode && window.activeUserTab !== 'CHAT') {
        const b1 = document.getElementById('floatingChatBadge');
        const b2 = document.getElementById('uBadge_CHAT');
        if (b1) b1.classList.remove('hidden');
        if (b2) b2.classList.remove('hidden');
        const ub = document.getElementById('userDesktopChatBadge');
        if (ub) ub.classList.remove('hidden');
      }
    }
  });

  socket.on('notify:event', (ev) => {
    if (!ev) return;
    if (ev.targetRole === 'ADMIN' && !(window.currentRole === 'ADMIN' && window.isAdminAuthenticated)) return;
    if (ev.targetUserId && ev.targetUserId !== window.currentUserId) return;
    playNotificationSound('default');
    const toastType = ev.type === 'motion' ? 'motion' : (ev.type === 'success' ? 'success' : (ev.type === 'warning' ? 'warning' : (ev.type === 'error' ? 'error' : 'info')));
    showToast(ev.text, toastType);
  });

  socket.on('random:spin', (spinPayload) => {
    if (typeof window.playRandomizerPopupAnimation === 'function') {
      window.playRandomizerPopupAnimation(spinPayload);
    }
  });

  socket.on('user:statusNote', (data) => {
    if (!data || !data.userId) return;
    const state = window.appState;
    if (state && Array.isArray(state.users)) {
      const u = state.users.find(user => user.id === data.userId);
      if (u) {
        u.statusNote = typeof data.statusNote === 'string' ? data.statusNote.trim().slice(0, 60) : '';
        u.statusNoteUpdatedAt = u.statusNote ? (data.updatedAt || Date.now()) : null;
        if (typeof window.saveLocalState === 'function') window.saveLocalState();
        if (typeof window.renderAll === 'function') window.renderAll();
      }
    }
  });

  socket.on('stream:permission', (data) => {
    if (!data || !data.userId) return;
    const state = window.appState;
    if (state && Array.isArray(state.users)) {
      const u = state.users.find(user => user.id === data.userId);
      if (u) {
        u.streamPermission = data.status || 'NONE';
        if (data.status !== 'APPROVED') {
          if (state.activeStream && (state.activeStream.streamerId === data.userId || !state.activeStream.streamerId)) {
            state.activeStream = null;
          }
          if (data.userId === window.currentUserId) {
            if (typeof stopMediaTracksOnly === 'function') stopMediaTracksOnly();
            if (window.streamInterval) {
              clearInterval(window.streamInterval);
              window.streamInterval = null;
            }
            window.currentStreamMode = null;
            const indicator = document.getElementById('liveStreamActiveIndicator');
            if (indicator) indicator.classList.add('hidden');
          }
        }
        if (typeof window.saveLocalState === 'function') window.saveLocalState();
        if (typeof window.renderAll === 'function') window.renderAll();
        if (typeof window.renderStreamSection === 'function') window.renderStreamSection();
      }
    }
  });

  socket.on('file:permission', (data) => {
    if (!data || !data.userId) return;
    const state = window.appState;
    if (state && Array.isArray(state.users)) {
      const u = state.users.find(user => user.id === data.userId);
      if (u) {
        u.filePermission = data.status || 'NONE';
        if (typeof window.saveLocalState === 'function') window.saveLocalState();
        if (typeof window.renderAll === 'function') window.renderAll();
        if (typeof window.renderFileDropSection === 'function') window.renderFileDropSection();
      }
    }
  });

  socket.on('stream:frameUpdate', (streamData) => {
    if (!streamData || !streamData.frameDataUrl) return;
    const uImg = document.getElementById('userLiveStreamViewer');
    const uEmpty = document.getElementById('userStreamEmptyText');
    const aImg = document.getElementById('adminLiveStreamViewer');
    const aEmpty = document.getElementById('adminStreamEmptyText');
    const pill = document.getElementById('streamLiveStatusPill');
    const presName = document.getElementById('streamPresenterName');
    const presSub = document.getElementById('streamPresenterSub');

    if (uImg && uEmpty) {
      uImg.src = streamData.frameDataUrl;
      uImg.classList.remove('hidden');
      uEmpty.classList.add('hidden');
    }
    if (aImg && aEmpty) {
      aImg.src = streamData.frameDataUrl;
      aImg.classList.remove('hidden');
      aEmpty.classList.add('hidden');
    }
    if (pill) {
      pill.className = 'px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0';
      pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span> กำลังแชร์';
    }
    if (presName) presName.textContent = streamData.streamerName || 'ผู้นำเสนอในห้องประชุม';
    if (presSub) presSub.textContent = streamData.mode === 'SCREEN' ? 'กำลังแชร์หน้าจอประกอบการประชุม' : 'กำลังเปิดกล้องถ่ายทอดสด';

    if (window.activeFullscreenSourceId) {
      const fsImg = document.getElementById('fullscreenStreamImg');
      if (fsImg) fsImg.src = streamData.frameDataUrl;
    }

    if (window.appState) {
      window.appState.activeStream = streamData;
      if (typeof updateUserActiveEventsBanner === 'function') {
        updateUserActiveEventsBanner(window.appState);
      }
    }
  });

  socket.on('stream:stopped', () => {
    if (window.localMediaStream || window.streamInterval || window.currentStreamMode) {
      if (typeof stopMediaTracksOnly === 'function') stopMediaTracksOnly();
      if (window.streamInterval) {
        clearInterval(window.streamInterval);
        window.streamInterval = null;
      }
      window.currentStreamMode = null;
      const indicator = document.getElementById('liveStreamActiveIndicator');
      if (indicator) indicator.classList.add('hidden');
    }
    if (window.appState) {
      window.appState.activeStream = null;
      if (typeof updateUserActiveEventsBanner === 'function') {
        updateUserActiveEventsBanner(window.appState);
      }
    }
    if (typeof window.clearStreamViewerScreens === 'function') {
      window.clearStreamViewerScreens();
    }
    if (typeof window.renderStreamSection === 'function') {
      window.renderStreamSection();
    }
  });

  socket.on('stream:forceStop', () => {
    if (typeof stopMediaTracksOnly === 'function') stopMediaTracksOnly();
    if (window.streamInterval) {
      clearInterval(window.streamInterval);
      window.streamInterval = null;
    }
    window.currentStreamMode = null;
    const indicator = document.getElementById('liveStreamActiveIndicator');
    if (indicator) indicator.classList.add('hidden');
    if (window.appState) {
      window.appState.activeStream = null;
      if (typeof updateUserActiveEventsBanner === 'function') {
        updateUserActiveEventsBanner(window.appState);
      }
    }
    if (typeof window.clearStreamViewerScreens === 'function') {
      window.clearStreamViewerScreens();
    }
    if (typeof window.renderAll === 'function') window.renderAll();
    if (typeof window.renderStreamSection === 'function') window.renderStreamSection();
  });
}

// Window attachments
window.renderAll = renderAll;
window.updateMeetingTimersAndBanners = updateMeetingTimersAndBanners;
window.updateUserActiveEventsBanner = updateUserActiveEventsBanner;
window.handleGoToStream = handleGoToStream;

// App initialization
window.addEventListener('DOMContentLoaded', () => {
  ensureDummyCheckinSpan();
  initTheme();
  setupSocketListeners();
  if (window.isAdminAuthenticated || (window.isUserAuthenticated && window.currentUserId)) {
    if (typeof window.switchRoleView === 'function') {
      window.switchRoleView(window.currentRole || (window.isAdminAuthenticated ? 'ADMIN' : 'USER'));
    }
    if (window.currentUserId && typeof window.renderUserQrCode === 'function') {
      window.renderUserQrCode(window.currentUserId);
    }
  }
  if (typeof window.updateSidebarVisibility === 'function') window.updateSidebarVisibility();
  if (typeof window.syncSidebarTopOffset === 'function') window.syncSidebarTopOffset();
  if (typeof window.rebuildRandomMemberPool === 'function') window.rebuildRandomMemberPool();
  if (typeof window.populateCameraDeviceOptions === 'function') window.populateCameraDeviceOptions();
  if (typeof window.initRecommendedFeaturesCarousel === 'function') window.initRecommendedFeaturesCarousel();
  if (typeof window.initAdminSupabaseSettingsUI === 'function') window.initAdminSupabaseSettingsUI();
  if (typeof window.initDbConfigUI === 'function') window.initDbConfigUI();
  renderAll();
  setInterval(updateMeetingTimersAndBanners, 1000);

  // Check URL for direct check-in query parameter ?checkin=...
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const checkinToken = urlParams.get('checkin');
    if (checkinToken) {
      window.pendingCheckinToken = checkinToken;
      if (window.currentUserId && window.isUserAuthenticated) {
        setTimeout(() => {
          if (typeof window.processUserAdminQrToken === 'function') {
            window.processUserAdminQrToken(checkinToken);
            window.pendingCheckinToken = null;
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {}
          }
        }, 600);
      }
    }
  } catch (e) {
    console.error('Error parsing checkin URL params:', e);
  }
});

window.addEventListener('resize', () => {
  if (typeof window.updateSidebarVisibility === 'function') window.updateSidebarVisibility();
  if (typeof window.syncSidebarTopOffset === 'function') window.syncSidebarTopOffset();
});
