const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function findChrome() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

(async () => {
  const chromePath = await findChrome();
  console.log('Chrome:', chromePath);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // ==================== PART 1: MOBILE VIEW (390x844) ====================
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Direct auth to ADMIN
  await page.evaluate(() => {
    window.isAdminAuthenticated = true;
    window.switchRoleView('ADMIN');
    window.switchAdminTab('CHAT');
  });
  await new Promise(r => setTimeout(r, 1000));

  // 1.1 Verify Stage 1 Inbox on Mobile
  const isInboxVisibleMobile = await page.$eval('#adminIgChatInboxView', el => !el.classList.contains('hidden'));
  const isRoomVisibleMobile = await page.$eval('#adminIgChatRoomView', el => !el.classList.contains('hidden'));
  console.log('Mobile Stage 1 - Inbox visible:', isInboxVisibleMobile, '| Room visible:', isRoomVisibleMobile);

  await page.screenshot({ path: 'C:/Users/NBODT/.gemini/antigravity/brain/1e54c1a0-bef1-4f1f-a50d-a29817ec25b1/admin_chat_mobile_inbox.png' });

  // 1.2 Open Chat Room (Stage 2) with Public Room 'ALL'
  await page.evaluate(() => {
    window.openAdminIgChatRoom('ALL');
  });
  await new Promise(r => setTimeout(r, 800));

  const isRoomOpenMobile = await page.$eval('#adminIgChatRoomView', el => !el.classList.contains('hidden'));
  console.log('Mobile Stage 2 - Room visible:', isRoomOpenMobile);

  // Send a test message as Admin
  await page.type('#adminIgChatInput', 'สวัสดีทุกคน ยินดีต้อนรับสู่การประชุม COMSAN');
  await page.click('#adminIgChatSendBtn');
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: 'C:/Users/NBODT/.gemini/antigravity/brain/1e54c1a0-bef1-4f1f-a50d-a29817ec25b1/admin_chat_mobile_room.png' });

  // 1.3 Test back button to Inbox
  await page.evaluate(() => {
    window.closeAdminIgChatRoom();
  });
  await new Promise(r => setTimeout(r, 600));

  const isBackToInboxMobile = await page.$eval('#adminIgChatInboxView', el => !el.classList.contains('hidden'));
  console.log('Mobile - Returned to Inbox:', isBackToInboxMobile);

  // ==================== PART 2: DESKTOP VIEW (1280x800) ====================
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: 'C:/Users/NBODT/.gemini/antigravity/brain/1e54c1a0-bef1-4f1f-a50d-a29817ec25b1/admin_chat_desktop_inbox.png' });

  // Open Room on Desktop
  await page.evaluate(() => {
    window.openAdminIgChatRoom('ALL');
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: 'C:/Users/NBODT/.gemini/antigravity/brain/1e54c1a0-bef1-4f1f-a50d-a29817ec25b1/admin_chat_desktop_room.png' });

  await browser.close();
  console.log('Admin Chat verification completed successfully!');
})();
