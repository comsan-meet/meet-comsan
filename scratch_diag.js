const puppeteer = require('c:/Users/NBODT/Desktop/CS-MEETING 2/comsan meeting server/node_modules/puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Login
  await page.type('#userLoginName', 'แมทธิว');
  await page.type('#userLoginPass', '123');
  await page.click('#authScreen button[type="submit"]');
  await new Promise(r => setTimeout(r, 800));

  const diag = await page.evaluate(() => {
    const h = document.getElementById('desktopMainHeader');
    const s = document.getElementById('appSidebar');
    const noteBtn = document.getElementById('uToolBtn_NOTE');
    const appLayout = document.getElementById('appLayout');
    const authScreen = document.getElementById('authScreen');

    const getParents = (el) => {
      const parents = [];
      let cur = el;
      while (cur) {
        parents.push({
          tag: cur.tagName,
          id: cur.id,
          classList: Array.from(cur.classList),
          display: window.getComputedStyle(cur).display,
          rect: cur.getBoundingClientRect()
        });
        cur = cur.parentElement;
      }
      return parents;
    };

    return {
      windowSize: { w: window.innerWidth, h: window.innerHeight },
      authScreen: {
        classList: Array.from(authScreen.classList),
        display: window.getComputedStyle(authScreen).display
      },
      appLayout: {
        classList: Array.from(appLayout.classList),
        display: window.getComputedStyle(appLayout).display
      },
      desktopHeaderParents: getParents(h),
      sidebarParents: getParents(s),
      noteBtnParents: getParents(noteBtn)
    };
  });

  console.log(JSON.stringify(diag, null, 2));
  await browser.close();
})();
