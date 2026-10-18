const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
  await sleep(1000);

  // Check available users from window.appState if possible
  const users = await page.evaluate(() => {
    return (window.appState && window.appState.users) ? window.appState.users.map(u => ({ id: u.id, nickname: u.nickname, pass: u.password })) : [];
  });
  console.log('Available users count:', users.length);

  const testUser = users.find(u => u.id === 'COMSAN-01') || users[0] || { id: 'COMSAN-01', pass: '123' };
  console.log('Logging in as:', testUser.id, testUser.nickname);

  await page.type('#userLoginName', testUser.id || testUser.nickname);
  await page.type('#userLoginPass', testUser.pass || '123');
  await page.click('#authScreen button[type="submit"]');
  await sleep(2000);

  // Close modals if open
  await page.evaluate(() => {
    const autoVoteModal = document.getElementById('autoVotePopupModal');
    if (autoVoteModal) autoVoteModal.classList.add('hidden');
    const randomModal = document.getElementById('randomPopupModal');
    if (randomModal) randomModal.classList.add('hidden');
  });
  await sleep(500);

  // Capture user dashboard screenshot
  const shotPath = path.join(ARTIFACT_DIR, 'meeting_local_user_cleaned_sidebar.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved:', shotPath);

  // Capture sidebar screenshot
  const sidebar = await page.$('#appSidebar');
  if (sidebar) {
    const sidebarShotPath = path.join(ARTIFACT_DIR, 'meeting_sidebar_user_cleaned.png');
    await sidebar.screenshot({ path: sidebarShotPath });
    console.log('Saved:', sidebarShotPath);
  }

  // Get visible menu text in sidebarUserMenu
  const menuItems = await page.evaluate(() => {
    const menu = document.getElementById('sidebarUserMenu');
    if (!menu) return [];
    return Array.from(menu.querySelectorAll('a')).map(a => a.innerText.trim().replace(/\n/g, ' '));
  });

  const quickActionVisible = await page.evaluate(() => {
    const btn = document.getElementById('sidebarQuickActionBtn');
    return btn && !btn.classList.contains('hidden') && window.getComputedStyle(btn).display !== 'none';
  });

  console.log('User Menu Items:', JSON.stringify(menuItems, null, 2));
  console.log('Quick Action Button Visible:', quickActionVisible);

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
