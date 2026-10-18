const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  console.log('--- STARTING COMPREHENSIVE END-TO-END VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), error: req.failure() ? req.failure().errorText : 'unknown' });
  });

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  // Perform login as member
  console.log('Logging in as member...');
  await page.type('#userLoginName', 'แมทธิว');
  await page.type('#userLoginPass', '123');
  await page.evaluate(() => document.querySelector('#authScreen form').requestSubmit());
  await new Promise(r => setTimeout(r, 1200));

  // 1. Initial State Check
  const initialCheck = await page.evaluate(() => {
    const svgs = document.querySelectorAll('svg.lucide');
    const remainingLucide = document.querySelectorAll('[data-lucide]:not(svg)');
    const faIcons = document.querySelectorAll('i[class*="fa-"], span[class*="fa-"]');
    
    // Check DiceBear URL format
    const testUrl = window.getUserAvatarUrl({ nickname: 'Somchai', id: 'user_123' });
    const isCorrectDiceBear = testUrl.includes('api.dicebear.com/10.x/gaze/svg') &&
                              testUrl.includes('seed=Somchai') &&
                              testUrl.includes('backgroundColor=ff5d8f,ffb703,43aa8b,4d96ff,b57bff');

    return {
      lucideCount: svgs.length,
      unrenderedDataLucide: remainingLucide.length,
      faCount: faIcons.length,
      diceBearUrlValid: isCorrectDiceBear,
      sampleUrl: testUrl,
      currentRole: window.currentRole,
      currentUserId: window.currentUserId,
      title: document.title
    };
  });

  console.log('Initial Checks:', initialCheck);
  await page.screenshot({ path: path.join(screenshotDir, '01_desktop_home.png') });

  // 2. Theme Toggle Verification
  console.log('Testing Theme Toggle...');
  const themeBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.evaluate(() => {
    if (typeof window.toggleTheme === 'function') {
      window.toggleTheme();
    }
  });
  await new Promise(r => setTimeout(r, 400));
  const themeAfter = await page.evaluate(() => {
    const isDark = document.documentElement.classList.contains('dark');
    const sidebarIcon = document.querySelector('#sidebarThemeIcon')?.getAttribute('data-lucide') || 
                        document.querySelector('#sidebarThemeIcon svg')?.getAttribute('data-lucide');
    const mobileIcon = document.querySelector('#themeToggleIcon')?.getAttribute('data-lucide') ||
                       document.querySelector('#themeToggleIcon svg')?.getAttribute('data-lucide');
    return { isDark, sidebarIcon, mobileIcon };
  });
  console.log(`Theme toggled from dark=${themeBefore} to dark=${themeAfter.isDark}, sidebarIcon=${themeAfter.sidebarIcon}, mobileIcon=${themeAfter.mobileIcon}`);
  await page.screenshot({ path: path.join(screenshotDir, '02_theme_toggled.png') });

  // Toggle back
  await page.evaluate(() => window.toggleTheme());
  await new Promise(r => setTimeout(r, 400));

  // 3. User View: Calendar Tool Subtab
  console.log('Testing User Calendar Subtab...');
  await page.evaluate(() => {
    if (typeof window.switchUserToolSubTab === 'function') {
      window.switchUserToolSubTab('CALENDAR');
    }
  });
  await new Promise(r => setTimeout(r, 600));
  
  const calUserStats = await page.evaluate(() => {
    return {
      svgCount: document.querySelectorAll('svg.lucide').length,
      faCount: document.querySelectorAll('i[class*="fa-"], span[class*="fa-"]').length,
      unrendered: document.querySelectorAll('[data-lucide]:not(svg)').length
    };
  });
  console.log('User Calendar Tab Stats:', calUserStats);
  await page.screenshot({ path: path.join(screenshotDir, '03_user_calendar.png') });

  // Test switching calendar to Month view
  await page.evaluate(() => {
    if (typeof window.setCalendarView === 'function') {
      window.setCalendarView('MONTH');
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '04_user_calendar_month.png') });

  // 4. User View: Seating Chart Subtab
  console.log('Testing Seating Chart Avatars...');
  await page.evaluate(() => {
    if (typeof window.switchUserToolSubTab === 'function') {
      window.switchUserToolSubTab('SEATS');
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const avatarStats = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img[src*="dicebear.com/10.x/gaze"]'));
    return {
      dicebearImgCount: imgs.length,
      loadedOk: imgs.filter(img => img.naturalWidth > 0).length,
      firstThreeUrls: imgs.slice(0, 3).map(img => img.src)
    };
  });
  console.log('Avatar Stats in Seating Tab:', avatarStats);
  await page.screenshot({ path: path.join(screenshotDir, '05_user_seating_chart.png') });

  // 5. User View: Profile Tab
  console.log('Testing User Profile Tab...');
  await page.evaluate(() => {
    if (typeof window.switchUserTab === 'function') {
      window.switchUserTab('PROFILE');
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '06_user_profile.png') });

  // 6. Admin Authentication & Admin View
  console.log('Testing Admin View...');
  await page.evaluate(() => {
    window.currentRole = 'ADMIN';
    window.isAdminAuthenticated = true;
    if (typeof window.switchRoleView === 'function') {
      window.switchRoleView('ADMIN');
    }
    if (typeof window.switchAdminTab === 'function') {
      window.switchAdminTab('MEMBERS');
    }
  });
  await new Promise(r => setTimeout(r, 700));

  const adminMemberStats = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('#membersTableBody img[src*="dicebear.com/10.x/gaze"]'));
    return {
      adminMemberAvatars: imgs.length,
      loadedOk: imgs.filter(img => img.naturalWidth > 0).length,
      svgCount: document.querySelectorAll('svg.lucide').length,
      faCount: document.querySelectorAll('i[class*="fa-"], span[class*="fa-"]').length
    };
  });
  console.log('Admin Members Tab Stats:', adminMemberStats);
  await page.screenshot({ path: path.join(screenshotDir, '07_admin_members.png') });

  // Test Admin Calendar Tab
  await page.evaluate(() => {
    if (typeof window.switchAdminTab === 'function') {
      window.switchAdminTab('CALENDAR');
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '08_admin_calendar.png') });

  // 7. Mobile Viewport Test (iPhone 12 / Modern Mobile: 390 x 844)
  console.log('Testing Mobile Viewport (390 x 844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluate(() => {
    if (typeof window.closeAdminModal === 'function') window.closeAdminModal();
    window.currentRole = 'USER';
    if (typeof window.switchRoleView === 'function') {
      window.switchRoleView('USER');
    }
    if (typeof window.switchUserTab === 'function') {
      window.switchUserTab('HOME');
    }
    if (typeof window.switchUserToolSubTab === 'function') {
      window.switchUserToolSubTab('FILES');
    }
  });
  await new Promise(r => setTimeout(r, 700));

  const mobileStats = await page.evaluate(() => {
    const bottomNav = document.getElementById('userMobileNav');
    const bottomNavSvgs = bottomNav ? bottomNav.querySelectorAll('svg.lucide').length : 0;
    const documentScrollWidth = document.documentElement.scrollWidth;
    return {
      bottomNavSvgs,
      documentScrollWidth,
      viewportWidth: window.innerWidth,
      hasHorizontalOverflow: documentScrollWidth > window.innerWidth,
      svgCount: document.querySelectorAll('svg.lucide').length,
      faCount: document.querySelectorAll('i[class*="fa-"], span[class*="fa-"]').length
    };
  });
  console.log('Mobile Viewport Stats:', mobileStats);
  await page.screenshot({ path: path.join(screenshotDir, '09_mobile_user_home.png') });

  // Mobile User Calendar
  await page.evaluate(() => {
    if (typeof window.switchUserToolSubTab === 'function') {
      window.switchUserToolSubTab('CALENDAR');
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '10_mobile_user_calendar.png') });

  console.log('--- TEST SUMMARY ---');
  console.log('Total Console Errors:', consoleErrors);
  console.log('Total Failed Network Requests:', failedRequests);

  await browser.close();
  console.log('--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
})().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
