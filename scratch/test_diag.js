const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'lucide-custom-style';
    style.innerHTML = `
      :where(svg.lucide) {
        width: 1em;
        height: 1em;
        display: inline-block;
        vertical-align: -0.15em;
      }
    `;
    document.head.appendChild(style);
    document.getElementById('mobileHeader')?.classList.remove('hidden');
    document.getElementById('appLayout')?.classList.remove('hidden');
    document.getElementById('authScreen')?.classList.add('hidden');
    window.lucide.createIcons();
  });
  const visible = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('svg.lucide'))
      .filter(el => el.getBoundingClientRect().width > 0)
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          icon: el.getAttribute('data-lucide'),
          classes: el.getAttribute('class'),
          w: Math.round(r.width * 10) / 10,
          h: Math.round(r.height * 10) / 10,
          parent: el.parentElement.tagName + '.' + (el.parentElement.className || '').slice(0, 30)
        };
      });
  });
  console.log('Tested with :where(svg.lucide):');
  console.table(visible.slice(0, 20));
  await browser.close();
})().catch(console.error);
