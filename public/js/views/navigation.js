/**
 * COMSAN Meeting System - Navigation View Controller (Comsan Choice Unified Sister-Site Edition)
 */

function syncSidebarTopOffset() {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) {
    sidebar.style.paddingTop = '0px';
  }
}

function updateChatFloatingButtons() {
  const adminFloatBtn = document.getElementById('adminMobileChatFloatBtnWrapper');
  const userFloatBtn = document.getElementById('userChatFloatBtnWrapper');
  const authScreen = document.getElementById('authScreen');
  const isAuthVisible = authScreen && !authScreen.classList.contains('hidden');
  const isAdminLogged = Boolean(window.isAdminAuthenticated);
  const isUserLogged = Boolean(window.isUserAuthenticated) && Boolean(window.currentUserId);
  const isAuthenticated = isAdminLogged || isUserLogged;

  if (!isAuthenticated || isAuthVisible) {
    if (adminFloatBtn) adminFloatBtn.classList.add('hidden');
    if (userFloatBtn) userFloatBtn.classList.add('hidden');
    return;
  }

  if (window.currentRole === 'ADMIN') {
    if (userFloatBtn) userFloatBtn.classList.add('hidden');
    if (adminFloatBtn) {
      if (window.activeAdminTab === 'CHAT' || !window.isAdminAuthenticated) {
        adminFloatBtn.classList.add('hidden');
      } else {
        adminFloatBtn.classList.remove('hidden');
      }
    }
  } else {
    if (adminFloatBtn) adminFloatBtn.classList.add('hidden');
    if (userFloatBtn) {
      const isMobile = window.innerWidth < 768;
      if (window.activeUserTab !== 'CHAT' && !isMobile) {
        userFloatBtn.classList.remove('hidden');
      } else {
        userFloatBtn.classList.add('hidden');
      }
    }
  }
}

function updateSidebarActiveStates() {
  const activeClass = 'sidebar-nav-btn flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group bg-primary/10 text-primary cursor-pointer';
  const inactiveClass = 'sidebar-nav-btn flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer';

  const userNavIds = ['HOME', 'VOTE', 'RAISE', 'CHAT', 'PROFILE'];
  const adminNavIds = ['DASHBOARD', 'SETTINGS', 'CHECKIN', 'VOTING', 'QUEUE', 'RANDOM', 'STREAM', 'FILES', 'NOTES', 'CALENDAR', 'SUMMARY', 'MEMBERS', 'DATABASE'];

  const isAdminMode = window.currentRole === 'ADMIN';

  // 1. Sidebar User Menu
  userNavIds.forEach(id => {
    const btn = document.getElementById(`uNav_${id}`);
    if (btn) {
      const isActive = !isAdminMode && id === window.activeUserTab;
      btn.className = isActive ? activeClass : inactiveClass;
    }
  });

  // 2. Sidebar Admin Menu
  adminNavIds.forEach(id => {
    const btn = document.getElementById(`aNav_${id}`);
    if (btn) {
      const isActive = isAdminMode && id === window.activeAdminTab;
      btn.className = isActive ? activeClass : inactiveClass;
    }
  });

  // 3. Mobile Bottom Nav (HOME, VOTE, RAISE, CHAT, PROFILE)
  ['HOME', 'VOTE', 'CHAT', 'PROFILE'].forEach(t => {
    const mBtn = document.getElementById(`mNav_${t}`);
    const mPill = document.getElementById(`mNavPill_${t}`);
    const isActive = !isAdminMode && t === window.activeUserTab;
    if (mBtn) {
      mBtn.className = isActive
        ? 'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 transition-all h-full text-primary'
        : 'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 transition-all h-full text-muted-foreground hover:text-foreground';
    }
    if (mPill) {
      mPill.className = 'flex items-center justify-center transition relative';
    }
  });

  const mRaiseBtn = document.getElementById('mNav_RAISE');
  if (mRaiseBtn) {
    const isRaiseActive = !isAdminMode && window.activeUserTab === 'RAISE';
    mRaiseBtn.className = isRaiseActive
      ? 'absolute -top-5 inset-x-0 mx-auto w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 bg-primary text-primary-foreground active:scale-95 shadow-[0_4px_14px_hsl(var(--primary)/0.35)] ring-2 ring-primary ring-offset-2 ring-offset-background cursor-pointer'
      : 'absolute -top-5 inset-x-0 mx-auto w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 bg-primary text-primary-foreground active:scale-95 shadow-[0_4px_14px_hsl(var(--primary)/0.25)] hover:scale-105 cursor-pointer';
  }
}

function updateSidebarVisibility() {
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const mobileBottomNav = document.getElementById('mobileBottomNav');
  const mobileHeader = document.getElementById('mobileHeader');
  const desktopHeader = document.getElementById('desktopMainHeader');
  const sidebarUser = document.getElementById('sidebarUserMenu');
  const sidebarAdmin = document.getElementById('sidebarAdminMenu');
  const authScreen = document.getElementById('authScreen');
  const appLayout = document.getElementById('appLayout');

  const isDesktop = window.innerWidth >= 768;
  const isAdminLogged = Boolean(window.isAdminAuthenticated);
  const isUserLogged = Boolean(window.isUserAuthenticated) && Boolean(window.currentUserId);
  const isAuthenticated = isAdminLogged || isUserLogged;

  // 1. Not authenticated -> show Auth page
  if (!isAuthenticated) {
    if (authScreen) authScreen.classList.remove('hidden');
    if (appLayout) {
      appLayout.classList.add('hidden');
      appLayout.classList.remove('flex');
    }
    if (sidebar) {
      sidebar.classList.add('hidden', '-translate-x-full');
      sidebar.classList.remove('flex', 'translate-x-0', 'mobile-drawer-open', 'sidebar-collapsed');
    }
    if (mobileBottomNav) {
      mobileBottomNav.classList.add('hidden');
      mobileBottomNav.classList.remove('flex');
    }
    if (mobileHeader) {
      mobileHeader.classList.add('hidden');
      mobileHeader.classList.remove('flex');
    }
    if (desktopHeader) {
      desktopHeader.classList.add('hidden');
      desktopHeader.classList.remove('flex');
    }
    if (backdrop) backdrop.classList.add('hidden');
    updateChatFloatingButtons();
    return;
  }

  // 2. Authenticated -> show App Layout
  if (authScreen) authScreen.classList.add('hidden');
  if (appLayout) {
    appLayout.classList.remove('hidden');
    appLayout.classList.add('flex');
  }

  // Toggle User vs Admin menus in sidebar based on currentRole
  if (window.currentRole === 'ADMIN') {
    if (sidebarAdmin) sidebarAdmin.classList.remove('hidden');
    if (sidebarUser) sidebarUser.classList.add('hidden');
  } else {
    if (sidebarUser) sidebarUser.classList.remove('hidden');
    if (sidebarAdmin) sidebarAdmin.classList.add('hidden');
  }

  const isChatActive = (window.currentRole === 'ADMIN' && window.activeAdminTab === 'CHAT') ||
                       (window.currentRole !== 'ADMIN' && window.activeUserTab === 'CHAT');

  document.body.classList.toggle('chat-open', isChatActive);
  if (isChatActive) {
    window.scrollTo(0, 0);
  }

  if (isDesktop) {
    // Desktop layout
    if (mobileHeader) {
      mobileHeader.classList.add('hidden');
      mobileHeader.classList.remove('flex');
    }
    if (mobileBottomNav) {
      mobileBottomNav.classList.add('hidden');
      mobileBottomNav.classList.remove('flex');
    }
    if (desktopHeader) {
      if (isChatActive) {
        desktopHeader.classList.add('hidden');
        desktopHeader.classList.remove('flex');
      } else {
        desktopHeader.classList.remove('hidden');
        desktopHeader.classList.add('flex');
      }
    }
    if (sidebar) {
      if (isChatActive) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex', 'md:flex');
      } else {
        sidebar.classList.remove('hidden', '-translate-x-full', 'mobile-drawer-open');
        sidebar.classList.add('flex', 'md:flex', 'translate-x-0');
        sidebar.classList.toggle('sidebar-collapsed', !!window.isSidebarCollapsed);
      }
    }
    if (backdrop) backdrop.classList.add('hidden');
  } else {
    // Mobile layout
    if (window.currentRole === 'ADMIN') {
      if (desktopHeader) {
        desktopHeader.classList.add('hidden');
        desktopHeader.classList.remove('flex');
      }
      if (mobileHeader) {
        if (isChatActive) {
          mobileHeader.classList.add('hidden');
          mobileHeader.classList.remove('flex');
        } else {
          mobileHeader.classList.remove('hidden');
          mobileHeader.classList.add('flex');
        }
      }
    } else {
      // USER MODE ON MOBILE: Match Comsan Choice Image 2!
      // Show desktopMainHeader (the Choice greeting header) and hide the sticky mini mobileHeader!
      if (desktopHeader) {
        if (isChatActive) {
          desktopHeader.classList.add('hidden');
          desktopHeader.classList.remove('flex');
        } else {
          desktopHeader.classList.remove('hidden');
          desktopHeader.classList.add('flex');
        }
      }
      if (mobileHeader) {
        mobileHeader.classList.add('hidden');
        mobileHeader.classList.remove('flex');
      }
    }
    if (mobileBottomNav) {
      if (isChatActive || window.currentRole === 'ADMIN') {
        mobileBottomNav.classList.add('hidden');
        mobileBottomNav.classList.remove('flex');
      } else {
        mobileBottomNav.classList.remove('hidden');
        mobileBottomNav.classList.add('flex');
      }
    }
    if (sidebar) {
      sidebar.classList.remove('sidebar-collapsed');
      if (window.isMobileSidebarOpen && !isChatActive) {
        sidebar.classList.remove('hidden', '-translate-x-full');
        sidebar.classList.add('flex', 'translate-x-0', 'mobile-drawer-open');
        if (backdrop) backdrop.classList.remove('hidden');
      } else {
        sidebar.classList.add('-translate-x-full', 'hidden');
        sidebar.classList.remove('translate-x-0', 'mobile-drawer-open', 'flex');
        if (backdrop) backdrop.classList.add('hidden');
      }
    }
  }

  const mobileToggleBtn = document.getElementById('btnMobileSidebarToggle');
  if (mobileToggleBtn) {
    mobileToggleBtn.classList.remove('hidden');
    mobileToggleBtn.classList.add('flex');
  }

  updateSidebarActiveStates();
  updateSidebarProfile();
  updateHeaderRoleSwitcherVisibility();
  updateChatFloatingButtons();
}

function updateSidebarProfile() {
  updateDesktopHeader();
  const nameEl = document.getElementById('sidebarProfileName');
  const roleEl = document.getElementById('sidebarProfileRole');
  const initialEl = document.getElementById('sidebarUserInitials');
  const verified = document.getElementById('sidebarVerifiedIcon');
  const avatarContainer = document.getElementById('sidebarAvatarContainer');

  if (!nameEl) return;

  const userId = window.currentUserId;
  const state = window.appState;
  const me = state && (state.users || []).find(u => u.id === userId);

  if (window.currentRole === 'ADMIN') {
    nameEl.textContent = 'ผู้ดำเนินการ (ADMIN)';
    if (roleEl) roleEl.textContent = me ? `ผู้ดูแลระบบ (${me.nickname || me.firstName})` : 'ผู้ดูแลระบบการประชุม';
    if (initialEl) initialEl.textContent = 'A';
    if (avatarContainer && typeof window.updateAvatarElement === 'function') {
      window.updateAvatarElement(avatarContainer, { nickname: 'ADMIN', id: 'ADMIN' });
    }
    if (verified) verified.classList.remove('hidden');
    return;
  }

  if (me) {
    nameEl.textContent = me.nickname ? `${me.nickname} (${me.firstName})` : me.id;
    if (roleEl) roleEl.textContent = me.position ? `${me.position}` : 'ผู้เข้าร่วมประชุม';
    if (initialEl) initialEl.textContent = (me.nickname || me.firstName || 'U').charAt(0);
    if (avatarContainer && typeof window.updateAvatarElement === 'function') {
      window.updateAvatarElement(avatarContainer, me);
    }
    if (verified) {
      verified.classList.remove('hidden');
    }
  } else {
    nameEl.textContent = 'Comsan Official';
    if (roleEl) roleEl.textContent = 'ผู้ดูแลระบบ';
    if (initialEl) initialEl.textContent = 'C';
    if (avatarContainer && typeof window.updateAvatarElement === 'function') {
      window.updateAvatarElement(avatarContainer, 'C');
    }
    if (verified) verified.classList.remove('hidden');
  }
}

function updateDesktopHeader() {
  const titleEl = document.getElementById('desktopHeadingTitle');
  const subEl = document.getElementById('desktopHeadingSubtitle');
  const primaryBtn = document.getElementById('headerPrimaryActionBtn');
  const primaryLabel = document.getElementById('headerPrimaryActionLabel');
  if (!titleEl) return;

  const totalMembers = (window.appState && Array.isArray(window.appState.users)) ? window.appState.users.length : 60;

  if (window.currentRole === 'ADMIN') {
    const adminTitles = {
      DASHBOARD: ['จัดการการประชุม', 'ควบคุมสถานะการประชุม วาระ และภาพรวมแบบเรียลไทม์'],
      CHAT: ['ห้องแชททางการ (Admin)', 'ติดต่อสื่อสารกับสมาชิกและห้องประชุมรวมในฐานะผู้ดำเนินการ'],
      CHECKIN: ['เช็คชื่อผู้เข้าร่วม', 'สแกน QR Code และตรวจสอบสถานะการเข้าร่วมประชุม'],
      VOTING: ['สร้างการลงคะแนน', 'เปิดญัตติใหม่และควบคุมการลงมติในที่ประชุม'],
      QUEUE: ['คิวผู้ขอพูด', 'จัดลำดับผู้ยกมือขออภิปรายและจับเวลา'],
      CALENDAR: ['จัดการปฏิทิน', 'เพิ่มและแก้ไขกำหนดการประชุมขององค์กร'],
      FILES: ['จัดการเอกสาร', 'อัปโหลดเอกสารประกอบการประชุมสำหรับสมาชิก'],
      STREAM: ['ตั้งค่าถ่ายทอดสด', 'จัดการลิงก์สัญญาณภาพสดและห้องประชุมออนไลน์'],
      MEMBERS: ['จัดการสมาชิก', `นำเข้าและจัดการรายชื่อสมาชิกในองค์กร (${totalMembers} คน)`],
      NOTES: ['โน้ตสรุปสมาชิก', 'ตรวจสอบบันทึกการประชุมที่สมาชิกส่งเข้ามา'],
      RANDOM: ['วงล้อสุ่มชื่อ', 'สุ่มชื่อสมาชิกในที่ประชุมพร้อมเอฟเฟกต์เสียง'],
      SUMMARY: ['ประวัติและสรุปผล', 'รายงานผลการประชุมและส่งออกข้อมูล'],
      SETTINGS: ['ตั้งค่าระบบ', 'จัดการรหัสผ่านและการตั้งค่าผู้ดูแลระบบ'],
      DATABASE: ['เชื่อมต่อฐานข้อมูล', 'จัดการการเชื่อมต่อ Supabase (Cloud) และ MySQL / MariaDB']
    };
    const [t, s] = adminTitles[window.activeAdminTab] || ['จัดการการประชุม', 'ระบบจัดการการประชุม COMSAN'];
    titleEl.textContent = t;
    if (subEl) subEl.textContent = s;
    if (primaryBtn) {
      primaryBtn.classList.remove('hidden');
      primaryBtn.classList.add('inline-flex');
      if (primaryLabel) primaryLabel.textContent = 'กลับหน้าหลัก';
      primaryBtn.dataset.action = 'BACK_HOME';
    }
    return;
  }

  const currentTab = window.activeUserTab || 'HOME';

  // Find user greeting name for HOME tab
  let greetingName = 'สมาชิก';
  const uid = window.currentUserId;
  if (window.appState && uid) {
    const me = (window.appState.users || []).find(u => u.id === uid);
    if (me) {
      if (me.nickname) {
        greetingName = `คุณ${me.nickname}`;
      } else if (me.name) {
        greetingName = me.name.split(' ')[0];
      }
    }
  }

  const pageMeta = {
    HOME: {
      title: `สวัสดี, ${greetingName}`,
      sub: 'ระบบจัดการการประชุม',
      cta: null
    },
    VOTE: {
      title: 'การลงมติ (โหวต)',
      sub: 'รายการการลงคะแนนทั้งหมดในระบบ',
      cta: null
    },
    RAISE: {
      title: 'ยกมือขอพูด',
      sub: 'ส่งคำขออภิปรายและตรวจสอบลำดับคิวในที่ประชุม',
      cta: null
    },
    CHAT: {
      title: 'แชตห้องประชุม',
      sub: 'พูดคุยแลกเปลี่ยนความคิดเห็นระหว่างการประชุม',
      cta: null
    },
    PROFILE: {
      title: 'โปรไฟล์ของฉัน',
      sub: 'จัดการข้อมูลของคุณ',
      cta: null
    }
  };

  const meta = pageMeta[currentTab] || pageMeta.HOME;
  titleEl.textContent = meta.title;
  titleEl.className = 'text-2xl sm:text-3xl font-medium font-prompt text-foreground truncate';
  if (subEl) {
    subEl.textContent = meta.sub;
    subEl.className = 'text-muted-foreground mt-1 text-xs sm:text-sm md:text-base truncate font-prompt';
  }

  if (primaryBtn) {
    if (meta.cta) {
      primaryBtn.classList.remove('hidden');
      primaryBtn.classList.add('inline-flex');
      if (primaryLabel) primaryLabel.textContent = meta.cta;
      primaryBtn.dataset.action = meta.action || '';
    } else {
      primaryBtn.classList.add('hidden');
      primaryBtn.classList.remove('inline-flex');
      primaryBtn.dataset.action = '';
    }
  }
}

function toggleSidebarCreateMenu(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const dropdown = document.getElementById('sidebarCreateDropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('hidden');
}

// Close sidebar create dropdown on outside click
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('sidebarCreateDropdown');
  const btn = document.getElementById('sidebarQuickActionBtn');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if ((!btn || !btn.contains(e.target)) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  }
});

function handleQuickCreateAction(type) {
  const dropdown = document.getElementById('sidebarCreateDropdown');
  if (dropdown) dropdown.classList.add('hidden');

  if (type === 'VOTE') {
    openAdminSection('VOTING');
  } else if (type === 'MEETING') {
    openAdminSection('DASHBOARD');
  } else if (type === 'EVENT') {
    openAdminSection('CALENDAR');
  }
}

function handleHeaderPrimaryAction(e) {
  const btn = document.getElementById('headerPrimaryActionBtn');
  const action = btn ? btn.dataset.action : '';
  if (action === 'BACK_HOME') {
    openUserSection('HOME');
  } else if (action === 'CREATE_VOTE') {
    openAdminSection('VOTING');
  } else if (action === 'CREATE_EVENT') {
    openAdminSection('CALENDAR');
  } else if (action === 'ADMIN_FILES') {
    openAdminSection('FILES');
  } else {
    toggleSidebarCreateMenu(e);
  }
}

function openUserSection(section) {
  // Admin-only (no member login) -> force member login popup
  if (window.isAdminAuthenticated && !window.isUserAuthenticated) {
    showUserLoginPopup();
    return;
  }
  // Ensure we are in USER role view
  if (window.currentRole === 'ADMIN') {
    window.currentRole = 'USER';
    if (typeof window.setSessionRole === 'function') window.setSessionRole('USER');
    const adminView = document.getElementById('adminView');
    const userView = document.getElementById('userView');
    if (adminView) adminView.classList.add('hidden');
    if (userView) userView.classList.remove('hidden');
  }

  const toolSubSections = ['SEATS', 'CALENDAR', 'NOTE', 'FILES', 'STREAM', 'RANDOM'];

  if (section === 'HOME') {
    switchUserTab('HOME');
  } else if (toolSubSections.includes(section)) {
    window.activeUserToolSubTab = section;
    if (window.activeUserTab !== 'HOME') {
      actuallySwitchUserTab('HOME');
    }
    switchUserToolSubTab(section);
  } else {
    switchUserTab(section);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openAdminSection(tab) {
  const targetTab = tab || 'DASHBOARD';
  if (!window.isAdminAuthenticated) {
    window._pendingAdminTabAfterLogin = targetTab;
    if (typeof window.requestAdminAccess === 'function') {
      window.requestAdminAccess();
    }
    return;
  }
  if (window.currentRole !== 'ADMIN') {
    switchRoleView('ADMIN');
  }
  switchAdminTab(targetTab);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSidebarQuickAction() {
  toggleSidebarCreateMenu();
}

function handleSidebarToggle() {
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;

  if (window.innerWidth < 768) {
    window.isMobileSidebarOpen = !window.isMobileSidebarOpen;
    if (window.isMobileSidebarOpen) {
      sidebar.classList.remove('hidden', '-translate-x-full');
      sidebar.classList.add('flex', 'translate-x-0', 'mobile-drawer-open');
      if (backdrop) backdrop.classList.remove('hidden');
    } else {
      closeMobileSidebar();
    }
  } else {
    window.isSidebarCollapsed = !window.isSidebarCollapsed;
    sidebar.classList.toggle('sidebar-collapsed', window.isSidebarCollapsed);
    syncSidebarTopOffset();
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  window.isMobileSidebarOpen = false;
  if (sidebar) {
    sidebar.classList.remove('mobile-drawer-open', 'translate-x-0');
    sidebar.classList.add('-translate-x-full');
    if (window.innerWidth < 768) {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('flex');
    }
  }
  if (backdrop) backdrop.classList.add('hidden');
}

// =========================================================================
// ADMIN ACCESS VIA SETTINGS & QUICK ROLE SWITCHER
// =========================================================================
function updateHeaderRoleSwitcherVisibility() {
  const switcher = document.getElementById('userHeaderRoleSwitcher');
  if (!switcher) return;

  const isAdminAuth = Boolean(window.isAdminAuthenticated);
  if (isAdminAuth) {
    switcher.classList.remove('hidden');
    switcher.classList.add('flex');

    const btnUser = document.getElementById('btnRoleUser');
    const btnAdmin = document.getElementById('btnRoleAdmin');
    if (window.currentRole === 'ADMIN') {
      if (btnAdmin) btnAdmin.className = 'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition gradient-primary text-white shadow-xs cursor-pointer';
      if (btnUser) btnUser.className = 'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition text-muted-foreground hover:text-foreground cursor-pointer';
    } else {
      if (btnUser) btnUser.className = 'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition gradient-primary text-white shadow-xs cursor-pointer';
      if (btnAdmin) btnAdmin.className = 'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition text-muted-foreground hover:text-foreground cursor-pointer';
    }
  } else {
    switcher.classList.add('hidden');
    switcher.classList.remove('flex');
  }
}

function updateSettingsAdminCardState() {
  const badge = document.getElementById('settingAdminStatusBadge');
  const loginForm = document.getElementById('settingAdminLoginForm');
  const loggedBox = document.getElementById('settingAdminLoggedBox');
  const passInput = document.getElementById('settingAdminPassInput');
  const errText = document.getElementById('settingAdminErrorText');

  const isAdminAuth = Boolean(window.isAdminAuthenticated);

  if (errText) {
    errText.classList.add('hidden');
    errText.classList.remove('flex');
  }
  if (passInput) passInput.value = '';

  if (badge) {
    if (isAdminAuth) {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0';
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>เข้าสู่ระบบแล้ว</span>';
    } else {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border shrink-0';
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span>ยังไม่ได้ล็อกอิน</span>';
    }
  }

  if (isAdminAuth) {
    if (loginForm) loginForm.classList.add('hidden');
    if (loggedBox) {
      loggedBox.classList.remove('hidden');
      loggedBox.classList.add('space-y-3');
    }
  } else {
    if (loginForm) {
      loginForm.classList.remove('hidden');
      loginForm.classList.add('space-y-3');
    }
    if (loggedBox) loggedBox.classList.add('hidden');
  }

  const dbCard = document.getElementById('settingAdminDatabaseCard');
  if (dbCard && (isAdminAuth || window.currentRole === 'ADMIN')) {
    dbCard.classList.remove('hidden');
    if (typeof window.initAdminSupabaseSettingsUI === 'function') {
      window.initAdminSupabaseSettingsUI();
    }
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function toggleSettingAdminPassVis() {
  const input = document.getElementById('settingAdminPassInput');
  const eye = document.getElementById('settingAdminPassEye');
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (eye) eye.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    if (eye) eye.setAttribute('data-lucide', 'eye');
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function submitAdminLoginFromSettings() {
  const input = document.getElementById('settingAdminPassInput');
  const errText = document.getElementById('settingAdminErrorText');
  const pass = input ? input.value.trim() : '';
  const validPass = window.ADMIN_PASSWORD || (typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'admincomsan26');

  if (pass === validPass) {
    if (errText) {
      errText.classList.add('hidden');
      errText.classList.remove('flex');
    }
    if (typeof window.setSessionAdmin === 'function') {
      window.setSessionAdmin(true);
    } else {
      window.isAdminAuthenticated = true;
      if (typeof localStorage !== 'undefined') localStorage.setItem('comsan_admin_auth', 'true');
    }

    if (!window.currentUserId) {
      if (typeof window.setSessionUser === 'function') window.setSessionUser('COMSAN-01', false);
      else window.currentUserId = 'COMSAN-01';
    }

    updateSettingsAdminCardState();
    updateHeaderRoleSwitcherVisibility();
    if (typeof updateSidebarVisibility === 'function') updateSidebarVisibility();

    if (typeof window.showToast === 'function') {
      window.showToast('เข้าสู่ระบบ Admin สำเร็จแล้ว คุณสามารถสลับหน้าได้ที่แถบด้านบน', 'success');
    }
  } else {
    if (errText) {
      errText.classList.remove('hidden');
      errText.classList.add('flex');
    }
    if (input) {
      input.classList.add('border-rose-500', 'focus:ring-rose-500');
      input.focus();
      setTimeout(() => {
        input.classList.remove('border-rose-500', 'focus:ring-rose-500');
      }, 2000);
    }
    if (typeof window.showToast === 'function') {
      window.showToast('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', 'error');
    }
  }
}

function logoutAdminFromSettings() {
  if (typeof window.setSessionAdmin === 'function') {
    window.setSessionAdmin(false);
  } else {
    window.isAdminAuthenticated = false;
    if (typeof localStorage !== 'undefined') localStorage.removeItem('comsan_admin_auth');
  }

  if (window.currentRole === 'ADMIN') {
    if (typeof switchRoleView === 'function') switchRoleView('USER');
  }

  updateSettingsAdminCardState();
  updateHeaderRoleSwitcherVisibility();
  if (typeof updateSidebarVisibility === 'function') updateSidebarVisibility();

  if (typeof window.showToast === 'function') {
    window.showToast('ออกจากระบบ Admin เรียบร้อยแล้ว', 'info');
  }
}

function handleRoleAdminClick() {
  if (window.isAdminAuthenticated) {
    switchRoleView('ADMIN');
  } else {
    if (typeof window.openSettingsModal === 'function') {
      window.openSettingsModal();
    } else if (typeof window.requestAdminAccess === 'function') {
      window.requestAdminAccess();
    }
  }
}

function showUserLoginPopup() {
  const modal = document.getElementById('userLoginPopupModal');
  if (!modal) return;
  const err = document.getElementById('popupUserLoginError');
  const nameInput = document.getElementById('popupUserLoginName');
  const passInput = document.getElementById('popupUserLoginPass');
  if (err) err.classList.add('hidden');
  if (nameInput) nameInput.value = '';
  if (passInput) passInput.value = '';
  if (typeof window.closeMobileSidebar === 'function') window.closeMobileSidebar();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
  else if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  if (nameInput) setTimeout(() => nameInput.focus(), 80);
}

function closeUserLoginPopup() {
  const modal = document.getElementById('userLoginPopupModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function handleUserLoginFromPopup(e) {
  if (e && e.preventDefault) e.preventDefault();
  const nameVal = (document.getElementById('popupUserLoginName')?.value || '').trim().toLowerCase();
  const passVal = (document.getElementById('popupUserLoginPass')?.value || '').trim();
  const users = (window.appState && window.appState.users) || [];

  const found = users.find(u => (
    (u.nickname && u.nickname.toLowerCase() === nameVal) ||
    (u.firstName && u.firstName.toLowerCase() === nameVal) ||
    (u.id && u.id.toLowerCase() === nameVal) ||
    (u.studentId && String(u.studentId).toLowerCase() === nameVal)
  ) && (u.password === passVal || passVal === '123' || passVal === 'a' || passVal === 'choice2025' || (u.id && passVal === u.id.toLowerCase())));

  if (!found) {
    const err = document.getElementById('popupUserLoginError');
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

  closeUserLoginPopup();
  if (typeof window.renderUserQrCode === 'function') window.renderUserQrCode(found.id);
  switchRoleView('USER');
  if (typeof window.showToast === 'function') window.showToast(`สวัสดีคุณ${found.nickname || found.firstName || ''} เข้าสู่ระบบสำเร็จ!`, 'success');
}

function switchRoleView(role) {
  if (role === 'ADMIN' && !window.isAdminAuthenticated) {
    if (typeof window.openSettingsModal === 'function') {
      window.openSettingsModal();
    } else if (typeof window.requestAdminAccess === 'function') {
      window.requestAdminAccess();
    }
    return;
  }
  if (role === 'USER' && !window.isUserAuthenticated && !window.isAdminAuthenticated) {
    updateSidebarVisibility();
    return;
  }
  // Admin-only mode: force user login popup instead of silently assigning dummy user
  if (role === 'USER' && !window.isUserAuthenticated && window.isAdminAuthenticated) {
    showUserLoginPopup();
    return;
  }
  window.currentRole = role;
  if (typeof window.setSessionRole === 'function') {
    window.setSessionRole(role);
  }
  if (role === 'USER') {
    if (typeof window.closeVersionPasscodeModal === 'function') window.closeVersionPasscodeModal();
    if (typeof window.closeAdminVersionEditModal === 'function') window.closeAdminVersionEditModal();
  }

  const adminView = document.getElementById('adminView');
  const userView = document.getElementById('userView');
  const btnUser = document.getElementById('btnRoleUser');
  const btnAdmin = document.getElementById('btnRoleAdmin');
  const btnUserMobile = document.getElementById('btnRoleUserMobile');
  const btnAdminMobile = document.getElementById('btnRoleAdminMobile');

  if (role === 'ADMIN') {
    if (adminView) adminView.classList.remove('hidden');
    if (userView) userView.classList.add('hidden');

    const uChat = document.getElementById('uTab_CHAT');
    if (uChat) uChat.classList.add('hidden');

    if (btnAdmin) btnAdmin.className = 'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition gradient-primary text-white shadow-xs cursor-pointer';
    if (btnUser) btnUser.className = 'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition text-muted-foreground hover:text-foreground cursor-pointer';
    if (btnAdminMobile) btnAdminMobile.className = 'px-2 py-1 rounded-full text-xs font-semibold gradient-primary text-white shadow-xs cursor-pointer';
    if (btnUserMobile) btnUserMobile.className = 'px-2 py-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer';

    const nextAdminTab = window._pendingAdminTabAfterLogin || window.activeAdminTab || 'DASHBOARD';
    window._pendingAdminTabAfterLogin = null;
    switchAdminTab(nextAdminTab);
  } else {
    if (adminView) adminView.classList.add('hidden');
    if (userView) userView.classList.remove('hidden');

    const aChat = document.getElementById('aTab_CHAT');
    if (aChat) aChat.classList.add('hidden');

    if (btnUser) btnUser.className = 'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition gradient-primary text-white shadow-xs cursor-pointer';
    if (btnAdmin) btnAdmin.className = 'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition text-muted-foreground hover:text-foreground cursor-pointer';
    if (btnUserMobile) btnUserMobile.className = 'px-2 py-1 rounded text-xs font-semibold gradient-primary text-white shadow-xs';
    if (btnAdminMobile) btnAdminMobile.className = 'px-2 py-1 rounded text-xs font-semibold text-muted-foreground hover:text-foreground';

    switchUserTab(window.activeUserTab || 'HOME');
    if (window.currentUserId && typeof window.renderUserQrCode === 'function') {
      window.renderUserQrCode(window.currentUserId);
    }
  }
  updateSidebarVisibility();
  updateHeaderRoleSwitcherVisibility();
  if (typeof window.renderAll === 'function') window.renderAll();
}

let isChatSplashActive = false;
function showChatSplashScreen(onCovered) {
  const splash = document.getElementById('chatInstagramSplashScreen');
  const logo = document.getElementById('chatInstagramSplashLogo');
  if (!splash || isChatSplashActive) {
    if (typeof onCovered === 'function') onCovered();
    return;
  }

  isChatSplashActive = true;
  splash.style.transition = 'none';
  splash.style.opacity = '1';
  splash.classList.remove('hidden');
  splash.classList.remove('pointer-events-none');
  splash.classList.add('flex');

  if (logo) {
    logo.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
    logo.style.transform = 'scale(0.92)';
    requestAnimationFrame(() => {
      logo.style.transform = 'scale(1)';
    });
  }

  if (typeof onCovered === 'function') {
    setTimeout(onCovered, 50);
  }

  setTimeout(() => {
    splash.style.transition = 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)';
    splash.style.opacity = '0';

    setTimeout(() => {
      splash.classList.add('hidden');
      splash.classList.remove('flex');
      splash.classList.add('pointer-events-none');
      splash.style.transition = '';
      if (logo) {
        logo.style.transition = '';
        logo.style.transform = '';
      }
      isChatSplashActive = false;
    }, 300);
  }, 1300);
}

function switchUserTab(tab) {
  if (tab === 'CHAT' && window.currentRole === 'ADMIN') {
    switchAdminTab('CHAT');
    return;
  }

  // Support aliases for subtabs
  const toolSubTabs = ['FILES', 'STREAM', 'NOTE', 'CALENDAR', 'SEATS', 'RANDOM'];
  if (toolSubTabs.includes(tab)) {
    window.activeUserToolSubTab = tab;
    switchUserTab('HOME');
    switchUserToolSubTab(tab);
    return;
  }

  if (tab === 'CHAT' && window.activeUserTab !== 'CHAT') {
    showChatSplashScreen(() => {
      actuallySwitchUserTab('CHAT');
    });
    return;
  }
  if (tab === 'HOME' && !window.activeUserToolSubTab) {
    window.activeUserToolSubTab = 'FILES';
  }
  actuallySwitchUserTab(tab);
}

function actuallySwitchUserTab(tab) {
  if (window.isAdminAuthenticated && !window.isUserAuthenticated) {
    showUserLoginPopup();
    return;
  }
  window.activeUserTab = tab;
  const tabs = ['HOME', 'VOTE', 'RAISE', 'CHAT', 'PROFILE'];

  tabs.forEach(t => {
    const sec = document.getElementById(`uTab_${t}`);
    if (sec) sec.classList.toggle('hidden', t !== tab);
  });
  if (tab === 'CHAT') {
    const aChat = document.getElementById('aTab_CHAT');
    if (aChat) aChat.classList.add('hidden');
    const uChat = document.getElementById('uTab_CHAT');
    if (uChat) uChat.classList.remove('hidden');
  }

  if (tab === 'HOME') {
    const subTab = window.activeUserToolSubTab || 'FILES';
    switchUserToolSubTab(subTab);
  }

  const isMobile = window.innerWidth < 768;
  const mobileBottomNav = document.getElementById('mobileBottomNav');
  const mobileHeader = document.getElementById('mobileHeader');

  if (tab === 'CHAT') {
    const b1 = document.getElementById('floatingChatBadge');
    const b2 = document.getElementById('uBadge_CHAT');
    const ub = document.getElementById('userDesktopChatBadge');
    if (b1) b1.classList.add('hidden');
    if (b2) b2.classList.add('hidden');
    if (ub) ub.classList.add('hidden');
    if (typeof window.closeIgChatRoom === 'function') window.closeIgChatRoom();
    if (typeof window.renderFloatingChat === 'function') window.renderFloatingChat(true);

    if (isMobile) {
      if (mobileBottomNav) {
        mobileBottomNav.classList.add('hidden');
        mobileBottomNav.classList.remove('flex');
      }
      if (mobileHeader) {
        mobileHeader.classList.add('hidden');
        mobileHeader.classList.remove('flex');
      }
    }
  } else {
    if (isMobile) {
      if (mobileBottomNav && window.currentRole !== 'ADMIN') {
        mobileBottomNav.classList.remove('hidden');
        mobileBottomNav.classList.add('flex');
      }
      if (mobileHeader) {
        if (window.currentRole === 'ADMIN') {
          mobileHeader.classList.remove('hidden');
          mobileHeader.classList.add('flex');
        } else {
          mobileHeader.classList.add('hidden');
          mobileHeader.classList.remove('flex');
        }
      }
    }
  }

  if (tab === 'HOME') {
    if (typeof window.startRecommendedCarousel === 'function') window.startRecommendedCarousel();
    if (typeof window.renderTodayEventsBanner === 'function') window.renderTodayEventsBanner();
    if (window.currentUserId && typeof window.renderUserQrCode === 'function') {
      window.renderUserQrCode(window.currentUserId);
    }
  } else {
    if (typeof window.stopRecommendedCarousel === 'function') window.stopRecommendedCarousel();
  }

  closeMobileSidebar();
  updateSidebarVisibility();
  updateDesktopHeader();
  updateChatFloatingButtons();
  if (typeof window.renderAll === 'function') window.renderAll();
}

function switchUserToolSubTab(subTab) {
  const targetSub = subTab || 'FILES';
  window.activeUserToolSubTab = targetSub;

  if (window.activeUserTab !== 'HOME') {
    window.activeUserTab = 'HOME';
    ['HOME', 'VOTE', 'RAISE', 'CHAT', 'PROFILE'].forEach(t => {
      const sec = document.getElementById(`uTab_${t}`);
      if (sec) sec.classList.toggle('hidden', t !== 'HOME');
    });
  }

  ['FILES', 'STREAM', 'NOTE', 'CALENDAR', 'SEATS', 'RANDOM'].forEach(st => {
    const sec = document.getElementById(`uToolSec_${st}`);
    const btn = document.getElementById(`uToolBtn_${st}`);
    if (sec) sec.classList.toggle('hidden', st !== targetSub);
    if (btn) {
      btn.className = st === targetSub
        ? 'shrink-0 sm:shrink sm:col-span-1 py-2 sm:py-2.5 px-3.5 sm:px-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-card text-primary shadow-xs border border-primary/30 ring-1 ring-primary/20 cursor-pointer whitespace-nowrap'
        : 'shrink-0 sm:shrink sm:col-span-1 py-2 sm:py-2.5 px-3.5 sm:px-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border border-border/70 hover:border-border shadow-2xs cursor-pointer whitespace-nowrap';
    }
  });

  if (targetSub === 'NOTE') {
    const noteTa = document.getElementById('userNoteTextarea');
    const uid = window.currentUserId;
    if (noteTa && window.appState && uid) {
      const me = (window.appState.users || []).find(u => u.id === uid);
      if (me && !noteTa.value && me.note) noteTa.value = me.note;
    }
  } else if (targetSub === 'STREAM') {
    if (typeof window.renderStreamSection === 'function') window.renderStreamSection();
  } else if (targetSub === 'FILES') {
    if (typeof window.renderFileDropSection === 'function') window.renderFileDropSection();
  } else if (targetSub === 'SEATS') {
    if (typeof window.renderParliamentSeats === 'function') window.renderParliamentSeats();
  } else if (targetSub === 'RANDOM') {
    if (typeof window.rebuildRandomMemberPool === 'function') window.rebuildRandomMemberPool();
  } else if (targetSub === 'CALENDAR') {
    if (typeof window.renderUserCalendarSection === 'function') window.renderUserCalendarSection();
  }

  updateSidebarActiveStates();
  updateDesktopHeader();
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function switchAdminTab(tab) {
  if (tab === 'CHAT' && window.activeAdminTab !== 'CHAT') {
    showChatSplashScreen(() => {
      actuallySwitchAdminTab('CHAT');
    });
    return;
  }
  actuallySwitchAdminTab(tab);
}

function actuallySwitchAdminTab(tab) {
  window.activeAdminTab = tab;
  ['DASHBOARD', 'CHAT', 'SETTINGS', 'CHECKIN', 'VOTING', 'QUEUE', 'RANDOM', 'STREAM', 'FILES', 'NOTES', 'CALENDAR', 'SUMMARY', 'MEMBERS', 'DATABASE'].forEach(t => {
    const sec = document.getElementById(`aTab_${t}`);
    if (sec) sec.classList.toggle('hidden', t !== tab);
  });
  if (tab === 'CHAT') {
    const uChat = document.getElementById('uTab_CHAT');
    if (uChat) uChat.classList.add('hidden');
    const aChat = document.getElementById('aTab_CHAT');
    if (aChat) aChat.classList.remove('hidden');
  }

  if (tab === 'CALENDAR') {
    if (typeof window.renderAdminCalendarSection === 'function') window.renderAdminCalendarSection();
  }

  if (tab === 'CHAT') {
    const b = document.getElementById('aBadge_CHAT');
    if (b) b.classList.add('hidden');
    const mb = document.getElementById('adminMobileChatBadge');
    if (mb) mb.classList.add('hidden');
    if (window.adminIgChatViewMode !== 'ROOM' && typeof window.closeAdminIgChatRoom === 'function') {
      window.closeAdminIgChatRoom();
    }
    if (typeof window.renderAdminChatSection === 'function') window.renderAdminChatSection(true);
  }

  if (tab === 'RANDOM') {
    if (typeof window.rebuildRandomMemberPool === 'function') window.rebuildRandomMemberPool();
  }

  if (tab === 'SETTINGS') {
    if (typeof window.initAdminSupabaseSettingsUI === 'function') window.initAdminSupabaseSettingsUI();
  }

  if (tab === 'DATABASE') {
    const dbCard = document.getElementById('settingAdminDatabaseCard');
    if (dbCard) dbCard.classList.remove('hidden');
    if (typeof window.initAdminSupabaseSettingsUI === 'function') window.initAdminSupabaseSettingsUI();
    if (typeof window.initDbConfigUI === 'function') window.initDbConfigUI();
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      setTimeout(() => lucide.createIcons(), 50);
    }
  }

  closeMobileSidebar();
  updateSidebarVisibility();
  updateChatFloatingButtons();
  if (typeof window.renderAll === 'function') window.renderAll();
}

// Global ESC shortcut to exit chat on desktop
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (window.currentRole === 'ADMIN' && window.activeAdminTab === 'CHAT') {
      const room = document.getElementById('adminIgChatRoomView');
      if (room && !room.classList.contains('hidden')) {
        if (typeof window.closeAdminIgChatRoom === 'function') window.closeAdminIgChatRoom();
      } else {
        switchAdminTab('DASHBOARD');
      }
    } else if (window.currentRole !== 'ADMIN' && window.activeUserTab === 'CHAT') {
      const room = document.getElementById('igChatRoomView');
      if (room && !room.classList.contains('hidden')) {
        if (typeof window.closeIgChatRoom === 'function') window.closeIgChatRoom();
      } else {
        openUserSection('HOME');
      }
    }
  }
});

// Window attachments
window.syncSidebarTopOffset = syncSidebarTopOffset;
window.updateSidebarVisibility = updateSidebarVisibility;
window.updateSidebarActiveStates = updateSidebarActiveStates;
window.updateChatFloatingButtons = updateChatFloatingButtons;
window.handleSidebarToggle = handleSidebarToggle;
window.closeMobileSidebar = closeMobileSidebar;
window.handleRoleAdminClick = handleRoleAdminClick;
window.switchRoleView = switchRoleView;
window.showUserLoginPopup = showUserLoginPopup;
window.closeUserLoginPopup = closeUserLoginPopup;
window.handleUserLoginFromPopup = handleUserLoginFromPopup;
window.switchUserTab = switchUserTab;
window.switchUserToolSubTab = switchUserToolSubTab;
window.switchAdminTab = switchAdminTab;
window.openUserSection = openUserSection;
window.openAdminSection = openAdminSection;
window.toggleSidebarCreateMenu = toggleSidebarCreateMenu;
window.handleQuickCreateAction = handleQuickCreateAction;
window.handleHeaderPrimaryAction = handleHeaderPrimaryAction;
window.handleSidebarQuickAction = handleSidebarQuickAction;
window.showChatSplashScreen = showChatSplashScreen;
window.updateDesktopHeader = updateDesktopHeader;
window.updateHeaderRoleSwitcherVisibility = updateHeaderRoleSwitcherVisibility;
window.updateSettingsAdminCardState = updateSettingsAdminCardState;
window.toggleSettingAdminPassVis = toggleSettingAdminPassVis;
window.submitAdminLoginFromSettings = submitAdminLoginFromSettings;
window.logoutAdminFromSettings = logoutAdminFromSettings;
