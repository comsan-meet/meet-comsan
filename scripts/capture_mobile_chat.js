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

  // Login as user COMSAN-01 with password "123"
  await page.type('#userLoginName', 'COMSAN-01');
  await page.type('#userLoginPass', '123');
  await page.click('#authScreen button[type="submit"]');
  await sleep(1500);

  // Close modals
  await page.evaluate(() => {
    const autoVoteModal = document.getElementById('autoVotePopupModal');
    if (autoVoteModal) autoVoteModal.classList.add('hidden');
    const randomModal = document.getElementById('randomPopupModal');
    if (randomModal) randomModal.classList.add('hidden');
  });
  await sleep(400);

  // Switch to CHAT
  await page.evaluate(() => {
    window.switchUserTab('CHAT');
  });
  await sleep(500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_chat_before.png') });
  console.log('Saved mobile_chat_before.png');

  await browser.close();
}

main().catch(console.error);
