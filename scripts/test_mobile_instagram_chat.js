const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Login as user COMSAN-01
  await page.evaluate(() => {
    document.getElementById('userLoginName').value = 'COMSAN-01';
    document.getElementById('userLoginPass').value = '123';
    window.handleUserLogin();
  });
  await sleep(1000);

  // Close modals
  await page.evaluate(() => {
    if (typeof window.closeAutoVotePopup === 'function') window.closeAutoVotePopup();
    const autoVoteModal = document.getElementById('autoVotePopupModal');
    if (autoVoteModal) autoVoteModal.classList.add('hidden');
    const randomModal = document.getElementById('randomPopupModal');
    if (randomModal) randomModal.classList.add('hidden');
  });
  await sleep(500);

  // Verify bottom bar on HOME
  const homeBottomNavVisible = await page.evaluate(() => {
    const nav = document.getElementById('mobileBottomNav');
    return nav && !nav.classList.contains('hidden') && window.getComputedStyle(nav).display !== 'none';
  });
  console.log('Home bottom nav visible:', homeBottomNavVisible);

  // Switch to CHAT by clicking the chat nav button in bottom bar
  await page.evaluate(() => {
    window.switchUserTab('CHAT');
  });
  await sleep(600);

  // Check state in CHAT
  const chatNavState = await page.evaluate(() => {
    const bottomNav = document.getElementById('mobileBottomNav');
    const mobileHeader = document.getElementById('mobileHeader');
    const chatTab = document.getElementById('uTab_CHAT');
    return {
      bottomNavVisible: bottomNav && !bottomNav.classList.contains('hidden') && window.getComputedStyle(bottomNav).display !== 'none',
      mobileHeaderVisible: mobileHeader && !mobileHeader.classList.contains('hidden') && window.getComputedStyle(mobileHeader).display !== 'none',
      chatTabVisible: chatTab && !chatTab.classList.contains('hidden')
    };
  });
  console.log('Chat view states:', chatNavState);

  // Send a test chat message to see bubbles in action
  await page.evaluate(() => {
    const input = document.getElementById('floatingChatInput');
    if (input) input.value = 'สวัสดีทุกคนในที่ประชุมครับ! พร้อมเริ่มวาระที่ 2 แล้วครับ ✨';
    window.sendFloatingChatMessage();
  });
  await sleep(500);

  // Take screenshot of Instagram-style mobile chat
  const chatShotPath = path.join(ARTIFACT_DIR, 'mobile_chat_instagram.png');
  await page.screenshot({ path: chatShotPath });
  console.log('Saved mobile_chat_instagram.png');

  // Click the back button `<` in the chat header to return to HOME
  await page.evaluate(() => {
    window.switchUserTab('HOME');
  });
  await sleep(500);

  // Verify return to HOME
  const returnState = await page.evaluate(() => {
    const bottomNav = document.getElementById('mobileBottomNav');
    const mobileHeader = document.getElementById('mobileHeader');
    const homeTab = document.getElementById('uTab_HOME');
    const chatTab = document.getElementById('uTab_CHAT');
    return {
      bottomNavVisible: bottomNav && !bottomNav.classList.contains('hidden') && window.getComputedStyle(bottomNav).display !== 'none',
      mobileHeaderVisible: mobileHeader && !mobileHeader.classList.contains('hidden') && window.getComputedStyle(mobileHeader).display !== 'none',
      homeTabVisible: homeTab && !homeTab.classList.contains('hidden'),
      chatTabVisible: chatTab && !chatTab.classList.contains('hidden')
    };
  });
  console.log('Return to home states:', returnState);

  // Take screenshot of return to Home
  const homeShotPath = path.join(ARTIFACT_DIR, 'mobile_home_after_back.png');
  await page.screenshot({ path: homeShotPath });
  console.log('Saved mobile_home_after_back.png');

  // Also switch to member 1-on-1 chat to screenshot member conversation mode
  await page.evaluate(() => {
    window.switchUserTab('CHAT');
    const otherUser = (window.appState.users || []).find(u => u.id !== window.currentUserId);
    if (otherUser) window.selectChatRoom(otherUser.id);
  });
  await sleep(500);

  const dmShotPath = path.join(ARTIFACT_DIR, 'mobile_chat_instagram_dm.png');
  await page.screenshot({ path: dmShotPath });
  console.log('Saved mobile_chat_instagram_dm.png');

  await browser.close();
}

main().catch(console.error);
