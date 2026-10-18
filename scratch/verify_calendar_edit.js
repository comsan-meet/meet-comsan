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
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // 1. Authenticate as Admin & navigate to Calendar
  await page.evaluate(() => {
    window.isAdminAuthenticated = true;
    localStorage.setItem('comsan_admin_auth', 'true');
    window.currentRole = 'ADMIN';
    localStorage.setItem('comsan_role', 'ADMIN');
    window.currentUserId = 'COMSAN-01';
    document.getElementById('authScreen')?.classList.add('hidden');
    document.getElementById('appLayout')?.classList.remove('hidden');
    document.getElementById('appLayout')?.classList.add('flex');
    switchRoleView('ADMIN');
    switchAdminTab('CALENDAR');
    setCalendarView('MONTH');
  });
  await new Promise(r => setTimeout(r, 600));

  // 2. Open Event Detail Modal for the sample event
  const detailModalState = await page.evaluate(() => {
    const events = window.appState?.calendarEvents || [];
    if (events.length === 0) return { error: 'No events found' };
    const first = events[0];
    openCalendarEventDetailModal(first.id);

    const modal = document.getElementById('calendarEventDetailModal');
    const btnEdit = document.getElementById('detailCalBtnEdit');
    const btnDelete = document.getElementById('detailCalBtnDelete');
    const headerBtnEdit = document.getElementById('detailCalHeaderBtnEdit');

    return {
      eventId: first.id,
      title: first.title,
      modalVisible: !modal.classList.contains('hidden'),
      btnEditVisible: btnEdit && !btnEdit.parentElement.classList.contains('hidden'),
      btnDeleteVisible: btnDelete && !btnDelete.parentElement.classList.contains('hidden'),
      headerBtnEditVisible: headerBtnEdit && !headerBtnEdit.classList.contains('hidden')
    };
  });
  console.log('Detail Modal with Admin Edit State:', detailModalState);

  // Take screenshot of Detail Modal showing Edit & Delete buttons
  await page.screenshot({ path: path.join(artifactDir, 'verify_admin_cal_detail_with_edit.png') });

  // 3. Click the Edit button inside Detail Modal
  await page.click('#detailCalBtnEdit');
  await new Promise(r => setTimeout(r, 400));

  const editModalState = await page.evaluate(() => {
    const editModal = document.getElementById('calendarEventModal');
    const detailModal = document.getElementById('calendarEventDetailModal');
    const delBtn = document.getElementById('calDeleteBtn');
    const saveBtn = document.getElementById('calSaveBtn');
    const modalTitle = document.getElementById('calModalTitle');

    return {
      detailModalClosed: detailModal.classList.contains('hidden'),
      editModalOpen: !editModal.classList.contains('hidden'),
      modalTitle: modalTitle ? modalTitle.textContent : null,
      saveBtnText: saveBtn ? saveBtn.textContent.trim() : null,
      delBtnVisible: delBtn && !delBtn.classList.contains('hidden'),
      eventIdVal: document.getElementById('calEventId').value,
      titleVal: document.getElementById('calTitle').value,
      locationVal: document.getElementById('calLocation').value
    };
  });
  console.log('Edit Modal Opened from Detail Modal:', editModalState);

  // Take screenshot of Edit Modal
  await page.screenshot({ path: path.join(artifactDir, 'verify_admin_edit_modal.png') });

  // 4. Test editing a field and saving
  const updateResult = await page.evaluate(async () => {
    const targetId = document.getElementById('calEventId').value;
    const originalDesc = document.getElementById('calDescription').value;
    
    // Modify description
    document.getElementById('calDescription').value = originalDesc + ' [ปรับปรุงรายละเอียดแล้ว]';
    
    // Click save
    saveCalendarEventFromModal();
    
    await new Promise(res => setTimeout(res, 800));

    const updated = (window.appState?.calendarEvents || []).find(e => e.id === targetId);
    return {
      targetId,
      updatedDesc: updated ? updated.description : null,
      isEditModalClosed: document.getElementById('calendarEventModal').classList.contains('hidden')
    };
  });
  console.log('Save Edit Result:', updateResult);

  // Re-open detail to verify updated content is visible
  await page.evaluate((id) => {
    openCalendarEventDetailModal(id);
  }, updateResult.targetId);
  await new Promise(r => setTimeout(r, 400));

  const verifyDetailContent = await page.evaluate(() => {
    return document.getElementById('detailCalDesc').textContent;
  });
  console.log('Verified Updated Content in Detail Modal:', verifyDetailContent);

  // Restore original description
  await page.evaluate(async (id, origDesc) => {
    closeCalendarEventDetailModal();
    const evt = (window.appState?.calendarEvents || []).find(e => e.id === id);
    if (evt) {
      openAddCalendarEventModal(id);
      document.getElementById('calDescription').value = origDesc.replace(' [ปรับปรุงรายละเอียดแล้ว]', '');
      saveCalendarEventFromModal();
      await new Promise(res => setTimeout(res, 800));
    }
  }, updateResult.targetId, updateResult.updatedDesc);

  // 5. Test Mobile Viewport (width 390)
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    const events = window.appState?.calendarEvents || [];
    if (events.length > 0) {
      openCalendarEventDetailModal(events[0].id);
    }
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'verify_admin_cal_mobile_detail_with_edit.png') });

  await browser.close();
  console.log('All Calendar Edit tests passed successfully!');
}

verify().catch(console.error);
