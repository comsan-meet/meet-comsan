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

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
  await sleep(1500);

  const localShotAuth = path.join(ARTIFACT_DIR, 'meeting_local_auth_choice.png');
  await page.screenshot({ path: localShotAuth, fullPage: true });
  console.log('Saved meeting_local_auth_choice.png');

  // Login as user "แมทธิว" / "a"
  console.log('Logging in as user แมทธิว ...');
  await page.type('#userLoginName', 'แมทธิว');
  await page.type('#userLoginPass', 'a');
  await page.click('#authScreen button[type="submit"]');
  await sleep(2500);

  const localShotUserDash = path.join(ARTIFACT_DIR, 'meeting_local_user_choice.png');
  await page.screenshot({ path: localShotUserDash, fullPage: true });
  console.log('Saved meeting_local_user_choice.png');

  // Open Settings Modal
  console.log('Opening Settings Modal...');
  await page.evaluate(() => {
    if (typeof window.openSettingsModal === 'function') window.openSettingsModal();
  });
  await sleep(1000);
  const localShotSettings = path.join(ARTIFACT_DIR, 'meeting_local_settings_choice.png');
  await page.screenshot({ path: localShotSettings, fullPage: true });
  console.log('Saved meeting_local_settings_choice.png');

  // Close Settings Modal
  await page.evaluate(() => {
    if (typeof window.closeSettingsModal === 'function') window.closeSettingsModal();
  });
  await sleep(500);

  // Switch to Dark Mode
  console.log('Switching to Dark Mode...');
  await page.evaluate(() => {
    if (typeof window.applyTheme === 'function') window.applyTheme('dark');
  });
  await sleep(1000);
  const localShotDark = path.join(ARTIFACT_DIR, 'meeting_local_dark_choice.png');
  await page.screenshot({ path: localShotDark, fullPage: true });
  console.log('Saved meeting_local_dark_choice.png');

  // Switch back to Light Mode
  await page.evaluate(() => {
    if (typeof window.applyTheme === 'function') window.applyTheme('light');
  });
  await sleep(500);

  // Mobile view
  console.log('Capturing mobile view...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await sleep(1000);
  const localShotMobile = path.join(ARTIFACT_DIR, 'meeting_local_mobile_choice.png');
  await page.screenshot({ path: localShotMobile, fullPage: true });
  console.log('Saved meeting_local_mobile_choice.png');

  // Switch back to Desktop view and test Admin view
  console.log('Switching to Admin view...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await sleep(500);
  await page.evaluate(() => {
    window.isAdminAuthenticated = true;
    if (typeof window.switchRoleView === 'function') {
      window.switchRoleView('ADMIN');
    }
  });
  await sleep(1500);
  const localShotAdminDash = path.join(ARTIFACT_DIR, 'meeting_local_admin_choice.png');
  await page.screenshot({ path: localShotAdminDash, fullPage: true });
  console.log('Saved meeting_local_admin_choice.png');

  await browser.close();
  console.log('All local captures finished successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
