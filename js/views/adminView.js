/**
 * COMSAN Meeting System - Admin View Controller
 */

function requestAdminAccess() {
  if (window.isAdminAuthenticated) {
    if (typeof window.switchRoleView === 'function') {
      window.switchRoleView('ADMIN');
    }
    return;
  }
  const input = document.getElementById('adminPassInput');
  const err = document.getElementById('adminLoginError');
  if (input) input.value = '';
  if (err) err.classList.add('hidden');
  const modal = document.getElementById('adminLoginModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  setTimeout(() => {
    if (input) input.focus();
  }, 100);
}

function closeAdminModal() {
  const modal = document.getElementById('adminLoginModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleAdminLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('adminPassInput');
  const pass = input ? input.value.trim() : '';
  const validPass = window.ADMIN_PASSWORD || (typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'admincomsan26');
  if (pass === validPass) {
    if (typeof window.setSessionAdmin === 'function') window.setSessionAdmin(true);
    else { window.isAdminAuthenticated = true; localStorage.setItem('comsan_admin_auth', 'true'); }

    if (typeof window.setSessionRole === 'function') window.setSessionRole('ADMIN');
    else { window.currentRole = 'ADMIN'; localStorage.setItem('comsan_role', 'ADMIN'); }

    if (!window.currentUserId) {
      if (typeof window.setSessionUser === 'function') window.setSessionUser('COMSAN-01', false);
      else { window.currentUserId = 'COMSAN-01'; }
    }

    closeAdminModal();
    if (typeof window.closeSettingsModal === 'function') window.closeSettingsModal();
    const authScreen = document.getElementById('authScreen');
    const appLayout = document.getElementById('appLayout');
    if (authScreen) authScreen.classList.add('hidden');
    if (appLayout) {
      appLayout.classList.remove('hidden');
      appLayout.classList.add('flex');
    }
    if (typeof window.switchRoleView === 'function') {
      window.switchRoleView('ADMIN');
    }
    if (typeof window.updateSidebarVisibility === 'function') {
      window.updateSidebarVisibility();
    }
    if (typeof window.renderAll === 'function') {
      window.renderAll();
    }
    showToast('เข้าสู่ระบบผู้ดำเนินการ (ADMIN) สำเร็จ', 'success');
  } else {
    const err = document.getElementById('adminLoginError');
    if (err) err.classList.remove('hidden');
  }
}

let currentMeetingFormat = 'ONSITE';
let currentOnlinePlatform = 'GOOGLE_MEET';

function setMeetingFormat(format) {
  currentMeetingFormat = format === 'ONLINE' ? 'ONLINE' : 'ONSITE';
  const btnOnsite = document.getElementById('btnFormatOnsite');
  const btnOnline = document.getElementById('btnFormatOnline');
  const onsiteBox = document.getElementById('cfgMeetingLocationBox');
  const onlineBox = document.getElementById('cfgMeetingOnlineBox');
  const badge = document.getElementById('cfgCurrentFormatBadge');
  const note = document.getElementById('cfgCheckinSummaryNote');

  if (currentMeetingFormat === 'ONLINE') {
    if (btnOnline) {
      btnOnline.className = 'py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition bg-primary text-white shadow-xs border-primary';
    }
    if (btnOnsite) {
      btnOnsite.className = 'py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition bg-card border-border text-muted-foreground hover:text-foreground';
    }
    if (onsiteBox) onsiteBox.classList.add('hidden');
    if (onlineBox) onlineBox.classList.remove('hidden');
    if (badge) {
      badge.textContent = 'ออนไลน์ (Online)';
      badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
    }
    if (note) {
      note.textContent = 'Online: สมาชิกสแกน QR Code หรือกรอกรหัสเช็คชื่อของผู้ดูแลระบบ';
    }
  } else {
    if (btnOnsite) {
      btnOnsite.className = 'py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition bg-primary text-white shadow-xs border-primary';
    }
    if (btnOnline) {
      btnOnline.className = 'py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition bg-card border-border text-muted-foreground hover:text-foreground';
    }
    if (onsiteBox) onsiteBox.classList.remove('hidden');
    if (onlineBox) onlineBox.classList.add('hidden');
    if (badge) {
      badge.textContent = 'ในสถานที่ (On-site)';
      badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20';
    }
    if (note) {
      note.textContent = 'On-site: ผู้ดูแลระบบสแกน QR Code ประจำตัวสมาชิก';
    }
  }
}

function selectOnlinePlatform(platform) {
  currentOnlinePlatform = platform;
  const buttons = document.querySelectorAll('.platform-select-btn');
  buttons.forEach(btn => {
    const p = btn.getAttribute('data-platform');
    if (p === platform) {
      btn.className = 'platform-select-btn p-2.5 rounded-xl border border-primary bg-primary/10 text-primary text-xs font-bold flex flex-col items-center gap-1.5 transition shadow-2xs';
    } else {
      btn.className = 'platform-select-btn p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-medium flex flex-col items-center gap-1.5 transition';
    }
  });
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

function startOfficialMeeting(e) {
  if (e && e.preventDefault) e.preventDefault();
  const title = (document.getElementById('cfgMeetingTitle')?.value || '').trim();
  const date = document.getElementById('cfgMeetingDate')?.value ||
    ((typeof window.getLocalDateString === 'function') ? window.getLocalDateString() : new Date().toLocaleDateString('en-CA'));
  const endDate = document.getElementById('cfgMeetingEndDate')?.value || date;
  const startTime = document.getElementById('cfgStartTime')?.value || '17:00';
  const lateTime = document.getElementById('cfgLateTime')?.value || '17:15';
  const endTime = document.getElementById('cfgEndTime')?.value || '19:00';

  if (!title) {
    showToast('กรุณากรอก "หัวข้อการประชุม" ก่อนเปิดการประชุม!', 'error');
    return false;
  }

  let payload = {
    format: currentMeetingFormat,
    title,
    date,
    endDate: endDate || date,
    startTime,
    lateTime,
    endTime
  };

  if (currentMeetingFormat === 'ONLINE') {
    const onlineUrl = (document.getElementById('cfgOnlineMeetingUrl')?.value || '').trim();
    const onlinePasscode = (document.getElementById('cfgOnlineMeetingPasscode')?.value || '').trim();
    const onlineDetail = (document.getElementById('cfgOnlineMeetingDetail')?.value || '').trim();
    if (!onlineUrl) {
      showToast('กรุณากรอก "ลิงก์ห้องประชุมออนไลน์" ก่อนเปิดการประชุม!', 'error');
      return false;
    }
    payload.onlinePlatform = currentOnlinePlatform;
    payload.onlineUrl = onlineUrl;
    payload.onlinePasscode = onlinePasscode;
    payload.location = `ออนไลน์ (${currentOnlinePlatform})`;
    payload.locationDetail = onlineDetail || `ออนไลน์ (${currentOnlinePlatform})`;
  } else {
    const location = (document.getElementById('cfgMeetingLocation')?.value || '').trim();
    const locationDetail = (document.getElementById('cfgMeetingLocationDetail')?.value || '').trim();
    if (!location) {
      showToast('กรุณากรอก "สถานที่ประชุม (ชื่อห้องประชุม)" ก่อนเปิดการประชุม!', 'error');
      return false;
    }
    payload.location = location;
    payload.locationDetail = locationDetail || location;
  }

  window.appState.meeting = {
    ...window.appState.meeting,
    ...payload,
    startedAtMs: Date.now(),
    isStarted: true,
    isEnded: false
  };

  resetAllUsersAttendance(window.appState.users);
  window.appState.raiseHandQueue = [];
  window.saveLocalState();
  window.socket.emit('admin:startMeeting', payload);
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast('เปิดการประชุมเรียบร้อยแล้ว', 'success');
  return true;
}

async function resetMeetingToNotStarted() {
  const confirmed = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: 'ยืนยันการรีเซ็ตสถานะการประชุม',
        message: 'ต้องการตั้งค่าสถานะกลับเป็น "การประชุมยังไม่เริ่ม" หรือไม่? ระบบจะรีเซ็ตสถานะการเช็คชื่อของสมาชิกทั้งหมด',
        confirmText: 'ยืนยันรีเซ็ต',
        cancelText: 'ยกเลิก',
        isDanger: true,
        icon: 'rotate-ccw'
      })
    : false;
  if (!confirmed) return;
  window.appState.meeting.isStarted = false;
  window.appState.meeting.isEnded = false;
  window.appState.meeting.startedAtMs = null;
  (window.appState.motions || []).forEach(m => {
    m.isOpen = false;
  });
  resetAllUsersAttendance(window.appState.users);
  window.appState.raiseHandQueue = [];
  window.saveLocalState();
  window.socket.emit('admin:resetMeetingStatus');
  const toggleSwitch = document.getElementById('adminMeetingToggleSwitch');
  if (toggleSwitch) toggleSwitch.checked = false;
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast('รีเซ็ตสถานะการประชุมเรียบร้อยแล้ว', 'info');
}

async function endMeetingNow(skipConfirm = false) {
  if (!skipConfirm) {
    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'ยืนยันการจบการประชุม',
          message: 'ยืนยันการจบการประชุมและเปิดหน้าสรุปผลการประชุมหรือไม่?',
          confirmText: 'จบการประชุม',
          cancelText: 'ยกเลิก',
          isDanger: false,
          icon: 'flag'
        })
      : false;
    if (!confirmed) return;
  }

  window.appState.meeting.isEnded = true;
  (window.appState.motions || []).forEach(m => {
    m.isOpen = false;
  });

  window.appState.lastMeetingSummary = {
    meetingTitle: window.appState.meeting.title,
    meetingDate: window.appState.meeting.date,
    location: window.appState.meeting.location,
    format: window.appState.meeting.format,
    onlinePlatform: window.appState.meeting.onlinePlatform,
    startTime: window.appState.meeting.startTime,
    endTime: window.appState.meeting.endTime,
    lateTime: window.appState.meeting.lateTime,
    endedAtMs: Date.now(),
    users: JSON.parse(JSON.stringify(window.appState.users || [])),
    motions: JSON.parse(JSON.stringify(window.appState.motions || []))
  };

  resetAllUsersAttendance(window.appState.users);
  window.appState.raiseHandQueue = [];

  window.saveLocalState();
  window.socket.emit('admin:endMeeting');
  if (typeof window.switchAdminTab === 'function') window.switchAdminTab('SUMMARY');
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast('จบการประชุมเรียบร้อยแล้ว', 'info');
}

async function handleAdminMeetingToggle(isChecked) {
  const toggleSwitch = document.getElementById('adminMeetingToggleSwitch');
  const state = window.appState;
  const isMeetingActive = Boolean(state?.meeting?.isStarted && !state?.meeting?.isEnded);

  if (isChecked) {
    if (!isMeetingActive) {
      const success = startOfficialMeeting();
      if (!success && toggleSwitch) {
        toggleSwitch.checked = false;
      }
    }
  } else {
    if (isMeetingActive) {
      const confirmed = typeof window.showConfirmDialog === 'function'
        ? await window.showConfirmDialog({
            title: 'ยืนยันการจบการประชุม',
            message: 'ยืนยันการจบการประชุมและเปิดหน้าสรุปผลการประชุมหรือไม่?',
            confirmText: 'จบการประชุม',
            cancelText: 'ยกเลิก',
            isDanger: false,
            icon: 'flag'
          })
        : false;
      if (confirmed) {
        endMeetingNow(true);
      } else {
        if (toggleSwitch) toggleSwitch.checked = true;
      }
    } else {
      if (toggleSwitch) toggleSwitch.checked = false;
    }
  }
}

function toggleShowSeatsSetting() {
  const checkbox = document.getElementById('toggleShowSeatsToUsers');
  const checked = checkbox ? checkbox.checked : true;
  window.appState.meeting.showSeatsToUsers = checked;
  window.saveLocalState();
  window.socket.emit('admin:toggleShowSeats', checked);
  if (typeof window.renderAll === 'function') window.renderAll();
}

function processUserCheckIn(identifier) {
  const state = window.appState;
  if (!state.meeting || !state.meeting.isStarted) {
    if (typeof playNotificationSound === 'function') playNotificationSound('alert');
    return showToast('การประชุมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้', 'warning');
  }
  if (state.meeting && state.meeting.isEnded) {
    if (typeof playNotificationSound === 'function') playNotificationSound('alert');
    return showToast('การประชุมสิ้นสุดลงแล้ว ไม่สามารถเช็คชื่อได้', 'warning');
  }

  const cleanId = String(identifier || '').trim().toLowerCase();
  const user = (state.users || []).find(
    u => u.id.toLowerCase() === cleanId ||
         u.nickname.toLowerCase() === cleanId ||
         u.firstName.toLowerCase() === cleanId
  );
  if (!user) return showToast(`ไม่พบสมาชิก: "${identifier}"`, 'error');
  user.checkedIn = true;
  user.isLeave = false;
  user.checkInTimestamp = Date.now();
  user.checkInTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  window.saveLocalState();
  window.socket.emit('admin:checkIn', identifier, (res) => {
    if (res && !res.ok) {
      showToast(res.message || 'ไม่สามารถเช็คชื่อได้', 'error');
    }
  });
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast(`เช็คชื่อสำเร็จ: ${user.nickname}`, 'success');
}

function handleManualCheckIn() {
  const state = window.appState;
  if (!state.meeting || !state.meeting.isStarted) {
    if (typeof playNotificationSound === 'function') playNotificationSound('alert');
    return showToast('การประชุมยังไม่เริ่ม ไม่สามารถเช็คชื่อได้', 'warning');
  }
  if (state.meeting && state.meeting.isEnded) {
    if (typeof playNotificationSound === 'function') playNotificationSound('alert');
    return showToast('การประชุมสิ้นสุดลงแล้ว ไม่สามารถเช็คชื่อได้', 'warning');
  }
  const input = document.getElementById('manualQrInput');
  if (!input || !input.value.trim()) return;
  processUserCheckIn(input.value.trim());
  input.value = '';
}

function toggleCameraScanner() {
  const container = document.getElementById('qrReaderContainer');
  const btn = document.getElementById('btnToggleScanner');
  const state = window.appState;

  if (!window.isScannerRunning) {
    if (!state.meeting || !state.meeting.isStarted) {
      if (typeof playNotificationSound === 'function') playNotificationSound('alert');
      return showToast('การประชุมยังไม่เริ่ม ไม่สามารถเปิดกล้องเช็คชื่อได้', 'warning');
    }
    if (state.meeting && state.meeting.isEnded) {
      if (typeof playNotificationSound === 'function') playNotificationSound('alert');
      return showToast('การประชุมสิ้นสุดลงแล้ว ไม่สามารถเปิดกล้องเช็คชื่อได้', 'warning');
    }
    if (typeof Html5Qrcode !== 'undefined') {
      if (container) container.classList.remove('hidden');
      if (btn) btn.innerHTML = '<i data-lucide="square" class="mr-1.5"></i> ปิดกล้องสแกน QR';
      window.html5QrScanner = new Html5Qrcode('qr-reader');
      window.html5QrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (txt) => processUserCheckIn(txt),
        () => {}
      ).catch(() => {
        showToast('เปิดกล้องไม่ได้ (ต้องเปิดผ่าน localhost หรือ HTTPS)', 'error');
        if (container) container.classList.add('hidden');
      });
      window.isScannerRunning = true;
    }
  } else if (window.html5QrScanner) {
    window.html5QrScanner.stop().then(() => {
      if (container) container.classList.add('hidden');
      if (btn) btn.innerHTML = '<i data-lucide="camera" class="mr-1.5"></i> เปิดกล้องสแกน QR Code';
      window.isScannerRunning = false;
    });
  }
}

window.selectedHistoryMeetingId = null;

function toggleAdminHistoryDrawer() {
  const drawer = document.getElementById('adminHistoryDrawer');
  const chevron = document.getElementById('adminHistoryChevron');
  if (drawer) {
    const isHidden = drawer.classList.contains('hidden');
    drawer.classList.toggle('hidden', !isHidden);
    if (chevron) {
      chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }
}
window.toggleAdminHistoryDrawer = toggleAdminHistoryDrawer;

function viewHistoryMeetingSummary(id) {
  window.selectedHistoryMeetingId = id;
  renderSummarySection();
  const alertEl = document.getElementById('summaryViewingHistoryAlert');
  if (alertEl) {
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
window.viewHistoryMeetingSummary = viewHistoryMeetingSummary;

function returnToCurrentMeetingSummary() {
  window.selectedHistoryMeetingId = null;
  renderSummarySection();
}
window.returnToCurrentMeetingSummary = returnToCurrentMeetingSummary;

async function deleteHistoryMeeting(meetingId) {
  if (!meetingId) return;
  const confirmed = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: 'ยืนยันการลบประวัติการประชุม',
        message: 'คุณต้องการลบประวัติการประชุมนี้ออกจากระบบใช่หรือไม่? ข้อมูลสรุปและบันทึกจะไม่สามารถกู้คืนได้',
        confirmText: 'ลบประวัติการประชุม',
        isDanger: true,
        icon: 'trash-2'
      })
    : false;
  if (!confirmed) return;
  if (window.selectedHistoryMeetingId === meetingId) {
    window.selectedHistoryMeetingId = null;
  }
  window.socket.emit('admin:deleteMeetingHistory', meetingId);
  if (typeof showToast === 'function') showToast('ลบประวัติการประชุมเรียบร้อยแล้ว', 'info');
}
window.deleteHistoryMeeting = deleteHistoryMeeting;

function renderMeetingHistoryList() {
  const state = window.appState;
  const listEl = document.getElementById('adminHistoryList');
  const badgeEl = document.getElementById('adminHistoryBadgeCount');
  const history = (state && Array.isArray(state.meetingHistory)) ? state.meetingHistory : [];

  if (badgeEl) badgeEl.textContent = history.length;

  if (!listEl) return;
  if (history.length === 0) {
    listEl.innerHTML = `
      <div class="p-6 text-center text-xs text-muted-foreground bg-card/60 rounded-xl border border-dashed border-border">
        <i data-lucide="folder-open" class="w-8 h-8 text-muted-foreground/40 mb-2 mx-auto block"></i>
        ยังไม่มีประวัติการประชุมที่ถูกบันทึกไว้ในระบบ<br>
        <span class="text-[11px] opacity-75">(ระบบจะบันทึกให้อัตโนมัติเมื่อกด "จบการประชุม" ทุกครั้ง)</span>
      </div>
    `;
    return;
  }

  listEl.innerHTML = history.map(rec => {
    const isSelected = window.selectedHistoryMeetingId === rec.id;
    const isOnline = rec.format === 'ONLINE';
    const st = rec.stats || { total: 0, onTime: 0, late: 0, leave: 0, absent: 0 };
    const dateFormatted = (rec.endDate && rec.endDate !== rec.date)
      ? `${rec.date} ถึง ${rec.endDate}`
      : (rec.endedDateStr || rec.date || '-');
    const schedTime = rec.scheduledEndTime || rec.endTime || '-';
    const actualTime = rec.actualEndTime || rec.endedTimeStr || '-';

    return `
      <div class="p-3 rounded-xl border transition-all ${
        isSelected
          ? 'bg-primary/[0.08] border-primary shadow-xs'
          : 'bg-card border-border hover:border-border/80'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="min-w-0 space-y-1.5 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-xs sm:text-sm text-foreground truncate">${rec.title || 'การประชุมชมรม'}</span>
            ${isSelected ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shrink-0">กำลังแสดงผล</span>` : ''}
            <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              isOnline ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }">
              <i data-lucide="${isOnline ? 'globe' : 'map-pin'}" class="w-3 h-3"></i>
              ${isOnline ? `ออนไลน์ (${rec.onlinePlatform || 'Online'})` : `ออนไซต์ (${rec.location || '-'})`}
            </span>
          </div>
          <div class="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span class="inline-flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i>${dateFormatted}</span>
            <span class="inline-flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>กำหนดเลิก: ${schedTime} น. • ปิดจริง: ${actualTime} น.</span>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] flex-wrap pt-0.5">
            <span class="text-muted-foreground">ทั้งหมด <strong>${st.total}</strong></span>
            <span class="text-border">•</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">ทัน ${st.onTime}</span>
            <span class="text-border">•</span>
            <span class="text-amber-600 dark:text-amber-400 font-semibold">สาย ${st.late}</span>
            <span class="text-border">•</span>
            <span class="text-sky-600 dark:text-sky-400 font-semibold">ลา ${st.leave}</span>
            <span class="text-border">•</span>
            <span class="text-rose-600 dark:text-rose-400 font-semibold">ขาด ${st.absent}</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <button type="button" onclick="viewHistoryMeetingSummary('${rec.id}')"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i> <span>${isSelected ? 'กำลังดู' : 'ดูสรุปผล'}</span>
          </button>
          <button type="button" onclick="exportHistoryMeetingExcel('${rec.id}')" title="ดาวน์โหลดรายงานสรุปรอบนี้"
            class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i> <span>Excel</span>
          </button>
          <button type="button" onclick="deleteHistoryMeeting('${rec.id}')" title="ลบประวัติรอบนี้"
            class="w-7 h-7 rounded-lg hover:bg-rose-500/15 text-muted-foreground hover:text-rose-600 flex items-center justify-center transition cursor-pointer">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}
window.renderMeetingHistoryList = renderMeetingHistoryList;

function getSummaryUsers() {
  const state = window.appState;
  if (!state) return [];
  if (window.selectedHistoryMeetingId && Array.isArray(state.meetingHistory)) {
    const hist = state.meetingHistory.find(m => m.id === window.selectedHistoryMeetingId);
    if (hist && Array.isArray(hist.users)) {
      return hist.users;
    }
  }
  if (state.meeting && state.meeting.isStarted && !state.meeting.isEnded) {
    return state.users || [];
  }
  if (state.lastMeetingSummary && Array.isArray(state.lastMeetingSummary.users) && state.lastMeetingSummary.users.length > 0) {
    return state.lastMeetingSummary.users;
  }
  return state.users || [];
}
window.getSummaryUsers = getSummaryUsers;

async function adminChangeUserStatus(userId, newStatus) {
  const state = window.appState;
  if (!state) return;

  if (window.selectedHistoryMeetingId && Array.isArray(state.meetingHistory)) {
    const hist = state.meetingHistory.find(m => m.id === window.selectedHistoryMeetingId);
    if (hist && Array.isArray(hist.users)) {
      const u = hist.users.find(usr => usr.id === userId);
      if (u) {
        let reason = u.leaveReason || '';
        if (newStatus === 'LEAVE' && !reason) {
          reason = typeof window.showPromptDialog === 'function'
            ? await window.showPromptDialog({
                title: 'ระบุเหตุผลการลาประชุม',
                message: `ระบุเหตุผลการลาของ ${u.nickname}:`,
                defaultValue: 'ลาป่วย / ติดภารกิจ',
                placeholder: 'กรอกเหตุผลการลา...',
                confirmText: 'บันทึก'
              })
            : 'ผู้ดูแลระบบอนุมัติลา';
          if (!reason) reason = 'ผู้ดูแลระบบอนุมัติลา';
        }
        const nowTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        if (newStatus === 'LEAVE') {
          u.isLeave = true; u.checkedIn = false; u.isLate = false; u.leaveReason = reason; u.checkInTimeStr = 'ลาประชุม';
        } else if (newStatus === 'ABSENT') {
          u.isLeave = false; u.checkedIn = false; u.isLate = false; u.leaveReason = ''; u.checkInTimeStr = '-'; u.attendedMinutes = 0;
        } else if (newStatus === 'LATE') {
          u.isLeave = false; u.checkedIn = true; u.isLate = true; if (['-', 'ลาประชุม', 'แจ้งลา'].includes(u.checkInTimeStr)) u.checkInTimeStr = nowTimeStr;
        } else if (newStatus === 'ONTIME') {
          u.isLeave = false; u.checkedIn = true; u.isLate = false; if (['-', 'ลาประชุม', 'แจ้งลา'].includes(u.checkInTimeStr)) u.checkInTimeStr = nowTimeStr;
        }
        hist.stats = {
          total: hist.users.length,
          onTime: hist.users.filter(usr => usr.checkedIn && !usr.isLate && !usr.isLeave).length,
          late: hist.users.filter(usr => usr.checkedIn && usr.isLate && !usr.isLeave).length,
          leave: hist.users.filter(usr => usr.isLeave).length,
          absent: hist.users.filter(usr => !usr.checkedIn && !usr.isLeave).length
        };
        window.saveLocalState();
        window.socket.emit('admin:updateMeetingHistory', hist);
        renderSummarySection();
        return;
      }
    }
  }

  const user = (state.users || []).find(u => u.id === userId);
  const summaryUser = (state.lastMeetingSummary && Array.isArray(state.lastMeetingSummary.users))
    ? state.lastMeetingSummary.users.find(u => u.id === userId)
    : null;
  if (!user && !summaryUser) return;
  const targetUser = user || summaryUser;
  let reason = targetUser.leaveReason || '';
  if (newStatus === 'LEAVE' && !reason) {
    reason = typeof window.showPromptDialog === 'function'
      ? await window.showPromptDialog({
          title: 'ระบุเหตุผลการลาประชุม',
          message: `ระบุเหตุผลการลาของ ${targetUser.nickname}:`,
          defaultValue: 'ลาป่วย / ติดภารกิจ',
          placeholder: 'กรอกเหตุผลการลา...',
          confirmText: 'บันทึก'
        })
      : 'ผู้ดูแลระบบอนุมัติลา';
    if (!reason) reason = 'ผู้ดูแลระบบอนุมัติลา';
  }
  const nowTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  [user, summaryUser].filter(Boolean).forEach(u => {
    if (newStatus === 'LEAVE') {
      u.isLeave = true;
      u.checkedIn = false;
      u.isLate = false;
      u.leaveReason = reason;
      u.checkInTimeStr = 'ลาประชุม';
    } else if (newStatus === 'ABSENT') {
      u.isLeave = false;
      u.checkedIn = false;
      u.isLate = false;
      u.leaveReason = '';
      u.checkInTimeStr = '-';
      u.attendedMinutes = 0;
    } else if (newStatus === 'LATE') {
      u.isLeave = false;
      u.checkedIn = true;
      u.isLate = true;
      if (['-', 'ลาประชุม', 'แจ้งลา'].includes(u.checkInTimeStr)) u.checkInTimeStr = nowTimeStr;
    } else if (newStatus === 'ONTIME') {
      u.isLeave = false;
      u.checkedIn = true;
      u.isLate = false;
      if (['-', 'ลาประชุม', 'แจ้งลา'].includes(u.checkInTimeStr)) u.checkInTimeStr = nowTimeStr;
    }
  });

  window.saveLocalState();
  window.socket.emit('admin:setAttendanceStatus', { userId, status: newStatus, reason });
  if (typeof window.renderAll === 'function') window.renderAll();
}

function removeQueueItem(queueId) {
  window.appState.raiseHandQueue = (window.appState.raiseHandQueue || []).filter(q => q.queueId !== queueId);
  window.saveLocalState();
  window.socket.emit('admin:removeQueue', queueId);
  if (typeof window.renderAll === 'function') window.renderAll();
}

async function clearRaiseHandQueue() {
  const queueCount = (window.appState?.raiseHandQueue || []).length;
  if (queueCount === 0) {
    if (typeof showToast === 'function') showToast('ไม่มีคิวยกมือในขณะนี้', 'info');
    return;
  }
  const confirmed = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: 'ยืนยันการล้างคิวยกมือ',
        message: `คุณต้องการล้างคิวผู้ขอยกมือทั้งหมด (${queueCount} คน) หรือไม่?`,
        confirmText: 'ล้างคิวทั้งหมด',
        isDanger: true,
        icon: 'trash-2'
      })
    : false;
  if (!confirmed) return;
  window.appState.raiseHandQueue = [];
  window.saveLocalState();
  window.socket.emit('admin:clearQueue');
  if (typeof window.renderAll === 'function') window.renderAll();
  if (typeof showToast === 'function') showToast('ล้างคิวยกมือทั้งหมดเรียบร้อยแล้ว', 'info');
}

function handleExcelImport(e) {
  const file = e.target.files[0];
  if (!file || typeof XLSX === 'undefined') return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    if (!rows.length) return;
    const importedUsers = rows.map((r, idx) => ({
      id: `COMSAN-${String(idx + 1).padStart(2, '0')}`,
      firstName: String(r['ชื่อ'] || '').trim(),
      lastName: String(r['นามสกุล'] || '').trim(),
      nickname: String(r['ชื่อเล่น'] || '').trim(),
      year: String(r['ชั้นปี'] || '').trim(),
      major: String(r['สาขา'] || '').trim(),
      position: String(r['ตำแหน่งในชมรม'] || 'สมาชิก').trim(),
      password: String(r['รหัสผ่าน'] || r['รหัสผ่านการเข้าระบบ'] || '1234').trim(),
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
    }));
    window.appState.users = importedUsers;
    window.selectedRolesForRandom = null;
    window.saveLocalState();
    window.socket.emit('admin:importUsers', importedUsers);
    if (typeof window.renderAll === 'function') window.renderAll();
    showToast(`นำเข้าสมาชิกสำเร็จ ${importedUsers.length} คน!`, 'success');
  };
  reader.readAsArrayBuffer(file);
}

function setSummaryFilter(mode) {
  window.summaryFilterMode = mode;
  renderSummarySection();
}

function renderSummarySection() {
  const state = window.appState;
  if (!state) return;

  // Always update history list
  renderMeetingHistoryList();

  const isViewingHistory = Boolean(window.selectedHistoryMeetingId && Array.isArray(state.meetingHistory));
  const histMeeting = isViewingHistory
    ? state.meetingHistory.find(m => m.id === window.selectedHistoryMeetingId)
    : null;

  const headerInfo = document.getElementById('summaryMeetingHeaderInfo');
  const alertBanner = document.getElementById('summaryViewingHistoryAlert');
  const viewTitle = document.getElementById('viewingHistoryTitle');
  const viewDate = document.getElementById('viewingHistoryDate');
  const dlBtnText = document.getElementById('summaryDownloadBtnText');

  if (histMeeting) {
    const histDateDisplay = (histMeeting.endDate && histMeeting.endDate !== histMeeting.date)
      ? `${histMeeting.date} ถึง ${histMeeting.endDate}`
      : (histMeeting.date || '-');
    const histSchedTime = histMeeting.scheduledEndTime || histMeeting.endTime || '-';
    const histActualTime = histMeeting.actualEndTime || histMeeting.endedTimeStr || '-';
    if (headerInfo) {
      headerInfo.textContent = `ประวัติย้อนหลัง: ${histMeeting.title} • วันที่: ${histDateDisplay} • กำหนดเลิก: ${histSchedTime} น. • ปิดจริง: ${histActualTime} น.`;
    }
    if (alertBanner) alertBanner.classList.remove('hidden');
    if (viewTitle) viewTitle.textContent = histMeeting.title || 'การประชุมย้อนหลัง';
    if (viewDate) viewDate.textContent = `(วันที่: ${histDateDisplay} • กำหนดเลิก ${histSchedTime} น. • ปิดจริง ${histActualTime} น.)`;
    if (dlBtnText) dlBtnText.textContent = 'ดาวน์โหลด (.xlsx)';
  } else {
    if (headerInfo) {
      const isLive = Boolean(state.meeting && state.meeting.isStarted && !state.meeting.isEnded);
      const isBefore = isLive && (typeof isMeetingBeforeScheduledTime === 'function' && isMeetingBeforeScheduledTime(state.meeting));
      headerInfo.textContent = isLive
        ? (isBefore
            ? `การประชุมปัจจุบัน: ${state.meeting.title || 'ชมรมสันทนาการ'} (เปิดห้องล่วงหน้า - เริ่ม ${state.meeting.startTime || '07:00'} น.)`
            : `การประชุมปัจจุบัน: ${state.meeting.title || 'ชมรมสันทนาการ'} (กำลังดำเนินการประชุม)`)
        : (state.lastMeetingSummary
            ? `สรุปผลการประชุมล่าสุด: ${state.lastMeetingSummary.title || 'ชมรมสันทนาการ'} (เสร็จสิ้นแล้ว)`
            : 'สามารถเปลี่ยนสถานะสมาชิก (ลา / ขาด / มาสาย / มาทัน) ได้โดยตรงก่อนส่งออกไฟล์ Excel');
    }
    if (alertBanner) alertBanner.classList.add('hidden');
    if (dlBtnText) dlBtnText.textContent = 'ดาวน์โหลด (.xlsx)';
  }

  const users = getSummaryUsers();
  const total = users.length;
  const onTime = users.filter(u => u.checkedIn && !u.isLate && !u.isLeave).length;
  const late = users.filter(u => u.checkedIn && u.isLate && !u.isLeave).length;
  const leave = users.filter(u => u.isLeave).length;
  const absent = users.filter(u => !u.checkedIn && !u.isLeave).length;

  // Filter Buttons Style Update
  const btnAll = document.getElementById('sumBtn_ALL');
  const btnAbsent = document.getElementById('sumBtn_ABSENT_LEAVE');
  if (btnAll) {
    btnAll.className = window.summaryFilterMode === 'ALL'
      ? 'px-3 py-1.5 rounded-xl font-bold bg-primary text-primary-foreground shadow-xs transition'
      : 'px-3 py-1.5 rounded-xl font-semibold bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition';
  }
  if (btnAbsent) {
    btnAbsent.className = window.summaryFilterMode === 'ABSENT_LEAVE'
      ? 'px-3 py-1.5 rounded-xl font-bold bg-rose-500 text-white shadow-xs transition'
      : 'px-3 py-1.5 rounded-xl font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition';
  }

  // Stat Cards (Card 5 spans 2 cols on mobile for balanced layout)
  const statCards = document.getElementById('summaryStatCards');
  if (statCards) {
    statCards.innerHTML = `
      <div class="p-3.5 sm:p-4 rounded-2xl bg-muted/40 border border-border"><p class="text-xs text-muted-foreground font-semibold">ทั้งหมด</p><p class="text-xl sm:text-2xl font-bold mt-1 text-foreground">${total} คน</p></div>
      <div class="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"><p class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">มาทันเวลา</p><p class="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">${onTime} คน</p></div>
      <div class="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"><p class="text-xs text-amber-600 dark:text-amber-400 font-semibold">มาสาย</p><p class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">${late} คน</p></div>
      <div class="p-3.5 sm:p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20"><p class="text-xs text-sky-600 dark:text-sky-400 font-semibold">ลาประชุม</p><p class="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">${leave} คน</p></div>
      <div class="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20"><p class="text-xs text-rose-600 dark:text-rose-400 font-semibold">ขาดประชุม</p><p class="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">${absent} คน</p></div>
    `;
  }

  const filtered = window.summaryFilterMode === 'ABSENT_LEAVE' ? users.filter(u => !u.checkedIn || u.isLeave) : users;

  // 1. Mobile Cards Render (#summaryMembersMobileList)
  const mobileList = document.getElementById('summaryMembersMobileList');
  if (mobileList) {
    mobileList.innerHTML = filtered.length === 0
      ? `<div class="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">ไม่มีรายชื่อสมาชิกที่ตรงกับเงื่อนไข</div>`
      : filtered.map(u => {
          const isLeave = Boolean(u.isLeave);
          const isLate = Boolean(u.checkedIn && u.isLate && !u.isLeave);
          const isOnTime = Boolean(u.checkedIn && !u.isLate && !u.isLeave);
          const isAbsent = Boolean(!u.checkedIn && !u.isLeave);
          const badge = isLeave
            ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400 whitespace-nowrap">ลาประชุม</span>`
            : isLate
            ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 whitespace-nowrap">มาสาย</span>`
            : isOnTime
            ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">มาทันเวลา</span>`
            : `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 whitespace-nowrap">ขาดประชุม</span>`;

          const detailInfo = isLeave
            ? `<div class="text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg">เหตุผลลา: <span class="font-medium text-foreground">${u.leaveReason || 'แจ้งลา'}</span></div>`
            : (u.checkedIn && u.checkInTimeStr && u.checkInTimeStr !== '-')
            ? `<div class="text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg">เวลาเข้า: <span class="font-medium text-foreground">${u.checkInTimeStr}</span></div>`
            : '';

          return `
            <div class="p-3.5 rounded-2xl bg-card border border-border shadow-2xs space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-full overflow-hidden bg-primary/10 shrink-0 border border-primary/20 shadow-2xs">
                    ${typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u) : ''}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-bold text-xs text-foreground truncate">${u.id} • ${u.nickname}</span>
                      <span class="text-[11px] text-muted-foreground shrink-0">(${u.position || 'สมาชิก'})</span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-0.5 truncate">${u.firstName} ${u.lastName}</p>
                  </div>
                </div>
                <div class="shrink-0">${badge}</div>
              </div>
              ${detailInfo}
              <div class="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                <span class="text-[11px] text-muted-foreground font-medium shrink-0">เปลี่ยนสถานะ:</span>
                <div class="grid grid-cols-4 gap-1.5 flex-1 max-w-[280px]">
                  <button type="button" onclick="adminChangeUserStatus('${u.id}', 'LEAVE')"
                    class="py-1.5 px-1 rounded-lg text-xs font-bold transition text-center shadow-2xs ${isLeave ? 'bg-sky-600 text-white' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20'}">
                    ลา
                  </button>
                  <button type="button" onclick="adminChangeUserStatus('${u.id}', 'ABSENT')"
                    class="py-1.5 px-1 rounded-lg text-xs font-bold transition text-center shadow-2xs ${isAbsent ? 'bg-rose-600 text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'}">
                    ขาด
                  </button>
                  <button type="button" onclick="adminChangeUserStatus('${u.id}', 'LATE')"
                    class="py-1.5 px-1 rounded-lg text-xs font-bold transition text-center shadow-2xs ${isLate ? 'bg-amber-500 text-slate-950' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'}">
                    มาสาย
                  </button>
                  <button type="button" onclick="adminChangeUserStatus('${u.id}', 'ONTIME')"
                    class="py-1.5 px-1 rounded-lg text-xs font-bold transition text-center shadow-2xs ${isOnTime ? 'bg-emerald-600 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'}">
                    มาทัน
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
  }

  // 2. Desktop Table Render (#summaryMembersTableBody)
  const tbody = document.getElementById('summaryMembersTableBody');
  if (tbody) {
    tbody.innerHTML = filtered.map(u => {
      const isLeave = Boolean(u.isLeave);
      const isLate = Boolean(u.checkedIn && u.isLate && !u.isLeave);
      const isOnTime = Boolean(u.checkedIn && !u.isLate && !u.isLeave);
      const isAbsent = Boolean(!u.checkedIn && !u.isLeave);
      const badge = isLeave
        ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400 whitespace-nowrap">ลาประชุม</span>`
        : isLate
        ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 whitespace-nowrap">มาสาย</span>`
        : isOnTime
        ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">มาทันเวลา</span>`
        : `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 whitespace-nowrap">ขาดประชุม</span>`;
      return `
        <tr class="hover:bg-muted/30 transition-colors">
          <td class="py-3 px-4 font-bold text-foreground whitespace-nowrap">
            <div class="flex items-center gap-2.5">
              <span class="w-7 h-7 rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center bg-primary/10 border border-primary/20 shadow-2xs">
                ${typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u) : ''}
              </span>
              <span>${u.id} • ${u.nickname}</span>
            </div>
          </td>
          <td class="py-3 px-4 text-muted-foreground">${u.firstName} ${u.lastName} <span class="text-xs">(${u.position})</span></td>
          <td class="py-3 px-4">${badge}</td>
          <td class="py-3 px-4 text-muted-foreground whitespace-nowrap">${isLeave ? (u.leaveReason || 'แจ้งลา') : (u.checkInTimeStr || '-')}</td>
          <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
            <button type="button" onclick="adminChangeUserStatus('${u.id}', 'LEAVE')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${isLeave ? 'bg-sky-600 text-white' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25'}">ลา</button>
            <button type="button" onclick="adminChangeUserStatus('${u.id}', 'ABSENT')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${isAbsent ? 'bg-rose-600 text-white' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'}">ขาด</button>
            <button type="button" onclick="adminChangeUserStatus('${u.id}', 'LATE')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${isLate ? 'bg-amber-500 text-slate-950' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'}">มาสาย</button>
            <button type="button" onclick="adminChangeUserStatus('${u.id}', 'ONTIME')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${isOnTime ? 'bg-emerald-600 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'}">มาทัน</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function renderAdminOnlineMeetingQr() {
  const state = window.appState;
  const qrBox = document.getElementById('adminOnlineQrBox');
  if (!qrBox || !state || !state.meeting) return;
  const token = state.meeting.checkinToken || '';
  if (!token) return;

  const checkinUrl = `${window.location.origin}/?checkin=${encodeURIComponent(token)}`;
  qrBox.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrBox, {
      text: checkinUrl,
      width: 190,
      height: 190,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

function openAdminQrFullscreen() {
  const state = window.appState;
  const modal = document.getElementById('adminFullscreenQrModal');
  const canvas = document.getElementById('adminFullscreenQrCanvas');
  const title = document.getElementById('adminFsQrMeetingTitle');
  const tokenDisplay = document.getElementById('adminFullscreenTokenDisplay');
  if (!modal || !state || !state.meeting) return;

  if (!state.meeting.isStarted || state.meeting.isEnded) {
    if (typeof showToast === 'function') {
      showToast('ต้องเปิดการประชุมก่อนจึงจะสามารถเปิด QR Code เช็คชื่อได้', 'warning');
    }
    return;
  }

  const token = state.meeting.checkinToken || '';
  if (title) title.textContent = state.meeting.title || 'การประชุมออนไลน์';
  if (tokenDisplay) tokenDisplay.textContent = token || 'CS-XXXXXX';

  if (canvas && token) {
    const checkinUrl = `${window.location.origin}/?checkin=${encodeURIComponent(token)}`;
    canvas.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(canvas, {
        text: checkinUrl,
        width: 250,
        height: 250,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeAdminQrFullscreen() {
  const modal = document.getElementById('adminFullscreenQrModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function copyAdminCheckinToken() {
  const state = window.appState;
  const token = state.meeting?.checkinToken || '';
  if (!token) return;
  navigator.clipboard.writeText(token).then(() => {
    showToast(`คัดลอกรหัสเช็คชื่อ "${token}" เรียบร้อยแล้ว`, 'success');
  }).catch(() => {
    if (typeof window.showPromptDialog === 'function') {
      window.showPromptDialog({
        title: 'รหัสเช็คชื่อการประชุม',
        message: 'คุณสามารถคัดลอกรหัสด้านล่างนี้เพื่อส่งให้สมาชิก:',
        defaultValue: token,
        confirmText: 'ปิด',
        icon: 'key'
      });
    } else {
      showToast(`รหัสเช็คชื่อ: ${token}`, 'info');
    }
  });
}

function copyAdminCheckinLink() {
  const state = window.appState;
  const token = state.meeting?.checkinToken || '';
  if (!token) return;
  const url = `${window.location.origin}/?checkin=${encodeURIComponent(token)}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('คัดลอกลิงก์เช็คชื่ออัตโนมัติเรียบร้อยแล้ว', 'success');
  }).catch(() => {
    if (typeof window.showPromptDialog === 'function') {
      window.showPromptDialog({
        title: 'ลิงก์เช็คชื่ออัตโนมัติ',
        message: 'คุณสามารถคัดลอกลิงก์ด้านล่างนี้เพื่อส่งให้สมาชิก:',
        defaultValue: url,
        confirmText: 'ปิด',
        icon: 'link'
      });
    } else {
      showToast('คัดลอกลิงก์เช็คชื่อเรียบร้อยแล้ว', 'info');
    }
  });
}

// =========================================================================
// ADMIN CLOUD DATABASE (SUPABASE) SETTINGS CONTROLLER
// =========================================================================

function updateSupabaseStatusBadge(isConnected, message) {
  const badges = document.querySelectorAll('.supabase-status-badge');
  badges.forEach(badge => {
    if (isConnected) {
      badge.className = 'supabase-status-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>Supabase เชื่อมต่อแล้ว</span>';
      badge.title = message || 'เชื่อมต่อ Supabase Realtime & Database เรียบร้อย';
    } else {
      badge.className = 'supabase-status-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>ออฟไลน์</span>';
      badge.title = message || 'ยังไม่ได้เชื่อมต่อ Supabase';
    }
  });
}

async function initAdminSupabaseSettingsUI() {
  const urlInput = document.getElementById('settingSupabaseUrl');
  const keyInput = document.getElementById('settingSupabaseKey');
  if (!urlInput || !keyInput) return;

  let url = '';
  let anonKey = '';
  let isConfigured = false;

  if (typeof window.SupabaseConfigManager !== 'undefined') {
    const creds = await window.SupabaseConfigManager.getCredentials();
    if (creds) {
      url = creds.url || '';
      anonKey = creds.anonKey || '';
      isConfigured = Boolean(creds.isConfigured);
    }
  } else {
    try {
      url = localStorage.getItem('comsan_supabase_url') || '';
      anonKey = localStorage.getItem('comsan_supabase_anon_key') || '';
      isConfigured = Boolean(url && anonKey);
    } catch (e) {}
  }

  if (url && !urlInput.value) urlInput.value = url;
  if (anonKey && !keyInput.value) keyInput.value = anonKey;

  updateSupabaseStatusBadge(isConfigured, isConfigured ? 'เชื่อมต่อ Supabase สำเร็จ' : 'ออฟไลน์');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

async function saveSupabaseSettingsFromModal() {
  const urlInput = document.getElementById('settingSupabaseUrl');
  const keyInput = document.getElementById('settingSupabaseKey');
  const url = urlInput ? urlInput.value.trim() : '';
  const key = keyInput ? keyInput.value.trim() : '';

  if (!url || !key) {
    if (typeof window.showToast === 'function') {
      window.showToast('กรุณากรอก Supabase URL และ Anon Key ให้ครบถ้วน', 'warning');
    }
    return;
  }

  if (typeof window.SupabaseConfigManager !== 'undefined') {
    await window.SupabaseConfigManager.saveCredentials(url, key);
  } else {
    localStorage.setItem('comsan_supabase_url', url);
    localStorage.setItem('comsan_supabase_anon_key', key);
  }

  if (window.SupabaseSocketAdapter) {
    try {
      const adapter = new window.SupabaseSocketAdapter();
      const ok = await adapter.init({ url, anonKey: key });
      if (ok) {
        if (window.socket && typeof window.socket.setEngine === 'function') {
          window.socket.setEngine(adapter);
        } else {
          window.socket = adapter;
        }
      }
    } catch (e) {
      console.warn('Supabase adapter reinit failed:', e);
    }
  }

  updateSupabaseStatusBadge(true, 'บันทึกและเชื่อมต่อแล้ว');
  if (typeof window.showToast === 'function') {
    window.showToast('บันทึกการตั้งค่า Supabase เรียบร้อยแล้ว', 'success');
  }
}

async function testSupabaseConnectionFromModal() {
  const urlInput = document.getElementById('settingSupabaseUrl');
  const keyInput = document.getElementById('settingSupabaseKey');
  const url = urlInput ? urlInput.value.trim() : '';
  const key = keyInput ? keyInput.value.trim() : '';

  if (!url || !key) {
    if (typeof window.showToast === 'function') {
      window.showToast('กรุณากรอก Supabase URL และ Anon Key ก่อนทดสอบ', 'warning');
    }
    return;
  }

  if (typeof window.showToast === 'function') {
    window.showToast('กำลังทดสอบการเชื่อมต่อกับ Supabase...', 'info');
  }

  try {
    const cleanUrl = url.replace(/\/+$/, '');
    const testEndpoint = `${cleanUrl}/rest/v1/comsan_meeting_state?select=id&limit=1`;
    const resp = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (resp.status === 401 || resp.status === 403) {
      updateSupabaseStatusBadge(false, 'Anon Key ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง');
      if (typeof window.showToast === 'function') {
        window.showToast('Anon Key ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง กรุณาตรวจสอบอีกครั้ง', 'error');
      }
      return;
    }

    if (!resp.ok && resp.status !== 404) {
      updateSupabaseStatusBadge(false, 'เชื่อมต่อไม่สำเร็จ (' + resp.status + ')');
      if (typeof window.showToast === 'function') {
        window.showToast('เชื่อมต่อไม่สำเร็จ (HTTP ' + resp.status + ')', 'error');
      }
      return;
    }

    updateSupabaseStatusBadge(true, 'เชื่อมต่อ Supabase สำเร็จ');
    if (typeof window.showToast === 'function') {
      window.showToast('ทดสอบการเชื่อมต่อ Supabase สำเร็จ พร้อมใช้งาน!', 'success');
    }
  } catch (err) {
    console.error('Supabase test connection error:', err);
    updateSupabaseStatusBadge(false, 'เชื่อมต่อไม่สำเร็จ');
    if (typeof window.showToast === 'function') {
      window.showToast('ไม่สามารถเชื่อมต่อ Supabase ได้: ' + (err.message || 'Network error'), 'error');
    }
  }
}

async function uploadLocalStateToSupabase() {
  const urlInput = document.getElementById('settingSupabaseUrl');
  const keyInput = document.getElementById('settingSupabaseKey');
  const url = urlInput ? urlInput.value.trim() : '';
  const key = keyInput ? keyInput.value.trim() : '';

  if (!url || !key) {
    if (typeof window.showToast === 'function') {
      window.showToast('กรุณากรอกและบันทึกการตั้งค่า Supabase ก่อนซิงค์', 'warning');
    }
    return;
  }

  if (!window.appState) {
    if (typeof window.showToast === 'function') {
      window.showToast('ไม่พบข้อมูลสถานะการประชุมที่จะซิงค์', 'warning');
    }
    return;
  }

  if (typeof window.showToast === 'function') {
    window.showToast('กำลังซิงค์ข้อมูลขึ้น Supabase Cloud...', 'info');
  }

  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      const client = window.supabase.createClient(url, key);
      const { error } = await client
        .from('comsan_meeting_state')
        .upsert({
          id: 'current',
          state: window.appState,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    } else {
      const cleanUrl = url.replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/rest/v1/comsan_meeting_state`;
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'current',
          state: window.appState,
          updated_at: new Date().toISOString()
        })
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `HTTP status ${resp.status}`);
      }
    }

    updateSupabaseStatusBadge(true, 'ซิงค์ข้อมูลสำเร็จ');
    if (typeof window.showToast === 'function') {
      window.showToast('ซิงค์ข้อมูลขึ้น Supabase Cloud เรียบร้อยแล้ว', 'success');
    }
  } catch (err) {
    console.error('Upload to Supabase error:', err);
    if (typeof window.showToast === 'function') {
      window.showToast('การซิงค์ข้อมูลล้มเหลว: ' + (err.message || 'Error'), 'error');
    }
  }
}

function disconnectSupabaseFromModal() {
  if (typeof window.SupabaseConfigManager !== 'undefined') {
    window.SupabaseConfigManager.clearCredentials();
  } else {
    localStorage.removeItem('comsan_supabase_url');
    localStorage.removeItem('comsan_supabase_anon_key');
  }

  const urlInput = document.getElementById('settingSupabaseUrl');
  const keyInput = document.getElementById('settingSupabaseKey');
  if (urlInput) urlInput.value = '';
  if (keyInput) keyInput.value = '';

  updateSupabaseStatusBadge(false, 'ออฟไลน์');
  if (typeof window.showToast === 'function') {
    window.showToast('ตัดการเชื่อมต่อ Supabase เรียบร้อยแล้ว', 'info');
  }
}

// ========================================================
// MySQL / MariaDB Database Connection Settings
// ========================================================
async function initDbConfigUI() {
  const hostInput = document.getElementById('dbCfgHost');
  const portInput = document.getElementById('dbCfgPort');
  const nameInput = document.getElementById('dbCfgName');
  const userInput = document.getElementById('dbCfgUser');
  const passInput = document.getElementById('dbCfgPass');
  if (!hostInput) return;

  // Set default InfinityFree credentials if inputs are default/empty
  if (!hostInput.value || hostInput.value === 'localhost') {
    hostInput.value = 'sql204.infinityfree.com';
    if (portInput) portInput.value = '3306';
    if (nameInput) nameInput.value = 'if0_43235981_meet';
    if (userInput) userInput.value = 'if0_43235981';
    if (passInput) passInput.value = 'meet2026';
  }

  const saved = localStorage.getItem('comsan_db_config');
  if (saved) {
    try {
      const cfg = JSON.parse(saved);
      if (cfg.host) hostInput.value = cfg.host;
      if (cfg.port) portInput.value = cfg.port;
      if (cfg.dbname) nameInput.value = cfg.dbname;
      if (cfg.user) userInput.value = cfg.user;
      if (cfg.pass !== undefined) passInput.value = cfg.pass;
      if (cfg.lastStatus) {
        updateDbStatusBadge(cfg.lastStatus === 'success', cfg.lastStatusText || 'บันทึกไว้แล้ว');
      }
    } catch (e) {
      console.warn('Failed to parse saved DB config', e);
    }
  }

  // Fetch shared config from server so other devices get the same config
  try {
    const endpoints = ['api/db_config.php', '/api/db_config.php', '../api/db_config.php'];
    for (const ep of endpoints) {
      try {
        const r = await fetch(ep);
        if (r.ok) {
          const res = await r.json();
          if (res && res.data) {
            if (res.data.host) hostInput.value = res.data.host;
            if (res.data.port) portInput.value = res.data.port;
            if (res.data.dbname) nameInput.value = res.data.dbname;
            if (res.data.user) userInput.value = res.data.user;
            if (res.data.pass !== undefined) passInput.value = res.data.pass;
            updateDbStatusBadge(true, 'ซิงค์จากเซิร์ฟเวอร์');
          }
          break;
        }
      } catch (err) {}
    }
  } catch (e) {}
}

async function saveDbConfig() {
  const host = document.getElementById('dbCfgHost')?.value.trim() || 'localhost';
  const port = document.getElementById('dbCfgPort')?.value.trim() || '3306';
  const dbname = document.getElementById('dbCfgName')?.value.trim() || 'comsan_meeting';
  const user = document.getElementById('dbCfgUser')?.value.trim() || 'root';
  const pass = document.getElementById('dbCfgPass')?.value ?? '';

  const cfg = {
    host,
    port,
    dbname,
    user,
    pass,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem('comsan_db_config', JSON.stringify(cfg));

  // Sync to server via PHP API so all devices share the configuration
  // Supports POST with seamless GET fallback if InfinityFree blocks POST with 403
  try {
    const endpoints = ['api/db_config.php', '/api/db_config.php', '../api/db_config.php'];
    for (const ep of endpoints) {
      let saved = false;
      // 1. Try POST
      try {
        const r = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg)
        });
        if (r.ok) {
          saved = true;
          break;
        }
      } catch (err) {}

      // 2. Fallback to GET query parameters
      if (!saved) {
        try {
          const getUrl = `${ep}?action=save&host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}&dbname=${encodeURIComponent(dbname)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&_t=${Date.now()}`;
          const r2 = await fetch(getUrl);
          if (r2.ok) {
            saved = true;
            break;
          }
        } catch (err2) {}
      }
    }
  } catch (e) {}

  if (typeof window.showToast === 'function') {
    window.showToast('บันทึกการตั้งค่าฐานข้อมูลสำเร็จ (ซิงค์ทุกอุปกรณ์)!', 'success');
  }
}

function updateDbStatusBadge(isSuccess, text) {
  const badge = document.getElementById('dbConnStatusBadge');
  if (!badge) return;
  badge.className = isSuccess
    ? 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap'
    : 'px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap';
  badge.textContent = text || (isSuccess ? 'เชื่อมต่อสำเร็จ' : 'เชื่อมต่อล้มเหลว');
}

function toggleDbPassVisibility() {
  const passInput = document.getElementById('dbCfgPass');
  const eyeIcon = document.getElementById('dbPassEyeIcon');
  if (!passInput) return;
  if (passInput.type === 'password') {
    passInput.type = 'text';
    if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye-off');
  } else {
    passInput.type = 'password';
    if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye');
  }
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

async function testDbConnection() {
  const host = document.getElementById('dbCfgHost')?.value.trim() || 'localhost';
  const port = document.getElementById('dbCfgPort')?.value.trim() || '3306';
  const dbname = document.getElementById('dbCfgName')?.value.trim() || 'comsan_meeting';
  const user = document.getElementById('dbCfgUser')?.value.trim() || 'root';
  const pass = document.getElementById('dbCfgPass')?.value ?? '';

  const resultBox = document.getElementById('dbTestResultBox');
  const badge = document.getElementById('dbConnStatusBadge');
  if (badge) {
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap animate-pulse';
    badge.textContent = 'กำลังทดสอบ...';
  }

  if (resultBox) {
    resultBox.className = 'p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-700 dark:text-indigo-300 font-medium flex items-start gap-2.5';
    resultBox.innerHTML = '<span>⏳ กำลังส่งคำขอทดสอบการเชื่อมต่อไปยังฐานข้อมูล...</span>';
    resultBox.classList.remove('hidden');
  }

  try {
    const testEndpoints = ['/api/test_db.php', 'api/test_db.php', '../api/test_db.php'];
    let data = null;
    let lastError = null;

    for (const ep of testEndpoints) {
      // 1. Try POST
      try {
        const r = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host, port, dbname, user, pass })
        });
        if (r.ok || r.status === 500 || r.status === 400) {
          data = await r.json();
          break;
        }
      } catch (err) {
        lastError = err;
      }

      // 2. If POST fails or blocked with 403 on InfinityFree, fallback to GET query
      if (!data) {
        try {
          const getUrl = `${ep}?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}&dbname=${encodeURIComponent(dbname)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&_t=${Date.now()}`;
          const r2 = await fetch(getUrl);
          if (r2.ok || r2.status === 500 || r2.status === 400) {
            data = await r2.json();
            break;
          }
        } catch (err2) {
          lastError = err2;
        }
      }
    }

    if (data && data.status === 'success') {
      updateDbStatusBadge(true, 'เชื่อมต่อสำเร็จ');
      if (resultBox) {
        resultBox.className = 'p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-start gap-2.5';
        resultBox.innerHTML = `<div>
          <b class="text-emerald-600 dark:text-emerald-400">✓ ${data.message || 'เชื่อมต่อสำเร็จ!'}</b>
          <div class="mt-1 text-[11px] opacity-90 space-y-0.5">
            <div>• Database: <span class="font-mono font-bold">${data.data?.database || dbname}</span></div>
            <div>• Host: <span class="font-mono">${data.data?.host || host}:${data.data?.port || port}</span></div>
            <div>• Version: <span class="font-mono">${data.data?.version || 'N/A'}</span></div>
          </div>
        </div>`;
      }
      if (typeof window.showToast === 'function') {
        window.showToast('เชื่อมต่อฐานข้อมูล MySQL สำเร็จ!', 'success');
      }
      const saved = localStorage.getItem('comsan_db_config');
      const cfg = saved ? JSON.parse(saved) : {};
      cfg.lastStatus = 'success';
      cfg.lastStatusText = 'เชื่อมต่อสำเร็จ';
      localStorage.setItem('comsan_db_config', JSON.stringify(cfg));
    } else {
      const errMsg = data?.message || lastError?.message || 'ไม่สามารถติดต่อ PHP API เพื่อทดสอบการเชื่อมต่อได้';
      updateDbStatusBadge(false, 'เชื่อมต่อไม่สำเร็จ');
      if (resultBox) {
        resultBox.className = 'p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-start gap-2.5';
        resultBox.innerHTML = `<div>
          <b class="text-rose-600 dark:text-rose-400">✕ การเชื่อมต่อล้มเหลว</b>
          <p class="mt-1 text-[11px]">${errMsg}</p>
          <p class="mt-1.5 text-[11px] opacity-80">💡 ตรวจสอบว่าได้อัปโหลดไฟล์ <code class="font-mono bg-rose-500/20 px-1 rounded">config.php</code> และ <code class="font-mono bg-rose-500/20 px-1 rounded">api/test_db.php</code> ไปยัง Hosting หรือ XAMPP หรือยัง</p>
        </div>`;
      }
      if (typeof window.showToast === 'function') {
        window.showToast('การเชื่อมต่อล้มเหลว ตรวจสอบข้อมูลอีกครั้ง', 'error');
      }
    }
  } catch (err) {
    updateDbStatusBadge(false, 'ข้อผิดพลาด');
    if (resultBox) {
      resultBox.className = 'p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-start gap-2.5';
      resultBox.innerHTML = `<div>
        <b class="text-rose-600 dark:text-rose-400">✕ ข้อผิดพลาดในการเชื่อมต่อ</b>
        <p class="mt-1 text-[11px]">${err.message || 'Network Error'}</p>
      </div>`;
    }
  }
}

function generateConfigPhp() {
  const host = document.getElementById('dbCfgHost')?.value.trim() || 'localhost';
  const port = document.getElementById('dbCfgPort')?.value.trim() || '3306';
  const dbname = document.getElementById('dbCfgName')?.value.trim() || 'comsan_meeting';
  const user = document.getElementById('dbCfgUser')?.value.trim() || 'root';
  const pass = document.getElementById('dbCfgPass')?.value ?? '';

  const phpCode = `<?php
/**
 * Database Configuration (config.php)
 * ระบบจัดการฐานข้อมูล COMSAN Meeting System
 */

date_default_timezone_set('Asia/Bangkok');

define('DB_HOST', '${host}');
define('DB_PORT', '${port}');
define('DB_NAME', '${dbname}');
define('DB_USER', '${user}');
define('DB_PASS', '${pass}');
define('DB_CHARSET', 'utf8mb4');

try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    $conn = $pdo;
} catch (PDOException $e) {
    error_log("Database Connection Error: " . $e->getMessage());
    die(json_encode([
        'status' => 'error',
        'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE));
}
`;

  navigator.clipboard.writeText(phpCode).then(() => {
    if (typeof window.showToast === 'function') {
      window.showToast('คัดลอกโค้ด config.php ลงคลิปบอร์ดแล้ว!', 'success');
    }
  }).catch(() => {
    if (typeof window.showPromptDialog === 'function') {
      window.showPromptDialog({
        title: 'โค้ดการเชื่อมต่อฐานข้อมูล config.php',
        message: 'คุณสามารถคัดลอกโค้ดด้านล่างนี้ไปวางในไฟล์ config.php:',
        defaultValue: phpCode,
        confirmText: 'ปิด',
        icon: 'database'
      });
    } else if (typeof window.showToast === 'function') {
      window.showToast('กรุณาคัดลอกโค้ด config.php จากหน้านี้', 'info');
    }
  });
}

// Window attachments
window.setMeetingFormat = setMeetingFormat;
window.selectOnlinePlatform = selectOnlinePlatform;
window.renderAdminOnlineMeetingQr = renderAdminOnlineMeetingQr;
window.openAdminQrFullscreen = openAdminQrFullscreen;
window.closeAdminQrFullscreen = closeAdminQrFullscreen;
window.copyAdminCheckinToken = copyAdminCheckinToken;
window.copyAdminCheckinLink = copyAdminCheckinLink;
window.requestAdminAccess = requestAdminAccess;
window.closeAdminModal = closeAdminModal;
window.handleAdminLogin = handleAdminLogin;
window.startOfficialMeeting = startOfficialMeeting;
window.resetMeetingToNotStarted = resetMeetingToNotStarted;
window.endMeetingNow = endMeetingNow;
window.handleAdminMeetingToggle = handleAdminMeetingToggle;
window.toggleShowSeatsSetting = toggleShowSeatsSetting;
window.processUserCheckIn = processUserCheckIn;
window.handleManualCheckIn = handleManualCheckIn;
window.toggleCameraScanner = toggleCameraScanner;
window.adminChangeUserStatus = adminChangeUserStatus;
window.removeQueueItem = removeQueueItem;
window.clearRaiseHandQueue = clearRaiseHandQueue;
window.handleExcelImport = handleExcelImport;
window.setSummaryFilter = setSummaryFilter;
window.renderSummarySection = renderSummarySection;
window.updateSupabaseStatusBadge = updateSupabaseStatusBadge;
window.initAdminSupabaseSettingsUI = initAdminSupabaseSettingsUI;
window.saveSupabaseSettingsFromModal = saveSupabaseSettingsFromModal;
window.testSupabaseConnectionFromModal = testSupabaseConnectionFromModal;
window.uploadLocalStateToSupabase = uploadLocalStateToSupabase;
window.disconnectSupabaseFromModal = disconnectSupabaseFromModal;
window.initDbConfigUI = initDbConfigUI;
window.saveDbConfig = saveDbConfig;
window.testDbConnection = testDbConnection;
window.toggleDbPassVisibility = toggleDbPassVisibility;
window.generateConfigPhp = generateConfigPhp;

