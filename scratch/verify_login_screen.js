const puppeteer = require('c:/Users/NBODT/Desktop/CS-MEETING 2/comsan meeting server/node_modules/puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';

async function verifyLogin() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 600, height: 750 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Make sure we are on the unauthenticated login screen
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.isAdminAuthenticated = false;
    window.isUserAuthenticated = false;
    window.currentUserId = null;
    if (typeof window.updateSidebarVisibility === 'function') window.updateSidebarVisibility();
  });
  await new Promise(r => setTimeout(r, 600));

  const loginInfo = await page.evaluate(() => {
    const label = document.querySelector('#authScreen label');
    const input = document.getElementById('userLoginName');
    return {
      labelText: label ? label.textContent.trim() : null,
      placeholderText: input ? input.getAttribute('placeholder') : null
    };
  });
  console.log('Login Info:', loginInfo);

  await page.screenshot({ path: path.join(artifactDir, 'verify_updated_login_screen.png') });
  await browser.close();
}

verifyLogin().catch(err => {
  console.error(err);
  process.exit(1);
});
