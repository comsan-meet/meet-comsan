/**
 * COMSAN Meeting System - Authentication Controller (/auth)
 * Matches Comsan Choice Design & Sister-Site Integration
 */

(function() {
  'use strict';

  // --- Theme Management ---
  function initTheme() {
    try {
      const savedTheme = localStorage.getItem('comsan_theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme ? (savedTheme === 'dark') : prefersDark;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      updateThemeToggleIcons(isDark);
    } catch (e) {
      console.warn('Theme init warning:', e);
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('comsan_theme', isDark ? 'dark' : 'light');
    } catch (e) {}
    updateThemeToggleIcons(isDark);
  }

  function updateThemeToggleIcons(isDark) {
    const sunIcon = document.getElementById('themeSunIcon');
    const moonIcon = document.getElementById('themeMoonIcon');
    if (sunIcon && moonIcon) {
      if (isDark) {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
      } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
      }
    }
  }

  // --- Query Params & Redirect Helpers ---
  function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    const checkin = params.get('checkin');
    if (checkin) {
      return `/?checkin=${encodeURIComponent(checkin)}`;
    }
    if (redirect && redirect.startsWith('/')) {
      return redirect;
    }
    return '/';
  }

  // --- Guard: Check if already authenticated ---
  function checkExistingSession() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('force') === 'true') {
      return; // Allow viewing login page if force=true
    }
    const userAuth = localStorage.getItem('comsan_user_auth') === 'true';
    const adminAuth = localStorage.getItem('comsan_admin_auth') === 'true';
    const userId = localStorage.getItem('comsan_user_id');

    if (adminAuth || (userAuth && userId)) {
      window.location.replace(getRedirectTarget());
    }
  }

  // --- Password Visibility Toggle ---
  function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    const icon = btnEl ? btnEl.querySelector('[data-lucide]') : null;
    if (icon) {
      icon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

  // --- Login Error Helpers ---
  function showLoginError(msg) {
    const errEl = document.getElementById('userLoginError');
    const errText = document.getElementById('userLoginErrorText');
    if (errText) errText.textContent = msg;
    else if (errEl) errEl.textContent = msg;
    if (errEl) errEl.classList.remove('hidden');
  }

  function hideLoginError() {
    const errEl = document.getElementById('userLoginError');
    if (errEl) errEl.classList.add('hidden');
  }

  // --- Member & Admin Authentication Logic ---
  function handleUserLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideLoginError();

    const nameInput = (document.getElementById('userLoginName')?.value || '').trim().toLowerCase();
    const passInput = (document.getElementById('userLoginPass')?.value || '').trim();

    if (!nameInput) {
      showLoginError('กรุณากรอกชื่อผู้ใช้งาน หรือรหัสนักศึกษา');
      return;
    }

    const validAdminPass = window.ADMIN_PASSWORD || 'admincomsan26';

    // 1. Direct Organization or Admin Credentials
    const isChoiceOrgLogin = (nameInput === 'comsan.meet@gmail.com' || nameInput === 'comsan.meet' || nameInput === 'meet' ||
                              nameInput === 'comsan.choice@gmail.com' || nameInput === 'comsan.choice' || nameInput === 'choice') &&
                             (passInput === validAdminPass);
    const isAdminLogin = ['admin', 'ผู้ดูแลระบบ', 'admincomsan'].includes(nameInput) &&
                         (passInput === validAdminPass);

    if (isChoiceOrgLogin || isAdminLogin) {
      const state = window.appState;
      const defaultUser = (state?.users && state.users[0]) ? state.users[0].id : 'COMSAN-01';
      
      localStorage.setItem('comsan_admin_auth', 'true');
      localStorage.setItem('comsan_user_id', defaultUser);
      localStorage.setItem('comsan_user_auth', 'true');
      const targetRole = isChoiceOrgLogin && nameInput.includes('choice') ? 'USER' : 'ADMIN';
      localStorage.setItem('comsan_role', targetRole);

      showLoginSuccess('เข้าสู่ระบบผู้ดูแลระบบสำเร็จ กำลังพาเข้าสู่ระบบ...');
      setTimeout(() => {
        window.location.replace(getRedirectTarget());
      }, 400);
      return;
    }

    // 2. Member Matching
    const state = window.appState;
    const users = (state && Array.isArray(state.users)) ? state.users : [];

    const checkNameMatch = (u, input) => {
      const nick = (u.nickname || '').trim().toLowerCase();
      const first = (u.firstName || '').trim().toLowerCase();
      const last = (u.lastName || '').trim().toLowerCase();
      const id = (u.id || '').trim().toLowerCase();
      const sid = (u.studentId || '').trim().toLowerCase();
      const full = `${first} ${last}`.trim();
      return nick === input || first === input || id === input || sid === input || full === input;
    };

    const checkPassMatch = (u, pass) => {
      const uPass = String(u.password || '').trim();
      const sid = String(u.studentId || '').trim();
      return Boolean((uPass && pass === uPass) || (sid && pass.toLowerCase() === sid.toLowerCase()));
    };

    let matchedCandidates = users.filter(u => checkNameMatch(u, nameInput));

    // Support Demo Users: 'บอม', 'ฟีฟ่า'
    if (!matchedCandidates.length && (nameInput === 'บอม' || nameInput === 'ฟีฟ่า' || nameInput === 'bomb' || nameInput === 'fifa')) {
      const isBomb = nameInput === 'บอม' || nameInput === 'bomb';
      const demoUser = {
        id: isBomb ? 'COMSAN-BOMB' : 'COMSAN-FIFA',
        firstName: isBomb ? 'ธนกฤต' : 'ศุภกร',
        lastName: isBomb ? 'ยอดเยี่ยม' : 'มีสุข',
        nickname: isBomb ? 'บอม' : 'ฟีฟ่า',
        year: isBomb ? '2' : '1',
        major: isBomb ? 'CS' : 'IT',
        position: isBomb ? 'ฝ่ายกิจกรรม' : 'ฝ่ายเทคโนโลยีสารสนเทศ',
        password: '123',
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
      };
      if (state) {
        state.users = state.users || [];
        state.users.push(demoUser);
        if (typeof window.saveLocalState === 'function') window.saveLocalState();
      }
      matchedCandidates = [demoUser];
    }

    if (!matchedCandidates.length) {
      showLoginError('ไม่พบชื่อผู้ใช้งานนี้ กรุณาตรวจสอบชื่อเล่น หรือรหัสนักศึกษา');
      return;
    }

    if (!passInput) {
      showLoginError('กรุณากรอกรหัสผ่าน (รหัสนักศึกษา หรือรหัสผ่านประจำตัว)');
      return;
    }

    const found = matchedCandidates.find(u => checkPassMatch(u, passInput));

    if (!found) {
      showLoginError('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง');
      return;
    }

    // Success: save user session
    localStorage.setItem('comsan_user_id', found.id);
    localStorage.setItem('comsan_user_auth', 'true');
    localStorage.setItem('comsan_role', 'USER');

    showLoginSuccess(`ยินดีต้อนรับ ${found.nickname || found.firstName}!`);
    setTimeout(() => {
      window.location.replace(getRedirectTarget());
    }, 400);
  }

  // --- Admin Modal Access ---
  function requestAdminAccess() {
    const modal = document.getElementById('adminLoginModal');
    const input = document.getElementById('adminPassInput');
    const err = document.getElementById('adminLoginError');
    if (err) err.classList.add('hidden');
    if (input) input.value = '';
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
    const err = document.getElementById('adminLoginError');
    const pass = (input ? input.value : '').trim();
    const validPass = window.ADMIN_PASSWORD || 'admincomsan26';

    if (pass === validPass) {
      localStorage.setItem('comsan_admin_auth', 'true');
      localStorage.setItem('comsan_role', 'ADMIN');
      
      // Also ensure user_auth if not set
      if (!localStorage.getItem('comsan_user_id')) {
        const state = window.appState;
        const defaultUser = (state?.users && state.users[0]) ? state.users[0].id : 'COMSAN-01';
        localStorage.setItem('comsan_user_id', defaultUser);
        localStorage.setItem('comsan_user_auth', 'true');
      }

      closeAdminModal();
      showLoginSuccess('เข้าสู่ระบบผู้ดำเนินการ (ADMIN) สำเร็จ!');
      setTimeout(() => {
        window.location.replace('/admin');
      }, 400);
    } else {
      if (err) {
        err.classList.remove('hidden');
        err.textContent = 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      }
    }
  }

  // --- Login Help Modal ---
  function showLoginHelpModal() {
    const modal = document.getElementById('loginHelpModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closeLoginHelpModal() {
    const modal = document.getElementById('loginHelpModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // --- Toast / Feedback ---
  function showLoginSuccess(msg) {
    const submitBtn = document.getElementById('btnLoginSubmit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>${msg || 'กำลังเข้าสู่ระบบ...'}</span>
      `;
    }
  }

  // --- Expose Globals for Inline Handlers ---
  window.initTheme = initTheme;
  window.toggleTheme = toggleTheme;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.handleUserLogin = handleUserLogin;
  window.requestAdminAccess = requestAdminAccess;
  window.closeAdminModal = closeAdminModal;
  window.handleAdminLogin = handleAdminLogin;
  window.showLoginHelpModal = showLoginHelpModal;
  window.closeLoginHelpModal = closeLoginHelpModal;

  // --- On DOM Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkExistingSession();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });

})();
