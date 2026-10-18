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

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Open admin login modal
  await page.evaluate(() => {
    window.requestAdminAccess();
  });
  await sleep(400);

  // Enter password and submit
  await page.type('#adminPassInput', 'admincomsan26');
  await page.click('#adminLoginModal form button[type="submit"]');
  await sleep(1200);

  // Dismiss modals
  await page.evaluate(() => {
    const autoVoteModal = document.getElementById('autoVotePopupModal');
    if (autoVoteModal) autoVoteModal.classList.add('hidden');
    const randomModal = document.getElementById('randomPopupModal');
    if (randomModal) randomModal.classList.add('hidden');
  });
  await sleep(400);

  // Capture all 5 tabs that the user mentioned
  const tabs = [
    { name: 'CHECKIN', file: 'admin_fixed_checkin.png' },
    { name: 'DASHBOARD', file: 'admin_fixed_dashboard.png' },
    { name: 'RANDOM', file: 'admin_fixed_random.png' },
    { name: 'STREAM', file: 'admin_fixed_stream.png' },
    { name: 'MEMBERS', file: 'admin_fixed_members.png' }
  ];

  for (const t of tabs) {
    await page.evaluate((tabName) => {
      window.switchAdminTab(tabName);
    }, t.name);
    await sleep(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, t.file) });
    console.log(`Saved ${t.file}`);
  }

  const rects = await page.evaluate(() => {
    const header = document.getElementById('desktopMainHeader').getBoundingClientRect();
    const adminView = document.getElementById('adminView').getBoundingClientRect();
    return {
      headerBottom: header.bottom,
      adminViewTop: adminView.top,
      distance: adminView.top - header.bottom
    };
  });

  console.log('Distance between header and adminView:', rects);

  await browser.close();
}

main().catch(console.error);
