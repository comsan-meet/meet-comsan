const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  const consoleMessages = [];
  const failedRequests = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), error: req.failure().errorText });
  });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  const stats = await page.evaluate(() => {
    return {
      lucideSvgCount: document.querySelectorAll('svg.lucide').length,
      remainingDataLucide: document.querySelectorAll('[data-lucide]:not(svg)').length,
      faCount: document.querySelectorAll('i[class*="fa-"], span[class*="fa-"]').length,
      hasGetUserAvatarUrl: typeof window.getUserAvatarUrl === 'function',
      hasUpdateAvatarElement: typeof window.updateAvatarElement === 'function',
      hasGetAvatarImageHtml: typeof window.getAvatarImageHtml === 'function'
    };
  });

  console.log('Page Load Stats:', stats);
  console.log('Failed Requests:', failedRequests);
  const errors = consoleMessages.filter(m => m.type === 'error');
  console.log('Console Errors:', errors);

  await browser.close();
})().catch(console.error);
