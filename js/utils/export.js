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
  const state = window.appState;
  const user = (state.users || []).find(u => u.id === userId);
  if (!user) return;
  const m = state.meeting || {};

  const noteEl = document.getElementById('userNoteTextarea');
  const liveNoteText = (userId === window.currentUserId && noteEl && noteEl.value.trim() !== '')
    ? noteEl.value
    : (user.note || '(ไม่มีข้อความบันทึก)');

  showToast('กำลังสร้างไฟล์ PDF...', 'info');

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const PAGE_W = 1240;
    const PAGE_H = 1754;
    const MARGIN = 90;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');

    // Canvas Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    const labelColW = 210;
    const valColW = CONTENT_W - labelColW - 80;
    ctx.font = '500 22px Prompt, Tahoma, sans-serif';

    const titleLines = wrapThaiTextLines(ctx, m.title || '-', valColW);
    const locLines = wrapThaiTextLines(ctx, `${m.location || '-'} (วันที่: ${m.date || '-'})`, valColW);
    const authorLines = wrapThaiTextLines(ctx, `${user.firstName} ${user.lastName} (${user.nickname}) — ตำแหน่ง: ${user.position}`, valColW);

    const lineH = 34;
    const boxHeight = 110 + (titleLines.length + locLines.length + authorLines.length) * lineH + 30;

    const boxX = MARGIN;
    const boxY = MARGIN;
    ctx.fillStyle = '#EEF2FF';
    ctx.strokeStyle = '#4338CA';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(boxX, boxY, CONTENT_W, boxHeight, 24);
    } else {
      ctx.rect(boxX, boxY, CONTENT_W, boxHeight);
    }
    ctx.fill();
    ctx.stroke();

    let curY = boxY + 55;
    ctx.fillStyle = '#312E81';
    ctx.font = '700 32px Prompt, Tahoma, sans-serif';
    ctx.fillText('บันทึกการประชุมชมรมสันทนาการ (COMSAN)', boxX + 40, curY);

    curY += 48;
    const drawMetaRow = (label, linesArr) => {
      ctx.fillStyle = '#1e293b';
      ctx.font = '700 22px Prompt, Tahoma, sans-serif';
      ctx.fillText(label, boxX + 40, curY);

      ctx.font = '400 22px Prompt, Tahoma, sans-serif';
      linesArr.forEach((ln, idx) => {
        ctx.fillText(ln, boxX + 40 + labelColW, curY + idx * lineH);
      });
      curY += Math.max(1, linesArr.length) * lineH + 8;
    };

    drawMetaRow('หัวข้อการประชุม:', titleLines);
    drawMetaRow('สถานที่ / วันที่:', locLines);
    drawMetaRow('ผู้จดบันทึก:', authorLines);

    curY = boxY + boxHeight + 55;
    ctx.fillStyle = '#475569';
    ctx.font = '700 22px Prompt, Tahoma, sans-serif';
    ctx.fillText('รายละเอียดบันทึกการประชุม:', MARGIN, curY);

    curY += 16;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN, curY);
    ctx.lineTo(PAGE_W - MARGIN, curY);
    ctx.stroke();

    curY += 45;
    ctx.fillStyle = '#0f172a';
    ctx.font = '400 24px Prompt, Tahoma, sans-serif';
    const noteLines = wrapThaiTextLines(ctx, liveNoteText, CONTENT_W);
    const noteLineH = 42;

    noteLines.forEach(line => {
      if (curY < PAGE_H - MARGIN) {
        ctx.fillText(line, MARGIN, curY);
        curY += noteLineH;
      }
    });

    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    let pdfBlob = null;
    const jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

    if (jsPDFConstructor) {
      const pdfDoc = new jsPDFConstructor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdfDoc.addImage(imgDataUrl, 'JPEG', 0, 0, 210, 297);
      pdfBlob = pdfDoc.output('blob');
    } else if (typeof html2pdf !== 'undefined') {
      const worker = html2pdf().set({
        margin: 0,
        filename: `Note_${user.nickname}_COMSAN.pdf`,
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      });
      const dummyDiv = document.createElement('div');
      const pdfDoc = await worker.from(dummyDiv).toPdf().get('pdf');
      pdfDoc.addImage(imgDataUrl, 'JPEG', 0, 0, 210, 297);
      pdfBlob = pdfDoc.output('blob');
    }

    if (pdfBlob) {
      await triggerUniversalBlobDownload(pdfBlob, `Note_${user.nickname}_COMSAN.pdf`);
      showToast('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว!', 'success');
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
