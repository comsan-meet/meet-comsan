const puppeteer = require('puppeteer-core');
const fs = require('fs');
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

  console.log('Navigating to auth...');
  await page.goto('https://comsan-choice.vercel.app/auth', { waitUntil: 'networkidle2' });

  const emailInput = await page.$('input[type="email"], input[type="text"]');
  const passInput = await page.$('input[type="password"]');
  await emailInput.type('comsan.choice@gmail.com');
  await passInput.type('choice2025');

  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text && text.includes('เข้าสู่ระบบ')) {
      await b.click();
      break;
    }
  }

  await sleep(6000);

  const routes = [
    { name: 'all-votes', path: '/all-votes' },
    { name: 'members', path: '/members' },
    { name: 'board', path: '/board' },
    { name: 'products', path: '/products' },
    { name: 'profile', path: '/profile' }
  ];

  for (const r of routes) {
    console.log(`Navigating to ${r.path}...`);
    try {
      await page.goto(`https://comsan-choice.vercel.app${r.path}`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2000);
      const shotPath = path.join(ARTIFACT_DIR, `choice_${r.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      console.log(`Saved ${shotPath}`);
    } catch(e) {
      console.log(`Error on ${r.path}:`, e.message);
    }
  }

  // Go to settings and switch to dark mode
  console.log('Switching to dark mode in /settings...');
  await page.goto('https://comsan-choice.vercel.app/settings', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Find the dark theme button in settings
  const darkBtn = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('button, div[role="button"], label, div'));
    const darkEl = elements.find(el => el.innerText && el.innerText.trim() === 'มืด');
    if (darkEl) {
      darkEl.click();
      return true;
    }
    return false;
  });
  console.log('Clicked dark mode:', darkBtn);
  await sleep(1500);

  const darkSettingsShot = path.join(ARTIFACT_DIR, 'choice_settings_dark.png');
  await page.screenshot({ path: darkSettingsShot, fullPage: true });
  console.log('Saved choice_settings_dark.png');

  // Also capture dashboard in dark mode
  await page.goto('https://comsan-choice.vercel.app/', { waitUntil: 'networkidle2' });
  await sleep(2000);
  const darkHomeShot = path.join(ARTIFACT_DIR, 'choice_home_dark.png');
  await page.screenshot({ path: darkHomeShot, fullPage: true });
  console.log('Saved choice_home_dark.png');

  await browser.close();
  console.log('All extra screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
