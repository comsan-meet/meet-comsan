const puppeteer = require('c:/Users/NBODT/Desktop/CS-MEETING 2/comsan meeting server/node_modules/puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';

async function testLayout() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test Mobile (390x844)
  console.log('Capturing mobile view...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    window.isAdminAuthenticated = true;
    window.switchRoleView('ADMIN');
    window.switchAdminTab('DASHBOARD');
    window.updateSidebarVisibility();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(artifactDir, 'verify_analytics_mobile_new.png') });

  // Test Desktop (1280x800)
  console.log('Capturing desktop view...');
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'verify_analytics_desktop_new.png') });

  // Test Attendance Tab on Mobile
  console.log('Capturing attendance tab on mobile...');
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    window.setAdminChartMetric('ATTENDANCE');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'verify_analytics_attendance_mobile_new.png') });

  await browser.close();
  console.log('Capture finished!');
}

testLayout().catch(err => {
  console.error(err);
  process.exit(1);
});
