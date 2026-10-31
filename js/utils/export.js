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

    // Sanitize note HTML to prevent text collision, rogue inline fonts, and bad positions
    function sanitizeForPdf(rawHtml) {
      const div = document.createElement('div');
      div.innerHTML = rawHtml || '';
      div.querySelectorAll('script, style, iframe, button, input').forEach(el => el.remove());
      div.querySelectorAll('font').forEach(f => {
        const p = f.parentNode;
        if (p) {
          while (f.firstChild) p.insertBefore(f.firstChild, f);
          p.removeChild(f);
        }
      });
      div.querySelectorAll('*').forEach(el => {
        el.style.fontFamily = '';
        el.style.position = '';
        el.style.top = '';
        el.style.bottom = '';
        el.style.left = '';
        el.style.right = '';
        el.style.float = '';
        el.style.clear = '';
        el.style.letterSpacing = 'normal';
        el.style.wordSpacing = 'normal';
        if (el.tagName !== 'IMG' && el.tagName !== 'TABLE' && el.tagName !== 'TR' && el.tagName !== 'TD' && el.tagName !== 'TH') {
          el.style.lineHeight = '1.85';
        }
      });
      return div.innerHTML;
    }

    const processedNoteHtml = sanitizeForPdf(noteHtml);
    const logoSrc = (typeof window !== 'undefined' && window.COMSAN_LOGO_BASE64) ? window.COMSAN_LOGO_BASE64 : 'comsan_logo.png';

    // Build print container for multi-page PDF (clean offscreen container, not appended to document body)
    const printContainer = document.createElement('div');
    printContainer.id = 'pdfNoteExportContainer';
    printContainer.style.cssText = `
      width: 718px;
      margin: 0 auto;
      background-color: #ffffff;
      color: #0f172a;
      font-family: ${selectedFont} !important;
      padding: 24px 28px;
      box-sizing: border-box;
      line-height: 1.85;
    `;

    // Modern Header Meta Box with unified font & strict line spacing to prevent overlaps
    const headerHtml = `
      <style>
        #pdfNoteExportContainer,
        #pdfNoteExportContainer * {
          box-sizing: border-box !important;
          font-family: ${selectedFont} !important;
          float: none !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
        }
        #pdfNoteExportContainer p,
        #pdfNoteExportContainer div:not(.note-page-boundary-guide),
        #pdfNoteExportContainer li {
          line-height: 1.85 !important;
          font-size: 13.5px !important;
          margin-top: 4px !important;
          margin-bottom: 6px !important;
          font-family: ${selectedFont} !important;
        }
        #pdfNoteExportContainer ul { list-style-type: disc !important; margin: 8px 0 8px 24px !important; padding-left: 10px !important; }
        #pdfNoteExportContainer ol { list-style-type: decimal !important; margin: 8px 0 8px 24px !important; padding-left: 10px !important; }
        #pdfNoteExportContainer li { margin: 3px 0 !important; line-height: 1.85 !important; }
        #pdfNoteExportContainer h1 { font-size: 19px !important; font-weight: 700 !important; margin: 16px 0 6px 0 !important; color: #1e1b4b !important; line-height: 1.45 !important; }
        #pdfNoteExportContainer h2 { font-size: 16.5px !important; font-weight: 700 !important; margin: 14px 0 5px 0 !important; color: #1e293b !important; line-height: 1.45 !important; }
        #pdfNoteExportContainer h3 { font-size: 14.5px !important; font-weight: 600 !important; margin: 12px 0 4px 0 !important; color: #334155 !important; line-height: 1.45 !important; }
        #pdfNoteExportContainer img { max-width: 100% !important; height: auto !important; border-radius: 8px !important; margin: 8px 0 !important; display: block !important; }
        #pdfNoteExportContainer table { border-collapse: collapse !important; width: 100% !important; }
        #pdfNoteExportContainer .note-keypoint-box {
          padding: 8px 14px !important;
          background: rgba(245, 158, 11, 0.12) !important;
          border-left: 4px solid #f59e0b !important;
          border-radius: 4px !important;
          margin: 10px 0 !important;
          font-weight: 600 !important;
          color: #b45309 !important;
          line-height: 1.7 !important;
        }
        .note-page-boundary-guide { display: none !important; }
        .html2pdf__page-break { page-break-before: always !important; break-before: page !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; }
      </style>

      <!-- หัวกระดาษ: ด้านซ้ายเป็นโลโก้ชมรมขนาดใหญ่, ตรงกลางเป็น วันที่ เดือน ปี ที่เขียน, ด้านขวาเป็น เขียนที่ -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; margin-bottom: 18px; border-bottom: 2px solid #312e81;">
        <!-- ด้านซ้าย: โลโก้ชมรม (ขนาดใหญ่ชัดเจน พร้อม Fallback Base64) -->
        <div style="width: 190px; text-align: left; display: flex; align-items: center;">
          <img src="${logoSrc}" id="pdfDocLogoImg" alt="โลโก้ชมรม" style="height: 90px; width: auto; max-width: 185px; object-fit: contain; display: block;" onerror="this.onerror=null; this.src='comsan_logo.png';" />
        </div>

        <!-- ตรงกลาง: วันที่ เดือน ปี ที่เขียน -->
        <div style="flex: 1; text-align: center; padding: 0 10px;">
          <div style="font-size: 16px; font-weight: 800; color: #1e1b4b; font-family: ${selectedFont} !important;">บันทึกการประชุมชมรมสันทนาการ</div>
          <div style="font-size: 13px; font-weight: 600; color: #4338ca; margin-top: 3px; font-family: ${selectedFont} !important;">${meta.date}</div>
          ${m.title ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px; font-family: ${selectedFont} !important;">เรื่อง: ${m.title}</div>` : ''}
        </div>

        <!-- ด้านขวา: เขียนที่ -->
        <div style="width: 160px; text-align: right; font-size: 12px; color: #334155; font-family: ${selectedFont} !important; line-height: 1.4;">
          <div style="font-weight: 700; color: #1e293b;">เขียนที่</div>
          <div style="color: #4338ca; font-weight: 600; margin-top: 2px;">${meta.location}</div>
        </div>
      </div>

      <div class="note-body-content" style="font-size: 13.5px; color: #1e293b; word-break: break-word; font-family: ${selectedFont} !important; line-height: 1.85 !important;">
        ${processedNoteHtml}
      </div>

      <!-- ท้ายกระดาษ: ชื่อผู้จดบันทึก และตำแหน่งของผู้จดบันทึก (ฟอนต์เดียวกันทั้งหมด) -->
      <div style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; font-family: ${selectedFont} !important;">
        <div style="text-align: left; font-size: 10.5px; color: #94a3b8; font-family: ${selectedFont} !important;">
          <div>ระบบจัดการประชุมชมรมสันทนาการ (COMSAN Meeting)</div>
          <div>พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
        </div>
        <div style="text-align: right; font-family: ${selectedFont} !important;">
          <div style="margin-bottom: 4px; font-size: 12px; color: #334155; font-family: ${selectedFont} !important;">
            ลงชื่อ <span style="font-weight: 700; color: #1e293b; text-decoration: underline;">${user.firstName} ${user.lastName} (${user.nickname || '-'})</span> ผู้จดบันทึก
          </div>
          <div style="font-size: 11.5px; color: #4338ca; font-weight: 600; font-family: ${selectedFont} !important;">
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
  } finally {
    if (printContainer && printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
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
