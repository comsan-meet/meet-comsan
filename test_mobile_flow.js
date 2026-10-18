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
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // MOBILE VIEWPORT
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Wait for state
  await page.waitForFunction(() => window.appState && window.appState.users && window.appState.users.length > 0);

  console.log('--- 1. Login as user on mobile ---');
  await page.type('#userLoginName', 'แมทธิว');
  await page.type('#userLoginPass', 'a');
  await page.click('#authScreen button[type="submit"]');
  await new Promise(r => setTimeout(r, 800));

  const mobileUserState = await page.evaluate(() => {
    return {
      currentRole: window.currentRole,
      currentUserId: window.currentUserId,
      isAdminAuthenticated: window.isAdminAuthenticated,
      mobileBottomNavDisplay: window.getComputedStyle(document.getElementById('mobileBottomNav')).display,
      mobileHeaderDisplay: window.getComputedStyle(document.getElementById('mobileHeader')).display,
      userViewDisplay: window.getComputedStyle(document.getElementById('userView')).display,
      adminViewDisplay: window.getComputedStyle(document.getElementById('adminView')).display
    };
  });
  console.log('Mobile user state:', mobileUserState);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_user_state.png') });

  console.log('--- 2. Tap admin switch on mobile header ---');
  try {
    await page.click('#btnRoleAdminMobile');
    console.log('Clicked #btnRoleAdminMobile');
  } catch (e) {
    console.error('Error clicking #btnRoleAdminMobile:', e.message);
  }
  await new Promise(r => setTimeout(r, 500));

  const modalState = await page.evaluate(() => {
    const modal = document.getElementById('adminLoginModal');
    return {
      modalDisplay: window.getComputedStyle(modal).display,
      modalHidden: modal.classList.contains('hidden'),
      modalZIndex: window.getComputedStyle(modal).zIndex,
      modalPointerEvents: window.getComputedStyle(modal).pointerEvents
    };
  });
  console.log('Modal state on mobile:', modalState);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_admin_modal.png') });

  console.log('--- 3. Type admin password and submit ---');
  try {
    await page.type('#adminPassInput', 'admincomsan26');
    await page.click('#adminLoginModal button[type="submit"]');
    console.log('Submitted admin login');
  } catch (e) {
    console.error('Error submitting admin login:', e.message);
  }
  await new Promise(r => setTimeout(r, 800));

  const afterAdminLogin = await page.evaluate(() => {
    return {
      currentRole: window.currentRole,
      currentUserId: window.currentUserId,
      isAdminAuthenticated: window.isAdminAuthenticated,
      activeAdminTab: window.activeAdminTab,
      userViewDisplay: window.getComputedStyle(document.getElementById('userView')).display,
      adminViewDisplay: window.getComputedStyle(document.getElementById('adminView')).display,
      mobileHeaderDisplay: window.getComputedStyle(document.getElementById('mobileHeader')).display,
      mobileBottomNavDisplay: window.getComputedStyle(document.getElementById('mobileBottomNav')).display,
      btnMobileSidebarDisplay: window.getComputedStyle(document.getElementById('btnMobileSidebarToggle')).display
    };
  });
  console.log('After admin login on mobile:', afterAdminLogin);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_after_admin_login.png') });

  await browser.close();
})();
