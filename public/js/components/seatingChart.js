/**
 * COMSAN Meeting System - Member Directory & Parliament Seating Chart Component (Comsan Choice Sister-Site Edition)
 */

window.activeMemberDirectoryFilter = 'ALL';

function getMotionOptions(motion) {
  if (!motion) return [];
  if (Array.isArray(motion.options) && motion.options.length > 0) return motion.options;
  return [
    { id: 'APPROVE', label: 'เห็นชอบ', image: null },
    { id: 'REJECT', label: 'ไม่เห็นชอบ', image: null },
    { id: 'ABSTAIN', label: 'งดออกเสียง', image: null }
  ];
}

function getChoiceCrownSvg(position, sizeClass = 'h-5 w-5', topClass = 'top-1 left-1/2 -translate-x-1/2') {
  const pos = String(position || '');
  if (pos.includes('รองประธาน')) {
    return `<div class="absolute ${topClass} z-10"><svg viewBox="0 0 24 24" class="${sizeClass} drop-shadow-md" fill="none"><path d="M2 17L4 7L8 12L12 4L16 12L20 7L22 17H2Z" fill="#C0C0C0" stroke="#808080" stroke-width="1.5"></path><rect x="3" y="17" width="18" height="3" rx="1" fill="#C0C0C0" stroke="#808080" stroke-width="1"></rect><circle cx="12" cy="9" r="1.5" fill="#FFFFFF"></circle></svg></div>`;
  }
  if (pos.includes('ประธาน')) {
    return `<div class="absolute ${topClass} z-10"><svg viewBox="0 0 24 24" class="${sizeClass} drop-shadow-md" fill="none"><path d="M2 17L4 7L8 12L12 4L16 12L20 7L22 17H2Z" fill="#FFD700" stroke="#B8860B" stroke-width="1.5"></path><rect x="3" y="17" width="18" height="3" rx="1" fill="#FFD700" stroke="#B8860B" stroke-width="1"></rect><circle cx="12" cy="9" r="1.5" fill="#FFF8DC"></circle><circle cx="7" cy="12" r="1" fill="#FFF8DC"></circle><circle cx="17" cy="12" r="1" fill="#FFF8DC"></circle></svg></div>`;
  }
  return '';
}

function getChoiceVerifiedSvg(sizeClass = 'h-4 w-4') {
  return `<span class="inline-flex shrink-0 items-center justify-center"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 ${sizeClass}"><g transform="translate(1.8, 1.8) scale(0.85)"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" fill="hsl(var(--accent))" stroke="none"></path><path d="m9 12 2 2 4-4" fill="none" stroke="hsl(var(--accent-foreground))" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg></span>`;
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
      else if (u.checkedIn && u.isLate) bgClass = 'bg-emerald-500 text-white ring-2 sm:ring-4 ring-amber-400 border-white shadow-sm';
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
    seatEl.className = `seat-circle w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border flex flex-col items-center justify-center text-[10px] sm:text-xs font-semibold select-none shadow-2xs transition-all duration-150 hover:scale-105 active:scale-95 ${isAdminClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-pointer'} ${bgClass} ${myRing}`;
    seatEl.title = `ที่นั่ง #${idx + 1}: ${u.nickname} (${u.firstName})`;
    seatEl.innerHTML = `<span class="truncate max-w-full px-0.5">${u.nickname}</span>`;

    if (isAdminClickable) {
      seatEl.onclick = () => {
        const state = window.appState;
        if (!state || !state.meeting || !state.meeting.isStarted) {
          if (typeof window.playNotificationSound === 'function') window.playNotificationSound('alert');
          return window.showToast ? window.showToast('การประชุมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้', 'warning') : alert('การประชุมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้');
        }
        if (state.meeting.isEnded) {
          if (typeof window.playNotificationSound === 'function') window.playNotificationSound('alert');
          return window.showToast ? window.showToast('การประชุมสิ้นสุดลงแล้ว ไม่สามารถเช็คชื่อได้', 'warning') : alert('การประชุมสิ้นสุดลงแล้ว ไม่สามารถเช็คชื่อได้');
        }
        if (!u.checkedIn && confirm(`เช็คชื่อเข้าประชุมให้ "${u.nickname} (${u.firstName})" ทันทีหรือไม่?`)) {
          if (typeof window.processUserCheckIn === 'function') {
            window.processUserCheckIn(u.id);
          }
        }
      };
    } else {
      seatEl.onclick = () => openChoiceMemberDetailModal(u.id);
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
  renderMemberDirectoryCards();
}

/**
 * Renders the Home "สมาชิกของเรา" horizontal scroll row matching Comsan Choice 100% (pretty_01_home.html)
 */
function renderHomeMembersRow() {
  const container = document.getElementById('userHomeMembersRow');
  if (!container) return;
  const state = window.appState;
  const users = (state && state.users) || [];
  if (users.length === 0) {
    container.innerHTML = `<p class="text-xs text-muted-foreground py-2">ไม่มีข้อมูลสมาชิก</p>`;
    return;
  }

  container.innerHTML = users.slice(0, 12).map((u) => {
    const initial = (u.nickname || u.firstName || 'U').charAt(0);
    const crownHtml = getChoiceCrownSvg(u.position, 'h-5 w-5', 'top-1 left-1/2 -translate-x-1/2');
    const verifiedHtml = getChoiceVerifiedSvg('h-3.5 w-3.5');
    const avatarInner = typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u) : initial;

    return `
      <div onclick="openChoiceMemberDetailModal('${u.id}')" class="rounded-lg border border-border bg-card text-card-foreground shadow-sm shrink-0 w-32 shadow-card transition-all hover:scale-105 hover:shadow-md cursor-pointer select-none">
        <div class="p-4 flex flex-col items-center space-y-2 relative">
          ${crownHtml}
          <span class="relative flex shrink-0 overflow-hidden rounded-full h-16 w-16 ring-2 ring-primary/20 bg-primary/10 text-primary items-center justify-center font-bold text-lg">
            ${avatarInner}
          </span>
          <div class="text-center w-full">
            <div class="flex items-center justify-center gap-0.5">
              <p class="font-medium text-sm text-foreground truncate">${u.nickname || u.firstName}</p>
              ${verifiedHtml}
            </div>
            <p class="text-xs text-muted-foreground truncate">${u.position || 'สมาชิกชมรม'}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setMemberDirectoryFilter(filterKey) {
  window.activeMemberDirectoryFilter = filterKey || 'ALL';
  const pillsWrap = document.getElementById('memberDirectoryFilterPills');
  if (pillsWrap) {
    pillsWrap.querySelectorAll('.member-filter-pill').forEach(btn => {
      const f = btn.dataset.filter;
      btn.className = f === window.activeMemberDirectoryFilter
        ? 'member-filter-pill inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-full px-4 shrink-0'
        : 'member-filter-pill inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-white h-9 rounded-full px-4 shrink-0';
    });
  }
  renderMemberDirectoryCards();
}

/**
 * Renders the "/members" 3-column Member Directory Cards matching Comsan Choice 100% (pretty_04_members.html)
 */
function renderMemberDirectoryCards() {
  const gridEl = document.getElementById('userMemberDirectoryGrid');
  if (!gridEl) return;

  const state = window.appState;
  const users = (state && state.users) || [];
  const searchInput = document.getElementById('memberDirectorySearchInput');
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const filter = window.activeMemberDirectoryFilter || 'ALL';

  const filtered = users.filter(u => {
    const pos = String(u.position || 'สมาชิกชมรม');
    if (filter === 'EXEC') {
      const isExec = pos.includes('ประธาน') || pos.includes('เลขา') || pos.includes('เหรัญญิก') || pos.includes('กรรมการ') || pos.includes('หัวหน้า');
      if (!isExec) return false;
    } else if (filter === 'CHECKED_IN') {
      if (!u.checkedIn || u.isLeave) return false;
    } else if (filter === 'LEAVE') {
      if (!u.isLeave) return false;
    }

    if (!query) return true;
    const hay = `${u.nickname || ''} ${u.firstName || ''} ${u.lastName || ''} ${u.position || ''} ${u.id || ''} ${u.studentId || ''}`.toLowerCase();
    return hay.includes(query);
  });

  if (filtered.length === 0) {
    gridEl.innerHTML = `
      <div class="col-span-full rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
        ไม่พบรายชื่อสมาชิกที่ตรงกับการค้นหา
      </div>
    `;
    return;
  }

  gridEl.innerHTML = filtered.map(u => {
    const initial = (u.nickname || u.firstName || 'U').charAt(0);
    const crownHtml = getChoiceCrownSvg(u.position, 'h-4 w-4', '-top-1.5 left-1/2 -translate-x-1/2');
    const verifiedHtml = getChoiceVerifiedSvg('h-4 w-4');
    const avatarInner = typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u) : initial;
    const displayName = u.nickname
      ? `${u.nickname} (${u.firstName}${u.lastName ? ' ' + u.lastName : ''})`
      : `${u.firstName || u.id}`;
    const codeText = u.studentId || u.id;

    let attendancePill = '';
    if (u.isLeave) {
      attendancePill = `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400">แจ้งลา</span>`;
    } else if (u.checkedIn) {
      attendancePill = `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">เช็คชื่อแล้ว</span>`;
    }

    return `
      <div onclick="openChoiceMemberDetailModal('${u.id}')" class="rounded-lg border border-border bg-card text-card-foreground shadow-sm shadow-card cursor-pointer hover:shadow-lg transition-shadow select-none">
        <div class="p-4 flex items-center space-x-4">
          <div class="relative shrink-0">
            ${crownHtml}
            <span class="relative flex shrink-0 overflow-hidden rounded-full h-14 w-14 ring-2 ring-primary/20 bg-primary/10 text-primary items-center justify-center font-bold text-lg">
              ${avatarInner}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1">
              <h3 class="font-semibold text-foreground truncate">${displayName}</h3>
              ${verifiedHtml}
            </div>
            <div class="flex items-center gap-1.5 flex-wrap mt-1">
              <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground">
                ${u.position || 'สมาชิกชมรม'}
              </div>
              ${attendancePill}
            </div>
            <p class="text-xs text-muted-foreground mt-1 truncate">รหัสนักศึกษา: ${codeText}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openChoiceMemberDetailModal(userId) {
  const state = window.appState;
  const u = state && (state.users || []).find(item => item.id === userId);
  if (!u) return;

  const modal = document.getElementById('choiceMemberDetailModal');
  const body = document.getElementById('choiceMemberDetailBody');
  if (!modal || !body) return;

  const initial = (u.nickname || u.firstName || 'U').charAt(0);
  const crownHtml = getChoiceCrownSvg(u.position, 'h-6 w-6', '-top-2 left-1/2 -translate-x-1/2');
  const verifiedHtml = getChoiceVerifiedSvg('h-5 w-5');
  const avatarInner = typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u) : initial;

  let statusBadge = `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">ยังไม่ได้เช็คชื่อ</span>`;
  if (u.isLeave) {
    statusBadge = `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400">แจ้งลา (${u.leaveReason || 'ติดภารกิจ'})</span>`;
  } else if (u.checkedIn && u.isLate) {
    statusBadge = `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">เช็คชื่อแล้ว (มาสาย • ${u.checkInTimeStr || '-'})</span>`;
  } else if (u.checkedIn) {
    statusBadge = `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">เช็คชื่อแล้ว (ทันเวลา • ${u.checkInTimeStr || '-'})</span>`;
  }

  body.innerHTML = `
    <div class="flex flex-col items-center text-center space-y-2 pt-2">
      <div class="relative">
        ${crownHtml}
        <span class="relative flex shrink-0 overflow-hidden rounded-full h-24 w-24 ring-2 ring-primary bg-primary/10 text-primary items-center justify-center font-bold text-3xl">
          ${avatarInner}
        </span>
      </div>
      <div class="flex items-center justify-center gap-1.5 pt-1">
        <h3 class="text-xl font-bold text-foreground">${u.nickname ? `${u.nickname} (${u.firstName} ${u.lastName || ''})` : `${u.firstName} ${u.lastName || ''}`}</h3>
        ${verifiedHtml}
      </div>
      <div class="inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground">
        ${u.position || 'สมาชิกชมรม'}
      </div>
    </div>

    <div class="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm mt-4">
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">รหัสสมาชิก / นักศึกษา</span>
        <span class="font-medium text-foreground font-mono">${u.studentId || u.id}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">สังกัด / สาขา</span>
        <span class="font-medium text-foreground">${u.major || 'วิทยาลัยการคอมพิวเตอร์'}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">สถานะการเข้าประชุม</span>
        ${statusBadge}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function closeChoiceMemberDetailModal() {
  const modal = document.getElementById('choiceMemberDetailModal');
  if (modal) modal.classList.add('hidden');
}

// Window attachments
window.getMotionOptions = getMotionOptions;
window.setParliamentMode = setParliamentMode;
window.buildSeatsLegendHTML = buildSeatsLegendHTML;
window.populateSeatGrid = populateSeatGrid;
window.renderParliamentSeats = renderParliamentSeats;
window.renderHomeMembersRow = renderHomeMembersRow;
window.setMemberDirectoryFilter = setMemberDirectoryFilter;
window.renderMemberDirectoryCards = renderMemberDirectoryCards;
window.openChoiceMemberDetailModal = openChoiceMemberDetailModal;
window.closeChoiceMemberDetailModal = closeChoiceMemberDetailModal;
