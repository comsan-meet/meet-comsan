const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('Starting Puppeteer with Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('auth') || url.includes('supabase') || url.includes('api') || url.includes('login') || url.includes('user')) {
      console.log('NET RESPONSE:', res.status(), url);
      try {
        const txt = await res.text();
        console.log('NET BODY:', txt.slice(0, 200));
      } catch(e){}
    }
  });

  console.log('Navigating to https://comsan-choice.vercel.app/auth ...');
  await page.goto('https://comsan-choice.vercel.app/auth', { waitUntil: 'networkidle2', timeout: 35000 });
  await sleep(1500);

  const authShot = path.join(ARTIFACT_DIR, 'choice_auth.png');
  await page.screenshot({ path: authShot, fullPage: true });
  console.log('Saved choice_auth.png');

  // Find inputs
  const inputs = await page.$$('input');
  console.log('Found inputs:', inputs.length);

  const emailInput = await page.$('input[type="email"], input[type="text"]');
  const passInput = await page.$('input[type="password"]');

  if (emailInput && passInput) {
    console.log('Typing credentials: comsan.choice@gmail.com and choice2025 ...');
    await emailInput.click({ clickCount: 3 });
    await emailInput.type('comsan.choice@gmail.com', { delay: 20 });
    await passInput.click({ clickCount: 3 });
    await passInput.type('choice2025', { delay: 20 });

    console.log('Finding login button by text...');
    const buttons = await page.$$('button');
    let loginBtn = null;
    for (const b of buttons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text && text.includes('เข้าสู่ระบบ')) {
        loginBtn = b;
        break;
      }
    }

    if (loginBtn) {
      console.log('Found login button! Clicking it...');
      await loginBtn.click();
    } else {
      console.log('Login button not found by text, clicking first button...');
      await buttons[0].click();
    }

    console.log('Waiting after click for 8 seconds...');
    await sleep(8000);

    console.log('Current URL after login attempt:', page.url());

    const dashShot = path.join(ARTIFACT_DIR, 'choice_dashboard.png');
    await page.screenshot({ path: dashShot, fullPage: true });
    console.log('Saved choice_dashboard.png');

    const html = await page.content();
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'choice_dashboard.html'), html, 'utf8');
    console.log('Saved choice_dashboard.html');

    // Mobile screenshot
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await sleep(1000);
    const mobileShot = path.join(ARTIFACT_DIR, 'choice_dashboard_mobile.png');
    await page.screenshot({ path: mobileShot, fullPage: true });
    console.log('Saved choice_dashboard_mobile.png');

    // Check if we can navigate to other paths or if there's a sidebar/nav
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await sleep(1000);

    // List links and buttons
    const navItems = await page.$$eval('a, nav button, aside button, aside a', els => els.map(e => ({
      tag: e.tagName,
      text: e.innerText?.trim(),
      href: e.href || e.getAttribute('href')
    })));
    console.log('Available navigation items:', JSON.stringify(navItems, null, 2));

    // Try navigating to home or other routes if still on /auth or if dashboard has routes
    const routesToTest = ['/', '/dashboard', '/voting', '/election', '/rewards', '/history', '/settings', '/admin'];
    for (const route of routesToTest) {
      try {
        console.log(`Checking route: ${route} ...`);
        await page.goto(`https://comsan-choice.vercel.app${route}`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(2000);
        console.log(`Route ${route} resolved to:`, page.url());
        if (!page.url().includes('/auth')) {
          const routeShot = path.join(ARTIFACT_DIR, `choice_route_${route.replace('/', '') || 'root'}.png`);
          await page.screenshot({ path: routeShot, fullPage: true });
          console.log(`Saved screenshot for ${route} to ${routeShot}`);
          const routeHtml = await page.content();
          fs.writeFileSync(path.join(ARTIFACT_DIR, `choice_route_${route.replace('/', '') || 'root'}.html`), routeHtml, 'utf8');
        }
      } catch (err) {
        console.log(`Failed navigating to ${route}:`, err.message);
      }
    }
  }

  await browser.close();
  console.log('All done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
