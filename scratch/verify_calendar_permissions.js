const puppeteer = require('c:/Users/NBODT/Desktop/CS-MEETING 2/comsan meeting server/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const execPath = fs.existsSync(chromePath) ? chromePath : edgePath;
const artifactDir = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';

async function testPermissions() {
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Wait for socket to populate appState with calendar events
  await page.waitForFunction(() => window.appState && Array.isArray(window.appState.calendarEvents) && window.appState.calendarEvents.length > 0, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));

  console.log('=== TEST 1: USER ROLE (Simulating user "แมทธิว" with lingering admin auth flag) ===');
  const userTestResults = await page.evaluate(() => {
    // Simulate user state where admin was previously logged in on device (the bug reproduction)
    window.isAdminAuthenticated = true;
    localStorage.setItem('comsan_admin_auth', 'true');
    window.currentRole = 'USER';
    localStorage.setItem('comsan_role', 'USER');
    window.currentUserId = 'COMSAN-01';

    // Show app layout & switch to user calendar
    document.getElementById('authScreen')?.classList.add('hidden');
    document.getElementById('appLayout')?.classList.remove('hidden');
    document.getElementById('appLayout')?.classList.add('flex');
    if (typeof switchRoleView === 'function') switchRoleView('USER');
    if (typeof switchUserTool === 'function') switchUserTool('CALENDAR');
    if (typeof renderUserCalendarSection === 'function') renderUserCalendarSection();

    const isCalAdmin = window.isCalendarAdmin();

    // 1. Open Event Detail Modal
    const events = window.appState?.calendarEvents || [];
    const firstEvt = events[0] || { id: 'test', title: 'Test Event' };
    openCalendarEventDetailModal(firstEvt.id);

    const modal = document.getElementById('calendarEventDetailModal');
    const headerBtnEdit = document.getElementById('detailCalHeaderBtnEdit');
    const adminActions = document.getElementById('detailCalAdminActions');
    const btnEdit = document.getElementById('detailCalBtnEdit');
    const btnDelete = document.getElementById('detailCalBtnDelete');

    const detailState = {
      isCalAdmin,
      modalOpen: !modal.classList.contains('hidden'),
      headerBtnEditHidden: headerBtnEdit.classList.contains('hidden'),
      adminActionsHidden: adminActions.classList.contains('hidden'),
      headerBtnEditComputedDisplay: window.getComputedStyle(headerBtnEdit).display,
      adminActionsComputedDisplay: window.getComputedStyle(adminActions).display
    };

    // Close detail modal
    closeCalendarEventDetailModal();

    // 2. Test Attempting to open Add Event modal as USER
    const addModalBefore = document.getElementById('calendarEventModal').classList.contains('hidden');
    openAddCalendarEventModal();
    const addModalAfter = document.getElementById('calendarEventModal').classList.contains('hidden');

    // 3. Test Attempting to open ICS modal as USER
    const icsModalBefore = document.getElementById('calendarIcsModal').classList.contains('hidden');
    openCalendarIcsModal();
    const icsModalAfter = document.getElementById('calendarIcsModal').classList.contains('hidden');

    // Re-open detail modal to take screenshot from USER perspective
    openCalendarEventDetailModal(firstEvt.id);

    return {
      detailState,
      addModalBlocked: addModalBefore === true && addModalAfter === true,
      icsModalBlocked: icsModalBefore === true && icsModalAfter === true
    };
  });

  console.log('User Test Results:', JSON.stringify(userTestResults, null, 2));

  // Take screenshot of modal as USER
  await page.screenshot({ path: path.join(artifactDir, 'verify_calendar_permission_user.png') });
  console.log('Saved verify_calendar_permission_user.png');

  console.log('\n=== TEST 2: ADMIN ROLE (Authenticated Admin) ===');
  const adminTestResults = await page.evaluate(() => {
    closeCalendarEventDetailModal();

    // Set role to ADMIN
    window.currentRole = 'ADMIN';
    localStorage.setItem('comsan_role', 'ADMIN');
    window.isAdminAuthenticated = true;
    if (typeof switchRoleView === 'function') switchRoleView('ADMIN');
    if (typeof switchAdminTab === 'function') switchAdminTab('CALENDAR');

    const isCalAdmin = window.isCalendarAdmin();

    const events = window.appState?.calendarEvents || [];
    const firstEvt = events[0] || { id: 'test', title: 'Test Event' };
    openCalendarEventDetailModal(firstEvt.id);

    const modal = document.getElementById('calendarEventDetailModal');
    const headerBtnEdit = document.getElementById('detailCalHeaderBtnEdit');
    const adminActions = document.getElementById('detailCalAdminActions');
    const btnEdit = document.getElementById('detailCalBtnEdit');
    const btnDelete = document.getElementById('detailCalBtnDelete');

    const detailState = {
      isCalAdmin,
      modalOpen: !modal.classList.contains('hidden'),
      headerBtnEditVisible: !headerBtnEdit.classList.contains('hidden'),
      adminActionsVisible: !adminActions.classList.contains('hidden'),
      headerBtnEditComputedDisplay: window.getComputedStyle(headerBtnEdit).display,
      adminActionsComputedDisplay: window.getComputedStyle(adminActions).display
    };

    return {
      detailState
    };
  });

  console.log('Admin Test Results:', JSON.stringify(adminTestResults, null, 2));

  // Take screenshot of modal as ADMIN
  await page.screenshot({ path: path.join(artifactDir, 'verify_calendar_permission_admin.png') });
  console.log('Saved verify_calendar_permission_admin.png');

  await browser.close();
}

testPermissions().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
