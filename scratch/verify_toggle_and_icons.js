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
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Make mobileHeader & appLayout active
  await page.evaluate(() => {
    const hdr = document.getElementById('mobileHeader');
    if (hdr) {
      hdr.classList.remove('hidden');
      hdr.classList.add('flex');
    }
    const appLayout = document.getElementById('appLayout');
    if (appLayout) {
      appLayout.classList.remove('hidden');
      appLayout.classList.add('flex');
    }
    const auth = document.getElementById('authScreen');
    if (auth) auth.classList.add('hidden');
  });

  // Light Mode Button Screenshot
  await page.evaluate(() => applyTheme('light'));
  await new Promise(r => setTimeout(r, 400));
  const mobileBtn = await page.$('#themeToggleBtn');
  if (mobileBtn) {
    await mobileBtn.screenshot({ path: path.join(artifactDir, 'verify_btn_light_sun.png') });
  }

  // Dark Mode Button Screenshot
  await page.evaluate(() => applyTheme('dark'));
  await new Promise(r => setTimeout(r, 400));
  if (mobileBtn) {
    await mobileBtn.screenshot({ path: path.join(artifactDir, 'verify_btn_dark_moon.png') });
  }

  // Desktop Viewport
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluate(() => applyTheme('light'));
  await new Promise(r => setTimeout(r, 400));
  const sidebarBtn = await page.$('#sidebarThemeBtn');
  if (sidebarBtn) {
    await sidebarBtn.screenshot({ path: path.join(artifactDir, 'verify_sidebar_btn_light_sun.png') });
  }

  await page.evaluate(() => applyTheme('dark'));
  await new Promise(r => setTimeout(r, 400));
  if (sidebarBtn) {
    await sidebarBtn.screenshot({ path: path.join(artifactDir, 'verify_sidebar_btn_dark_moon.png') });
  }

  // Also capture the header group containing User/Admin pill, Theme button, Settings gear
  // matching user's uploaded image exactly!
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => applyTheme('light'));
  await new Promise(r => setTimeout(r, 300));
  const headerRightGroup = await page.evaluate(() => {
    const btn = document.getElementById('themeToggleBtn');
    const parent = btn ? btn.parentElement : null;
    if (!parent) return null;
    const r = parent.getBoundingClientRect();
    return { x: r.x - 10, y: r.y - 6, width: r.width + 20, height: r.height + 12 };
  });

  if (headerRightGroup) {
    await page.screenshot({
      path: path.join(artifactDir, 'verify_header_controls_light_sun.png'),
      clip: headerRightGroup
    });
  }

  await page.evaluate(() => applyTheme('dark'));
  await new Promise(r => setTimeout(r, 300));
  if (headerRightGroup) {
    await page.screenshot({
      path: path.join(artifactDir, 'verify_header_controls_dark_moon.png'),
      clip: headerRightGroup
    });
  }

  await browser.close();
  console.log('Button screenshots captured successfully!');
}

verify().catch(console.error);
