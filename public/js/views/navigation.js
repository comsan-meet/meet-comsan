/**
 * COMSAN Meeting System - Navigation View Controller
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
  const isDesktop = window.innerWidth >= 768;
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
      if (isDesktop && window.activeUserTab !== 'CHAT') {
        userFloatBtn.classList.remove('hidden');
      } else {
        userFloatBtn.classList.add('hidden');
      }
    }
  }
}

function updateSidebarVisibility() {
  const sidebar = document.getElementById('appSidebar');
  const topToggleBtn = document.getElementById('topSidebarToggleBtn');
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

  // 1. ถ้ายังไม่ได้เข้าสู่ระบบ (หน้า Auth / Login)
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

  // 2. เมื่อเข้าสู่ระบบแล้ว
  if (authScreen) authScreen.classList.add('hidden');
  if (appLayout) {
    appLayout.classList.remove('hidden');
    appLayout.classList.add('flex');
  }

  const quickActionBtn = document.getElementById('sidebarQuickActionBtn');

  // สลับชุดเมนูให้ตรงกับบทบาท (USER / ADMIN)
  if (window.currentRole === 'ADMIN') {
    if (sidebarAdmin) sidebarAdmin.classList.remove('hidden');
    if (sidebarUser) sidebarUser.classList.add('hidden');
    if (quickActionBtn) quickActionBtn.classList.remove('hidden');
  } else {
    if (sidebarUser) sidebarUser.classList.remove('hidden');
    if (sidebarAdmin) sidebarAdmin.classList.add('hidden');
    if (quickActionBtn) quickActionBtn.classList.add('hidden');
  }

  const btnMobileSidebar = document.getElementById('btnMobileSidebarToggle');

  if (isDesktop) {
    // DESKTOP: แสดง Sidebar ติดซ้าย sticky h-screen และแสดง Desktop Header
    if (mobileHeader) {
      mobileHeader.classList.add('hidden');
      mobileHeader.classList.remove('flex');
    }
    if (mobileBottomNav) {
      mobileBottomNav.classList.add('hidden');
      mobileBottomNav.classList.remove('flex');
    }

    const isChatActive = (window.currentRole === 'ADMIN' && window.activeAdminTab === 'CHAT') ||
                         (window.currentRole !== 'ADMIN' && window.activeUserTab === 'CHAT');

    if (isChatActive) {
      if (desktopHeader) {
        desktopHeader.classList.add('hidden');
        desktopHeader.classList.remove('flex', 'md:flex');
      }
      if (sidebar) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex', 'md:flex');
      }
    } else {
      if (desktopHeader) {
        desktopHeader.classList.remove('hidden');
        desktopHeader.classList.add('flex', 'md:flex');
      }
      if (sidebar) {
        sidebar.classList.remove('hidden', '-translate-x-full', 'mobile-drawer-open');
        sidebar.classList.add('flex', 'md:flex', 'translate-x-0');
        sidebar.classList.toggle('sidebar-collapsed', !!window.isSidebarCollapsed);
      }
    }
    if (backdrop) backdrop.classList.add('hidden');
  } else {
    // MOBILE: ซ่อน Desktop Header, แสดง Mobile Header, สลับ Bottom Bar ตามบทบาท
    if (sidebar) sidebar.classList.remove('sidebar-collapsed');
    if (desktopHeader) {
      desktopHeader.classList.add('hidden');
      desktopHeader.classList.remove('flex');
    }
    if (mobileHeader) {
      mobileHeader.classList.remove('hidden');
      mobileHeader.classList.add('flex');
    }

    if (window.currentRole === 'ADMIN') {
      if (window.activeAdminTab === 'CHAT') {
        if (mobileHeader) {
          mobileHeader.classList.add('hidden');
          mobileHeader.classList.remove('flex');
        }
      } else {
        if (mobileHeader) {
          mobileHeader.classList.remove('hidden');
          mobileHeader.classList.add('flex');
        }
      }
      // 1. ADMIN ON MOBILE: แสดงปุ่ม Hamburger Menu บน Header
      if (btnMobileSidebar) {
        btnMobileSidebar.classList.remove('hidden');
        btnMobileSidebar.classList.add('flex');
      }
      // ซ่อน Bottom Bar ในหน้า Admin
      if (mobileBottomNav) {
        mobileBottomNav.classList.add('hidden');
        mobileBottomNav.classList.remove('flex');
      }

      if (sidebar) {
        if (window.isMobileSidebarOpen) {
          sidebar.classList.remove('hidden', '-translate-x-full');
          sidebar.classList.add('flex', 'translate-x-0', 'mobile-drawer-open');
          if (backdrop) backdrop.classList.remove('hidden');
        } else {
          sidebar.classList.add('-translate-x-full', 'hidden');
          sidebar.classList.remove('translate-x-0', 'mobile-drawer-open', 'flex');
          if (backdrop) backdrop.classList.add('hidden');
        }
      }
    } else {
      // 2. USER ON MOBILE:
      if (btnMobileSidebar) {
        btnMobileSidebar.classList.add('hidden');
        btnMobileSidebar.classList.remove('flex');
      }

      // ผู้ใช้งานใช้ Mobile Bottom Bar นำทาง
      if (mobileBottomNav) {
        if (window.activeUserTab === 'CHAT') {
          mobileBottomNav.classList.add('hidden');
          mobileBottomNav.classList.remove('flex');
        } else {
          mobileBottomNav.classList.remove('hidden');
          mobileBottomNav.classList.add('flex');
        }
      }
      if (mobileHeader) {
        if (window.activeUserTab === 'CHAT') {
          mobileHeader.classList.add('hidden');
          mobileHeader.classList.remove('flex');
        } else {
          mobileHeader.classList.remove('hidden');
          mobileHeader.classList.add('flex');
        }
      }

      // ปิดและซ่อน Sidebar สำหรับ User บนมือถือเสมอ
      window.isMobileSidebarOpen = false;
      if (sidebar) {
        sidebar.classList.add('-translate-x-full', 'hidden');
        sidebar.classList.remove('translate-x-0', 'mobile-drawer-open', 'flex');
      }
      if (backdrop) backdrop.classList.add('hidden');
    }
  }

  updateSidebarProfile();
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

  if (window.currentRole === 'ADMIN') {
    nameEl.textContent = 'Meeting Official';
    if (roleEl) roleEl.textContent = 'ผู้ดูแลระบบ (Admin)';
    if (initialEl) initialEl.textContent = 'A';
    if (avatarContainer && typeof window.updateAvatarElement === 'function') {
      window.updateAvatarElement(avatarContainer, { nickname: 'Admin', id: 'admin' });
    }
    if (verified) verified.classList.remove('hidden');
    return;
  }

  const userId = window.currentUserId;
  const state = window.appState;
  const me = state && (state.users || []).find(u => u.id === userId);

  if (me) {
    nameEl.textContent = me.nickname ? `${me.nickname} (${me.firstName})` : me.id;
    if (roleEl) roleEl.textContent = me.position ? `${me.position}` : 'ผู้เข้าร่วมประชุม';
    if (initialEl) initialEl.textContent = (me.nickname || me.firstName || 'U').charAt(0);
    if (avatarContainer && typeof window.updateAvatarElement === 'function') {
      window.updateAvatarElement(avatarContainer, me);
    }
    if (verified) {
      if (me.position && (me.position.includes('ประธาน') || me.position.includes('เลขา') || me.position.includes('Official'))) {
        verified.classList.remove('hidden');
      } else {
        verified.classList.add('hidden');
      }
    }
  } else {
    nameEl.textContent = 'ผู้ใช้งาน';
    if (roleEl) roleEl.textContent = 'ผู้เข้าร่วมประชุม';
    if (initialEl) initialEl.textContent = 'U';
    if (avatarContainer && typeof window.updateAvatarElement === 'function') {
      window.updateAvatarElement(avatarContainer, 'U');
    }
    if (verified) verified.classList.add('hidden');
  }
}

function updateDesktopHeader() {
  const titleEl = document.getElementById('desktopHeadingTitle');
  const subEl = document.getElementById('desktopHeadingSubtitle');
  if (!titleEl) return;

  if (window.currentRole === 'ADMIN' && window.isAdminAuthenticated) {
    titleEl.textContent = 'ระบบจัดการประชุม (Admin)';
    if (subEl) subEl.textContent = 'แผงควบคุมและดูแลการประชุม • คมสัน';
    return;
  }

  const userId = window.currentUserId;
  const state = window.appState;
  const me = state && (state.users || []).find(u => u.id === userId);

  if (me) {
    const nick = (me.nickname || me.firstName || 'สมาชิก').trim();
    titleEl.textContent = `สวัสดีคุณ${nick}`;
    if (subEl) subEl.textContent = 'ระบบจัดการประชุม • คมสัน';
  } else {
    titleEl.textContent = 'Meeting';
    if (subEl) subEl.textContent = 'ระบบจัดการประชุม • คมสัน';
  }
}

function handleSidebarQuickAction() {
  if (window.currentRole === 'ADMIN') {
    if (typeof window.switchAdminTab === 'function') {
      window.switchAdminTab('VOTING');
    }
    if (typeof showToast === 'function') {
      showToast('เปิดหน้าจัดการวาระและการลงมติ', 'info');
    }
  } else {
    if (typeof window.triggerRaiseHand === 'function') {
      window.triggerRaiseHand();
    }
  }
}

function handleSidebarToggle() {
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;

  if (window.innerWidth < 768) {
    if (window.currentRole !== 'ADMIN') {
      closeMobileSidebar();
      return;
    }
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

function handleRoleAdminClick() {
  if (window.isAdminAuthenticated) {
    switchRoleView('ADMIN');
  } else {
    if (typeof window.requestAdminAccess === 'function') {
      window.requestAdminAccess();
    }
  }
}

function switchRoleView(role) {
  if (role === 'ADMIN' && !window.isAdminAuthenticated) {
    if (typeof window.requestAdminAccess === 'function') {
      window.requestAdminAccess();
    }
    return;
  }
  if (role === 'USER' && !window.isUserAuthenticated && !window.isAdminAuthenticated) {
    if (typeof window.updateSidebarVisibility === 'function') {
      window.updateSidebarVisibility();
    }
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

  // If an authenticated admin switches to USER but no user ID is active, assign default persona so user UI functions for preview
  if (role === 'USER' && !window.currentUserId && window.isAdminAuthenticated) {
    if (typeof window.setSessionUser === 'function') {
      window.setSessionUser('COMSAN-01', false);
    } else {
      window.currentUserId = 'COMSAN-01';
    }
  }

  const adminView = document.getElementById('adminView');
  const userView = document.getElementById('userView');
  const sidebarUser = document.getElementById('sidebarUserMenu');
  const sidebarAdmin = document.getElementById('sidebarAdminMenu');
  const btnUser = document.getElementById('btnRoleUser');
  const btnAdmin = document.getElementById('btnRoleAdmin');
  const btnUserMobile = document.getElementById('btnRoleUserMobile');
  const btnAdminMobile = document.getElementById('btnRoleAdminMobile');

  if (role === 'ADMIN') {
    if (adminView) adminView.classList.remove('hidden');
    if (userView) userView.classList.add('hidden');
    if (sidebarAdmin) sidebarAdmin.classList.remove('hidden');
    if (sidebarUser) sidebarUser.classList.add('hidden');

    // Desktop Buttons
    if (btnAdmin) btnAdmin.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition gradient-primary text-white shadow-xs';
    if (btnUser) btnUser.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition text-muted-foreground hover:text-foreground';

    // Mobile Buttons
    if (btnAdminMobile) btnAdminMobile.className = 'px-2 py-1 rounded text-xs font-semibold gradient-primary text-white shadow-xs';
    if (btnUserMobile) btnUserMobile.className = 'px-2 py-1 rounded text-xs font-semibold text-muted-foreground hover:text-foreground';

    switchAdminTab(window.activeAdminTab || 'DASHBOARD');
  } else {
    if (adminView) adminView.classList.add('hidden');
    if (userView) userView.classList.remove('hidden');
    if (sidebarUser) sidebarUser.classList.remove('hidden');
    if (sidebarAdmin) sidebarAdmin.classList.add('hidden');

    // Desktop Buttons
    if (btnUser) btnUser.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition gradient-primary text-white shadow-xs';
    if (btnAdmin) btnAdmin.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition text-muted-foreground hover:text-foreground';

    // Mobile Buttons
    if (btnUserMobile) btnUserMobile.className = 'px-2 py-1 rounded text-xs font-semibold gradient-primary text-white shadow-xs';
    if (btnAdminMobile) btnAdminMobile.className = 'px-2 py-1 rounded text-xs font-semibold text-muted-foreground hover:text-foreground';

    switchUserTab(window.activeUserTab || 'HOME');
    if (window.currentUserId && typeof window.renderUserQrCode === 'function') {
      window.renderUserQrCode(window.currentUserId);
    }
  }
  updateSidebarVisibility();
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

  // 1. Immediately cover screen with 100% opacity - NO entrance transition lag!
  splash.style.transition = 'none';
  splash.style.opacity = '1';
  splash.classList.remove('hidden');
  splash.classList.remove('pointer-events-none');
  splash.classList.add('flex');

  // Subtle logo scale animation
  if (logo) {
    logo.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
    logo.style.transform = 'scale(0.92)';
    requestAnimationFrame(() => {
      logo.style.transform = 'scale(1)';
    });
  }

  // 2. Perform tab switch safely behind the opaque splash
  if (typeof onCovered === 'function') {
    setTimeout(onCovered, 50);
  }

  // 3. Hold for 1.3 seconds as requested, then fade out smoothly
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
  if (tab === 'CHAT' && window.activeUserTab !== 'CHAT') {
    showChatSplashScreen(() => {
      actuallySwitchUserTab('CHAT');
    });
    return;
  }
  actuallySwitchUserTab(tab);
}

function actuallySwitchUserTab(tab) {
  if (!window.currentUserId && window.isAdminAuthenticated) {
    if (typeof window.setSessionUser === 'function') {
      window.setSessionUser('COMSAN-01', false);
    } else {
      window.currentUserId = 'COMSAN-01';
    }
  }
  window.activeUserTab = tab;
  const tabs = ['HOME', 'VOTE', 'RAISE', 'CHAT', 'PROFILE'];

  tabs.forEach(t => {
    const sec = document.getElementById(`uTab_${t}`);
    if (sec) sec.classList.toggle('hidden', t !== tab);

    // Desktop Sidebar Button (Exact Comsan Choice style)
    const dNav = document.getElementById(`uNav_${t}`);
    if (dNav) {
      dNav.className = t === tab
        ? 'sidebar-nav-btn w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold bg-primary/[0.06] text-primary transition-colors group cursor-pointer'
        : 'sidebar-nav-btn w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors group cursor-pointer';
    }

    // Mobile Bottom Bar Button & Pill (Exact Comsan Choice style)
    if (t !== 'RAISE') {
      const mBtn = document.getElementById(`mNav_${t}`);
      const mPill = document.getElementById(`mNavPill_${t}`);
      if (mBtn) {
        mBtn.className = t === tab
          ? 'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all h-full text-primary'
          : 'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all h-full text-muted-foreground hover:text-foreground';
      }
      if (mPill) {
        mPill.className = 'relative flex items-center justify-center';
      }
    }
  });

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
        mobileHeader.classList.remove('hidden');
        mobileHeader.classList.add('flex');
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
  updateChatFloatingButtons();
  if (typeof window.renderAll === 'function') window.renderAll();
}

function switchUserToolSubTab(subTab) {
  window.activeUserToolSubTab = subTab;
  ['FILES', 'STREAM', 'NOTE', 'CALENDAR', 'SEATS', 'RANDOM'].forEach(st => {
    const sec = document.getElementById(`uToolSec_${st}`);
    const btn = document.getElementById(`uToolBtn_${st}`);
    if (sec) sec.classList.toggle('hidden', st !== subTab);
    if (btn) {
      btn.className = st === subTab
        ? 'col-span-2 sm:col-span-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-card text-primary shadow-xs border border-primary/30 ring-1 ring-primary/20'
        : 'col-span-2 sm:col-span-1 py-2.5 px-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border border-border/70 hover:border-border shadow-2xs';
    }
  });

  if (subTab === 'NOTE') {
    const noteTa = document.getElementById('userNoteTextarea');
    const uid = window.currentUserId;
    if (noteTa && window.appState && uid) {
      const me = (window.appState.users || []).find(u => u.id === uid);
      if (me && !noteTa.value && me.note) noteTa.value = me.note;
    }
  } else if (subTab === 'STREAM') {
    if (typeof window.renderStreamSection === 'function') window.renderStreamSection();
  } else if (subTab === 'FILES') {
    if (typeof window.renderFileDropSection === 'function') window.renderFileDropSection();
  } else if (subTab === 'SEATS') {
    if (typeof window.renderParliamentSeats === 'function') window.renderParliamentSeats();
  } else if (subTab === 'RANDOM') {
    if (typeof window.rebuildRandomMemberPool === 'function') window.rebuildRandomMemberPool();
  } else if (subTab === 'CALENDAR') {
    if (typeof window.renderUserCalendarSection === 'function') window.renderUserCalendarSection();
  }
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
  ['DASHBOARD', 'CHAT', 'SETTINGS', 'CHECKIN', 'VOTING', 'QUEUE', 'RANDOM', 'STREAM', 'FILES', 'NOTES', 'CALENDAR', 'SUMMARY', 'MEMBERS'].forEach(t => {
    const sec = document.getElementById(`aTab_${t}`);
    const nav = document.getElementById(`aNav_${t}`);
    if (sec) sec.classList.toggle('hidden', t !== tab);
    if (nav) {
      nav.className = t === tab
        ? 'sidebar-nav-btn w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold bg-primary/[0.06] text-primary transition-colors group cursor-pointer'
        : 'sidebar-nav-btn w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors group cursor-pointer';
    }
  });

  if (tab === 'CALENDAR') {
    if (typeof window.renderAdminCalendarSection === 'function') window.renderAdminCalendarSection();
  }

  const isMobile = window.innerWidth < 768;
  const mobileHeader = document.getElementById('mobileHeader');

  if (tab === 'CHAT') {
    const b = document.getElementById('aBadge_CHAT');
    if (b) b.classList.add('hidden');
    const mb = document.getElementById('adminMobileChatBadge');
    if (mb) mb.classList.add('hidden');

    if (isMobile && mobileHeader) {
      mobileHeader.classList.add('hidden');
    }
    if (typeof window.closeAdminIgChatRoom === 'function') window.closeAdminIgChatRoom();
    if (typeof window.renderAdminChatSection === 'function') window.renderAdminChatSection(true);
  } else {
    if (isMobile && mobileHeader && window.currentRole === 'ADMIN') {
      mobileHeader.classList.remove('hidden');
      mobileHeader.classList.add('flex');
    }
  }
  if (tab === 'RANDOM') {
    if (typeof window.rebuildRandomMemberPool === 'function') window.rebuildRandomMemberPool();
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
        switchUserTab('HOME');
      }
    }
  }
});

// Window attachments
window.syncSidebarTopOffset = syncSidebarTopOffset;
window.updateSidebarVisibility = updateSidebarVisibility;
window.updateChatFloatingButtons = updateChatFloatingButtons;
window.handleSidebarToggle = handleSidebarToggle;
window.closeMobileSidebar = closeMobileSidebar;
window.handleRoleAdminClick = handleRoleAdminClick;
window.switchRoleView = switchRoleView;
window.switchUserTab = switchUserTab;
window.switchUserToolSubTab = switchUserToolSubTab;
window.switchAdminTab = switchAdminTab;
window.showChatSplashScreen = showChatSplashScreen;
window.updateDesktopHeader = updateDesktopHeader;
