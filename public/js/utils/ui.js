/**
 * COMSAN Meeting System - UI Utilities & Modals
 */

function playNotificationSound(type = 'default') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (type === 'hand') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.16);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {}
}

let _recentToasts = new Map();

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container || !message) return;

  const now = Date.now();
  if (_recentToasts.has(message) && (now - _recentToasts.get(message) < 1200)) {
    return;
  }
  _recentToasts.set(message, now);
  if (_recentToasts.size > 20) {
    for (const [k, t] of _recentToasts.entries()) {
      if (now - t > 5000) _recentToasts.delete(k);
    }
  }

  const configs = {
    success: {
      cardClass: 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-400/60 shadow-xl shadow-emerald-950/25',
      iconBadgeClass: 'bg-white/20 text-white',
      lucideIcon: 'circle-check',
      closeBtnClass: 'hover:bg-white/20 text-white/80 hover:text-white'
    },
    warning: {
      cardClass: 'bg-amber-500 text-slate-950 border-amber-300 shadow-xl shadow-amber-950/25',
      iconBadgeClass: 'bg-black/15 text-slate-950',
      lucideIcon: 'triangle-alert',
      closeBtnClass: 'hover:bg-black/10 text-slate-900/70 hover:text-slate-950'
    },
    error: {
      cardClass: 'bg-rose-600 text-white border-rose-400/60 shadow-xl shadow-rose-950/25',
      iconBadgeClass: 'bg-white/20 text-white',
      lucideIcon: 'circle-alert',
      closeBtnClass: 'hover:bg-white/20 text-white/80 hover:text-white'
    },
    motion: {
      cardClass: 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white border-indigo-400/60 shadow-xl shadow-indigo-950/25',
      iconBadgeClass: 'bg-white/20 text-white',
      lucideIcon: 'vote',
      closeBtnClass: 'hover:bg-white/20 text-white/80 hover:text-white'
    },
    info: {
      cardClass: 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700 shadow-xl shadow-slate-950/25',
      iconBadgeClass: 'bg-white/15 text-sky-400',
      lucideIcon: 'bell',
      closeBtnClass: 'hover:bg-white/10 text-slate-300 hover:text-white'
    }
  };

  const cfg = configs[type] || configs.info;
  const cleanMsg = String(message).replace(/\n/g, ' • ');

  const toast = document.createElement('div');
  toast.className = `px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-3 transition-all duration-300 pointer-events-auto select-none w-full max-w-sm sm:max-w-md ${cfg.cardClass}`;
  toast.style.transform = 'translateY(-10px) scale(0.96)';
  toast.style.opacity = '0';

  toast.innerHTML = `
    <div class="w-7 h-7 rounded-xl ${cfg.iconBadgeClass} flex items-center justify-center shrink-0 shadow-2xs">
      <i data-lucide="${cfg.lucideIcon}" class="w-4 h-4"></i>
    </div>
    <span class="flex-1 text-xs font-medium leading-snug">${cleanMsg}</span>
    <button type="button" class="w-6 h-6 rounded-lg ${cfg.closeBtnClass} flex items-center justify-center transition shrink-0" title="ปิดการแจ้งเตือน">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;

  const closeBtn = toast.querySelector('button');
  let isRemoved = false;
  const dismiss = () => {
    if (isRemoved) return;
    isRemoved = true;
    toast.style.transform = 'translateY(-10px) scale(0.96)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 250);
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });
  }

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0) scale(1)';
    toast.style.opacity = '1';
  });

  setTimeout(dismiss, 3800);
}

function initTheme() {
  const savedMode = localStorage.getItem('theme') || localStorage.getItem('COMSAN_THEME') || 'light';
  const savedColor = localStorage.getItem('colorTheme') || 'default';
  applyTheme(savedMode);
  applyColorTheme(savedColor);
  initHeroBubbleAnimation();
}

function initHeroBubbleAnimation() {
  const saved = localStorage.getItem('heroBubbleAnimation');
  const enabled = saved !== 'false';
  applyHeroBubbleAnimation(enabled);
}

function applyHeroBubbleAnimation(enabled) {
  const container = document.getElementById('heroBubbleContainer');
  if (container) {
    container.classList.toggle('hidden', !enabled);
  }
  const toggle = document.getElementById('settingBubbleAnimToggle');
  if (toggle) {
    toggle.checked = enabled;
  }
}

function toggleHeroBubbleAnimation(enabled) {
  localStorage.setItem('heroBubbleAnimation', enabled ? 'true' : 'false');
  applyHeroBubbleAnimation(enabled);
  if (typeof showToast === 'function') {
    showToast(enabled ? 'เปิดแอนิเมชันฟองสบู่ในการ์ดแล้ว' : 'ปิดแอนิเมชันฟองสบู่ในการ์ดแล้ว', 'info');
  }
}

function applyColorTheme(color) {
  document.documentElement.setAttribute('data-color-theme', color);
  localStorage.setItem('colorTheme', color);
  if (typeof window.renderTodayEventsBanner === 'function') {
    window.renderTodayEventsBanner();
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
}

function applyTheme(mode) {
  const htmlEl = document.documentElement;
  let effectiveMode = mode;
  if (mode === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveMode = prefersDark ? 'dark' : 'light';
  }
  const isDark = (effectiveMode === 'dark');

  if (isDark) {
    htmlEl.classList.add('dark');
  } else {
    htmlEl.classList.remove('dark');
  }

  // Update theme icons: Light = Sun (พระอาทิตย์), Dark = Moon (พระจันทร์)
  const themeIcons = document.querySelectorAll('.theme-toggle-icon, #themeIcon, #themeToggleIcon, #sidebarThemeIcon');
  themeIcons.forEach(icon => {
    const iconName = isDark ? 'moon' : 'sun';
    const colorClass = isDark ? 'text-indigo-400' : 'text-amber-500';
    if (typeof window.updateIcon === 'function') {
      window.updateIcon(icon, iconName, `theme-toggle-icon ${colorClass} text-xs`);
    } else {
      icon.setAttribute('data-lucide', iconName);
      icon.className = `theme-toggle-icon ${colorClass} text-xs`;
    }
  });

  const themeBtns = document.querySelectorAll('#themeToggleBtn, #sidebarThemeBtn');
  themeBtns.forEach(btn => {
    btn.setAttribute('title', isDark ? 'ธีมมืด (คลิกเพื่อเปลี่ยนเป็นธีมสว่าง)' : 'ธีมสว่าง (คลิกเพื่อเปลี่ยนเป็นธีมมืด)');
  });

  localStorage.setItem('theme', mode);
  localStorage.setItem('COMSAN_THEME', mode);
  if (typeof window.renderAdminAnalyticsChart === 'function' && window.currentRole === 'ADMIN') {
    setTimeout(window.renderAdminAnalyticsChart, 50);
  }
}

function openImagePreview(src, caption) {
  if (!src) return;
  const imgEl = document.getElementById('previewModalImg');
  const capEl = document.getElementById('previewModalCaption');
  if (imgEl) imgEl.src = src;
  if (capEl) capEl.textContent = caption || '';
  const modal = document.getElementById('imagePreviewModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeImagePreview() {
  const modal = document.getElementById('imagePreviewModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function openQrExpandModal() {
  if (!window.currentUserId) return;
  const modal = document.getElementById('qrExpandModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  resizeProfileQr(window.currentQrSizePx || 180);
}

function closeQrExpandModal() {
  const modal = document.getElementById('qrExpandModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function resizeProfileQr(sizePx) {
  window.currentQrSizePx = sizePx;
  [130, 180, 250].forEach(s => {
    const btn = document.getElementById(`qrSizeBtn_${s}`);
    if (btn) {
      btn.className = s === sizePx
        ? 'px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm'
        : 'px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    }
  });
  if (!window.currentUserId || !window.appState) return;
  const me = (window.appState.users || []).find(u => u.id === window.currentUserId);
  if (!me) return;
  const holder = document.getElementById('modalQrCanvasHolder');
  const subText = document.getElementById('modalQrCodeSubText');
  if (holder) {
    holder.innerHTML = '';
    new QRCode(holder, {
      text: me.id,
      width: sizePx,
      height: sizePx,
      colorDark: '#1e1b4b',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }
  if (subText) {
    subText.textContent = `${me.nickname} (${me.firstName}) • ${me.id}`;
  }
  const notice = document.getElementById('modalQrCodeNotice');
  if (notice) {
    const m = window.appState?.meeting;
    const isStarted = m && m.isStarted && !m.isEnded;
    if (!isStarted) {
      notice.innerHTML = '<span class="text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-center gap-1"><i data-lucide="triangle-alert" class="w-4 h-4"></i> การประชุมยังไม่เริ่ม (ยังไม่สามารถเช็คชื่อได้)</span>';
    } else {
      notice.textContent = 'แสดงหน้าจอนี้ให้ผู้ดูแลระบบสแกนเพื่อเช็คชื่อเข้าประชุม';
    }
  }
}

function toggleSeatingChartCollapse(target) {
  if (target === 'USER') {
    window.isUserSeatingCollapsed = !window.isUserSeatingCollapsed;
    const body = document.getElementById('userSeatingCollapsibleBody');
    const icon = document.getElementById('userSeatingCollapseIcon');
    if (body) body.classList.toggle('hidden', window.isUserSeatingCollapsed);
    if (icon) {
      if (typeof window.updateIcon === 'function') {
        window.updateIcon(icon, window.isUserSeatingCollapsed ? 'chevron-down' : 'chevron-up', 'text-xs');
      } else {
        icon.setAttribute('data-lucide', window.isUserSeatingCollapsed ? 'chevron-down' : 'chevron-up');
      }
    }
  } else {
    window.isAdminSeatingCollapsed = !window.isAdminSeatingCollapsed;
    const body = document.getElementById('adminSeatingCollapsibleBody');
    const icon = document.getElementById('adminSeatingCollapseIcon');
    if (body) body.classList.toggle('hidden', window.isAdminSeatingCollapsed);
    if (icon) {
      if (typeof window.updateIcon === 'function') {
        window.updateIcon(icon, window.isAdminSeatingCollapsed ? 'chevron-down' : 'chevron-up', 'text-xs');
      } else {
        icon.setAttribute('data-lucide', window.isAdminSeatingCollapsed ? 'chevron-down' : 'chevron-up');
      }
    }
  }
}

function closeRaiseHandPopup() {
  const popup = document.getElementById('raiseHandPopup');
  if (popup) {
    popup.classList.add('hidden');
    popup.classList.remove('flex');
  }
}

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    updateSettingsModalUI();
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function updateSettingsModalUI() {
  const curTheme = localStorage.getItem('theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const curPal = localStorage.getItem('colorTheme') || 'default';

  ['light', 'dark', 'system'].forEach(m => {
    const el = document.getElementById(`appOpt_${m}`);
    if (el) {
      if (m === curTheme) {
        el.className = 'flex items-center gap-3 p-3.5 rounded-xl border-2 border-primary bg-primary/5 text-primary cursor-pointer transition shadow-2xs';
      } else {
        el.className = 'flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 text-foreground cursor-pointer transition';
      }
    }
  });

  ['default', 'ocean', 'emerald', 'violet', 'rose', 'amber'].forEach(p => {
    const el = document.getElementById(`palOpt_${p}`);
    if (el) {
      const check = el.querySelector('.check-icon');
      if (p === curPal) {
        el.className = 'flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-primary/5 text-primary cursor-pointer transition shadow-2xs';
        if (check) check.classList.remove('hidden');
      } else {
        el.className = 'flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/40 text-foreground cursor-pointer transition';
        if (check) check.classList.add('hidden');
      }
    }
  });

  const isBubbleEnabled = localStorage.getItem('heroBubbleAnimation') !== 'false';
  const toggle = document.getElementById('settingBubbleAnimToggle');
  if (toggle) toggle.checked = isBubbleEnabled;
}

function setAppearance(mode) {
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
    localStorage.setItem('theme', 'system');
  } else {
    applyTheme(mode);
  }
  updateSettingsModalUI();
}

function setColorPalette(palette) {
  applyColorTheme(palette);
  updateSettingsModalUI();
  showToast(`เปลี่ยนชุดสีเป็น "${palette}" เรียบร้อยแล้ว`, 'success');
}

// =========================================================================
// EASTER EGG: คำร้องขอลาออกจากชมรม (JOKE / PRANK)
// Triggered by clicking the about logo in settings 6 times
// =========================================================================
let settingsLogoClickCount = 0;
let settingsLogoClickTimer = null;

function handleSettingsLogoClick() {
  settingsLogoClickCount++;

  const logo = document.getElementById('settingsAboutLogo');
  if (logo) {
    logo.style.transform = `scale(0.88) rotate(${settingsLogoClickCount % 2 === 0 ? 12 : -12}deg)`;
    setTimeout(() => {
      logo.style.transform = '';
    }, 150);
  }

  if (typeof playNotificationSound === 'function') {
    playNotificationSound('vote');
  }

  if (settingsLogoClickTimer) clearTimeout(settingsLogoClickTimer);
  settingsLogoClickTimer = setTimeout(() => {
    settingsLogoClickCount = 0;
  }, 4000);

  if (settingsLogoClickCount >= 6) {
    settingsLogoClickCount = 0;
    clearTimeout(settingsLogoClickTimer);
    openEasterEggModal();
  }
}

function openEasterEggModal() {
  const modal = document.getElementById('easterEggResignModal');
  const rejectAlert = document.getElementById('degreeRejectAlert');
  const badge = document.getElementById('degreeFileSelectedBadge');
  const fileInput = document.getElementById('degreeFileInput');
  const btn = document.getElementById('btnFakeResign');
  const promptText = document.getElementById('degreeFilePromptText');

  if (fileInput) fileInput.value = '';
  if (rejectAlert) rejectAlert.classList.add('hidden');
  if (badge) {
    badge.classList.add('hidden');
    badge.classList.remove('flex');
  }
  if (promptText) {
    promptText.innerHTML = 'แตะเพื่อเลือกไฟล์ใบปริญญาบัตร <span class="text-primary font-bold">PDF, JPG หรือ PNG</span>';
  }
  if (btn) {
    btn.innerHTML = '<i data-lucide="door-open" class="mr-1.5"></i> ยืนยันการยื่นคำร้องขอลาออกจากชมรม';
    btn.disabled = false;
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof playNotificationSound === 'function') {
      playNotificationSound('win');
    }
    showToast('🎉 ปลดล็อคระบบลับ: คำร้องขอลาออกจากชมรม!', 'warning');
  }
}

function closeEasterEggModal() {
  const modal = document.getElementById('easterEggResignModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleDegreeFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  const badge = document.getElementById('degreeFileSelectedBadge');
  const nameText = document.getElementById('degreeFileNameText');
  const promptText = document.getElementById('degreeFilePromptText');

  if (file && badge && nameText) {
    nameText.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    badge.classList.remove('hidden');
    badge.classList.add('flex');
    if (promptText) promptText.textContent = 'เปลี่ยนไฟล์ใบปริญญาบัตร';
    showToast(`แนบไฟล์ "${file.name}" เรียบร้อยแล้ว (พร้อมตรวจสอบ)`, 'info');
  }
}

function handleFakeResignClick() {
  const card = document.getElementById('easterEggCard');
  const rejectAlert = document.getElementById('degreeRejectAlert');
  const rejectText = document.getElementById('degreeRejectText');
  const btn = document.getElementById('btnFakeResign');
  const fileInput = document.getElementById('degreeFileInput');

  if (typeof playNotificationSound === 'function') {
    playNotificationSound('alert');
  }

  // Shake animation on card
  if (card) {
    card.classList.add('animate-shake');
    setTimeout(() => card.classList.remove('animate-shake'), 600);
  }

  if (btn) {
    btn.innerHTML = '<i data-lucide="loader-2" class="mr-1.5 animate-spin"></i> กำลังตรวจสอบคุณสมบัติกับมหาวิทยาลัย...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = '<i data-lucide="ban" class="mr-1.5"></i> ไม่ผ่านการอนุมัติ (ลาออกไม่ได้)';
      btn.disabled = false;
    }, 800);
  }

  const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;

  if (rejectAlert && rejectText) {
    rejectAlert.classList.remove('hidden');
    if (hasFile) {
      rejectText.innerHTML = `
        <strong class="font-bold">❌ AI ตรวจสอบไฟล์ "${fileInput.files[0].name}" ไม่ผ่าน!</strong>
        <p class="text-[11px] leading-relaxed">ตรวจพบว่ายังไม่จบปริญญาตรีจริง หรือเกรดยังไม่ออกครบตามหลักสูตร! สรุปคือ <strong>"ไม่อนุมัติให้ออก"</strong> กรุณาอยู่ช่วยงานชมรมคมสันต่อไปจนกว่าจะรับปริญญาครับ 🎓😈</p>
      `;
    } else {
      rejectText.innerHTML = `
        <strong class="font-bold">❌ ระบบระงับคำร้องทันที!</strong>
        <p class="text-[11px] leading-relaxed">คุณยังไม่ได้แนบใบปริญญาบัตรระดับปริญญาตรี! และต่อให้แนบมา AI ก็ไม่อนุมัติให้ออกอยู่ดีครับ อยู่ซ้อมสันทนาการช่วยชมรมต่อไปนะจ๊ะ 🤣</p>
      `;
    }
  }

  showToast('🚫 ระบบปฏิเสธ: ไม่อนุญาตให้ลาออกจากชมรมคมสัน!', 'error');
}

// =========================================================================
// VERSION CONTROL & RELEASE NOTES (What's New)
// =========================================================================
function handleVersionClick() {
  const isCurrentlyAdmin = Boolean(window.currentRole === 'ADMIN' && window.isAdminAuthenticated);
  if (isCurrentlyAdmin) {
    openVersionPasscodeModal();
  } else {
    closeVersionPasscodeModal();
    closeAdminVersionEditModal();
    openUserVersionNotesModal(false);
  }
}

function openVersionPasscodeModal() {
  if (window.currentRole !== 'ADMIN' || !window.isAdminAuthenticated) {
    openUserVersionNotesModal(false);
    return;
  }
  const modal = document.getElementById('adminVersionPasscodeModal');
  const input = document.getElementById('inputVersionPasscode');
  const err = document.getElementById('versionPasscodeError');
  if (input) input.value = '';
  if (err) err.classList.add('hidden');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => input?.focus(), 150);
  }
}

function closeVersionPasscodeModal() {
  const modal = document.getElementById('adminVersionPasscodeModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function toggleVersionPasscodeVisibility() {
  const input = document.getElementById('inputVersionPasscode');
  const icon = document.getElementById('iconVersionPasscodeToggle');
  if (!input || !icon) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (typeof window.updateIcon === 'function') {
      window.updateIcon(icon, 'eye-off', 'w-4 h-4');
    } else {
      icon.setAttribute('data-lucide', 'eye-off');
      icon.className = 'w-4 h-4';
    }
  } else {
    input.type = 'password';
    if (typeof window.updateIcon === 'function') {
      window.updateIcon(icon, 'eye', 'w-4 h-4');
    } else {
      icon.setAttribute('data-lucide', 'eye');
      icon.className = 'w-4 h-4';
    }
  }
}

function submitVersionPasscode() {
  const input = document.getElementById('inputVersionPasscode');
  const err = document.getElementById('versionPasscodeError');
  const card = document.getElementById('adminVersionPasscodeCard');
  const val = (input?.value || '').trim();

  if (val === 'comsanentertainer') {
    if (typeof playNotificationSound === 'function') playNotificationSound('vote');
    closeVersionPasscodeModal();
    openAdminVersionEditModal();
  } else {
    if (typeof playNotificationSound === 'function') playNotificationSound('alert');
    if (err) err.classList.remove('hidden');
    if (card) {
      card.classList.add('animate-shake');
      setTimeout(() => card.classList.remove('animate-shake'), 600);
    }
  }
}

function getDefaultVersionNotes() {
  return {
    features: [
      {
        title: 'ระบบตรึงมติที่เปิดอยู่ไว้ด้านบนสุด (Active Motion Priority)',
        desc: 'แสดงญัตติที่กำลังเปิดให้ลงคะแนนไว้ตำแหน่งบนสุดของการ์ดโหวตโดยอัตโนมัติ เพื่อความสะดวกและรวดเร็วของสมาชิก',
        visible: true
      },
      {
        title: 'ระบบสถานะผู้เข้าร่วมประชุมแบบเรียลไทม์ (Live Presence)',
        desc: 'แสดงจุดสีเขียวเฉพาะสมาชิกที่เช็คชื่อเข้าประชุมและกำลังออนไลน์อยู่ในห้องสนทนา พร้อมแจ้งเตือนเมื่อสมาชิกเข้า/ออก',
        visible: true
      },
      {
        title: 'ระบบควบคุมการเช็คชื่อตามสถานะการประชุม (Check-in Guard)',
        desc: 'ป้องกันการเช็คชื่อทั้ง QR Code และการพิมพ์รหัส หากผู้ดูแลระบบยังไม่ได้กดเริ่มการประชุมอย่างเป็นทางการ',
        visible: true
      },
      {
        title: 'ระบบปิดการลงมติอัตโนมัติเมื่อสิ้นสุดการประชุม',
        desc: 'สั่งปิดญัตติการลงคะแนนทั้งหมดทันทีเมื่อผู้ดูแลระบบกดจบการประชุม เพื่อความโปร่งใสและถูกต้อง',
        visible: true
      },
      {
        title: 'ระบบไข่อีสเตอร์ลับ (Secret Easter Egg: Resignation Request)',
        desc: 'เพิ่มลูกเล่นคำร้องขอลาออกจากชมรมในหน้าตั้งค่า เมื่อแตะโลโก้ระบบ 6 ครั้ง พร้อมเงื่อนไขแนบใบปริญญาบัตรแสนสนุก',
        visible: true
      },
      {
        title: 'หน้าต่างบันทึกการอัปเดตระบบ (Release Notes)',
        desc: 'แสดงรายละเอียดฟีเจอร์ใหม่ที่เพิ่มเข้ามาและรายการบั๊กที่ได้รับการแก้ไขอย่างครบถ้วนเมื่อแตะที่เลขเวอร์ชัน',
        visible: true
      }
    ],
    bugFixes: [
      {
        title: 'แก้ไขปัญหาการข้ามหน้า Login เข้าสู่ระบบอัตโนมัติ',
        desc: 'ปรับปรุงระบบ Authentication ให้ต้องกรอกรหัสผ่านเพื่อความปลอดภัย',
        visible: true
      },
      {
        title: 'แก้ไขปุ่มควบคุมการประชุมบนหน้าจอมือถือ',
        desc: 'ปรับปรุงปุ่ม "เปิดการประชุม" บนสมาร์ตโฟนให้กว้างเต็มแถว ไม่บีบแคบหรือตัวอักษรตัดบรรทัดแนวตั้ง',
        visible: true
      },
      {
        title: 'แก้ไขปัญหา QR Code ประจำตัวสมาชิกหายเมื่อรีเฟรชหน้าเว็บ',
        desc: 'ระบบจะเรนเดอร์และสร้าง QR Code สำหรับเช็คชื่อให้อัตโนมัติทุกครั้งที่โหลดหน้าจอ',
        visible: true
      },
      {
        title: 'ปรับปรุงไอคอนสถานะการเช็คชื่อให้ตรงตามความเป็นจริง',
        desc: 'แสดงไอคอนนาฬิกาเมื่อยังไม่เริ่มประชุม, กากบาทแดงเมื่อยังไม่เช็คชื่อ, ติ๊กถูกเขียวเมื่อมาทันเวลา, นาฬิกาส้มเมื่อมาสาย และสมุดฟ้าเมื่อแจ้งลา',
        visible: true
      },
      {
        title: 'ปรับปรุงระยะห่างแถบเมนูด้านล่าง (Bottom Navigation)',
        desc: 'กระจายพื้นที่ปุ่มกดให้สวยงามและพอดีกับหน้าจอมือถือทุกรุ่น',
        visible: true
      },
      {
        title: 'อัปเดตช่องทางติดต่อและช่วยเหลือฝ่ายเทคนิค',
        desc: 'เปลี่ยนอีเมลติดต่อเป็น comsan.meeting@gmail.com หรือติดต่อพี่แมทธิว',
        visible: true
      }
    ]
  };
}

function getNormalizedVersionNotes() {
  const defaults = getDefaultVersionNotes();
  const notes = window.appState?.versionNotes || {};
  const rawFeatures = Array.isArray(notes.features) ? notes.features : defaults.features;
  const rawBugFixes = Array.isArray(notes.bugFixes) ? notes.bugFixes : defaults.bugFixes;

  const features = rawFeatures.map(f => {
    let desc = f.desc || '';
    let title = f.title || '';
    if (desc.includes('แอดมิน')) {
      title = 'หน้าต่างบันทึกการอัปเดตระบบ (Release Notes)';
      desc = 'แสดงรายละเอียดฟีเจอร์ใหม่ที่เพิ่มเข้ามาและรายการบั๊กที่ได้รับการแก้ไขอย่างครบถ้วนเมื่อแตะที่เลขเวอร์ชัน';
    }
    return {
      title,
      desc,
      visible: f.visible !== false
    };
  });

  const bugFixes = rawBugFixes.map(b => ({
    title: b.title || '',
    desc: b.desc || '',
    visible: b.visible !== false
  }));

  return { features, bugFixes };
}

function escapeAttrHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function openAdminVersionEditModal() {
  if (window.currentRole !== 'ADMIN' || !window.isAdminAuthenticated) {
    return;
  }
  const modal = document.getElementById('adminVersionEditModal');
  const input = document.getElementById('adminInputNewVersion');
  const curVer = window.appState?.systemVersion || '2.0.1';
  if (input) {
    input.value = curVer;
  }

  const normalized = getNormalizedVersionNotes();
  window.draftVersionNotes = {
    features: normalized.features.map(f => ({ ...f })),
    bugFixes: normalized.bugFixes.map(b => ({ ...b }))
  };
  renderAdminVersionEditorLists();

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeAdminVersionEditModal() {
  const modal = document.getElementById('adminVersionEditModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function renderAdminVersionEditorLists() {
  if (!window.draftVersionNotes) return;
  const featContainer = document.getElementById('adminVersionFeaturesEditorList');
  const bugContainer = document.getElementById('adminVersionBugFixesEditorList');
  const featBadge = document.getElementById('adminFeatCountBadge');
  const bugBadge = document.getElementById('adminBugCountBadge');

  const feats = window.draftVersionNotes.features || [];
  const bugs = window.draftVersionNotes.bugFixes || [];

  if (featBadge) {
    const visCount = feats.filter(f => f.visible !== false).length;
    featBadge.textContent = `แสดง ${visCount}/${feats.length}`;
  }
  if (bugBadge) {
    const visCount = bugs.filter(b => b.visible !== false).length;
    bugBadge.textContent = `แสดง ${visCount}/${bugs.length}`;
  }

  const buildItemRows = (list, type, accentColor) => {
    if (list.length === 0) {
      return `<div class="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">ยังไม่มีรายการ กดปุ่ม "+ เพิ่ม" ด้านบนเพื่อสร้างรายการใหม่</div>`;
    }
    return list.map((item, idx) => {
      const isVis = item.visible !== false;
      const borderCls = isVis
        ? (accentColor === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-indigo-500/30 bg-indigo-500/[0.03]')
        : 'border-border bg-muted/40 opacity-65';
      const numBadgeCls = isVis
        ? (accentColor === 'emerald' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400')
        : 'bg-muted text-muted-foreground';

      return `
        <div class="p-3 rounded-xl border ${borderCls} space-y-2 transition">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full ${numBadgeCls} text-[10px] font-bold flex items-center justify-center shrink-0">${idx + 1}</span>
              <span class="text-[11px] font-bold ${isVis ? 'text-foreground' : 'text-muted-foreground line-through'}">
                ${isVis ? 'กำลังเปิดแสดงผล' : 'ซ่อนการมองเห็น'}
              </span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" onclick="toggleAdminDraftVersionItemVisibility('${type}', ${idx})"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${isVis ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'}"
                title="${isVis ? 'คลิกเพื่อซ่อนฟีเจอร์นี้จากผู้ใช้' : 'คลิกเพื่อเปิดแสดงฟีเจอร์นี้ให้ผู้ใช้เห็น'}">
                <i data-lucide="${isVis ? 'eye' : 'eye-off'}" class="w-3 h-3"></i>
                <span>${isVis ? 'แสดงผล' : 'ซ่อนไว้'}</span>
              </button>
              <button type="button" onclick="removeAdminDraftVersionItem('${type}', ${idx})"
                class="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="ลบรายการนี้">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          <div class="space-y-1.5">
            <input type="text" id="draftVerTitle_${type}_${idx}" value="${escapeAttrHtml(item.title)}"
              oninput="updateAdminDraftVersionItem('${type}', ${idx}, 'title', this.value)"
              placeholder="หัวข้อ${type === 'features' ? 'ฟีเจอร์ใหม่' : 'การแก้ไขบั๊ก'}..."
              class="w-full h-8 px-3 rounded-lg bg-background border border-input text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition" />
            <textarea rows="2"
              oninput="updateAdminDraftVersionItem('${type}', ${idx}, 'desc', this.value)"
              placeholder="รายละเอียดเพิ่มเติม..."
              class="w-full px-3 py-1.5 rounded-lg bg-background border border-input text-[11px] text-muted-foreground focus:text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none leading-relaxed">${escapeAttrHtml(item.desc)}</textarea>
          </div>
        </div>
      `;
    }).join('');
  };

  if (featContainer) {
    featContainer.innerHTML = buildItemRows(feats, 'features', 'emerald');
  }
  if (bugContainer) {
    bugContainer.innerHTML = buildItemRows(bugs, 'bugFixes', 'indigo');
  }
}

function addAdminDraftVersionItem(type) {
  if (!window.draftVersionNotes || !Array.isArray(window.draftVersionNotes[type])) return;
  window.draftVersionNotes[type].unshift({
    title: '',
    desc: '',
    visible: true
  });
  renderAdminVersionEditorLists();
  setTimeout(() => {
    const firstInput = document.getElementById(`draftVerTitle_${type}_0`);
    if (firstInput) firstInput.focus();
  }, 50);
}

function removeAdminDraftVersionItem(type, idx) {
  if (!window.draftVersionNotes || !Array.isArray(window.draftVersionNotes[type])) return;
  window.draftVersionNotes[type].splice(idx, 1);
  renderAdminVersionEditorLists();
}

function toggleAdminDraftVersionItemVisibility(type, idx) {
  if (!window.draftVersionNotes || !Array.isArray(window.draftVersionNotes[type])) return;
  const item = window.draftVersionNotes[type][idx];
  if (!item) return;
  item.visible = item.visible === false ? true : false;
  renderAdminVersionEditorLists();
}

function updateAdminDraftVersionItem(type, idx, field, val) {
  if (!window.draftVersionNotes || !Array.isArray(window.draftVersionNotes[type])) return;
  const item = window.draftVersionNotes[type][idx];
  if (!item) return;
  item[field] = val;
}

function saveNewSystemVersion() {
  if (window.currentRole !== 'ADMIN' || !window.isAdminAuthenticated) {
    return;
  }
  const input = document.getElementById('adminInputNewVersion');
  const newVer = (input?.value || '').trim();
  if (!newVer) {
    showToast('กรุณาระบุเลขเวอร์ชันระบบ', 'warning');
    return;
  }

  const cleanedFeatures = (window.draftVersionNotes?.features || [])
    .map(f => ({
      title: String(f.title || '').trim(),
      desc: String(f.desc || '').trim(),
      visible: f.visible !== false
    }))
    .filter(f => f.title !== '' || f.desc !== '');

  const cleanedBugFixes = (window.draftVersionNotes?.bugFixes || [])
    .map(b => ({
      title: String(b.title || '').trim(),
      desc: String(b.desc || '').trim(),
      visible: b.visible !== false
    }))
    .filter(b => b.title !== '' || b.desc !== '');

  if (window.socket) {
    window.socket.emit('admin:updateSystemVersion', {
      version: newVer,
      features: cleanedFeatures,
      bugFixes: cleanedBugFixes,
      password: 'comsanentertainer'
    }, (res) => {
      if (res && res.ok) {
        if (window.appState) {
          window.appState.systemVersion = newVer;
          window.appState.versionNotes = res.versionNotes || {
            version: newVer,
            releaseDate: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
            features: cleanedFeatures,
            bugFixes: cleanedBugFixes
          };
        }
        if (typeof window.saveLocalState === 'function') window.saveLocalState();
        if (typeof window.renderAll === 'function') window.renderAll();
        closeAdminVersionEditModal();
        showToast(`บันทึกเวอร์ชัน ${newVer} และรายการอัปเดตเรียบร้อยแล้ว!`, 'success');
      } else {
        showToast(res?.message || 'ไม่สามารถบันทึกเวอร์ชันได้', 'error');
      }
    });
  }
}

function openUserVersionNotesModal(fromAdmin = false) {
  const modal = document.getElementById('userVersionNotesModal');
  const badge = document.getElementById('userVersionNotesBadge');
  const dateEl = document.getElementById('userVersionNotesDate');
  const featSec = document.getElementById('userVersionFeaturesSection');
  const bugSec = document.getElementById('userVersionBugFixesSection');
  const featList = document.getElementById('userVersionFeaturesList');
  const bugList = document.getElementById('userVersionBugFixesList');

  const notes = window.appState?.versionNotes || {};
  const draftVerInput = document.getElementById('adminInputNewVersion');
  const ver = (fromAdmin && draftVerInput && draftVerInput.value.trim())
    ? draftVerInput.value.trim()
    : (window.appState?.systemVersion || notes.version || '2.0.1');
  const releaseDate = notes.releaseDate || '18 ตุลาคม 2569';

  if (badge) badge.textContent = `เวอร์ชัน ${ver}`;
  if (dateEl) dateEl.textContent = `Meeting by Comsan • อัปเดตล่าสุด ${releaseDate}`;

  const sourceData = (fromAdmin && window.draftVersionNotes)
    ? window.draftVersionNotes
    : getNormalizedVersionNotes();

  const visibleFeatures = (sourceData.features || []).filter(f => f.visible !== false && (f.title || f.desc));
  const visibleBugFixes = (sourceData.bugFixes || []).filter(b => b.visible !== false && (b.title || b.desc));

  if (featSec) {
    featSec.classList.toggle('hidden', visibleFeatures.length === 0 && visibleBugFixes.length > 0);
  }
  if (bugSec) {
    bugSec.classList.toggle('hidden', visibleBugFixes.length === 0);
  }

  if (featList) {
    featList.innerHTML = visibleFeatures.length === 0
      ? `<div class="p-4 rounded-xl bg-muted/40 border border-border text-center text-xs text-muted-foreground">ไม่มีรายการฟีเจอร์ที่เปิดแสดงผลในขณะนี้</div>`
      : visibleFeatures.map((f, i) => `
          <div class="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition">
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">${i + 1}</span>
              <div>
                <h5 class="text-xs font-bold text-foreground">${escapeAttrHtml(f.title)}</h5>
                <p class="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">${escapeAttrHtml(f.desc)}</p>
              </div>
            </div>
          </div>
        `).join('');
  }

  if (bugList) {
    bugList.innerHTML = visibleBugFixes.map((b, i) => `
      <div class="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 hover:border-indigo-500/40 transition">
        <div class="flex items-start gap-2.5">
          <span class="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">${i + 1}</span>
          <div>
            <h5 class="text-xs font-bold text-foreground">${escapeAttrHtml(b.title)}</h5>
            <p class="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">${escapeAttrHtml(b.desc)}</p>
          </div>
        </div>
      </div>
    `).join('');
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof playNotificationSound === 'function') playNotificationSound('vote');
  }
}

function closeUserVersionNotesModal() {
  const modal = document.getElementById('userVersionNotesModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Window attachments
window.playNotificationSound = playNotificationSound;
window.showToast = showToast;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;
window.applyColorTheme = applyColorTheme;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.setAppearance = setAppearance;
window.setColorPalette = setColorPalette;
window.openImagePreview = openImagePreview;
window.closeImagePreview = closeImagePreview;
window.openQrExpandModal = openQrExpandModal;
window.closeQrExpandModal = closeQrExpandModal;
window.resizeProfileQr = resizeProfileQr;
window.toggleSeatingChartCollapse = toggleSeatingChartCollapse;
window.closeRaiseHandPopup = closeRaiseHandPopup;
window.handleSettingsLogoClick = handleSettingsLogoClick;
window.openEasterEggModal = openEasterEggModal;
window.closeEasterEggModal = closeEasterEggModal;
window.handleDegreeFileSelect = handleDegreeFileSelect;
window.handleFakeResignClick = handleFakeResignClick;
window.handleVersionClick = handleVersionClick;
window.openVersionPasscodeModal = openVersionPasscodeModal;
window.closeVersionPasscodeModal = closeVersionPasscodeModal;
window.toggleVersionPasscodeVisibility = toggleVersionPasscodeVisibility;
window.submitVersionPasscode = submitVersionPasscode;
window.openAdminVersionEditModal = openAdminVersionEditModal;
window.closeAdminVersionEditModal = closeAdminVersionEditModal;
window.renderAdminVersionEditorLists = renderAdminVersionEditorLists;
window.addAdminDraftVersionItem = addAdminDraftVersionItem;
window.removeAdminDraftVersionItem = removeAdminDraftVersionItem;
window.toggleAdminDraftVersionItemVisibility = toggleAdminDraftVersionItemVisibility;
window.updateAdminDraftVersionItem = updateAdminDraftVersionItem;
window.saveNewSystemVersion = saveNewSystemVersion;
window.openUserVersionNotesModal = openUserVersionNotesModal;
window.closeUserVersionNotesModal = closeUserVersionNotesModal;
window.initHeroBubbleAnimation = initHeroBubbleAnimation;
window.applyHeroBubbleAnimation = applyHeroBubbleAnimation;
window.toggleHeroBubbleAnimation = toggleHeroBubbleAnimation;


