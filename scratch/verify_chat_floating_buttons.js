const puppeteer = require('c:/Users/NBODT/Desktop/CS-MEETING 2/comsan meeting server/node_modules/puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';

async function verify() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: Desktop Admin (1280x800)
  console.log('Testing Desktop Admin...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Login as admin
  await page.evaluate(() => {
    window.isAdminAuthenticated = true;
    window.switchRoleView('ADMIN');
    window.updateSidebarVisibility();
  });
  await new Promise(r => setTimeout(r, 600));

  // Verify Admin Sidebar has NO chat item
  const adminSidebarHasChat = await page.evaluate(() => {
    return !!document.getElementById('aNav_CHAT');
  });
  console.log('Admin Sidebar has Chat item:', adminSidebarHasChat);

  // Check Admin Float Button visibility
  const adminFloatBtnVisible = await page.evaluate(() => {
    const el = document.getElementById('adminMobileChatFloatBtnWrapper');
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return !el.classList.contains('hidden') && style.display !== 'none' && style.visibility !== 'hidden';
  });
  console.log('Admin Float Button visible on desktop:', adminFloatBtnVisible);

  await page.screenshot({ path: path.join(artifactDir, 'verify_admin_desktop_float_btn.png') });

  // Click Admin Float Button
  console.log('Clicking Admin Float Button...');
  await page.click('#adminMobileChatFloatBtn');
  await new Promise(r => setTimeout(r, 1600)); // wait for Instagram splash animation

  const inAdminChat = await page.evaluate(() => {
    const chatTab = document.getElementById('aTab_CHAT');
    const floatBtn = document.getElementById('adminMobileChatFloatBtnWrapper');
    return {
      chatTabVisible: chatTab && !chatTab.classList.contains('hidden'),
      floatBtnHidden: floatBtn && floatBtn.classList.contains('hidden'),
      activeAdminTab: window.activeAdminTab
    };
  });
  console.log('In Admin Chat:', inAdminChat);
  await page.screenshot({ path: path.join(artifactDir, 'verify_admin_desktop_in_chat.png') });

  // Click back button in Admin Chat
  console.log('Clicking back button in Admin Chat header...');
  await page.evaluate(() => {
    const backBtn = document.querySelector('#aTab_CHAT button[onclick*="switchAdminTab(\'DASHBOARD\')"]');
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const afterAdminBack = await page.evaluate(() => {
    const floatBtn = document.getElementById('adminMobileChatFloatBtnWrapper');
    return {
      activeAdminTab: window.activeAdminTab,
      floatBtnVisible: floatBtn && !floatBtn.classList.contains('hidden')
    };
  });
  console.log('After Admin Back to Dashboard:', afterAdminBack);
  await page.screenshot({ path: path.join(artifactDir, 'verify_admin_desktop_returned_dashboard.png') });

  // Test 2: Desktop User (1280x800)
  console.log('\nTesting Desktop User...');
  await page.evaluate(() => {
    window.isUserAuthenticated = true;
    window.currentUserId = 'COMSAN-01';
    window.switchRoleView('USER');
    window.switchUserTab('HOME');
    window.updateSidebarVisibility();
  });
  await new Promise(r => setTimeout(r, 600));

  // Verify User Sidebar has NO chat item
  const userSidebarHasChat = await page.evaluate(() => {
    return !!document.getElementById('uNav_CHAT');
  });
  console.log('User Sidebar has Chat item:', userSidebarHasChat);

  // Check User Float Button visibility
  const userFloatBtnVisible = await page.evaluate(() => {
    const el = document.getElementById('userChatFloatBtnWrapper');
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return !el.classList.contains('hidden') && style.display !== 'none' && style.visibility !== 'hidden';
  });
  console.log('User Float Button visible on desktop:', userFloatBtnVisible);

  await page.screenshot({ path: path.join(artifactDir, 'verify_user_desktop_float_btn.png') });

  // Click User Float Button
  console.log('Clicking User Float Button...');
  await page.click('#userChatFloatBtn');
  await new Promise(r => setTimeout(r, 1600)); // wait for Instagram splash animation

  const inUserChat = await page.evaluate(() => {
    const chatTab = document.getElementById('uTab_CHAT');
    const floatBtn = document.getElementById('userChatFloatBtnWrapper');
    return {
      chatTabVisible: chatTab && !chatTab.classList.contains('hidden'),
      floatBtnHidden: floatBtn && floatBtn.classList.contains('hidden'),
      activeUserTab: window.activeUserTab
    };
  });
  console.log('In User Chat:', inUserChat);
  await page.screenshot({ path: path.join(artifactDir, 'verify_user_desktop_in_chat.png') });

  // Click back button in User Chat
  console.log('Clicking back button in User Chat header...');
  await page.evaluate(() => {
    const backBtn = document.querySelector('#uTab_CHAT button[onclick*="switchUserTab(\'HOME\')"]');
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const afterUserBack = await page.evaluate(() => {
    const floatBtn = document.getElementById('userChatFloatBtnWrapper');
    return {
      activeUserTab: window.activeUserTab,
      floatBtnVisible: floatBtn && !floatBtn.classList.contains('hidden')
    };
  });
  console.log('After User Back to Home:', afterUserBack);
  await page.screenshot({ path: path.join(artifactDir, 'verify_user_desktop_returned_home.png') });

  // Test 3: Mobile User & Admin (390x844)
  console.log('\nTesting Mobile User...');
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    window.switchRoleView('USER');
    window.updateSidebarVisibility();
  });
  await new Promise(r => setTimeout(r, 400));

  const mobileUserState = await page.evaluate(() => {
    const userFloatBtn = document.getElementById('userChatFloatBtnWrapper');
    const bottomNav = document.getElementById('mobileBottomNav');
    const mNavChat = document.getElementById('mNav_CHAT');
    return {
      userFloatBtnHidden: userFloatBtn && userFloatBtn.classList.contains('hidden'),
      bottomNavVisible: bottomNav && !bottomNav.classList.contains('hidden'),
      hasBottomNavChat: !!mNavChat
    };
  });
  console.log('Mobile User Navigation State:', mobileUserState);
  await page.screenshot({ path: path.join(artifactDir, 'verify_user_mobile.png') });

  console.log('\nTesting Mobile Admin...');
  await page.evaluate(() => {
    window.switchRoleView('ADMIN');
    window.updateSidebarVisibility();
  });
  await new Promise(r => setTimeout(r, 400));

  const mobileAdminState = await page.evaluate(() => {
    const adminFloatBtn = document.getElementById('adminMobileChatFloatBtnWrapper');
    return {
      adminFloatBtnVisible: adminFloatBtn && !adminFloatBtn.classList.contains('hidden')
    };
  });
  console.log('Mobile Admin Floating Button State:', mobileAdminState);
  await page.screenshot({ path: path.join(artifactDir, 'verify_admin_mobile.png') });

  await browser.close();
  console.log('All tests finished successfully!');
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
