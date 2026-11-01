/**
 * COMSAN Meeting System - Parliament Seating Chart Component
 */

function getMotionOptions(motion) {
  if (!motion) return [];
  if (Array.isArray(motion.options) && motion.options.length > 0) return motion.options;
  return [
    { id: 'APPROVE', label: 'เห็นชอบ', image: null },
    { id: 'REJECT', label: 'ไม่เห็นชอบ', image: null },
    { id: 'ABSTAIN', label: 'งดออกเสียง', image: null }
  ];
}

function setParliamentMode(mode) {
  window.parliamentMode = mode;
  [['btnParlAttendance', 'btnParlVoting'], ['uBtnParlAttendance', 'uBtnParlVoting']].forEach(([attId, votId]) => {
    const btnAtt = document.getElementById(attId);
    const btnVot = document.getElementById(votId);
    if (!btnAtt || !btnVot) return;
    btnAtt.className = mode === 'ATTENDANCE'
      ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white transition shadow-xs'
      : 'px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground';
    btnVot.className = mode === 'VOTING'
      ? 'px-3 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-white transition shadow-xs'
      : 'px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground';
  });
  renderParliamentSeats();
}

function buildSeatsLegendHTML(users, activeMotion, showRealtime) {
  const total = users.length;
  if (window.parliamentMode === 'ATTENDANCE') {
    const presentOnTime = users.filter(u => u.checkedIn && !u.isLate && !u.isLeave).length;
    const presentLate = users.filter(u => u.checkedIn && u.isLate && !u.isLeave).length;
    const onLeave = users.filter(u => u.isLeave).length;
    const absent = users.filter(u => !u.checkedIn && !u.isLeave).length;
    return `
      <div class="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between"><span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">มาทัน</span><strong class="text-base text-emerald-600 dark:text-emerald-400 font-bold">${presentOnTime}</strong></div>
      <div class="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 flex items-center justify-between"><span class="text-xs font-semibold text-amber-600 dark:text-amber-400">มาสาย</span><strong class="text-base text-amber-600 dark:text-amber-400 font-bold">${presentLate}</strong></div>
      <div class="bg-sky-500/10 p-3 rounded-xl border border-sky-500/30 flex items-center justify-between"><span class="text-xs font-semibold text-sky-600 dark:text-sky-400">แจ้งลา</span><strong class="text-base text-sky-600 dark:text-sky-400 font-bold">${onLeave}</strong></div>
      <div class="bg-card p-3 rounded-xl border border-border flex items-center justify-between shadow-xs"><span class="text-xs text-muted-foreground font-medium">ยังไม่มา (${total})</span><strong class="text-base text-foreground font-bold">${absent}</strong></div>
    `;
  } else {
    if (!activeMotion) return `<div class="col-span-4 p-3 rounded-xl bg-card border border-border text-center text-xs text-muted-foreground shadow-xs">ยังไม่มีญัตติที่เปิดโหวต</div>`;
    const opts = getMotionOptions(activeMotion);
    const votesMap = activeMotion.votes || {};
    return opts.map(opt => {
      const count = Object.values(votesMap).filter(v => v === opt.id).length;
      return `<div class="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-2 shadow-xs"><span class="text-xs font-medium text-foreground truncate">${opt.label}</span><strong class="text-base text-primary font-bold">${showRealtime ? count : 'ซ่อน'}</strong></div>`;
    }).join('');
  }
}

function populateSeatGrid(canvasEl, users, activeMotion, showRealtime, isAdminClickable) {
  if (!canvasEl) return;
  canvasEl.innerHTML = '';
  const opts = getMotionOptions(activeMotion);

  users.forEach((u, idx) => {
    let bgClass = 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white border-slate-200 dark:border-slate-600';
    if (window.parliamentMode === 'ATTENDANCE') {
      if (u.isLeave) bgClass = 'bg-sky-500 text-white border-sky-300 shadow-sm';
      else if (u.checkedIn && !u.isLate) bgClass = 'bg-emerald-500 text-white border-emerald-200 shadow-sm';
      else if (u.checkedIn && u.isLate) bgClass = 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-sm ring-2 ring-amber-400';
    } else {
      const vote = activeMotion && activeMotion.votes ? activeMotion.votes[u.id] : null;
      if (vote) {
        if (activeMotion.isSecret) bgClass = 'bg-purple-600 text-white border-purple-300 shadow-sm';
        else if (showRealtime) {
          const optIndex = opts.findIndex(o => o.id === vote);
          if (activeMotion.type === 'STANDARD') {
            if (vote === 'APPROVE') bgClass = 'bg-emerald-500 text-white border-emerald-200 shadow-sm';
            else if (vote === 'REJECT') bgClass = 'bg-rose-500 text-white border-rose-300 shadow-sm';
            else if (vote === 'ABSTAIN') bgClass = 'bg-amber-400 text-slate-950 border-amber-200 shadow-sm';
          } else if (optIndex >= 0) {
            bgClass = window.CUSTOM_PALETTE[optIndex % window.CUSTOM_PALETTE.length].bg + ' shadow-sm';
          }
        }
      }
    }

    const isMySeat = !isAdminClickable && window.currentUserId && u.id === window.currentUserId;
    const myRing = isMySeat ? 'ring-4 ring-amber-400 scale-110' : '';
    const seatEl = document.createElement('div');
    seatEl.className = `seat-circle w-full max-w-[85px] sm:max-w-[100px] h-11 sm:h-12 px-2 rounded-2xl border flex flex-col items-center justify-center text-xs sm:text-sm font-semibold select-none shadow-2xs transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer hover:shadow-md ${bgClass} ${myRing}`;
    seatEl.title = isAdminClickable
      ? `คลิกเพื่อเช็คชื่อ: ${u.nickname} (${u.firstName})`
      : `ที่นั่ง #${idx + 1}: ${u.nickname} (${u.firstName}) - คลิกดูข้อมูล`;
    seatEl.innerHTML = `<span class="truncate max-w-full text-center leading-tight tracking-tight">${u.nickname}</span>`;

    if (isAdminClickable) {
      seatEl.onclick = () => {
        const state = window.appState;
        const isLive = Boolean(state?.meeting?.isStarted && !state?.meeting?.isEnded);
        if (!isLive) {
          const isAct = state?.meeting?.format === 'ACTIVITY';
          if (typeof window.showToast === 'function') {
            window.showToast(isAct ? 'กิจกรรมยังไม่เริ่ม กรุณากดเปิดกิจกรรมก่อนเช็คชื่อ' : 'การประชุมยังไม่เริ่ม กรุณากดเปิดการประชุมก่อนเช็คชื่อ', 'warning');
          }
          if (typeof window.openMemberProfilePopup === 'function') {
            window.openMemberProfilePopup(u.id);
          }
          return;
        }
        if (typeof window.openAdminSeatAttendanceModal === 'function') {
          window.openAdminSeatAttendanceModal(u.id);
        } else if (typeof window.openMemberProfilePopup === 'function') {
          window.openMemberProfilePopup(u.id);
        }
      };
    } else {
      seatEl.onclick = () => {
        if (typeof window.openMemberProfilePopup === 'function') {
          window.openMemberProfilePopup(u.id);
        }
      };
    }
    canvasEl.appendChild(seatEl);
  });
}

function renderParliamentSeats() {
  const state = window.appState;
  if (!state) return;
  const users = state.users || [];
  const activeMotion = (state.motions && state.motions.length > 0) ? state.motions[state.motions.length - 1] : null;
  const showRealtime = (state.meeting && state.meeting.realtimeVoting) || (activeMotion && !activeMotion.isOpen);
  const legendHTML = buildSeatsLegendHTML(users, activeMotion, showRealtime);

  const adminLegend = document.getElementById('parliamentLegend');
  const adminCanvas = document.getElementById('parliamentSeatsCanvas');
  if (adminLegend) adminLegend.innerHTML = legendHTML;

  // Dynamic pill status for admin seating chart
  const isMeetingActive = Boolean(state?.meeting?.isStarted && !state?.meeting?.isEnded);
  const pillBox = document.getElementById('parliamentSeatsTitlePill');
  const pillText = document.getElementById('parliamentSeatsTitlePillText');
  if (pillBox && pillText) {
    pillText.textContent = 'สมาชิกชมรมทั้งหมด';
    if (isMeetingActive) {
      pillBox.className = 'w-auto max-w-sm mx-auto py-2 px-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs';
    } else {
      pillBox.className = 'w-auto max-w-sm mx-auto py-2 px-4 bg-primary/10 border border-primary/20 text-primary rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs';
    }
  }

  populateSeatGrid(adminCanvas, users, activeMotion, showRealtime, true);

  const userHiddenNotice = document.getElementById('userSeatsHiddenNotice');
  const userVisibleContent = document.getElementById('userSeatsVisibleContent');
  if (userHiddenNotice && userVisibleContent) {
    if (state.meeting && state.meeting.showSeatsToUsers) {
      userHiddenNotice.classList.add('hidden');
      userVisibleContent.classList.remove('hidden');
      const userLegend = document.getElementById('userParliamentLegend');
      const userCanvas = document.getElementById('userParliamentSeatsCanvas');
      if (userLegend) userLegend.innerHTML = legendHTML;
      populateSeatGrid(userCanvas, users, activeMotion, showRealtime, false);
    } else {
      userHiddenNotice.classList.remove('hidden');
      userVisibleContent.classList.add('hidden');
    }
  }

  renderHomeMembersRow();
}

function renderHomeMembersRow() {
  const container = document.getElementById('userHomeMembersRow');
  if (!container) return;
  const state = window.appState;
  const users = (state && state.users) || [];
  if (users.length === 0) {
    container.innerHTML = `<p class="text-xs text-muted-foreground py-2">ไม่มีข้อมูลสมาชิก</p>`;
    return;
  }
  container.innerHTML = users.map((u) => {
    const initial = (u.nickname || u.firstName || 'U').charAt(0);
    const isOnline = u.checkedIn && !u.isLeave;
    const badgeDot = isOnline
      ? '<span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card ring-1 ring-emerald-400"></span>'
      : (u.isLeave ? '<span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-sky-500 border-2 border-card"></span>' : '');
    const isMe = window.currentUserId && u.id === window.currentUserId;
    const meRing = isMe ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.04]' : 'border-border bg-card';
    return `
      <div onclick="openMemberProfilePopup('${u.id}')" class="flex flex-col items-center justify-center p-3 rounded-2xl border ${meRing} hover:border-primary/50 hover:shadow-xs cursor-pointer transition shrink-0 w-24 sm:w-28 text-center group select-none" title="คลิกดูข้อมูล ${u.nickname}">
        <div class="relative mb-2">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-base group-hover:scale-105 transition shadow-2xs overflow-hidden">
            ${typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u) : initial}
          </div>
          ${badgeDot}
        </div>
        <p class="text-xs font-bold text-foreground truncate w-full">${u.nickname}</p>
        <p class="text-[10px] text-muted-foreground truncate w-full mt-0.5">${u.position || 'สมาชิก'}</p>
      </div>
    `;
  }).join('');
}

// =========================================================================
// ADMIN QUICK SEAT ATTENDANCE CONTROLLER
// =========================================================================
let currentAttendanceSelectedUserId = null;

function openAdminSeatAttendanceModal(userId) {
  if (!userId) return;
  const state = window.appState;
  const isLive = Boolean(state?.meeting?.isStarted && !state?.meeting?.isEnded);
  const isAct = state?.meeting?.format === 'ACTIVITY';

  if (!isLive) {
    if (typeof window.showToast === 'function') {
      window.showToast(isAct ? 'กิจกรรมยังไม่เริ่ม กรุณากดเปิดกิจกรรมก่อนเช็คชื่อ' : 'การประชุมยังไม่เริ่ม กรุณากดเปิดการประชุมก่อนเช็คชื่อ', 'warning');
    }
    if (typeof window.openMemberProfilePopup === 'function') {
      window.openMemberProfilePopup(userId);
    }
    return;
  }

  const user = (state?.users || []).find(u => u.id === userId);
  if (!user) return;

  currentAttendanceSelectedUserId = userId;
  const modal = document.getElementById('adminSeatAttendanceModal');
  if (!modal) return;

  // Avatar
  const avEl = document.getElementById('asatAvatarContainer');
  if (avEl) {
    if (typeof window.getAvatarImageHtml === 'function') {
      avEl.innerHTML = window.getAvatarImageHtml(user, 'w-12 h-12 rounded-full shadow-xs');
    } else {
      avEl.innerHTML = `<div class="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-base flex items-center justify-center">${(user.nickname || user.firstName || 'U')[0]}</div>`;
    }
  }

  // Member text details
  const nickEl = document.getElementById('asatNickname');
  const codeEl = document.getElementById('asatMemberCode');
  const nameEl = document.getElementById('asatFullName');
  const badgeEl = document.getElementById('asatStatusBadge');

  if (nickEl) nickEl.textContent = user.nickname || user.firstName || user.id;
  if (codeEl) codeEl.textContent = user.id;
  if (nameEl) nameEl.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.position || 'สมาชิกชมรม';

  // Active status indicator dots on buttons
  const indOnTime = document.getElementById('asatActiveOnTimeIndicator');
  const indLate = document.getElementById('asatActiveLateIndicator');
  const indLeave = document.getElementById('asatActiveLeaveIndicator');
  const indAbsent = document.getElementById('asatActiveAbsentIndicator');

  if (indOnTime) indOnTime.classList.add('hidden');
  if (indLate) indLate.classList.add('hidden');
  if (indLeave) indLeave.classList.add('hidden');
  if (indAbsent) indAbsent.classList.add('hidden');

  if (badgeEl) {
    if (user.isLeave) {
      badgeEl.className = 'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30';
      badgeEl.innerHTML = `<i data-lucide="file-text" class="w-3 h-3"></i> แจ้งลา (${user.leaveReason || 'มีเหตุจำเป็น'})`;
      if (indLeave) indLeave.classList.remove('hidden');
    } else if (user.checkedIn && user.isLate) {
      badgeEl.className = 'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      badgeEl.innerHTML = `<i data-lucide="clock" class="w-3 h-3"></i> มาสาย (${user.checkInTimeStr || '-'} น.)`;
      if (indLate) indLate.classList.remove('hidden');
    } else if (user.checkedIn) {
      badgeEl.className = 'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      badgeEl.innerHTML = `<i data-lucide="check-circle-2" class="w-3 h-3"></i> มาทันเวลา (${user.checkInTimeStr || '-'} น.)`;
      if (indOnTime) indOnTime.classList.remove('hidden');
    } else {
      badgeEl.className = 'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-muted-foreground border border-border';
      badgeEl.innerHTML = `<i data-lucide="user-x" class="w-3 h-3"></i> ยังไม่มา / ขาด`;
      if (indAbsent) indAbsent.classList.remove('hidden');
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    setTimeout(() => window.lucide.createIcons(), 50);
  }
}

function closeAdminSeatAttendanceModal() {
  const modal = document.getElementById('adminSeatAttendanceModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  currentAttendanceSelectedUserId = null;
}

async function selectSeatAttendanceStatus(status) {
  if (!currentAttendanceSelectedUserId) return;
  const state = window.appState;
  const isLive = Boolean(state?.meeting?.isStarted && !state?.meeting?.isEnded);
  const isAct = state?.meeting?.format === 'ACTIVITY';

  if (!isLive) {
    if (typeof window.showToast === 'function') {
      window.showToast(isAct ? 'กิจกรรมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้' : 'การประชุมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้', 'warning');
    }
    closeAdminSeatAttendanceModal();
    return;
  }

  const userId = currentAttendanceSelectedUserId;
  const user = (state?.users || []).find(u => u.id === userId);
  const nick = user?.nickname || 'สมาชิก';

  const res = typeof window.adminChangeUserStatus === 'function'
    ? await window.adminChangeUserStatus(userId, status)
    : false;

  // Only close and show success if adminChangeUserStatus actually succeeded (not cancelled on prompt)
  if (res !== false) {
    closeAdminSeatAttendanceModal();
    if (typeof window.showToast === 'function') {
      const statusLabels = {
        ONTIME: isAct ? 'มาเข้าร่วมกิจกรรมทันเวลา' : 'มาเข้าประชุมทันเวลา',
        LATE: 'มาสาย',
        LEAVE: 'แจ้งลา',
        ABSENT: 'ยังไม่มา / ขาด'
      };
      const toastType = status === 'ONTIME' ? 'success' : (status === 'ABSENT' ? 'info' : 'warning');
      window.showToast(`เช็คชื่อ "${nick}" เป็น ${statusLabels[status] || status} เรียบร้อย`, toastType);
    }
  }
}

function viewProfileFromSeatAttendanceModal() {
  const uid = currentAttendanceSelectedUserId;
  closeAdminSeatAttendanceModal();
  if (uid && typeof window.openMemberProfilePopup === 'function') {
    window.openMemberProfilePopup(uid);
  }
}

// Window attachments
window.getMotionOptions = getMotionOptions;
window.setParliamentMode = setParliamentMode;
window.buildSeatsLegendHTML = buildSeatsLegendHTML;
window.populateSeatGrid = populateSeatGrid;
window.renderParliamentSeats = renderParliamentSeats;
window.renderHomeMembersRow = renderHomeMembersRow;
window.openAdminSeatAttendanceModal = openAdminSeatAttendanceModal;
window.closeAdminSeatAttendanceModal = closeAdminSeatAttendanceModal;
window.selectSeatAttendanceStatus = selectSeatAttendanceStatus;
window.viewProfileFromSeatAttendanceModal = viewProfileFromSeatAttendanceModal;
