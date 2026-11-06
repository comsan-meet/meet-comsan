/**
 * COMSAN Meeting System - Authentication Controller (/auth)
 * Maintenance Mode: Exclusively for ADMIN access during system upgrades
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
    if (redirect && redirect.startsWith('/') && redirect !== '/auth') {
      return redirect;
    }
    return '/';
  }

  // --- Guard: Check if already authenticated as ADMIN ---
  function checkExistingSession() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('force') === 'true') {
      return;
    }
    const adminAuth = localStorage.getItem('comsan_admin_auth') === 'true';

    // In maintenance mode: ONLY ADMIN is permitted to pass
    if (adminAuth) {
      window.location.replace(getRedirectTarget());
    } else {
      // Clear any non-admin member sessions during maintenance
      localStorage.removeItem('comsan_user_auth');
      localStorage.removeItem('comsan_user_id');
      localStorage.removeItem('comsan_role');
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
  function showAdminError(msg) {
    const errEl = document.getElementById('adminDirectLoginError');
    const errText = document.getElementById('adminDirectLoginErrorText');
    if (errText) errText.textContent = msg;
    else if (errEl) errEl.textContent = msg;
    if (errEl) errEl.classList.remove('hidden');
  }

  function hideAdminError() {
    const errEl = document.getElementById('adminDirectLoginError');
    if (errEl) errEl.classList.add('hidden');
  }

  // --- Direct Admin Passcode Authentication ---
  function handleDirectAdminLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAdminError();

    const passInput = (document.getElementById('adminDirectPass')?.value || '').trim();
    const validAdminPass = window.ADMIN_PASSWORD || 'admincomsan26';

    if (!passInput) {
      showAdminError('กรุณากรอกรหัสผ่านผู้ดูแลระบบ (ADMIN)');
      return;
    }

    if (passInput === validAdminPass) {
      const state = window.appState;
      const defaultUser = (state?.users && state.users[0]) ? state.users[0].id : 'COMSAN-01';

      localStorage.setItem('comsan_admin_auth', 'true');
      localStorage.setItem('comsan_user_id', defaultUser);
      localStorage.setItem('comsan_user_auth', 'true');
      localStorage.setItem('comsan_role', 'ADMIN');

      showLoginSuccess('เข้าสู่ระบบผู้ดูแลระบบสำเร็จ กำลังพาเข้าสู่ระบบ...');
      setTimeout(() => {
        window.location.replace(getRedirectTarget());
      }, 350);
    } else {
      showAdminError('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
    }
  }

  // --- Org Email / Secondary Admin Login ---
  function handleOrgAdminLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAdminError();

    const nameInput = (document.getElementById('orgAdminName')?.value || '').trim().toLowerCase();
    const passInput = (document.getElementById('orgAdminPass')?.value || '').trim();
    const validAdminPass = window.ADMIN_PASSWORD || 'admincomsan26';

    const isOrgMatch = (nameInput === 'comsan.meet@gmail.com' || nameInput === 'comsan.meet' || nameInput === 'admin' || nameInput === 'ผู้ดูแลระบบ') &&
                       (passInput === validAdminPass);

    if (isOrgMatch) {
      const state = window.appState;
      const defaultUser = (state?.users && state.users[0]) ? state.users[0].id : 'COMSAN-01';

      localStorage.setItem('comsan_admin_auth', 'true');
      localStorage.setItem('comsan_user_id', defaultUser);
      localStorage.setItem('comsan_user_auth', 'true');
      localStorage.setItem('comsan_role', 'ADMIN');

      showLoginSuccess('ยืนยันตัวตนผู้ดูแลระบบสำเร็จ...');
      setTimeout(() => {
        window.location.replace(getRedirectTarget());
      }, 350);
    } else {
      showAdminError('ชื่อบัญชีผู้ดูแลระบบหรือรหัสผ่านไม่ถูกต้อง');
    }
  }

  // --- Member Login Block Notice ---
  function handleMemberLoginAttempt(e) {
    if (e && e.preventDefault) e.preventDefault();
    showAdminError('⚠️ ขณะนี้ระบบกำลังอยู่ระหว่างปรับปรุงชั่วคราว เปิดให้เฉพาะผู้ดูแลระบบ (ADMIN) เข้าใช้งานเท่านั้น');
  }

  // --- Toggle between Quick Passcode & Full Email Form ---
  function toggleAdminLoginMode(mode) {
    const passMode = document.getElementById('adminPasscodeMode');
    const emailMode = document.getElementById('adminEmailMode');
    hideAdminError();
    if (mode === 'EMAIL') {
      if (passMode) passMode.classList.add('hidden');
      if (emailMode) emailMode.classList.remove('hidden');
    } else {
      if (emailMode) emailMode.classList.add('hidden');
      if (passMode) passMode.classList.remove('hidden');
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

  // --- Success Animation ---
  function showLoginSuccess(msg) {
    const submitBtn = document.getElementById('btnAdminDirectSubmit') || document.getElementById('btnOrgAdminSubmit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-900 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>${msg || 'กำลังตรวจสอบสิทธิ์...'}</span>
      `;
    }
  }

  // --- Expose Globals ---
  window.initTheme = initTheme;
  window.toggleTheme = toggleTheme;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.handleDirectAdminLogin = handleDirectAdminLogin;
  window.handleOrgAdminLogin = handleOrgAdminLogin;
  window.handleMemberLoginAttempt = handleMemberLoginAttempt;
  window.toggleAdminLoginMode = toggleAdminLoginMode;
  window.showLoginHelpModal = showLoginHelpModal;
  window.closeLoginHelpModal = closeLoginHelpModal;

  // --- DOM Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkExistingSession();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });

})();
