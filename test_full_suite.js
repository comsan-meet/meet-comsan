const puppeteer = require('c:/Users/NBODT/Desktop/CS-MEETING 2/comsan meeting server/node_modules/puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('cdn.tailwindcss.com') && !text.includes('autocomplete attributes')) {
      console.log('PAGE LOG:', text);
    }
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('=== TEST SUITE 1: DESKTOP WORKSPACE & TOOLBAR BUTTONS ===');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  const desktopInitialState = await page.evaluate(() => {
    const h = document.getElementById('desktopMainHeader');
    const s = document.getElementById('appSidebar');
    const auth = document.getElementById('authScreen');
    const app = document.getElementById('appLayout');
    return {
      authScreenDisplay: window.getComputedStyle(auth).display,
      appLayoutDisplay: window.getComputedStyle(app).display,
      headerDisplay: window.getComputedStyle(h).display,
      headerHeight: h.offsetHeight,
      sidebarDisplay: window.getComputedStyle(s).display,
      sidebarWidth: s.offsetWidth,
      currentRole: window.currentRole,
      currentUserId: window.currentUserId
    };
  });
  console.log('Desktop Initial State:', desktopInitialState);

  // 1. Test clicking [ สมุดจด ]
  console.log('Testing click #uToolBtn_NOTE...');
  await page.click('#uToolBtn_NOTE');
  await new Promise(r => setTimeout(r, 300));
  const noteState = await page.evaluate(() => {
    const sec = document.getElementById('uToolSec_NOTE');
    const ta = document.getElementById('userNoteTextarea');
    return {
      noteSecDisplay: window.getComputedStyle(sec).display,
      noteSecHidden: sec.classList.contains('hidden'),
      activeSubTab: window.activeUserToolSubTab,
      noteTextareaExists: Boolean(ta)
    };
  });
  console.log('Note subtab check:', noteState);

  // 2. Test clicking [ แชร์หน้าจอ ]
  console.log('Testing click #uToolBtn_STREAM...');
  await page.click('#uToolBtn_STREAM');
  await new Promise(r => setTimeout(r, 300));
  const streamState = await page.evaluate(() => {
    const sec = document.getElementById('uToolSec_STREAM');
    const permBox = document.getElementById('userStreamPermissionBox');
    return {
      streamSecDisplay: window.getComputedStyle(sec).display,
      streamSecHidden: sec.classList.contains('hidden'),
      activeSubTab: window.activeUserToolSubTab,
      permBoxContent: permBox ? permBox.innerHTML.trim() : ''
    };
  });
  console.log('Stream subtab check:', streamState);

  // 3. Test clicking [ เอกสาร ]
  console.log('Testing click #uToolBtn_FILES...');
  await page.click('#uToolBtn_FILES');
  await new Promise(r => setTimeout(r, 300));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_desktop_toolbar_fixed.png') });

  console.log('=== TEST SUITE 2: DESKTOP ROLE SWITCH TO ADMIN & BACK ===');
  await page.click('#btnRoleAdmin');
  await new Promise(r => setTimeout(r, 400));

  // Type admin password in modal
  await page.type('#adminPassInput', 'admincomsan26');
  await page.click('#adminLoginModal button[type="submit"]');
  await new Promise(r => setTimeout(r, 600));

  const adminDesktopState = await page.evaluate(() => {
    const aView = document.getElementById('adminView');
    const uView = document.getElementById('userView');
    const h = document.getElementById('desktopMainHeader');
    const s = document.getElementById('appSidebar');
    const sAdmin = document.getElementById('sidebarAdminMenu');
    return {
      currentRole: window.currentRole,
      isAdminAuthenticated: window.isAdminAuthenticated,
      adminViewDisplay: window.getComputedStyle(aView).display,
      userViewDisplay: window.getComputedStyle(uView).display,
      headerDisplay: window.getComputedStyle(h).display,
      sidebarDisplay: window.getComputedStyle(s).display,
      sidebarAdminVisible: !sAdmin.classList.contains('hidden')
    };
  });
  console.log('Admin Desktop State:', adminDesktopState);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_desktop_admin_view.png') });

  // Switch back to User
  console.log('Switching back to USER via #btnRoleUser...');
  await page.click('#btnRoleUser');
  await new Promise(r => setTimeout(r, 500));

  const afterSwitchBackState = await page.evaluate(() => {
    const aView = document.getElementById('adminView');
    const uView = document.getElementById('userView');
    const h = document.getElementById('desktopMainHeader');
    const s = document.getElementById('appSidebar');
    return {
      currentRole: window.currentRole,
      adminViewDisplay: window.getComputedStyle(aView).display,
      userViewDisplay: window.getComputedStyle(uView).display,
      headerDisplay: window.getComputedStyle(h).display,
      sidebarDisplay: window.getComputedStyle(s).display
    };
  });
  console.log('After switch back to USER:', afterSwitchBackState);

  console.log('=== TEST SUITE 3: BROWSER REFRESH PERSISTENCE ===');
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  const reloadState = await page.evaluate(() => {
    const h = document.getElementById('desktopMainHeader');
    const s = document.getElementById('appSidebar');
    const auth = document.getElementById('authScreen');
    const app = document.getElementById('appLayout');
    return {
      authDisplay: window.getComputedStyle(auth).display,
      appDisplay: window.getComputedStyle(app).display,
      headerDisplay: window.getComputedStyle(h).display,
      sidebarDisplay: window.getComputedStyle(s).display,
      currentRole: window.currentRole,
      currentUserId: window.currentUserId,
      isAdminAuthenticated: window.isAdminAuthenticated
    };
  });
  console.log('Reload State:', reloadState);

  console.log('=== TEST SUITE 4: MOBILE VIEWPORT & ADMIN SWITCH ===');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 500));

  const mobileUserState = await page.evaluate(() => {
    const mHead = document.getElementById('mobileHeader');
    const mBottom = document.getElementById('mobileBottomNav');
    const dHead = document.getElementById('desktopMainHeader');
    return {
      mobileHeaderDisplay: window.getComputedStyle(mHead).display,
      mobileBottomNavDisplay: window.getComputedStyle(mBottom).display,
      desktopHeaderDisplay: window.getComputedStyle(dHead).display,
      currentRole: window.currentRole
    };
  });
  console.log('Mobile User State:', mobileUserState);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_mobile_user_view.png') });

  // Switch to admin on mobile
  console.log('Tapping admin switch on mobile...');
  await page.click('#btnRoleAdminMobile');
  await new Promise(r => setTimeout(r, 600));

  const mobileAdminState = await page.evaluate(() => {
    const aView = document.getElementById('adminView');
    const uView = document.getElementById('userView');
    const mHead = document.getElementById('mobileHeader');
    const mBottom = document.getElementById('mobileBottomNav');
    const hamburger = document.getElementById('btnMobileSidebarToggle');
    return {
      currentRole: window.currentRole,
      isAdminAuthenticated: window.isAdminAuthenticated,
      adminViewDisplay: window.getComputedStyle(aView).display,
      userViewDisplay: window.getComputedStyle(uView).display,
      mobileHeaderDisplay: window.getComputedStyle(mHead).display,
      mobileBottomNavDisplay: window.getComputedStyle(mBottom).display,
      hamburgerDisplay: window.getComputedStyle(hamburger).display
    };
  });
  console.log('Mobile Admin State:', mobileAdminState);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_mobile_admin_view.png') });

  // Open mobile drawer and check chat logs modal
  console.log('Opening mobile sidebar drawer...');
  await page.click('#btnMobileSidebarToggle');
  await new Promise(r => setTimeout(r, 400));

  const drawerState = await page.evaluate(() => {
    const s = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    return {
      sidebarDisplay: window.getComputedStyle(s).display,
      backdropDisplay: window.getComputedStyle(backdrop).display,
      sidebarClasses: Array.from(s.classList)
    };
  });
  console.log('Mobile drawer state:', drawerState);

  // Close mobile drawer
  console.log('Closing mobile drawer...');
  await page.evaluate(() => window.closeMobileSidebar());
  await new Promise(r => setTimeout(r, 400));

  // Switch back to user on mobile
  console.log('Switching back to user on mobile...');
  await page.click('#btnRoleUserMobile');
  await new Promise(r => setTimeout(r, 600));

  const mobileBackToUser = await page.evaluate(() => {
    const aView = document.getElementById('adminView');
    const uView = document.getElementById('userView');
    const mHead = document.getElementById('mobileHeader');
    const mBottom = document.getElementById('mobileBottomNav');
    return {
      currentRole: window.currentRole,
      adminViewDisplay: window.getComputedStyle(aView).display,
      userViewDisplay: window.getComputedStyle(uView).display,
      mobileHeaderDisplay: window.getComputedStyle(mHead).display,
      mobileBottomNavDisplay: window.getComputedStyle(mBottom).display
    };
  });
  console.log('Mobile back to USER state:', mobileBackToUser);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_mobile_back_to_user.png') });

  await browser.close();
  console.log('ALL TEST SUITES COMPLETED SUCCESSFULLY!');
})();
