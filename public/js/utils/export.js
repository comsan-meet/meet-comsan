/**
 * COMSAN Meeting System - Export Utilities (PDF & Excel)
 */

function wrapThaiTextLines(ctx, text, maxWidth) {
  const paragraphs = String(text || '').split('\n');
  const lines = [];
  const segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter)
    ? new Intl.Segmenter('th', { granularity: 'word' })
    : null;

  paragraphs.forEach(para => {
    if (!para) {
      lines.push('');
      return;
    }
    const tokens = segmenter
      ? Array.from(segmenter.segment(para), s => s.segment)
      : para.split(/(\s+)/);

    let currentLine = '';
    tokens.forEach(token => {
      const testLine = currentLine + token;
      if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = token.trimStart();
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine !== '') lines.push(currentLine);
  });
  return lines;
}

async function generatePDFForUser(userId) {
  const state = window.appState || {};
  let user = (state.users || []).find(u => u.id === userId);
  if (!user && window.appState && window.appState.currentUser) {
    user = window.appState.currentUser;
  }
  if (!user) {
    user = {
      firstName: 'สมาชิก',
      lastName: 'ชมรม',
      nickname: 'COMSAN',
      position: 'สมาชิกชมรม'
    };
  }
  const m = state.meeting || {};

  const ed = document.getElementById('userNoteEditor');
  const ta = document.getElementById('userNoteTextarea');
  let noteHtml = '';
  if (userId === window.currentUserId) {
    if (ed && ed.innerHTML.trim() !== '' && ed.innerHTML.trim() !== '<br>') {
      noteHtml = ed.innerHTML;
    } else if (ta && ta.value.trim() !== '') {
      noteHtml = ta.value;
    }
  }
  if (!noteHtml) {
    noteHtml = user.note || '';
  }

  if (!noteHtml || noteHtml.trim() === '' || noteHtml === '<br>') {
    noteHtml = '<p style="color: #64748b; font-style: italic;">(ไม่มีข้อความบันทึกการประชุม)</p>';
  } else if (!noteHtml.includes('<') || !noteHtml.includes('>')) {
    noteHtml = noteHtml.split('\n').map(line => `<p style="margin: 4px 0;">${line || '&nbsp;'}</p>`).join('');
  }

  if (typeof showToast === 'function') {
    showToast('กำลังสร้างไฟล์ PDF หลายหน้า...', 'info');
  }

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const meta = (typeof getNoteDocMeta === 'function') ? getNoteDocMeta() : {
      location: m.location || 'ห้องประชุมชมรมสันทนาการ',
      date: `วันที่ ${new Date().getDate()} ${new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`
    };

    let selectedFont = "'Prompt', Tahoma, -apple-system, sans-serif";
    try {
      const saved = localStorage.getItem('comsan_note_font');
      if (saved) selectedFont = saved;
    } catch (e) {}

    // Transform editor visual page-break into clean html2pdf pagebreak
    const processedNoteHtml = String(noteHtml || '')
      .replace(/<div class="note-page-break-container"[\s\S]*?<\/div>\s*<\/div>/gi, '<div class="html2pdf__page-break" style="page-break-before: always; break-before: page; height: 0; margin: 0; padding: 0; border: none;"></div>');

    // Build print container for multi-page PDF (clean normal flow container, without fixed positioning or negative z-index)
    const printContainer = document.createElement('div');
    printContainer.id = 'pdfNoteExportContainer';
    printContainer.style.cssText = `
      width: 718px;
      margin: 0 auto;
      background-color: #ffffff;
      color: #0f172a;
      font-family: ${selectedFont};
      padding: 24px 28px;
      box-sizing: border-box;
      line-height: 1.65;
    `;

    // Modern Header Meta Box with scoped CSS for formatted notes
    const headerHtml = `
      <style>
        #pdfNoteExportContainer { background-color: #ffffff !important; color: #0f172a !important; font-family: ${selectedFont}; }
        #pdfNoteExportContainer * { box-sizing: border-box; position: static !important; float: none !important; }
        #pdfNoteExportContainer p { margin: 6px 0; line-height: 1.65 !important; }
        #pdfNoteExportContainer ul { list-style-type: disc; margin: 8px 0 8px 24px; padding-left: 10px; }
        #pdfNoteExportContainer ol { list-style-type: decimal; margin: 8px 0 8px 24px; padding-left: 10px; }
        #pdfNoteExportContainer li { margin: 3px 0; line-height: 1.65 !important; }
        #pdfNoteExportContainer h1 { font-size: 18px; font-weight: 700; margin: 14px 0 6px 0; color: #1e1b4b; }
        #pdfNoteExportContainer h2 { font-size: 16px; font-weight: 700; margin: 12px 0 5px 0; color: #1e293b; }
        #pdfNoteExportContainer h3 { font-size: 14px; font-weight: 600; margin: 10px 0 4px 0; color: #334155; }
        #pdfNoteExportContainer img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block; }
        #pdfNoteExportContainer table { border-collapse: collapse; width: 100%; }
        .html2pdf__page-break { page-break-before: always !important; break-before: page !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
      </style>

      <!-- หัวกระดาษ: ด้านซ้ายเป็นโลโก้ชมรม (comsan (2).png), ตรงกลางเป็น วันที่ เดือน ปี ที่เขียน, ด้านขวาเป็น เขียนที่ -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; margin-bottom: 18px; border-bottom: 2px solid #312e81;">
        <!-- ด้านซ้าย: โลโก้ชมรม comsan (2).png -->
        <div style="width: 130px; text-align: left; display: flex; align-items: center;">
          <img src="Comsan (2).PNG" id="pdfDocLogoImg" alt="โลโก้ชมรม" style="height: 56px; width: auto; max-width: 125px; object-fit: contain; display: block;" onerror="this.onerror=null; this.src='comsan (2).png';" />
        </div>

        <!-- ตรงกลาง: วันที่ เดือน ปี ที่เขียน -->
        <div style="flex: 1; text-align: center; padding: 0 10px;">
          <div style="font-size: 15.5px; font-weight: 800; color: #1e1b4b; font-family: ${selectedFont};">บันทึกการประชุมชมรมสันทนาการ</div>
          <div style="font-size: 13px; font-weight: 600; color: #4338ca; margin-top: 3px; font-family: ${selectedFont};">${meta.date}</div>
          ${m.title ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px; font-family: ${selectedFont};">เรื่อง: ${m.title}</div>` : ''}
        </div>

        <!-- ด้านขวา: เขียนที่ -->
        <div style="width: 150px; text-align: right; font-size: 12px; color: #334155; font-family: ${selectedFont}; line-height: 1.35;">
          <div style="font-weight: 700; color: #1e293b;">เขียนที่</div>
          <div style="color: #4338ca; font-weight: 600; margin-top: 2px;">${meta.location}</div>
        </div>
      </div>

      <div class="note-body-content" style="font-size: 13.5px; color: #1e293b; word-break: break-word; font-family: ${selectedFont};">
        ${processedNoteHtml}
      </div>

      <!-- ท้ายกระดาษ: ชื่อผู้จดบันทึก และตำแหน่งของผู้จดบันทึก -->
      <div style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; font-family: ${selectedFont};">
        <div style="text-align: left; font-size: 10.5px; color: #94a3b8;">
          <div>ระบบจัดการประชุมชมรมสันทนาการ (COMSAN Meeting)</div>
          <div>พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
        </div>
        <div style="text-align: right;">
          <div style="margin-bottom: 4px; font-size: 12px; color: #334155;">
            ลงชื่อ <span style="font-weight: 700; color: #1e293b; text-decoration: underline;">${user.firstName} ${user.lastName} (${user.nickname || '-'})</span> ผู้จดบันทึก
          </div>
          <div style="font-size: 11.5px; color: #4338ca; font-weight: 600;">
            ตำแหน่ง: ${user.position || 'สมาชิกชมรม'}
          </div>
        </div>
      </div>
    `;

    printContainer.innerHTML = headerHtml;

    // Apply inline style adjustments for printed content
    const noteImgs = printContainer.querySelectorAll('img');
    noteImgs.forEach(img => {
      if (img.id === 'pdfDocLogoImg') return;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '8px';
      img.style.margin = '8px 0';
      img.style.display = 'block';
    });

    // Wait for images inside container to finish loading
    if (noteImgs.length > 0) {
      await Promise.all(Array.from(noteImgs).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 2500);
        });
      }));
    }

    const safeNickname = String(user.nickname || user.firstName || 'สมาชิก').replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `Note_${safeNickname}_COMSAN.pdf`;

    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [12, 12, 18, 12], // Top 12mm, Left 12mm, Bottom 18mm, Right 12mm
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: false, // Prevents text overlapping in complex scripts!
          logging: false,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      const worker = html2pdf().set(opt).from(printContainer);
      const pdfBlob = await worker.output('blob');

      if (pdfBlob && typeof triggerUniversalBlobDownload === 'function') {
        await triggerUniversalBlobDownload(pdfBlob, filename);
        if (typeof showToast === 'function') showToast('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว!', 'success');
      } else if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 10000);
        if (typeof showToast === 'function') showToast('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว!', 'success');
      } else {
        await worker.save();
        if (typeof showToast === 'function') showToast('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว!', 'success');
      }
    } else {
      if (typeof showToast === 'function') showToast('ไม่พบไลบรารีสร้าง PDF', 'error');
    }
  } catch (err) {
    console.error('PDF generation error:', err);
    if (typeof showToast === 'function') showToast('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF', 'error');
  }
}

function exportUserNoteToPDF() {
  if (!window.currentUserId) return;
  generatePDFForUser(window.currentUserId);
}

function downloadSampleTemplate() {
  if (typeof XLSX === 'undefined') return;
  const ws = XLSX.utils.json_to_sheet([
    { 'ชื่อ': 'อิทธิพัทธ์', 'นามสกุล': 'พืชผักหวาน', 'ชื่อเล่น': 'ประธานคมสัน', 'ชั้นปี': '2', 'สาขา': 'AI', 'ตำแหน่งในชมรม': 'ประธานชมรม', 'รหัสผ่าน': '1234' },
    { 'กมลชนก': 'ใจดี', 'ชื่อ': 'กมลชนก', 'นามสกุล': 'ใจดี', 'ชื่อเล่น': 'พลอย', 'ชั้นปี': '2', 'สาขา': 'CS', 'ตำแหน่งในชมรม': 'เลขานุการ', 'รหัสผ่าน': '1234' }
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'COMSAN_Members');
  XLSX.writeFile(wb, 'COMSAN_Template_รายชื่อสมาชิก.xlsx');
}

function exportSummaryExcel(customMeetingRecord) {
  if (typeof XLSX === 'undefined') return;
  const state = window.appState;
  
  let m = null;
  let users = [];
  let motions = [];

  if (customMeetingRecord) {
    m = customMeetingRecord;
    users = customMeetingRecord.users || [];
    motions = customMeetingRecord.motions || [];
  } else if (window.selectedHistoryMeetingId && Array.isArray(state.meetingHistory)) {
    const found = state.meetingHistory.find(h => h.id === window.selectedHistoryMeetingId);
    if (found) {
      m = found;
      users = found.users || [];
      motions = found.motions || [];
    }
  }

  if (!m) {
    const isMeetingActive = Boolean(state.meeting && state.meeting.isStarted && !state.meeting.isEnded);
    m = isMeetingActive
      ? (state.meeting || {})
      : (state.lastMeetingSummary ? {
          title: state.lastMeetingSummary.meetingTitle || state.lastMeetingSummary.title,
          location: state.lastMeetingSummary.location,
          date: state.lastMeetingSummary.meetingDate || state.lastMeetingSummary.date,
          endDate: state.lastMeetingSummary.endDate || state.lastMeetingSummary.meetingEndDate || state.lastMeetingSummary.date,
          startTime: state.lastMeetingSummary.startTime,
          endTime: state.lastMeetingSummary.endTime,
          scheduledEndTime: state.lastMeetingSummary.scheduledEndTime || state.lastMeetingSummary.endTime,
          actualEndTime: state.lastMeetingSummary.actualEndTime || state.lastMeetingSummary.endedTimeStr,
          lateTime: state.lastMeetingSummary.lateTime,
          format: state.lastMeetingSummary.format,
          onlinePlatform: state.lastMeetingSummary.onlinePlatform
        } : (state.meeting || {}));
    users = (typeof window.getSummaryUsers === 'function') ? window.getSummaryUsers() : (state.users || []);
    motions = (isMeetingActive || !state.lastMeetingSummary)
      ? (state.motions || [])
      : (state.lastMeetingSummary.motions || []);
  }

  const meetingTitle = m.title || m.meetingTitle || 'การประชุมชมรมสันทนาการ';
  const meetingDate = (m.endDate && m.endDate !== m.date)
    ? `${m.date} ถึง ${m.endDate}`
    : (m.date || m.meetingDate || (new Date().toISOString().slice(0, 10)));
  const schedEnd = m.scheduledEndTime || m.endTime || '-';
  const actualEnd = m.actualEndTime || m.endedTimeStr || '-';
  const meetingFormat = m.format === 'ONLINE' ? `ออนไลน์ (${m.onlinePlatform || 'Online'})` : `ออนไซต์ (${m.location || '-'})`;

  const onTimeCount = users.filter(u => u.checkedIn && !u.isLate && !u.isLeave).length;
  const lateCount = users.filter(u => u.checkedIn && u.isLate && !u.isLeave).length;
  const leaveCount = users.filter(u => u.isLeave).length;
  const absentCount = users.filter(u => !u.checkedIn && !u.isLeave).length;

  const aoa = [
    ['รายงานสรุปผลการประชุมชมรมสันทนาการ (COMSAN)'],
    ['หัวข้อการประชุม', meetingTitle],
    ['รูปแบบการประชุม / สถานที่', meetingFormat],
    ['วัน เดือน ปี ที่ประชุม', meetingDate],
    ['เวลากำหนดการประชุม', `เริ่ม ${m.startTime || '-'} น. ถึง ${schedEnd} น. (ตัดสาย: ${m.lateTime || '-'} น.)`],
    ['เวลาปิดการประชุมจริง', actualEnd && actualEnd !== '-' ? `${actualEnd} น.` : '-'],
    ['สรุปภาพรวมการเข้าร่วม', `ทั้งหมด ${users.length} คน | มาทัน ${onTimeCount} คน | มาสาย ${lateCount} คน | ลา ${leaveCount} คน | ขาด ${absentCount} คน`],
    [],
    ['สรุปผลคะแนนโหวตในแต่ละญัตติ']
  ];
  if (!motions || motions.length === 0) {
    aoa.push(['ไม่มีญัตติที่เปิดโหวต']);
  } else {
    aoa.push(['รหัสญัตติ', 'หัวข้อญัตติ', 'รูปแบบ', 'ผลคะแนนรวม']);
    motions.forEach(mot => {
      const opts = typeof window.getMotionOptions === 'function' ? window.getMotionOptions(mot) : (mot.options || []);
      const votesVals = Object.values(mot.votes || {});
      aoa.push([
        mot.id,
        mot.title,
        mot.isSecret ? 'โหวตลับ' : 'โหวตเปิดเผย',
        opts.map(o => `${o.label}: ${votesVals.filter(v => v === o.id).length} คะแนน`).join(' | ')
      ]);
    });
  }
  aoa.push([], ['รหัสสมาชิก', 'ชื่อ', 'นามสกุล', 'ชื่อเล่น', 'ชั้นปี', 'สาขา', 'ตำแหน่งในชมรม', 'สถานะ', 'เวลาเช็คชื่อ', 'เวลาเข้าประชุม (นาที)', 'จำนวนยกมือ', 'ประวัติการโหวต', 'โน้ต']);
  users.forEach(u => {
    const voteSummary = motions.map(mot => {
      const v = mot.votes ? mot.votes[u.id] : null;
      if (!v) return `${mot.title}: ไม่ลงคะแนน`;
      if (mot.isSecret) return `${mot.title}: ลงคะแนนแล้ว (โหวตลับ)`;
      const opts = typeof window.getMotionOptions === 'function' ? window.getMotionOptions(mot) : (mot.options || []);
      const foundOpt = opts.find(o => o.id === v);
      return `${mot.title}: ${foundOpt ? foundOpt.label : v}`;
    }).join(' | ');
    const st = u.isLeave ? `ลา (${u.leaveReason || '-'})` : u.checkedIn ? (u.isLate ? 'มาสาย' : 'มาทันเวลา') : 'ขาดประชุม';
    aoa.push([u.id, u.firstName, u.lastName, u.nickname, u.year, u.major, u.position, st, u.checkInTimeStr, u.attendedMinutes || 0, u.raiseHandCount || 0, voteSummary || '-', u.note || '-']);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'สรุปผลการประชุม_COMSAN');
  const safeTitle = String(meetingTitle).replace(/[/\\?%*:|"<>]/g, '_').slice(0, 30);
  XLSX.writeFile(wb, `สรุปผลการประชุม_${safeTitle}_${meetingDate}.xlsx`);
  if (typeof showToast === 'function') {
    showToast(`ดาวน์โหลดสรุปผลการประชุม (${meetingTitle}) เรียบร้อยแล้ว`, 'success');
  }
}

function exportHistoryMeetingExcel(meetingId) {
  const state = window.appState;
  if (!state) return;
  if (meetingId === 'LIVE_CURRENT' || !meetingId) {
    if (typeof exportSummaryExcel === 'function') exportSummaryExcel();
    return;
  }
  if (!Array.isArray(state.meetingHistory)) return;
  const target = state.meetingHistory.find(h => h.id === meetingId);
  if (!target) {
    if (typeof showToast === 'function') showToast('ไม่พบข้อมูลการประชุมย้อนหลังที่ต้องการดาวน์โหลด', 'error');
    return;
  }
  exportSummaryExcel(target);
}

// Window attachments
window.wrapThaiTextLines = wrapThaiTextLines;
window.generatePDFForUser = generatePDFForUser;
window.exportUserNoteToPDF = exportUserNoteToPDF;
window.downloadSampleTemplate = downloadSampleTemplate;
window.exportSummaryExcel = exportSummaryExcel;
window.exportHistoryMeetingExcel = exportHistoryMeetingExcel;
