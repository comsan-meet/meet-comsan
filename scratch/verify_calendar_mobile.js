const puppeteer = require('c:/Users/NBODT/Desktop/CS-MEETING 2/comsan meeting server/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const execPath = fs.existsSync(chromePath) ? chromePath : edgePath;
const artifactDir = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';

async function testMobile() {
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  await page.waitForFunction(() => window.appState && Array.isArray(window.appState.calendarEvents) && window.appState.calendarEvents.length > 0, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 400));

  // Test Mobile as regular USER
  await page.evaluate(() => {
    window.currentRole = 'USER';
    localStorage.setItem('comsan_role', 'USER');
    window.isAdminAuthenticated = false;
    window.currentUserId = 'COMSAN-01';

    document.getElementById('authScreen')?.classList.add('hidden');
    document.getElementById('appLayout')?.classList.remove('hidden');
    document.getElementById('appLayout')?.classList.add('flex');
    if (typeof switchRoleView === 'function') switchRoleView('USER');
    if (typeof switchUserTool === 'function') switchUserTool('CALENDAR');

    const events = window.appState?.calendarEvents || [];
    openCalendarEventDetailModal(events[0].id);
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'verify_calendar_permission_mobile_user.png') });

  // Test Mobile as ADMIN
  await page.evaluate(() => {
    closeCalendarEventDetailModal();
    window.currentRole = 'ADMIN';
    localStorage.setItem('comsan_role', 'ADMIN');
    window.isAdminAuthenticated = true;
    if (typeof switchRoleView === 'function') switchRoleView('ADMIN');
    if (typeof switchAdminTab === 'function') switchAdminTab('CALENDAR');

    const events = window.appState?.calendarEvents || [];
    openCalendarEventDetailModal(events[0].id);
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'verify_calendar_permission_mobile_admin.png') });

  await browser.close();
  console.log('Mobile screenshots captured successfully.');
}

testMobile().catch(err => {
  console.error('Mobile test failed:', err);
  process.exit(1);
});
