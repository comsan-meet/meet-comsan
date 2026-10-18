const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', async res => {
    const url = res.url();
    if (!url.endsWith('.js') && !url.endsWith('.css') && !url.endsWith('.woff2') && !url.endsWith('.svg')) {
      console.log('RESPONSE:', res.status(), url);
      try {
        const text = await res.text();
        console.log('RESPONSE BODY:', text.slice(0, 300));
      } catch(e){}
    }
  });

  await page.goto('https://comsan-choice.vercel.app/auth', { waitUntil: 'networkidle2' });

  const emailInput = await page.$('input[type="email"], input[type="text"]');
  const passInput = await page.$('input[type="password"]');
  await emailInput.type('comsan.choice@gmail.com');
  await passInput.type('choice2025');

  const submitBtn = await page.$('button[type="submit"], form button');
  console.log('Submit button found:', !!submitBtn);
  await submitBtn.click();

  await new Promise(r => setTimeout(r, 6000));
  console.log('Final URL:', page.url());

  const screenshotPath = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1\\choice_after_submit.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
})();
