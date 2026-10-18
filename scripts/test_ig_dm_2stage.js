const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    // Test on a compact 360x780 mobile viewport (like standard Android / compact iPhone) to ensure zero overflow!
    await page.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await sleep(600);

    // Login using the first user in window.appState.users
    await page.evaluate(() => {
      const u = (window.appState && window.appState.users && window.appState.users[0]) || { id: 'COMSAN-01', password: '123' };
      document.getElementById('userLoginName').value = u.id;
      document.getElementById('userLoginPass').value = u.password;
      window.handleUserLogin();
    });
    await sleep(900);

    // Dismiss any auto-popups
    await page.evaluate(() => {
      if (typeof window.closeAutoVotePopup === 'function') window.closeAutoVotePopup();
      const autoVoteModal = document.getElementById('autoVotePopupModal');
      if (autoVoteModal) autoVoteModal.classList.add('hidden');
      const randomModal = document.getElementById('randomPopupModal');
      if (randomModal) randomModal.classList.add('hidden');
    });
    await sleep(300);

    // Switch to CHAT tab -> Opens Stage 1 Inbox
    await page.evaluate(() => {
      window.switchUserTab('CHAT');
      const tc = document.getElementById('toastContainer');
      if (tc) tc.innerHTML = '';
    });
    await sleep(500);

    // Check Stage 1 Inbox: how many items are in #igChatConversationList when on ALL tab
    const inboxInfo = await page.evaluate(() => {
      const rows = document.querySelectorAll('#igChatConversationList > div');
      return {
        rowCount: rows.length,
        titles: Array.from(rows).map(r => {
          const h4 = r.querySelector('h4');
          return h4 ? h4.textContent.trim() : '';
        })
      };
    });
    console.log('Stage 1 Inbox (ALL tab - active messages only):', inboxInfo);

    // Screenshot 1: Stage 1 Inbox (Clean header, tight search-to-notes spacing, ONLY active messages + Clear Chat button)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ig_chat_v2_inbox.png') });
    console.log('Saved ig_chat_v2_inbox.png');

    // Open a chat room (COMSAN-03) -> Stage 2 Room View
    await page.evaluate(() => {
      window.openIgChatRoom('COMSAN-03');
    });
    await sleep(500);

    // Verify send button bounding box is strictly within 360px viewport width!
    const roomBounds = await page.evaluate(() => {
      const sendBtn = document.getElementById('floatingChatSendBtn');
      const rect = sendBtn ? sendBtn.getBoundingClientRect() : null;
      return {
        viewportWidth: window.innerWidth,
        sendBtnLeft: rect ? Math.round(rect.left) : null,
        sendBtnRight: rect ? Math.round(rect.right) : null,
        fitsInsideScreen: rect ? rect.right <= window.innerWidth : false
      };
    });
    console.log('Stage 2 Room Send Button Bounds:', roomBounds);

    // Screenshot 2: Stage 2 Chat Room (No top-right redundant icons, Send button fits 100% inside screen)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ig_chat_v2_room.png') });
    console.log('Saved ig_chat_v2_room.png');

    // Return to Stage 1 Inbox and test "เคลียร์แชท" (Clear All Chats)
    await page.evaluate(() => {
      window.closeIgChatRoom();
    });
    await sleep(400);

    await page.evaluate(() => {
      window.clearAllIgConversations();
    });
    await sleep(500);

    // Screenshot 3: Stage 1 Inbox after clicking "เคลียร์แชท"
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ig_chat_v2_cleared.png') });
    console.log('Saved ig_chat_v2_cleared.png');

    // Restore one message in ALL room so the inbox has a sample active conversation if needed
    await page.evaluate(() => {
      localStorage.removeItem(`comsan_cleared_chats_${window.currentUserId}`);
      window.renderIgInboxView();
    });

  } finally {
    await browser.close();
  }
})();
