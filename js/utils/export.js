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
  const user = (state.users || []).find(u => u.id === userId);
  if (!user) return;
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

  showToast('กำลังสร้างไฟล์ PDF หลายหน้า...', 'info');

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Build print container for multi-page PDF (fixed at 0,0 behind everything with scroll 0)
    const printContainer = document.createElement('div');
    printContainer.id = 'pdfNoteExportContainer';
    printContainer.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 780px;
      z-index: -99999;
      pointer-events: none;
      background: #ffffff;
      color: #0f172a;
      font-family: 'Prompt', Tahoma, -apple-system, sans-serif;
      padding: 30px 36px;
      box-sizing: border-box;
      line-height: 1.6;
    `;

    // Modern Header Meta Box
    const headerHtml = `
      <div style="background: #eef2ff; border: 2px solid #4338ca; border-radius: 14px; padding: 18px 22px; margin-bottom: 22px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(67, 56, 202, 0.2); padding-bottom: 8px;">
          <h1 style="font-size: 19px; font-weight: 800; color: #312e81; margin: 0;">บันทึกการประชุมชมรมสันทนาการ (COMSAN)</h1>
          <span style="font-size: 11px; font-weight: 700; color: #4338ca; background: #ffffff; border: 1px solid rgba(67, 56, 202, 0.3); padding: 3px 10px; border-radius: 9999px;">เอกสารบันทึกส่วนบุคคล</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="width: 130px; font-weight: 700; color: #1e293b; padding: 4px 0;">หัวข้อการประชุม:</td>
            <td style="color: #334155; padding: 4px 0; font-weight: 600;">${m.title || '-'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #1e293b; padding: 4px 0;">สถานที่ / วันที่:</td>
            <td style="color: #334155; padding: 4px 0;">${m.location || '-'} (${m.date || '-'})</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #1e293b; padding: 4px 0;">ผู้จดบันทึก:</td>
            <td style="color: #334155; padding: 4px 0; font-weight: 600;">${user.firstName} ${user.lastName} (${user.nickname}) — <span style="color: #4338ca;">ตำแหน่ง: ${user.position}</span></td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 14px; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px;">
        <h2 style="font-size: 14px; font-weight: 700; color: #334155; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">รายละเอียดบันทึกการประชุม</h2>
      </div>

      <div class="note-body-content" style="font-size: 13.5px; color: #1e293b; word-break: break-word;">
        ${noteHtml}
      </div>

      <div style="margin-top: 32px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
        <span>ระบบจัดการประชุมชมรมสันทนาการ (COMSAN Meeting)</span>
        <span>ส่งออกเมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
      </div>
    `;

    printContainer.innerHTML = headerHtml;

    // Apply inline style adjustments for printed content
    const noteImgs = printContainer.querySelectorAll('img');
    noteImgs.forEach(img => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '8px';
      img.style.margin = '8px 0';
      img.style.display = 'block';
    });

    document.body.appendChild(printContainer);

    // Wait for images inside container to finish loading
    if (noteImgs.length > 0) {
      await Promise.all(Array.from(noteImgs).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
    }

    const filename = `Note_${user.nickname}_COMSAN.pdf`;

    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [10, 10, 10, 10], // 10mm margins on all sides
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      const pdfBlob = await html2pdf().set(opt).from(printContainer).output('blob');
      if (printContainer.parentNode) printContainer.parentNode.removeChild(printContainer);

      if (pdfBlob && typeof triggerUniversalBlobDownload === 'function') {
        await triggerUniversalBlobDownload(pdfBlob, filename);
        showToast('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว!', 'success');
      } else if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว!', 'success');
      }
    } else {
      if (printContainer.parentNode) printContainer.parentNode.removeChild(printContainer);
      showToast('ไม่พบไลบรารีสร้าง PDF', 'error');
    }
  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF', 'error');
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
