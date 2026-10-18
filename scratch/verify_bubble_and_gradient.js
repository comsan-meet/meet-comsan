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
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Simulate active meeting matching the user's uploaded image exactly
  console.log('Simulating active meeting with Amber theme (orange)...');
  await page.evaluate(() => {
    window.isUserAuthenticated = true;
    window.currentUserId = 'COMSAN-01';
    window.switchRoleView('USER');
    window.switchUserTab('HOME');
    window.setColorPalette('amber');
    window.setAppearance('light');

    if (window.appState && window.appState.meeting) {
      window.appState.meeting.isStarted = true;
      window.appState.meeting.isEnded = false;
      window.appState.meeting.format = 'ONLINE';
      window.appState.meeting.onlinePlatform = 'GOOGLE_MEET';
      window.appState.meeting.title = 'การประชุมออนไลน์ (Google Meet)';
      window.appState.meeting.startTime = '17:00';
      window.appState.meeting.endTime = '19:00';
      window.appState.meeting.lateTime = '17:15';
    }
    if (typeof window.renderAll === 'function') window.renderAll();
    window.updateSidebarVisibility();
  });
  await new Promise(r => setTimeout(r, 600));

  // Screenshot Amber Light Active Meeting
  await page.screenshot({ path: path.join(artifactDir, 'verify_active_hero_amber_light.png') });

  // Test Amber Dark Active Meeting
  console.log('Testing Amber theme in Dark Mode...');
  await page.evaluate(() => {
    window.setAppearance('dark');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'verify_active_hero_amber_dark.png') });

  // Test Mobile View (390x844)
  console.log('Testing on Mobile viewport...');
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    window.setAppearance('light');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'verify_active_hero_amber_mobile.png') });

  // Test Settings Modal
  console.log('Opening Settings Modal on mobile...');
  await page.evaluate(() => {
    window.openSettingsModal();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'verify_settings_modal_bubble_toggle.png') });

  // Toggle bubbles OFF
  console.log('Toggling bubbles OFF in Settings...');
  await page.evaluate(() => {
    window.toggleHeroBubbleAnimation(false);
    window.closeSettingsModal();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, 'verify_active_hero_amber_bubbles_off.png') });

  await browser.close();
  console.log('Finished active meeting verification!');
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
