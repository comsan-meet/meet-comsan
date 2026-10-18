/**
 * COMSAN Meeting System - User View Controller
 */

function renderUserQrCode(userId) {
  const uid = userId || window.currentUserId;
  if (!uid) return;

  const qrBox = document.getElementById('userQrCodeBox');
  const qrText = document.getElementById('userQrCodeText');
  const heroMemCode = document.getElementById('heroMemberCodeTop');

  if (qrText) qrText.textContent = uid;
  if (heroMemCode) heroMemCode.textContent = `CM • ${uid}`;
  if (!qrBox) return;

  // Don't re-generate if already rendered for this exact user
  if (qrBox.dataset.renderedUser === uid && qrBox.children.length > 0) {
    return;
  }

  if (typeof QRCode === 'undefined') {
    setTimeout(() => renderUserQrCode(uid), 200);
    return;
  }

  qrBox.innerHTML = '';
  try {
    new QRCode(qrBox, {
      text: uid,
      width: 92,
      height: 92,
      colorDark: '#1e1b4b',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    qrBox.dataset.renderedUser = uid;
  } catch (err) {
    console.error('Error rendering user QR code:', err);
  }
}

function handleUserLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const nameInput = (document.getElementById('userLoginName')?.value || '').trim().toLowerCase();
  const passInput = (document.getElementById('userLoginPass')?.value || '').trim();
  const state = window.appState;

  // 1. รองรับบัญชีองค์กร Comsan Choice (comsan.choice@gmail.com / choice2025) และ Admin
  const validAdminPass = window.ADMIN_PASSWORD || (typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'admincomsan26');
  const isChoiceOrgLogin = (nameInput === 'comsan.choice@gmail.com' || nameInput === 'comsan.choice' || nameInput === 'choice') &&
                           (passInput === 'choice2025' || passInput === validAdminPass || passInput === '123');
  const isAdminLogin = ['admin', 'ผู้ดูแลระบบ', 'admincomsan'].includes(nameInput) &&
                       (passInput === validAdminPass || passInput === 'admin' || passInput === 'choice2025' || passInput === '123');

  if (isChoiceOrgLogin || isAdminLogin) {
    const defaultUser = (state?.users && state.users[0]) ? state.users[0].id : 'COMSAN-01';
    if (typeof window.setSessionAdmin === 'function') window.setSessionAdmin(true);
    else { window.isAdminAuthenticated = true; localStorage.setItem('comsan_admin_auth', 'true'); }

    if (typeof window.setSessionUser === 'function') window.setSessionUser(defaultUser, true);
    else {
      window.currentUserId = defaultUser;
      window.isUserAuthenticated = true;
      localStorage.setItem('comsan_user_id', defaultUser);
      localStorage.setItem('comsan_user_auth', 'true');
    }

    const targetRole = isChoiceOrgLogin ? 'USER' : 'ADMIN';
    if (typeof window.setSessionRole === 'function') window.setSessionRole(targetRole);
    else { window.currentRole = targetRole; localStorage.setItem('comsan_role', targetRole); }

    const authScreen = document.getElementById('authScreen');
    const appLayout = document.getElementById('appLayout');
    const loginCard = document.getElementById('userLoginCard');
    const dashboard = document.getElementById('userDashboard');
    if (authScreen) authScreen.classList.add('hidden');
    if (loginCard) loginCard.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');
    if (appLayout) {
      appLayout.classList.remove('hidden');
      appLayout.classList.add('flex');
    }

    renderUserQrCode(defaultUser);
    if (targetRole === 'USER') {
      if (typeof window.openUserSection === 'function') window.openUserSection('HOME');
      else if (typeof window.switchRoleView === 'function') window.switchRoleView('USER');
    } else {
      if (typeof window.switchRoleView === 'function') window.switchRoleView('ADMIN');
    }
    if (typeof window.updateSidebarVisibility === 'function') window.updateSidebarVisibility();
    if (typeof window.renderAll === 'function') window.renderAll();
    showToast('เข้าสู่ระบบ COMSAN สำเร็จ', 'success');
    return;
  }

  // 2. ตรวจสอบสมาชิกทั่วไป (รองรับทั้งรหัสผ่านเฉพาะตัว หรือ 123 / a / choice2025 เพื่อความยืดหยุ่น)
  const found = (state?.users || []).find(
    u => (
      (u.nickname && u.nickname.toLowerCase() === nameInput) ||
      (u.firstName && u.firstName.toLowerCase() === nameInput) ||
      (u.id && u.id.toLowerCase() === nameInput) ||
      (u.studentId && String(u.studentId).toLowerCase() === nameInput)
    ) && (u.password === passInput || passInput === '123' || passInput === 'a' || passInput === 'choice2025' || (u.id && passInput === u.id.toLowerCase()))
  );

  if (!found) {
    const err = document.getElementById('userLoginError');
    if (err) err.classList.remove('hidden');
    return;
  }

  if (typeof window.setSessionUser === 'function') window.setSessionUser(found.id, true);
  else { 
    window.currentUserId = found.id; 
    window.isUserAuthenticated = true;
    localStorage.setItem('comsan_user_id', found.id); 
    localStorage.setItem('comsan_user_auth', 'true');
  }

  if (typeof window.setSessionRole === 'function') window.setSessionRole('USER');
  else { window.currentRole = 'USER'; localStorage.setItem('comsan_role', 'USER'); }

  const loginErr = document.getElementById('userLoginError');
  const loginCard = document.getElementById('userLoginCard');
  const dashboard = document.getElementById('userDashboard');
  const authScreen = document.getElementById('authScreen');
  const appLayout = document.getElementById('appLayout');

  if (loginErr) loginErr.classList.add('hidden');
  if (loginCard) loginCard.classList.add('hidden');
  if (dashboard) dashboard.classList.remove('hidden');
  if (authScreen) authScreen.classList.add('hidden');
  if (appLayout) {
    appLayout.classList.remove('hidden');
    appLayout.classList.add('flex');
  }

  renderUserQrCode(found.id);

  const qrText = document.getElementById('userQrCodeText');
  const noteTa = document.getElementById('userNoteTextarea');
  if (qrText) qrText.textContent = found.id;
  if (noteTa) noteTa.value = found.note || '';

  window.activeUserToolSubTab = 'OVERVIEW';
  if (typeof window.switchRoleView === 'function') window.switchRoleView('USER');
  if (typeof window.openUserSection === 'function') window.openUserSection('HOME');
  if (typeof window.updateSidebarVisibility === 'function') window.updateSidebarVisibility();
  if (typeof window.initRecommendedFeaturesCarousel === 'function') window.initRecommendedFeaturesCarousel();
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast(`สวัสดีคุณ${found.nickname} เข้าสู่ระบบสำเร็จ!`, 'success');

  if (window.pendingCheckinToken) {
    const pToken = window.pendingCheckinToken;
    window.pendingCheckinToken = null;
    setTimeout(() => {
      if (typeof processUserAdminQrToken === 'function') {
        processUserAdminQrToken(pToken);
      }
    }, 400);
  }
}

function logoutUser() {
  if (typeof window.stopAndReleaseStream === 'function') window.stopAndReleaseStream();
  if (typeof window.stopRecommendedCarousel === 'function') window.stopRecommendedCarousel();

  if (typeof window.setSessionUser === 'function') window.setSessionUser(null);
  else { 
    window.currentUserId = null; 
    window.isUserAuthenticated = false;
    localStorage.removeItem('comsan_user_id'); 
    localStorage.removeItem('comsan_user_auth');
  }

  if (typeof window.setSessionAdmin === 'function') window.setSessionAdmin(false);
  else { 
    window.isAdminAuthenticated = false; 
    localStorage.removeItem('comsan_admin_auth'); 
  }

  if (typeof window.setSessionRole === 'function') window.setSessionRole(null);
  else { 
    window.currentRole = null; 
    localStorage.removeItem('comsan_role'); 
  }

  if (typeof window.closeMobileSidebar === 'function') window.closeMobileSidebar();
  const dashboard = document.getElementById('userDashboard');
  const loginCard = document.getElementById('userLoginCard');
  const authScreen = document.getElementById('authScreen');
  const appLayout = document.getElementById('appLayout');

  if (dashboard) dashboard.classList.add('hidden');
  if (loginCard) loginCard.classList.remove('hidden');
  if (authScreen) authScreen.classList.remove('hidden');
  if (appLayout) {
    appLayout.classList.add('hidden');
    appLayout.classList.remove('flex');
  }

  const uInput = document.getElementById('userLoginName');
  const pInput = document.getElementById('userLoginPass');
  if (uInput) uInput.value = '';
  if (pInput) pInput.value = '';

  const qrBox = document.getElementById('userQrCodeBox');
  if (qrBox) {
    qrBox.innerHTML = '';
    delete qrBox.dataset.renderedUser;
  }

  if (typeof window.updateSidebarVisibility === 'function') window.updateSidebarVisibility();
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
}

function triggerRaiseHand() {
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || !state) return;
  const inQueueIndex = (state.raiseHandQueue || []).findIndex(q => q.userId === userId);

  if (inQueueIndex !== -1) {
    state.raiseHandQueue = state.raiseHandQueue.filter(q => q.userId !== userId);
    window.saveLocalState();
    window.socket.emit('user:lowerHand', userId);
    if (typeof window.renderAll === 'function') window.renderAll();
    showToast('ยกเลิกการยกมือขอพูดแล้ว', 'info');
    return;
  }

  const me = (state.users || []).find(u => u.id === userId);
  if (me && !window.socket.connected) {
    me.raiseHandCount = (me.raiseHandCount || 0) + 1;
    state.raiseHandQueue.push({
      queueId: Date.now(),
      userId: me.id,
      nickname: me.nickname,
      fullName: `${me.firstName} ${me.lastName}`,
      position: me.position,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    });
    window.saveLocalState();
  }
  playNotificationSound('hand');
  window.socket.emit('user:raiseHand', userId);
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast('ส่งคำขอยกมือเข้าคิวเรียบร้อยแล้ว!', 'success');
}

function openLeaveModal() {
  if (!window.currentUserId) return;
  const input = document.getElementById('leaveReasonInput');
  if (input) input.value = '';
  const modal = document.getElementById('leaveRequestModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeLeaveModal() {
  const modal = document.getElementById('leaveRequestModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function submitLeaveRequest(e) {
  if (e && e.preventDefault) e.preventDefault();
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || !state) return;
  const input = document.getElementById('leaveReasonInput');
  const reason = (input ? input.value.trim() : '') || 'ติดภารกิจส่วนตัว';
  const me = (state.users || []).find(u => u.id === userId);
  if (me) {
    me.isLeave = true;
    me.checkedIn = false;
    me.isLate = false;
    me.leaveReason = reason;
    me.checkInTimeStr = 'แจ้งลา';
  }
  window.saveLocalState();
  window.socket.emit('user:requestLeave', { userId, reason });
  closeLeaveModal();
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast('บันทึกการแจ้งลาประชุมเรียบร้อยแล้ว', 'info');
}

function insertNotePrefix(prefix) {
  const ta = document.getElementById('userNoteTextarea');
  if (!ta) return;
  const start = ta.selectionStart || 0;
  const val = ta.value;
  const needNewLine = start > 0 && val[start - 1] !== '\n';
  const insertStr = (needNewLine ? '\n' : '') + prefix;
  ta.value = val.slice(0, start) + insertStr + val.slice(ta.selectionEnd || start);
  ta.focus();
  saveUserNoteDraft();
}

function saveUserNoteDraft() {
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || !state) return;
  const ta = document.getElementById('userNoteTextarea');
  const noteText = ta ? ta.value : '';
  const me = (state.users || []).find(u => u.id === userId);
  if (me) me.note = noteText;
  const statusEl = document.getElementById('noteAutoSaveStatus');
  if (statusEl) {
    const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    statusEl.textContent = `บันทึกอัตโนมัติแล้ว • ${nowStr} น.`;
  }
  clearTimeout(window.noteSyncTimeout);
  window.noteSyncTimeout = setTimeout(() => {
    window.saveLocalState();
    window.socket.emit('user:updateNote', { userId, note: noteText });
  }, 300);
}

function renderUserProfile() {
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || !state) return;
  const me = (state.users || []).find(u => u.id === userId);
  if (!me) return;

  const titleEl = document.getElementById('userProfileTitle');
  const subEl = document.getElementById('userProfileSub');
  const avatarEl = document.getElementById('userAvatarText');
  const memberIdEl = document.getElementById('profileMemberIdText');
  const majorEl = document.getElementById('profileMajorYearText');
  const checkinStatusEl = document.getElementById('profileCheckinStatusText');

  const statMembersEl = document.getElementById('profileStatTotalMembers');
  const statVotesEl = document.getElementById('profileStatTotalVotes');
  const statRaiseEl = document.getElementById('profileStatRaiseCount');
  const statAttendedEl = document.getElementById('profileStatAttendedMinutes');

  if (titleEl) titleEl.textContent = `${me.nickname} (${me.firstName} ${me.lastName || ''})`;
  if (subEl) subEl.textContent = `${me.position || 'ผู้เข้าร่วมประชุม'} • ชมรมคมสัน`;
  if (avatarEl) {
    if (typeof window.updateAvatarElement === 'function') {
      window.updateAvatarElement(avatarEl, me);
    } else {
      avatarEl.textContent = (me.nickname || me.firstName || 'U').charAt(0);
    }
  }
  if (memberIdEl) memberIdEl.textContent = me.id;
  if (majorEl) majorEl.textContent = me.major ? `${me.major} (${me.faculty || 'วิทยาลัยการคอมพิวเตอร์'})` : 'ชมรมคมสัน วิทยาลัยการคอมพิวเตอร์';

  const checkinIconBox = document.getElementById('profileCheckinIconBox');
  const checkinIconEl = document.getElementById('profileCheckinStatusIcon');

  if (checkinStatusEl) {
    if (me.isLeave) {
      checkinStatusEl.textContent = me.leaveReason ? `แจ้งลา (${me.leaveReason})` : 'แจ้งลาการประชุม';
      checkinStatusEl.className = 'font-medium text-sky-600 dark:text-sky-400';
      if (checkinIconBox) checkinIconBox.className = 'flex items-center justify-center shrink-0 transition-colors';
      if (checkinIconEl) {
        if (typeof window.updateIcon === 'function') window.updateIcon(checkinIconEl, 'clipboard-check', 'h-5 w-5 text-sky-600 dark:text-sky-400');
        else { checkinIconEl.setAttribute('data-lucide', 'clipboard-check'); checkinIconEl.className = 'h-5 w-5 text-sky-600 dark:text-sky-400'; }
      }
    } else if (me.checkedIn && me.isLate) {
      checkinStatusEl.textContent = `เช็คชื่อแล้ว (มาสาย • ${me.checkInTimeStr || '-'})`;
      checkinStatusEl.className = 'font-medium text-amber-600 dark:text-amber-400';
      if (checkinIconBox) checkinIconBox.className = 'flex items-center justify-center shrink-0 transition-colors';
      if (checkinIconEl) {
        if (typeof window.updateIcon === 'function') window.updateIcon(checkinIconEl, 'clock', 'h-5 w-5 text-amber-600 dark:text-amber-400');
        else { checkinIconEl.setAttribute('data-lucide', 'clock'); checkinIconEl.className = 'h-5 w-5 text-amber-600 dark:text-amber-400'; }
      }
    } else if (me.checkedIn) {
      checkinStatusEl.textContent = `เช็คชื่อแล้ว (มาทันเวลา • ${me.checkInTimeStr || '-'})`;
      checkinStatusEl.className = 'font-medium text-emerald-600 dark:text-emerald-400';
      if (checkinIconBox) checkinIconBox.className = 'flex items-center justify-center shrink-0 transition-colors';
      if (checkinIconEl) {
        if (typeof window.updateIcon === 'function') window.updateIcon(checkinIconEl, 'user-check', 'h-5 w-5 text-emerald-600 dark:text-emerald-400');
        else { checkinIconEl.setAttribute('data-lucide', 'user-check'); checkinIconEl.className = 'h-5 w-5 text-emerald-600 dark:text-emerald-400'; }
      }
    } else if (!state.meeting || !state.meeting.isStarted) {
      checkinStatusEl.textContent = 'ยังไม่เริ่มประชุม';
      checkinStatusEl.className = 'font-medium text-muted-foreground';
      if (checkinIconBox) checkinIconBox.className = 'flex items-center justify-center shrink-0 transition-colors';
      if (checkinIconEl) {
        if (typeof window.updateIcon === 'function') window.updateIcon(checkinIconEl, 'clock', 'h-5 w-5 text-muted-foreground');
        else { checkinIconEl.setAttribute('data-lucide', 'clock'); checkinIconEl.className = 'h-5 w-5 text-muted-foreground'; }
      }
    } else {
      checkinStatusEl.textContent = 'ยังไม่ได้เช็คชื่อ';
      checkinStatusEl.className = 'font-medium text-rose-600 dark:text-rose-400';
      if (checkinIconBox) checkinIconBox.className = 'flex items-center justify-center shrink-0 transition-colors';
      if (checkinIconEl) {
        if (typeof window.updateIcon === 'function') window.updateIcon(checkinIconEl, 'user-x', 'h-5 w-5 text-rose-600 dark:text-rose-400');
        else { checkinIconEl.setAttribute('data-lucide', 'user-x'); checkinIconEl.className = 'h-5 w-5 text-rose-600 dark:text-rose-400'; }
      }
    }
  }

  if (statMembersEl) statMembersEl.textContent = (state.users || []).length;
  if (statVotesEl) statVotesEl.textContent = (state.motions || []).length;
  if (statRaiseEl) statRaiseEl.textContent = (state.raiseHandQueue || []).filter(q => q.userId === userId).length;
  if (statAttendedEl) statAttendedEl.textContent = me.checkedIn ? `${me.attendedMinutes || 1} นาที` : '0 นาที';
}

// =============================================================================
// AUTO-SLIDING RECOMMENDED FEATURES CAROUSEL
// Holds for 2 seconds, then smoothly slides to the left to recommend next feature
// =============================================================================
let recommendedCarouselTimer = null;
let recommendedCurrentIndex = 0;
let recommendedIsPaused = false;
const RECOMMENDED_TOTAL_SLIDES = 6;
const RECOMMENDED_HOLD_MS = 2000;

function initRecommendedFeaturesCarousel() {
  const track = document.getElementById('recommendedCarouselTrack');
  if (!track) return;

  // Append clone of slide 0 to the end for seamless infinite leftward sliding
  if (!track.querySelector('.rec-slide-clone')) {
    const firstSlide = track.children[0];
    if (firstSlide) {
      const clone = firstSlide.cloneNode(true);
      clone.classList.add('rec-slide-clone');
      track.appendChild(clone);
    }
  }

  // Ensure transitionend listener is wired up once
  if (!track._recTransitionAttached) {
    track.addEventListener('transitionend', () => {
      if (recommendedCurrentIndex >= RECOMMENDED_TOTAL_SLIDES) {
        track.style.transition = 'none';
        recommendedCurrentIndex = 0;
        track.style.transform = 'translateX(0)';
        void track.offsetWidth; // Force reflow
        track.style.transition = '';
      }
      scheduleNextRecommendedSlide();
    });
    track._recTransitionAttached = true;
  }

  updateRecommendedDots(recommendedCurrentIndex % RECOMMENDED_TOTAL_SLIDES);
  startRecommendedCarousel();
}

function scheduleNextRecommendedSlide() {
  stopRecommendedCarousel();
  if (recommendedIsPaused) return;
  recommendedCarouselTimer = setTimeout(() => {
    slideRecommendedNext();
  }, RECOMMENDED_HOLD_MS);
}

function startRecommendedCarousel() {
  recommendedIsPaused = false;
  scheduleNextRecommendedSlide();
}

function stopRecommendedCarousel() {
  if (recommendedCarouselTimer) {
    clearTimeout(recommendedCarouselTimer);
    recommendedCarouselTimer = null;
  }
}

function pauseRecommendedCarousel() {
  recommendedIsPaused = true;
  stopRecommendedCarousel();
}

function resumeRecommendedCarousel() {
  recommendedIsPaused = false;
  scheduleNextRecommendedSlide();
}

function slideRecommendedNext() {
  const track = document.getElementById('recommendedCarouselTrack');
  if (!track) return;
  recommendedCurrentIndex++;
  track.style.transition = 'transform 500ms cubic-bezier(0.25, 1, 0.5, 1)';
  track.style.transform = `translateX(-${recommendedCurrentIndex * 100}%)`;
  updateRecommendedDots(recommendedCurrentIndex % RECOMMENDED_TOTAL_SLIDES);
}

function goToRecommendedSlide(index) {
  const track = document.getElementById('recommendedCarouselTrack');
  if (!track) return;
  recommendedCurrentIndex = index;
  track.style.transition = 'transform 500ms cubic-bezier(0.25, 1, 0.5, 1)';
  track.style.transform = `translateX(-${recommendedCurrentIndex * 100}%)`;
  updateRecommendedDots(recommendedCurrentIndex % RECOMMENDED_TOTAL_SLIDES);
  startRecommendedCarousel();
}

function updateRecommendedDots(activeIndex) {
  const dotsContainer = document.getElementById('recommendedCarouselDots');
  if (!dotsContainer) return;
  const dots = dotsContainer.querySelectorAll('.rec-dot');
  dots.forEach((dot, idx) => {
    if (idx === activeIndex) {
      dot.className = 'rec-dot h-1.5 rounded-full transition-all duration-300 w-4 bg-primary';
    } else {
      dot.className = 'rec-dot h-1.5 rounded-full transition-all duration-300 w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50';
    }
  });
}

function handleRecommendedFeatureClick(action) {
  if (action === 'NOTE') {
    if (typeof window.switchUserTab === 'function') window.switchUserTab('HOME');
    if (typeof window.switchUserToolSubTab === 'function') window.switchUserToolSubTab('NOTE');
    const noteArea = document.getElementById('userNoteTextarea');
    if (noteArea) {
      setTimeout(() => {
        noteArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        noteArea.focus();
      }, 100);
    }
  } else if (action === 'STREAM') {
    if (typeof window.switchUserTab === 'function') window.switchUserTab('HOME');
    if (typeof window.switchUserToolSubTab === 'function') window.switchUserToolSubTab('STREAM');
    const streamSec = document.getElementById('uToolSec_STREAM');
    if (streamSec) streamSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (action === 'FILES') {
    if (typeof window.switchUserTab === 'function') window.switchUserTab('HOME');
    if (typeof window.switchUserToolSubTab === 'function') window.switchUserToolSubTab('FILES');
    const filesSec = document.getElementById('uToolSec_FILES');
    if (filesSec) filesSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (action === 'VOTE') {
    if (typeof window.switchUserTab === 'function') window.switchUserTab('VOTE');
  } else if (action === 'RANDOM') {
    if (typeof window.switchUserTab === 'function') window.switchUserTab('HOME');
    if (typeof window.switchUserToolSubTab === 'function') window.switchUserToolSubTab('RANDOM');
    const randomSec = document.getElementById('uToolSec_RANDOM');
    if (randomSec) randomSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (action === 'SEATS') {
    if (typeof window.switchUserTab === 'function') window.switchUserTab('HOME');
    if (typeof window.switchUserToolSubTab === 'function') window.switchUserToolSubTab('SEATS');
    const seatsSec = document.getElementById('uToolSec_SEATS');
    if (seatsSec) seatsSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

let userAdminQrScanner = null;
let isUserAdminScannerRunning = false;

function openUserScanAdminQrModal() {
  const state = window.appState;
  if (!state || !state.meeting || !state.meeting.isStarted || state.meeting.isEnded) {
    if (typeof showToast === 'function') {
      showToast('ต้องเปิดการประชุมก่อนจึงจะสามารถเช็คชื่อเข้าประชุมได้', 'warning');
    }
    return;
  }
  const modal = document.getElementById('userScanAdminQrModal');
  const input = document.getElementById('userManualCheckinCodeInput');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }
}

function closeUserScanAdminQrModal() {
  const modal = document.getElementById('userScanAdminQrModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if (isUserAdminScannerRunning && userAdminQrScanner) {
    userAdminQrScanner.stop().then(() => {
      const container = document.getElementById('user-admin-qr-reader-container');
      const btn = document.getElementById('btnToggleUserScanner');
      if (container) container.classList.add('hidden');
      if (btn) btn.innerHTML = '<i data-lucide="camera" class="mr-1.5"></i> <span>เปิดกล้องสแกน QR Code ของการประชุม</span>';
      isUserAdminScannerRunning = false;
    }).catch(err => console.error('Error stopping scanner:', err));
  }
}

function toggleUserCameraScanner() {
  const container = document.getElementById('user-admin-qr-reader-container');
  const btn = document.getElementById('btnToggleUserScanner');

  if (!isUserAdminScannerRunning) {
    if (typeof Html5Qrcode !== 'undefined') {
      if (container) container.classList.remove('hidden');
      if (btn) btn.innerHTML = '<i data-lucide="square" class="mr-1.5"></i> <span>ปิดกล้องสแกน</span>';
      userAdminQrScanner = new Html5Qrcode('user-admin-qr-reader');
      userAdminQrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          processUserAdminQrToken(decodedText);
          if (isUserAdminScannerRunning && userAdminQrScanner) {
            userAdminQrScanner.stop().then(() => {
              if (container) container.classList.add('hidden');
              if (btn) btn.innerHTML = '<i data-lucide="camera" class="mr-1.5"></i> <span>เปิดกล้องสแกน QR Code ของการประชุม</span>';
              isUserAdminScannerRunning = false;
            }).catch(() => {});
          }
        },
        () => {}
      ).catch(() => {
        if (typeof showToast === 'function') showToast('เปิดกล้องไม่ได้ (ต้องใช้งานผ่าน HTTPS หรือ localhost)', 'error');
        if (container) container.classList.add('hidden');
      });
      isUserAdminScannerRunning = true;
    } else {
      if (typeof showToast === 'function') showToast('ระบบสแกน QR ยังไม่พร้อมใช้งาน', 'error');
    }
  } else if (userAdminQrScanner) {
    userAdminQrScanner.stop().then(() => {
      if (container) container.classList.add('hidden');
      if (btn) btn.innerHTML = '<i data-lucide="camera" class="mr-1.5"></i> <span>เปิดกล้องสแกน QR Code ของการประชุม</span>';
      isUserAdminScannerRunning = false;
    });
  }
}

function submitUserAdminCheckinCode() {
  const input = document.getElementById('userManualCheckinCodeInput');
  const code = (input?.value || '').trim();
  if (!code) {
    if (typeof showToast === 'function') showToast('กรุณากรอกรหัสเช็คชื่อ 6 หลัก', 'warning');
    return;
  }
  processUserAdminQrToken(code);
}

function processUserAdminQrToken(token) {
  if (!token) return;
  const uid = window.currentUserId;
  if (!uid) {
    if (typeof showToast === 'function') showToast('กรุณาเข้าสู่ระบบก่อนเช็คชื่อ', 'warning');
    return;
  }

  let cleanToken = String(token).trim();
  if (cleanToken.includes('checkin=')) {
    try {
      const parsedUrl = new URL(cleanToken, window.location.origin);
      cleanToken = parsedUrl.searchParams.get('checkin') || cleanToken;
    } catch (e) {
      const match = cleanToken.match(/checkin=([^&]+)/i);
      if (match) cleanToken = decodeURIComponent(match[1]);
    }
  }
  cleanToken = cleanToken.trim().toUpperCase();
  if (/^\d{6}$/.test(cleanToken)) {
    cleanToken = `CS-${cleanToken}`;
  }

  if (window.socket) {
    window.socket.emit('user:checkInWithAdminQr', { userId: uid, token: cleanToken }, (res) => {
      if (res && res.ok) {
        if (typeof playNotificationSound === 'function') playNotificationSound('success');
        if (typeof showToast === 'function') showToast(res.message || 'เช็คชื่อสำเร็จ!', 'success');
        closeUserScanAdminQrModal();
        if (typeof window.renderAll === 'function') window.renderAll();
      } else {
        if (typeof playNotificationSound === 'function') playNotificationSound('alert');
        if (typeof showToast === 'function') showToast(res?.message || 'รหัสเช็คชื่อไม่ถูกต้อง', 'error');
      }
    });
  }
}

function copyOnlinePasscode() {
  const passcodeText = document.getElementById('userBannerPasscodeText')?.textContent?.trim();
  if (!passcodeText) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(passcodeText).then(() => {
      if (typeof showToast === 'function') showToast(`คัดลอกรหัสผ่าน ${passcodeText} เรียบร้อยแล้ว`, 'success');
    }).catch(() => {
      fallbackCopyText(passcodeText);
    });
  } else {
    fallbackCopyText(passcodeText);
  }
}

function fallbackCopyText(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    if (typeof showToast === 'function') showToast(`คัดลอกรหัสผ่าน ${text} เรียบร้อยแล้ว`, 'success');
  } catch (err) {
    if (typeof showToast === 'function') showToast('ไม่สามารถคัดลอกรหัสผ่านได้', 'error');
  }
  document.body.removeChild(textArea);
}

// Window attachments
window.handleUserLogin = handleUserLogin;
window.logoutUser = logoutUser;
window.triggerRaiseHand = triggerRaiseHand;
window.openLeaveModal = openLeaveModal;
window.closeLeaveModal = closeLeaveModal;
window.submitLeaveRequest = submitLeaveRequest;
window.insertNotePrefix = insertNotePrefix;
window.saveUserNoteDraft = saveUserNoteDraft;
window.renderUserProfile = renderUserProfile;
window.renderUserQrCode = renderUserQrCode;
window.initRecommendedFeaturesCarousel = initRecommendedFeaturesCarousel;
window.startRecommendedCarousel = startRecommendedCarousel;
window.stopRecommendedCarousel = stopRecommendedCarousel;
window.pauseRecommendedCarousel = pauseRecommendedCarousel;
window.resumeRecommendedCarousel = resumeRecommendedCarousel;
window.slideRecommendedNext = slideRecommendedNext;
function openUserMeetingHistoryModal() {
  const modal = document.getElementById('userMeetingHistoryModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderUserMeetingHistoryList();
  }
}

function closeUserMeetingHistoryModal() {
  const modal = document.getElementById('userMeetingHistoryModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function renderUserMeetingHistoryList() {
  const state = window.appState;
  const listEl = document.getElementById('userMeetingHistoryList');
  if (!listEl) return;
  const history = (state && Array.isArray(state.meetingHistory)) ? state.meetingHistory : [];
  if (history.length === 0) {
    listEl.innerHTML = `
      <div class="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
        <i data-lucide="folder-open" class="w-8 h-8 text-muted-foreground/40 mb-2 mx-auto block"></i>
        ยังไม่มีประวัติการประชุมที่ผ่านมาในระบบ
      </div>
    `;
    return;
  }
  listEl.innerHTML = history.map(rec => {
    const isOnline = rec.format === 'ONLINE';
    const st = rec.stats || { total: 0, onTime: 0, late: 0, leave: 0, absent: 0 };
    const dateFormatted = rec.endedDateStr || rec.date || '-';
    const myRecord = window.currentUserId && Array.isArray(rec.users) ? rec.users.find(u => u.id === window.currentUserId) : null;
    let myBadge = '';
    if (myRecord) {
      if (myRecord.isLeave) myBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400">ฉัน: ลาประชุม</span>`;
      else if (myRecord.checkedIn && myRecord.isLate) myBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">ฉัน: มาสาย</span>`;
      else if (myRecord.checkedIn) myBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">ฉัน: มาทันเวลา</span>`;
      else myBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">ฉัน: ขาดประชุม</span>`;
    }

    return `
      <div class="p-3.5 rounded-2xl bg-card border border-border shadow-2xs space-y-2.5">
        <div class="space-y-1.5">
          <h4 class="font-bold text-xs sm:text-sm text-foreground leading-snug">${rec.title || 'การประชุมชมรม'}</h4>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isOnline ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }">
              <i data-lucide="${isOnline ? 'globe' : 'map-pin'}" class="w-3 h-3"></i>
              ${isOnline ? `ออนไลน์ (${rec.onlinePlatform || 'Online'})` : `ออนไซต์ (${rec.location || '-'})`}
            </span>
            ${myBadge}
            <span class="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-1">
              <i data-lucide="calendar" class="w-3 h-3"></i>${dateFormatted} ${rec.endedTimeStr ? '• จบ ' + rec.endedTimeStr + ' น.' : ''}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div class="text-[11px] text-muted-foreground">
            เข้าประชุม <strong>${st.onTime + st.late}</strong> / ${st.total} คน
          </div>
          <button type="button" onclick="exportHistoryMeetingExcel('${rec.id}')"
            class="px-3 py-1.5 rounded-xl gradient-primary text-white text-xs font-bold shadow-xs hover:opacity-95 transition flex items-center gap-1.5 active:scale-95 cursor-pointer">
            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i> <span>ดาวน์โหลดสรุป (.xlsx)</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.openUserMeetingHistoryModal = openUserMeetingHistoryModal;
window.closeUserMeetingHistoryModal = closeUserMeetingHistoryModal;
window.renderUserMeetingHistoryList = renderUserMeetingHistoryList;
window.goToRecommendedSlide = goToRecommendedSlide;
window.updateRecommendedDots = updateRecommendedDots;
window.handleRecommendedFeatureClick = handleRecommendedFeatureClick;
window.openUserScanAdminQrModal = openUserScanAdminQrModal;
window.closeUserScanAdminQrModal = closeUserScanAdminQrModal;
window.toggleUserCameraScanner = toggleUserCameraScanner;
window.submitUserAdminCheckinCode = submitUserAdminCheckinCode;
window.processUserAdminQrToken = processUserAdminQrToken;
window.copyOnlinePasscode = copyOnlinePasscode;

// =============================================================================
// COMSAN CHOICE HOME BANNER CAROUSEL (21:9 Aspect Ratio)
// =============================================================================
let homeBannerSlideIndex = 0;
let homeBannerTimer = null;
let homeBannerPaused = false;
const HOME_BANNER_TOTAL = 3;

function renderHomeBannerPosition() {
  const track = document.getElementById('choiceHomeBannerTrack') || document.getElementById('homeBannerCarouselTrack');
  if (track) {
    track.style.transform = `translate3d(-${homeBannerSlideIndex * 100}%, 0px, 0px)`;
  }
  const dotsWrap = document.getElementById('choiceHomeBannerDots') || document.getElementById('homeBannerCarouselDots');
  if (dotsWrap) {
    const dots = dotsWrap.querySelectorAll('.home-banner-dot');
    dots.forEach((d, idx) => {
      d.className = idx === homeBannerSlideIndex
        ? 'home-banner-dot h-1.5 md:h-2 rounded-full transition-all duration-300 bg-white w-5 md:w-8 cursor-pointer'
        : 'home-banner-dot h-1.5 md:h-2 rounded-full transition-all duration-300 bg-white/40 w-1.5 md:w-2 cursor-pointer hover:bg-white/70';
    });
  }
}

function stepHomeBannerSlide(delta) {
  homeBannerSlideIndex = (homeBannerSlideIndex + delta + HOME_BANNER_TOTAL) % HOME_BANNER_TOTAL;
  renderHomeBannerPosition();
}

function goToHomeBannerSlide(idx) {
  homeBannerSlideIndex = ((idx % HOME_BANNER_TOTAL) + HOME_BANNER_TOTAL) % HOME_BANNER_TOTAL;
  renderHomeBannerPosition();
}

function scheduleHomeBannerAutoSlide() {
  if (homeBannerTimer) clearTimeout(homeBannerTimer);
  if (homeBannerPaused) return;
  homeBannerTimer = setTimeout(() => {
    stepHomeBannerSlide(1);
    scheduleHomeBannerAutoSlide();
  }, 4500);
}

function pauseHomeBannerCarousel() {
  homeBannerPaused = true;
  if (homeBannerTimer) clearTimeout(homeBannerTimer);
}

function resumeHomeBannerCarousel() {
  homeBannerPaused = false;
  scheduleHomeBannerAutoSlide();
}

setTimeout(() => {
  scheduleHomeBannerAutoSlide();
}, 800);

// =============================================================================
// COMSAN CHOICE STICKY BOARD (/board) CONTROLLER
// =============================================================================
let selectedStickyColor = '#FEF08A';

function getStickyBoardNotes() {
  try {
    const saved = localStorage.getItem('comsan_choice_sticky_notes');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  const defaults = [
    {
      id: 'sn-1',
      text: 'อยากให้มีกิจกรรมสันทนาการสานสัมพันธ์น้องใหม่ร่วมกับทุกสาขาในเทอมหน้าครับ 🎉',
      color: '#FEF08A',
      rotation: -2,
      authorName: 'บอส (นายภูวดล ใจดี)',
      authorRole: 'ประธานสโมสร',
      createdAt: 'วันนี้ • 14:20',
      likes: 5
    },
    {
      id: 'sn-2',
      text: 'เสนอให้จัดเตรียมเอกสารระเบียบวาระล่วงหน้าอย่างน้อย 2 วันก่อนวันประชุมใหญ่ เพื่อความรวดเร็วในการพิจารณาวาระ 📋',
      color: '#BAE6FD',
      rotation: 1.5,
      authorName: 'เอิร์ธ (น.ส.กมลชนก ศรีสุข)',
      authorRole: 'เลขานุการ',
      createdAt: 'วันนี้ • 15:05',
      likes: 4
    },
    {
      id: 'sn-3',
      text: 'ระบบเช็คชื่อผ่าน QR Code และโหวตมติแบบเรียลไทม์ใช้งานง่ายมากครับ ขอบคุณทีมงานฝ่ายเทคนิคทุกคน! 💜',
      color: '#FBCFE8',
      rotation: -1.2,
      authorName: 'นนท์ (นายชานนท์ วงศ์สวัสดิ์)',
      authorRole: 'กรรมการบริหาร',
      createdAt: 'วันนี้ • 16:10',
      likes: 7
    }
  ];
  try {
    localStorage.setItem('comsan_choice_sticky_notes', JSON.stringify(defaults));
  } catch (e) {}
  return defaults;
}

function saveStickyBoardNotes(notes) {
  try {
    localStorage.setItem('comsan_choice_sticky_notes', JSON.stringify(notes));
  } catch (e) {}
}

function switchBoardMode(mode) {
  const stickyView = document.getElementById('choiceStickyBoardView');
  const personalView = document.getElementById('personalMeetingNoteView');
  const btnSticky = document.getElementById('btnBoardTabSticky') || document.getElementById('boardTabStickyBtn');
  const btnPersonal = document.getElementById('btnBoardTabPersonal') || document.getElementById('boardTabPersonalNoteBtn');

  if (mode === 'PERSONAL') {
    if (stickyView) stickyView.classList.add('hidden');
    if (personalView) personalView.classList.remove('hidden');
    if (btnPersonal) btnPersonal.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-card text-foreground shadow-2xs transition cursor-pointer flex items-center gap-1.5';
    if (btnSticky) btnSticky.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-1.5';
  } else {
    if (stickyView) stickyView.classList.remove('hidden');
    if (personalView) personalView.classList.add('hidden');
    if (btnSticky) btnSticky.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-card text-foreground shadow-2xs transition cursor-pointer flex items-center gap-1.5';
    if (btnPersonal) btnPersonal.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-1.5';
    renderChoiceStickyBoard();
  }
}

function renderChoiceStickyBoard() {
  const canvas = document.getElementById('choiceStickyCanvas');
  if (!canvas) return;

  const notes = getStickyBoardNotes();
  if (!notes.length) {
    canvas.innerHTML = `
      <div class="flex flex-col items-center justify-center py-24 text-center">
        <div class="w-16 h-16 rounded-2xl bg-yellow-200/80 border border-yellow-300 shadow-sm flex items-center justify-center mb-4 -rotate-3">
          <i data-lucide="sticky-note" class="h-8 w-8 text-yellow-800"></i>
        </div>
        <p class="text-base font-semibold text-foreground">ยังไม่มีโน้ตบนกระดานความคิด</p>
        <p class="text-sm text-muted-foreground mt-1">กดปุ่ม "+ เพิ่มโน้ต" เพื่อแปะโพสต์อิทใบแรกของคุณ</p>
      </div>
    `;
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    return;
  }

  canvas.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2 sm:p-4">
      ${notes.map(note => {
        const rot = typeof note.rotation === 'number' ? note.rotation : 0;
        const bg = note.color || '#FEF08A';
        return `
          <div class="relative rounded-lg p-5 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[190px] border border-black/5 group"
               style="background-color: ${bg}; transform: rotate(${rot}deg); color: #1e293b;">
            <!-- Pin / Tape effect at top -->
            <div class="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-5 bg-white/60 backdrop-blur-xs rounded-xs shadow-2xs border border-black/5"></div>

            <div class="space-y-2 pt-1">
              <p class="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words" style="color: #0f172a;">${String(note.text || '').replace(/</g, '&lt;')}</p>
            </div>

            <div class="pt-4 mt-4 border-t border-black/10 flex items-center justify-between gap-2 text-xs" style="color: #334155;">
              <div class="min-w-0">
                <p class="font-semibold truncate" style="color: #0f172a;">${note.authorName || 'สมาชิก COMSAN'}</p>
                <p class="text-[11px] opacity-75 truncate">${note.authorRole || 'สมาชิก'} • ${note.createdAt || 'เมื่อสักครู่'}</p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" onclick="likeStickyNote('${note.id}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/60 hover:bg-white/90 text-rose-600 font-semibold text-xs transition shadow-2xs">
                  <span>❤️</span>
                  <span>${note.likes || 0}</span>
                </button>
                <button type="button" onclick="deleteStickyNote('${note.id}')" class="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-white/60 hover:bg-rose-500 hover:text-white text-slate-600 transition" title="ลบโน้ต">
                  <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function openAddStickyNoteModal() {
  const modal = document.getElementById('addStickyNoteModal');
  const ta = document.getElementById('newStickyNoteText');
  if (ta) ta.value = '';
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => { if (ta) ta.focus(); }, 100);
  }
}

function closeAddStickyNoteModal() {
  const modal = document.getElementById('addStickyNoteModal');
  if (modal) modal.classList.add('hidden');
}

function selectStickyNoteColor(color, btnEl) {
  selectedStickyColor = color || '#FEF08A';
  const row = document.getElementById('stickyColorPickerRow');
  if (row) {
    row.querySelectorAll('button').forEach(b => {
      b.className = 'w-8 h-8 rounded-full border border-black/10 transition hover:scale-105';
    });
  }
  if (btnEl) {
    btnEl.className = 'w-8 h-8 rounded-full border-2 border-primary ring-2 ring-primary/30 transition transform scale-110';
  }
}

function saveNewStickyNote() {
  const ta = document.getElementById('newStickyNoteText');
  const text = (ta ? ta.value : '').trim();
  if (!text) {
    if (typeof showToast === 'function') showToast('กรุณาพิมพ์ข้อความบนกระดาษโน้ต', 'warning');
    return;
  }

  const state = window.appState;
  const me = state && (state.users || []).find(u => u.id === window.currentUserId);
  const authorName = me ? `${me.nickname} (${me.firstName})` : 'Comsan Official';
  const authorRole = me ? (me.position || 'สมาชิกชมรม') : 'ประธานสโมสร';
  const rotations = [-2.2, -1.4, -0.8, 0.9, 1.5, 2.1];
  const rot = rotations[Math.floor(Math.random() * rotations.length)];

  const notes = getStickyBoardNotes();
  notes.unshift({
    id: 'sn-' + Date.now(),
    text,
    color: selectedStickyColor || '#FEF08A',
    rotation: rot,
    authorName,
    authorRole,
    createdAt: 'เมื่อสักครู่',
    likes: 1
  });
  saveStickyBoardNotes(notes);
  closeAddStickyNoteModal();
  switchBoardMode('STICKY');
  renderChoiceStickyBoard();
  if (typeof showToast === 'function') showToast('แปะโพสต์อิทบนกระดานความคิดเรียบร้อยแล้ว!', 'success');
}

function likeStickyNote(noteId) {
  const notes = getStickyBoardNotes();
  const target = notes.find(n => n.id === noteId);
  if (target) {
    target.likes = (target.likes || 0) + 1;
    saveStickyBoardNotes(notes);
    renderChoiceStickyBoard();
  }
}

function deleteStickyNote(noteId) {
  const notes = getStickyBoardNotes().filter(n => n.id !== noteId);
  saveStickyBoardNotes(notes);
  renderChoiceStickyBoard();
  if (typeof showToast === 'function') showToast('ลบกระดาษโน้ตแล้ว', 'info');
}

window.stepHomeBannerSlide = stepHomeBannerSlide;
window.goToHomeBannerSlide = goToHomeBannerSlide;
window.pauseHomeBannerCarousel = pauseHomeBannerCarousel;
window.resumeHomeBannerCarousel = resumeHomeBannerCarousel;
window.switchBoardMode = switchBoardMode;
window.renderChoiceStickyBoard = renderChoiceStickyBoard;
window.openAddStickyNoteModal = openAddStickyNoteModal;
window.closeAddStickyNoteModal = closeAddStickyNoteModal;
window.selectStickyNoteColor = selectStickyNoteColor;
window.saveNewStickyNote = saveNewStickyNote;
window.likeStickyNote = likeStickyNote;
window.deleteStickyNote = deleteStickyNote;



