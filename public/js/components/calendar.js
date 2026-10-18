/**
 * COMSAN Meeting System - Club Calendar & Task Responsibility Component
 * Supports:
 * 1. Admin manual schedule creation with multi-person responsibility mapping
 * 2. Admin .ics (iCalendar) import with automatic parsing & scheduling
 * 3. User & Admin .ics export / download to device
 * 4. Google Calendar direct add
 * 5. Month & List/Agenda views with category and assignee filtering
 */

// Calendar State
window.calendarState = {
  currentDate: new Date(),
  view: 'LIST', // 'LIST' | 'MONTH'
  categoryFilter: 'ALL',
  assigneeFilter: 'ALL', // 'ALL' | 'MY_TASKS' | specific userId
  searchQuery: '',
  selectedDay: null,
  pendingIcsEvents: []
};

// Thai Month Names
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];
const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const CALENDAR_CATEGORIES = {
  EVENT: { label: 'กิจกรรมชมรม', bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', icon: 'star' },
  MEETING: { label: 'การประชุม', bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', icon: 'users' },
  DEADLINE: { label: 'กำหนดส่งงาน', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20', icon: 'clock' },
  WORKSHOP: { label: 'เวิร์กช็อป / อบรม', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', icon: 'laptop' },
};

/**
 * Helper to verify if the active session is currently an authenticated Admin
 */
function isCalendarAdmin() {
  return Boolean(window.currentRole === 'ADMIN' && window.isAdminAuthenticated);
}

// =========================================================================
// 1. ICS (iCalendar RFC 5545) PARSER & GENERATOR
// =========================================================================

/**
 * Unfolds folded lines and parses standard .ics content into event objects
 */
function parseIcsText(icsContent) {
  if (!icsContent || typeof icsContent !== 'string') return [];

  // Unfold lines: RFC 5545 specifies that a line starting with space or tab is a continuation
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n|\r/);

  const events = [];
  let inEvent = false;
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    if (rawLine === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {
        assignees: [],
        category: 'EVENT',
        color: 'indigo',
        createdSource: 'ICS_IMPORT'
      };
      continue;
    }

    if (rawLine === 'END:VEVENT') {
      if (currentEvent && currentEvent.title) {
        // Fallback dates
        if (!currentEvent.startDate) {
          currentEvent.startDate = new Date().toISOString().slice(0, 10);
        }
        if (!currentEvent.endDate) {
          currentEvent.endDate = currentEvent.startDate;
        }
        if (!currentEvent.startTime) currentEvent.startTime = '09:00';
        if (!currentEvent.endTime) currentEvent.endTime = '10:00';

        // Auto categorize if not set
        const titleLower = currentEvent.title.toLowerCase();
        if (titleLower.includes('ประชุม') || titleLower.includes('meet')) currentEvent.category = 'MEETING';
        else if (titleLower.includes('ส่ง') || titleLower.includes('deadline') || titleLower.includes('กำหนด')) currentEvent.category = 'DEADLINE';
        else if (titleLower.includes('อบรม') || titleLower.includes('workshop') || titleLower.includes('สัมมนา')) currentEvent.category = 'WORKSHOP';

        events.push(currentEvent);
      }
      inEvent = false;
      currentEvent = null;
      continue;
    }

    if (!inEvent || !currentEvent) continue;

    const colonIdx = rawLine.indexOf(':');
    if (colonIdx === -1) continue;

    const keyPart = rawLine.substring(0, colonIdx);
    const valuePart = rawLine.substring(colonIdx + 1);

    const propName = keyPart.split(';')[0].toUpperCase();

    if (propName === 'SUMMARY') {
      currentEvent.title = unescapeIcsText(valuePart);
    } else if (propName === 'DESCRIPTION') {
      currentEvent.description = unescapeIcsText(valuePart);
      // Auto extract assignees from description if mentioned (e.g. ผู้รับผิดชอบ: ... หรือ Assignee: ...)
      extractAssigneesFromDescription(currentEvent.description, currentEvent.assignees);
    } else if (propName === 'LOCATION') {
      currentEvent.location = unescapeIcsText(valuePart);
    } else if (propName === 'UID') {
      currentEvent.id = 'evt_ics_' + valuePart.replace(/[^a-zA-Z0-9_-]/g, '_');
    } else if (propName === 'DTSTART') {
      const parsed = parseIcsDateTime(keyPart, valuePart);
      currentEvent.startDate = parsed.date;
      currentEvent.startTime = parsed.time;
      currentEvent.isAllDay = parsed.isAllDay;
    } else if (propName === 'DTEND') {
      const parsed = parseIcsDateTime(keyPart, valuePart);
      currentEvent.endDate = parsed.date;
      currentEvent.endTime = parsed.time;
    } else if (propName === 'ATTENDEE') {
      // Extract CN=Name from attendee parameter
      const cnMatch = keyPart.match(/CN=([^;:]+)/i);
      let name = cnMatch ? cnMatch[1].replace(/^["']|["']$/g, '') : valuePart.replace(/^mailto:/i, '');
      if (name && !currentEvent.assignees.some(a => a.name === name)) {
        currentEvent.assignees.push({
          userId: null,
          name: name,
          role: 'ผู้ร่วมดำเนินงาน'
        });
      }
    } else if (propName === 'CATEGORIES') {
      const cat = valuePart.toUpperCase();
      if (cat.includes('MEET')) currentEvent.category = 'MEETING';
      else if (cat.includes('DEADLINE')) currentEvent.category = 'DEADLINE';
      else if (cat.includes('WORKSHOP')) currentEvent.category = 'WORKSHOP';
    }
  }

  return events;
}

function unescapeIcsText(str) {
  if (!str) return '';
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\N/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseIcsDateTime(keyPart, valuePart) {
  const isDateOnly = keyPart.includes('VALUE=DATE') || valuePart.length === 8;
  if (isDateOnly) {
    const y = valuePart.substring(0, 4);
    const m = valuePart.substring(4, 6);
    const d = valuePart.substring(6, 8);
    return { date: `${y}-${m}-${d}`, time: '00:00', isAllDay: true };
  }

  // DateTime format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const cleanVal = valuePart.replace(/[^0-9TZ]/g, '');
  if (cleanVal.length >= 15) {
    const y = cleanVal.substring(0, 4);
    const m = cleanVal.substring(4, 6);
    const d = cleanVal.substring(6, 8);
    let hh = cleanVal.substring(9, 11);
    let mm = cleanVal.substring(11, 13);

    // If UTC 'Z', convert to local time
    if (cleanVal.endsWith('Z')) {
      const utcDate = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm));
      const ly = utcDate.getFullYear();
      const lm = String(utcDate.getMonth() + 1).padStart(2, '0');
      const ld = String(utcDate.getDate()).padStart(2, '0');
      hh = String(utcDate.getHours()).padStart(2, '0');
      mm = String(utcDate.getMinutes()).padStart(2, '0');
      return { date: `${ly}-${lm}-${ld}`, time: `${hh}:${mm}`, isAllDay: false };
    }

    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}`, isAllDay: false };
  }

  return { date: new Date().toISOString().slice(0, 10), time: '09:00', isAllDay: false };
}

function extractAssigneesFromDescription(desc, assigneesList) {
  if (!desc) return;
  const lines = desc.split('\n');
  const patterns = [
    /(?:ผู้รับผิดชอบหลัก|ผู้รับผิดชอบ|ผู้ดูแล|มอบหมาย|Assignee|In-charge)\s*[:：]\s*(.+)/i,
    /ฝ่าย\s*([^\s:]+)\s*[:：]\s*(.+)/i
  ];

  lines.forEach(line => {
    patterns.forEach(regex => {
      const match = line.match(regex);
      if (match) {
        const fullContent = match[1].trim();
        const parts = fullContent.split(/[,、/]/);
        parts.forEach(p => {
          const item = p.trim();
          if (item) {
            // Check for role inside parentheses: e.g. "อิทธิพัทธ์ (ฝ่ายจัดงาน)"
            const roleMatch = item.match(/^([^(]+)\(([^)]+)\)$/);
            const name = roleMatch ? roleMatch[1].trim() : item;
            const role = roleMatch ? roleMatch[2].trim() : 'ผู้รับผิดชอบ';
            if (!assigneesList.some(a => a.name === name)) {
              assigneesList.push({ userId: null, name, role });
            }
          }
        });
      }
    });
  });
}

/**
 * Generate RFC 5545 formatted .ics string
 */
function generateIcsString(events) {
  const list = Array.isArray(events) ? events : [events];
  const nowIso = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//COMSAN Meeting System//Club Calendar//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ปฏิทินงานชมรมคมสัน',
    'X-WR-TIMEZONE:Asia/Bangkok'
  ];

  list.forEach(evt => {
    if (!evt || !evt.title) return;
    const uid = evt.id ? `${evt.id}@comsan.club` : `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}@comsan.club`;
    
    // Start Date & End Date
    let dtStart, dtEnd;
    const sDate = (evt.startDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const eDate = (evt.endDate || evt.startDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');

    if (evt.isAllDay) {
      dtStart = `DTSTART;VALUE=DATE:${sDate}`;
      dtEnd = `DTEND;VALUE=DATE:${eDate}`;
    } else {
      const sTime = (evt.startTime || '09:00').replace(':', '') + '00';
      const eTime = (evt.endTime || '10:00').replace(':', '') + '00';
      dtStart = `DTSTART:${sDate}T${sTime}`;
      dtEnd = `DTEND:${eDate}T${eTime}`;
    }

    // Build Description with Assignees
    let descLines = [];
    if (evt.description) descLines.push(evt.description);
    if (Array.isArray(evt.assignees) && evt.assignees.length > 0) {
      descLines.push('\n[ผู้รับผิดชอบงาน]:');
      evt.assignees.forEach(a => {
        descLines.push(`• ${a.name || 'ไม่ระบุชื่อ'} (${a.role || 'ผู้รับผิดชอบ'})`);
      });
    }
    const escapedDesc = escapeIcsText(descLines.join('\n'));
    const escapedSummary = escapeIcsText(evt.title);
    const escapedLoc = escapeIcsText(evt.location || '');

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${uid}`);
    ics.push(`DTSTAMP:${nowIso}`);
    ics.push(dtStart);
    ics.push(dtEnd);
    ics.push(`SUMMARY:${escapedSummary}`);
    if (escapedDesc) ics.push(`DESCRIPTION:${escapedDesc}`);
    if (escapedLoc) ics.push(`LOCATION:${escapedLoc}`);
    ics.push(`CATEGORIES:${evt.category || 'EVENT'}`);
    
    // Add Attendees
    if (Array.isArray(evt.assignees)) {
      evt.assignees.forEach(a => {
        if (a.name) {
          ics.push(`ATTENDEE;CN=${escapeIcsText(a.name)};ROLE=REQ-PARTICIPANT:mailto:member@comsan.club`);
        }
      });
    }

    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

function escapeIcsText(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Download single event as .ics
function downloadCalendarEventIcs(eventId) {
  const events = (window.appState && window.appState.calendarEvents) || [];
  const evt = events.find(e => e.id === eventId);
  if (!evt) return showToast('ไม่พบข้อมูลกิจกรรม', 'error');

  try {
    const icsText = generateIcsString(evt);
    const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
    const safeTitle = (evt.title || 'event').replace(/[/\\?%*:|"<>]/g, '_').substring(0, 30);
    triggerUniversalBlobDownload(blob, `${safeTitle}.ics`);
    showToast(`บันทึกตารางงาน "${evt.title}" ลงเครื่องเรียบร้อย`, 'success');
  } catch (err) {
    console.error('Error downloading ICS:', err);
    showToast('เกิดข้อผิดพลาดในการบันทึกไฟล์ .ics', 'error');
  }
}

// Download full calendar as .ics
function downloadAllCalendarEventsIcs() {
  const events = (window.appState && window.appState.calendarEvents) || [];
  if (events.length === 0) {
    return showToast('ยังไม่มีรายการงานในปฏิทินชมรม', 'warning');
  }

  try {
    const icsText = generateIcsString(events);
    const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
    triggerUniversalBlobDownload(blob, `COMSAN_Club_Calendar_${new Date().toISOString().slice(0, 10)}.ics`);
    showToast(`ดาวน์โหลดปฏิทินงานชมรมทั้งหมด (${events.length} รายการ) ลงเครื่องแล้ว`, 'success');
  } catch (err) {
    console.error('Error downloading full calendar:', err);
    showToast('เกิดข้อผิดพลาดในการดาวน์โหลดปฏิทิน', 'error');
  }
}

// Open Google Calendar URL
function openGoogleCalendarAdd(eventId) {
  const events = (window.appState && window.appState.calendarEvents) || [];
  const evt = events.find(e => e.id === eventId);
  if (!evt) return;

  const sDate = (evt.startDate || '').replace(/-/g, '');
  const eDate = (evt.endDate || evt.startDate || '').replace(/-/g, '');
  let datesParam;

  if (evt.isAllDay) {
    datesParam = `${sDate}/${eDate || sDate}`;
  } else {
    const sTime = (evt.startTime || '09:00').replace(':', '') + '00';
    const eTime = (evt.endTime || '10:00').replace(':', '') + '00';
    datesParam = `${sDate}T${sTime}/${eDate}T${eTime}`;
  }

  let details = evt.description || '';
  if (Array.isArray(evt.assignees) && evt.assignees.length > 0) {
    details += '\n\nผู้รับผิดชอบงาน:\n' + evt.assignees.map(a => `• ${a.name} (${a.role || 'ผู้รับผิดชอบ'})`).join('\n');
  }

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evt.title)}&dates=${datesParam}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(evt.location || '')}`;
  window.open(url, '_blank');
}

// =========================================================================
// 2. RENDERING: USER CALENDAR SECTION
// =========================================================================

function renderUserCalendarSection() {
  const container = document.getElementById('uToolSec_CALENDAR');
  if (!container) return;

  const events = (window.appState && window.appState.calendarEvents) || [];
  const me = (window.appState && window.appState.users || []).find(u => u.id === window.currentUserId) || {};

  // Filter events
  let filtered = [...events];

  // Category Filter
  if (window.calendarState.categoryFilter && window.calendarState.categoryFilter !== 'ALL') {
    filtered = filtered.filter(e => e.category === window.calendarState.categoryFilter);
  }

  // Assignee Filter
  if (window.calendarState.assigneeFilter === 'MY_TASKS') {
    filtered = filtered.filter(e => {
      if (!Array.isArray(e.assignees)) return false;
      return e.assignees.some(a => {
        if (a.userId && a.userId === me.id) return true;
        if (a.name && (a.name.includes(me.firstName) || a.name.includes(me.nickname))) return true;
        return false;
      });
    });
  } else if (window.calendarState.assigneeFilter && window.calendarState.assigneeFilter !== 'ALL') {
    filtered = filtered.filter(e => {
      if (!Array.isArray(e.assignees)) return false;
      return e.assignees.some(a => a.userId === window.calendarState.assigneeFilter || a.name === window.calendarState.assigneeFilter);
    });
  }

  // Search Query
  if (window.calendarState.searchQuery) {
    const q = window.calendarState.searchQuery.toLowerCase();
    filtered = filtered.filter(e => {
      const matchTitle = (e.title || '').toLowerCase().includes(q);
      const matchDesc = (e.description || '').toLowerCase().includes(q);
      const matchLoc = (e.location || '').toLowerCase().includes(q);
      const matchAssignee = Array.isArray(e.assignees) && e.assignees.some(a => (a.name || '').toLowerCase().includes(q) || (a.role || '').toLowerCase().includes(q));
      return matchTitle || matchDesc || matchLoc || matchAssignee;
    });
  }

  // Sort by start date & time ascending
  filtered.sort((a, b) => {
    const dtA = `${a.startDate || ''}T${a.startTime || '00:00'}`;
    const dtB = `${b.startDate || ''}T${b.startTime || '00:00'}`;
    return dtA.localeCompare(dtB);
  });

  const totalEventsCount = events.length;
  const myTasksCount = events.filter(e => {
    if (!Array.isArray(e.assignees)) return false;
    return e.assignees.some(a => {
      if (a.userId && a.userId === me.id) return true;
      if (a.name && (a.name.includes(me.firstName) || a.name.includes(me.nickname))) return true;
      return false;
    });
  }).length;

  // Build HTML
  let html = `
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
      <div>
        <h3 class="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
          <i data-lucide="calendar-days" class="w-5 h-5 text-primary inline-block"></i> ปฏิทินงานชมรมคมสัน
        </h3>
        <p class="text-xs text-muted-foreground mt-0.5">ตรวจสอบตารางงาน กิจกรรม และผู้รับผิดชอบในแต่ละหน้าที่</p>
      </div>

      <div class="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
        <button type="button" onclick="downloadAllCalendarEventsIcs()"
          class="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition flex items-center justify-center gap-1.5 shadow-2xs truncate">
          <i data-lucide="download" class="w-3.5 h-3.5 inline-block"></i>
          <span class="truncate">บันทึกปฏิทิน (.ics)</span>
        </button>

        <!-- View Switcher -->
        <div class="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border/60 shrink-0">
          <button type="button" onclick="setCalendarView('LIST')"
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${window.calendarState.view === 'LIST' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}">
            <i data-lucide="list" class="w-3.5 h-3.5 mr-1 inline-block"></i> รายการ
          </button>
          <button type="button" onclick="setCalendarView('MONTH')"
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${window.calendarState.view === 'MONTH' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}">
            <i data-lucide="calendar-days" class="w-3.5 h-3.5 mr-1 inline-block"></i> เดือน
          </button>
        </div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-card text-card-foreground border border-border rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
      <!-- Quick Filter Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button type="button" onclick="setCalendarAssigneeFilter('ALL')"
          class="px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${window.calendarState.assigneeFilter === 'ALL' ? 'bg-primary text-white shadow-xs' : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'}">
          งานทั้งหมด (${totalEventsCount})
        </button>
        <button type="button" onclick="setCalendarAssigneeFilter('MY_TASKS')"
          class="px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${window.calendarState.assigneeFilter === 'MY_TASKS' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'}">
          <i data-lucide="user-check" class="w-3 h-3 inline-block"></i> งานที่ฉันรับผิดชอบ
          <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${window.calendarState.assigneeFilter === 'MY_TASKS' ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-600'}">${myTasksCount}</span>
        </button>

        <div class="h-4 w-px bg-border/80 mx-1 shrink-0"></div>

        <!-- Category Dropdown / Pills -->
        <select onchange="setCalendarCategoryFilter(this.value)" class="text-xs bg-muted/60 border border-border rounded-xl px-2.5 py-1.5 text-foreground font-medium focus:ring-1 focus:ring-primary outline-none shrink-0">
          <option value="ALL" ${window.calendarState.categoryFilter === 'ALL' ? 'selected' : ''}>ทุกหมวดหมู่</option>
          <option value="EVENT" ${window.calendarState.categoryFilter === 'EVENT' ? 'selected' : ''}>กิจกรรมชมรม</option>
          <option value="MEETING" ${window.calendarState.categoryFilter === 'MEETING' ? 'selected' : ''}>การประชุม</option>
          <option value="DEADLINE" ${window.calendarState.categoryFilter === 'DEADLINE' ? 'selected' : ''}>กำหนดส่งงาน</option>
          <option value="WORKSHOP" ${window.calendarState.categoryFilter === 'WORKSHOP' ? 'selected' : ''}>เวิร์กช็อป / อบรม</option>
          <option value="OTHER" ${window.calendarState.categoryFilter === 'OTHER' ? 'selected' : ''}>อื่นๆ</option>
        </select>

        <!-- Search input -->
        <div class="relative flex-1 min-w-[160px]">
          <i data-lucide="search" class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"></i>
          <input type="text" placeholder="ค้นหาชื่องาน, ผู้รับผิดชอบ..."
            value="${window.calendarState.searchQuery || ''}"
            oninput="handleCalendarSearchInput(this.value)"
            class="w-full pl-8 pr-3 py-1.5 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/70 focus:bg-card focus:ring-1 focus:ring-primary outline-none transition">
        </div>
      </div>
    </div>
  `;

  // Views Body
  if (window.calendarState.view === 'MONTH') {
    html += renderMonthGridView(filtered, me);
  } else {
    html += renderAgendaListView(filtered, me, false);
  }

  container.innerHTML = html;
}

// =========================================================================
// 3. RENDERING: ADMIN CALENDAR SECTION
// =========================================================================

function renderAdminCalendarSection() {
  const container = document.getElementById('aTab_CALENDAR');
  if (!container) return;

  const events = (window.appState && window.appState.calendarEvents) || [];
  let filtered = [...events];

  // Category Filter
  if (window.calendarState.categoryFilter && window.calendarState.categoryFilter !== 'ALL') {
    filtered = filtered.filter(e => e.category === window.calendarState.categoryFilter);
  }

  // Search Query
  if (window.calendarState.searchQuery) {
    const q = window.calendarState.searchQuery.toLowerCase();
    filtered = filtered.filter(e => {
      const matchTitle = (e.title || '').toLowerCase().includes(q);
      const matchDesc = (e.description || '').toLowerCase().includes(q);
      const matchLoc = (e.location || '').toLowerCase().includes(q);
      const matchAssignee = Array.isArray(e.assignees) && e.assignees.some(a => (a.name || '').toLowerCase().includes(q) || (a.role || '').toLowerCase().includes(q));
      return matchTitle || matchDesc || matchLoc || matchAssignee;
    });
  }

  // Sort by start date & time ascending
  filtered.sort((a, b) => {
    const dtA = `${a.startDate || ''}T${a.startTime || '00:00'}`;
    const dtB = `${b.startDate || ''}T${b.startTime || '00:00'}`;
    return dtA.localeCompare(dtB);
  });

  let html = `
    <div class="bg-card text-card-foreground border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      <!-- Admin Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 class="font-bold text-lg sm:text-xl flex items-center gap-2.5 text-primary">
            <i data-lucide="calendar-days" class="w-5 h-5 inline-block"></i> จัดการปฏิทินงานชมรม
          </h2>
          <p class="text-xs text-muted-foreground mt-0.5">วางแผนกิจกรรม มอบหมายหน้าที่ความรับผิดชอบ และนำเข้าไฟล์ปฏิทิน (.ics)</p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Button 1: Add Event Manually (วิธีที่ 2) -->
          <button type="button" onclick="openAddCalendarEventModal()"
            class="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition flex items-center gap-1.5 active:scale-95">
            <i data-lucide="plus" class="w-3.5 h-3.5 inline-block"></i> เพิ่มตารางงานใหม่
          </button>

          <!-- Button 2: Import ICS File (วิธีที่ 1) -->
          <button type="button" onclick="openCalendarIcsModal()"
            class="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs transition flex items-center gap-1.5 active:scale-95">
            <i data-lucide="upload" class="w-3.5 h-3.5 inline-block"></i> นำเข้าไฟล์ .ics
          </button>

          <!-- Button 3: Download full .ics -->
          <button type="button" onclick="downloadAllCalendarEventsIcs()"
            class="px-3 py-2.5 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border shadow-2xs transition flex items-center gap-1.5">
            <i data-lucide="download" class="w-3.5 h-3.5 inline-block"></i> โหลด .ics
          </button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Category Filter -->
          <select onchange="setCalendarCategoryFilter(this.value)" class="text-xs bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground font-medium outline-none">
            <option value="ALL" ${window.calendarState.categoryFilter === 'ALL' ? 'selected' : ''}>ทุกหมวดหมู่ (${events.length})</option>
            <option value="EVENT" ${window.calendarState.categoryFilter === 'EVENT' ? 'selected' : ''}>กิจกรรมชมรม</option>
            <option value="MEETING" ${window.calendarState.categoryFilter === 'MEETING' ? 'selected' : ''}>การประชุม</option>
            <option value="DEADLINE" ${window.calendarState.categoryFilter === 'DEADLINE' ? 'selected' : ''}>กำหนดส่งงาน</option>
            <option value="WORKSHOP" ${window.calendarState.categoryFilter === 'WORKSHOP' ? 'selected' : ''}>เวิร์กช็อป / อบรม</option>
            <option value="OTHER" ${window.calendarState.categoryFilter === 'OTHER' ? 'selected' : ''}>อื่นๆ</option>
          </select>

          <!-- Search input -->
          <div class="relative min-w-[200px]">
            <i data-lucide="search" class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"></i>
            <input type="text" placeholder="ค้นหาตารางงาน..."
              value="${window.calendarState.searchQuery || ''}"
              oninput="handleCalendarSearchInput(this.value)"
              class="w-full pl-8 pr-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/70 focus:bg-card focus:ring-1 focus:ring-primary outline-none transition">
          </div>
        </div>

        <!-- View Switcher -->
        <div class="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border/60 self-start sm:self-auto">
          <button type="button" onclick="setCalendarView('LIST')"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${window.calendarState.view === 'LIST' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}">
            <i data-lucide="list" class="w-3.5 h-3.5 mr-1 inline-block"></i> รายการงาน
          </button>
          <button type="button" onclick="setCalendarView('MONTH')"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${window.calendarState.view === 'MONTH' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}">
            <i data-lucide="calendar-days" class="w-3.5 h-3.5 mr-1 inline-block"></i> ปฏิทินเดือน
          </button>
        </div>
      </div>

      <!-- Events Content -->
      <div>
        ${window.calendarState.view === 'MONTH' ? renderMonthGridView(filtered, null, true) : renderAgendaListView(filtered, null, true)}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// =========================================================================
// 4. SUB-VIEWS: MONTH VIEW & AGENDA VIEW
// =========================================================================

function renderMonthGridView(events, currentUser, isAdmin = false) {
  const canManage = Boolean(isAdmin && isCalendarAdmin());
  const current = window.calendarState.currentDate;
  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Month navigation header
  let html = `
    <div class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <h4 class="font-extrabold text-base sm:text-lg text-foreground">
            ${THAI_MONTHS[month]} ${year + 543}
          </h4>
          <button type="button" onclick="navigateCalendarMonth(0)" class="text-xs font-semibold px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition">
            วันนี้
          </button>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" onclick="navigateCalendarMonth(-1)" class="w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition" title="เดือนก่อนหน้า">
            <i data-lucide="chevron-left" class="w-4 h-4"></i>
          </button>
          <button type="button" onclick="navigateCalendarMonth(1)" class="w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition" title="เดือนถัดไป">
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Calendar Grid -->
      <div class="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <!-- Day names -->
        <div class="grid grid-cols-7 bg-muted/60 border-b border-border text-center py-2 text-xs font-bold text-muted-foreground">
          ${THAI_DAYS_SHORT.map((d, idx) => `<div class="${idx === 0 ? 'text-rose-500' : ''}">${d}</div>`).join('')}
        </div>

        <!-- Days cells -->
        <div class="grid grid-cols-7 divide-x divide-y divide-border/60">
  `;

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="min-h-[85px] sm:min-h-[105px] p-1.5 bg-muted/10 opacity-40"></div>`;
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  // Day cells
  for (let day = 1; day <= totalDays; day++) {
    const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.startDate === dayDateStr);
    const isToday = dayDateStr === todayIso;

    html += `
      <div class="min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 bg-card hover:bg-muted/30 transition flex flex-col justify-between group">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-primary text-white shadow-xs' : 'text-foreground'}">
            ${day}
          </span>
          ${canManage ? `
            <button type="button" onclick="openAddCalendarEventModal(null, '${dayDateStr}')"
              class="opacity-0 group-hover:opacity-100 transition w-5 h-5 rounded hover:bg-primary/10 text-primary flex items-center justify-center text-[10px]" title="เพิ่มงานในวันนี้">
              <i data-lucide="plus" class="w-3 h-3"></i>
            </button>
          ` : ''}
        </div>

        <!-- Event badges inside day cell -->
        <div class="space-y-1 overflow-y-auto max-h-[60px] scrollbar-none">
          ${dayEvents.map(e => {
            const catInfo = CALENDAR_CATEGORIES[e.category] || CALENDAR_CATEGORIES.EVENT;
            return `
              <div onclick="openCalendarEventDetailModal('${e.id}')"
                class="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate cursor-pointer transition ${catInfo.bg} ${catInfo.text} border ${catInfo.border} hover:scale-[1.02] flex items-center justify-between group/chip"
                title="${e.title} (${e.startTime || ''}) - คลิกเพื่อดูรายละเอียดหรือแก้ไข">
                <span class="truncate flex-1">
                  ${e.startTime && !e.isAllDay ? `<span class="opacity-75 mr-0.5">${e.startTime}</span>` : ''}
                  ${e.title}
                </span>
                ${canManage ? `
                  <button type="button" onclick="event.stopPropagation(); openAddCalendarEventModal('${e.id}')"
                    class="opacity-0 group-hover/chip:opacity-100 hover:scale-125 ml-1 text-inherit hover:text-indigo-600 transition shrink-0 p-0.5"
                    title="แก้ไขงานนี้ทันที">
                    <i data-lucide="pen" class="w-2.5 h-2.5"></i>
                  </button>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Calculate trailing empty cells
  const totalSlots = firstDay + totalDays;
  const trailing = (7 - (totalSlots % 7)) % 7;
  for (let i = 0; i < trailing; i++) {
    html += `<div class="min-h-[85px] sm:min-h-[105px] p-1.5 bg-muted/10 opacity-40"></div>`;
  }

  html += `
        </div>
      </div>
    </div>
  `;

  return html;
}

function renderAgendaListView(events, currentUser, isAdmin = false) {
  const canManage = Boolean(isAdmin && isCalendarAdmin());
  if (events.length === 0) {
    return `
      <div class="p-8 text-center bg-card border border-border rounded-2xl space-y-3">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground text-2xl">
          <i data-lucide="calendar-x" class="w-8 h-8"></i>
        </div>
        <h4 class="font-bold text-base text-foreground">ไม่พบรายการตารางงาน</h4>
        <p class="text-xs text-muted-foreground max-w-sm mx-auto">ยังไม่มีกิจกรรมที่ตรงตามเงื่อนไขการค้นหา คุณสามารถตรวจสอบปฏิทินเดือนหรือนำเข้าไฟล์ .ics เพิ่มเติมได้</p>
        ${canManage ? `
          <div class="pt-2">
            <button type="button" onclick="openAddCalendarEventModal()" class="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-xs">
              + เพิ่มตารางงานแรก
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  let html = `<div class="space-y-3.5">`;

  events.forEach(evt => {
    const catInfo = CALENDAR_CATEGORIES[evt.category] || CALENDAR_CATEGORIES.EVENT;

    // Date formatting (Thai)
    let dateStr = evt.startDate || '';
    let dayNum = '-', monthStr = '-';
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        dayNum = parseInt(parts[2], 10);
        const mIdx = parseInt(parts[1], 10) - 1;
        monthStr = THAI_MONTHS_SHORT[mIdx] || '';
      }
    }

    // Time text
    let timeText = 'ตลอดวัน';
    if (!evt.isAllDay && evt.startTime) {
      timeText = `${evt.startTime} - ${evt.endTime || '12:00'} น.`;
    }

    // Check if current user is an assignee
    const isMeAssigned = currentUser && Array.isArray(evt.assignees) && evt.assignees.some(a => {
      if (a.userId && a.userId === currentUser.id) return true;
      if (a.name && (a.name.includes(currentUser.firstName) || a.name.includes(currentUser.nickname))) return true;
      return false;
    });

    html += `
      <div id="calEventItem_${evt.id}" class="bg-card text-card-foreground border border-border hover:border-primary/40 rounded-2xl p-4 sm:p-5 shadow-sm transition space-y-3.5 group">
        <!-- Event Top Row -->
        <div class="flex items-start gap-3.5">
          <!-- Date Badge Box -->
          <div class="w-14 h-14 rounded-2xl bg-muted/80 border border-border/80 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:bg-primary/10 group-hover:border-primary/30 transition">
            <span class="text-lg font-black text-foreground group-hover:text-primary leading-none">${dayNum}</span>
            <span class="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">${monthStr}</span>
          </div>

          <!-- Main Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${catInfo.bg} ${catInfo.text} border ${catInfo.border} flex items-center gap-1">
                <i data-lucide="${catInfo.icon || 'star'}" class="w-2.5 h-2.5 inline-block"></i> ${catInfo.label}
              </span>

              ${isMeAssigned ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 animate-pulse">
                  <i data-lucide="star" class="w-2.5 h-2.5 inline-block"></i> งานของคุณ
                </span>
              ` : ''}

              ${evt.createdSource === 'ICS_IMPORT' ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20" title="นำเข้าจากไฟล์ .ics">
                  <i data-lucide="upload" class="w-2.5 h-2.5 mr-1 inline-block"></i> ICS
                </span>
              ` : ''}
            </div>

            <h4 class="font-bold text-sm sm:text-base text-foreground leading-snug group-hover:text-primary transition cursor-pointer"
              onclick="openCalendarEventDetailModal('${evt.id}')">
              ${evt.title}
            </h4>

            <div class="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              <span class="flex items-center gap-1 font-medium">
                <i data-lucide="clock" class="w-3.5 h-3.5 text-primary inline-block"></i> ${timeText}
              </span>
              ${evt.location ? `
                <span class="flex items-center gap-1">
                  <i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-500 inline-block"></i> <span class="truncate max-w-[200px]">${evt.location}</span>
                </span>
              ` : ''}
            </div>
          </div>
        </div>

        ${evt.description ? `
          <p class="text-xs text-muted-foreground line-clamp-2 pl-1">${evt.description}</p>
        ` : ''}

        <!-- Section: ผู้รับผิดชอบในส่วนไหน (Assignees & Responsibilities) -->
        <div class="pt-2 border-t border-border/60">
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <i data-lucide="user-cog" class="w-3.5 h-3.5 text-indigo-500 inline-block"></i> ผู้รับผิดชอบในส่วนงานนี้:
          </div>

          ${Array.isArray(evt.assignees) && evt.assignees.length > 0 ? `
            <div class="flex flex-wrap gap-2">
              ${evt.assignees.map(a => `
                <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/80 border border-border text-xs">
                  <div class="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                    ${(a.name || 'ผ')[0]}
                  </div>
                  <span class="font-bold text-foreground">${a.name || 'ไม่ระบุชื่อ'}</span>
                  ${a.role ? `
                    <span class="text-[10px] text-muted-foreground font-medium border-l border-border/80 pl-1.5 ml-0.5">
                      ${a.role}
                    </span>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <p class="text-xs text-muted-foreground/70 italic pl-1">ยังไม่ได้กำหนดผู้รับผิดชอบเฉพาะเจาะจง</p>
          `}
        </div>

        <!-- Action Buttons -->
        <div class="pt-2 flex items-center justify-between gap-2 border-t border-border/40 flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" onclick="downloadCalendarEventIcs('${evt.id}')"
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border shadow-2xs transition flex items-center gap-1.5"
              title="บันทึกไฟล์ .ics เข้าปฏิทินในเครื่อง / มือถือ">
              <i data-lucide="download" class="w-3.5 h-3.5 text-primary inline-block"></i> บันทึกลงเครื่อง (.ics)
            </button>
            <button type="button" onclick="openGoogleCalendarAdd('${evt.id}')"
              class="px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              title="เปิดเพิ่มใน Google Calendar">
              <i data-lucide="calendar-plus" class="w-3.5 h-3.5 text-rose-500 inline-block"></i> เพิ่มใน Google Cal
            </button>
          </div>

          ${canManage ? `
            <div class="flex items-center gap-1.5 ml-auto">
              <button type="button" onclick="openAddCalendarEventModal('${evt.id}')"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition flex items-center gap-1 shadow-2xs">
                <i data-lucide="pen" class="w-3.5 h-3.5 inline-block"></i> แก้ไข
              </button>
              <button type="button" onclick="confirmDeleteCalendarEvent('${evt.id}', '${evt.title}')"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition flex items-center gap-1 shadow-2xs">
                <i data-lucide="trash-2" class="w-3.5 h-3.5 inline-block"></i> ลบ
              </button>
            </div>
          ` : `
            <button type="button" onclick="openCalendarEventDetailModal('${evt.id}')"
              class="px-3 py-1.5 rounded-xl text-xs font-medium text-primary hover:underline ml-auto flex items-center gap-1">
              ดูรายละเอียด <i data-lucide="arrow-right" class="w-3 h-3 inline-block"></i>
            </button>
          `}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

// =========================================================================
// 5. MODALS & INTERACTIONS
// =========================================================================

// Add / Edit Modal
function openAddCalendarEventModal(eventIdToEdit = null, defaultDate = null) {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถเพิ่มหรือแก้ไขกิจกรรมได้', 'warning');
    }
    return;
  }

  const modal = document.getElementById('calendarEventModal');
  if (!modal) return;

  const state = window.appState || {};
  const events = state.calendarEvents || [];
  const users = state.users || [];
  const event = eventIdToEdit ? events.find(e => e.id === eventIdToEdit) : null;

  const modalIcon = document.getElementById('calModalIcon');
  if (modalIcon) {
    if (typeof updateIcon === 'function') {
      updateIcon(modalIcon, event ? 'pen' : 'calendar-plus');
    } else {
      modalIcon.setAttribute('data-lucide', event ? 'pen' : 'calendar-plus');
    }
  }
  document.getElementById('calModalTitle').textContent = event ? 'แก้ไขตารางงานชมรม' : 'เพิ่มตารางงานใหม่';
  document.getElementById('calEventId').value = event ? event.id : '';
  document.getElementById('calTitle').value = event ? event.title : '';
  document.getElementById('calCategory').value = event ? event.category : 'EVENT';
  document.getElementById('calStartDate').value = event ? event.startDate : (defaultDate || new Date().toISOString().slice(0, 10));
  document.getElementById('calStartTime').value = event ? event.startTime : '09:00';
  document.getElementById('calEndDate').value = event ? (event.endDate || event.startDate) : (defaultDate || new Date().toISOString().slice(0, 10));
  document.getElementById('calEndTime').value = event ? event.endTime : '12:00';
  document.getElementById('calIsAllDay').checked = event ? Boolean(event.isAllDay) : false;
  document.getElementById('calLocation').value = event ? (event.location || '') : '';
  document.getElementById('calDescription').value = event ? (event.description || '') : '';

  // Update save button text
  const saveBtn = document.getElementById('calSaveBtn');
  if (saveBtn) {
    saveBtn.innerHTML = event
      ? '<i data-lucide="check" class="w-3.5 h-3.5 inline-block"></i> บันทึกการแก้ไข'
      : '<i data-lucide="check" class="w-3.5 h-3.5 inline-block"></i> บันทึกตารางงาน';
  }

  // Delete button shown only when editing existing event
  const delBtn = document.getElementById('calDeleteBtn');
  if (delBtn) {
    if (event) {
      delBtn.classList.remove('hidden');
      delBtn.classList.add('flex');
      delBtn.onclick = () => {
        closeCalendarEventModal();
        confirmDeleteCalendarEvent(event.id, event.title);
      };
    } else {
      delBtn.classList.add('hidden');
      delBtn.classList.remove('flex');
      delBtn.onclick = null;
    }
  }

  // Render assignees list builder
  renderAssigneeRows(event && Array.isArray(event.assignees) ? event.assignees : []);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCalendarEventModal() {
  const modal = document.getElementById('calendarEventModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function renderAssigneeRows(assignees) {
  const container = document.getElementById('calAssigneesContainer');
  if (!container) return;

  container.innerHTML = '';
  if (assignees.length === 0) {
    addAssigneeRow('', '');
  } else {
    assignees.forEach(a => addAssigneeRow(a.name, a.role));
  }
}

function addAssigneeRow(name = '', role = '') {
  const container = document.getElementById('calAssigneesContainer');
  if (!container) return;

  const users = (window.appState && window.appState.users) || [];

  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 cal-assignee-row';
  row.innerHTML = `
    <div class="flex-1 min-w-0">
      <input type="text" list="clubMemberList" placeholder="ชื่อผู้รับผิดชอบ หรือพิมพ์เลือก..." value="${name || ''}"
        class="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/70 focus:bg-card focus:ring-1 focus:ring-primary outline-none assignee-name">
      <datalist id="clubMemberList">
        ${users.map(u => `<option value="${u.nickname} (${u.firstName} ${u.lastName})">${u.position}</option>`).join('')}
      </datalist>
    </div>
    <div class="flex-1 min-w-0">
      <input type="text" placeholder="บทบาทหน้าที่ (เช่น ผู้ประสานงาน, ฝ่ายสถานที่)..." value="${role || ''}"
        class="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/70 focus:bg-card focus:ring-1 focus:ring-primary outline-none assignee-role">
    </div>
    <button type="button" onclick="this.closest('.cal-assignee-row').remove()"
      class="w-8 h-8 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition shrink-0" title="ลบผู้รับผิดชอบนี้">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;
  container.appendChild(row);
}

function saveCalendarEventFromModal() {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถบันทึกหรือแก้ไขกิจกรรมได้', 'warning');
    }
    return;
  }

  const id = document.getElementById('calEventId').value;
  const title = (document.getElementById('calTitle').value || '').trim();
  if (!title) return showToast('กรุณากรอกชื่องานหรือกิจกรรม', 'warning');

  const category = document.getElementById('calCategory').value;
  const startDate = document.getElementById('calStartDate').value;
  const startTime = document.getElementById('calStartTime').value;
  const endDate = document.getElementById('calEndDate').value || startDate;
  const endTime = document.getElementById('calEndTime').value;
  const isAllDay = document.getElementById('calIsAllDay').checked;
  const location = (document.getElementById('calLocation').value || '').trim();
  const description = (document.getElementById('calDescription').value || '').trim();

  // Collect assignees
  const assigneeRows = document.querySelectorAll('#calAssigneesContainer .cal-assignee-row');
  const assignees = [];
  assigneeRows.forEach(row => {
    const name = (row.querySelector('.assignee-name')?.value || '').trim();
    const role = (row.querySelector('.assignee-role')?.value || '').trim();
    if (name) {
      assignees.push({ userId: null, name, role: role || 'ผู้รับผิดชอบ' });
    }
  });

  const eventData = {
    id: id || undefined,
    title,
    category,
    startDate,
    startTime,
    endDate,
    endTime,
    isAllDay,
    location,
    description,
    assignees,
    createdSource: 'MANUAL'
  };

  if (id) {
    window.socket.emit('admin:updateCalendarEvent', eventData);
    // Optimistic local update for instant UI feedback
    if (window.appState && Array.isArray(window.appState.calendarEvents)) {
      const idx = window.appState.calendarEvents.findIndex(e => e.id === id);
      if (idx !== -1) {
        window.appState.calendarEvents[idx] = {
          ...window.appState.calendarEvents[idx],
          ...eventData,
          updatedAt: new Date().toISOString()
        };
        if (window.currentRole === 'ADMIN') {
          if (typeof renderAdminCalendarSection === 'function') renderAdminCalendarSection();
        } else {
          if (typeof renderUserCalendarSection === 'function') renderUserCalendarSection();
        }
        if (typeof renderTodayEventsBanner === 'function') renderTodayEventsBanner();
      }
    }
    showToast('บันทึกการแก้ไขตารางงานแล้ว', 'success');
  } else {
    window.socket.emit('admin:addCalendarEvent', eventData);
    showToast('เพิ่มตารางงานใหม่เรียบร้อยแล้ว', 'success');
  }

  closeCalendarEventModal();
}

function confirmDeleteCalendarEvent(eventId, title) {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถลบกิจกรรมได้', 'warning');
    }
    return;
  }
  if (!confirm(`คุณต้องการลบกิจกรรม "${title}" ออกจากปฏิทินหรือไม่?`)) return;
  window.socket.emit('admin:deleteCalendarEvent', { eventId });
  showToast(`ลบกิจกรรม "${title}" เรียบร้อยแล้ว`, 'info');
}

// ICS Import Modal
function openCalendarIcsModal() {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถนำเข้าไฟล์ .ics ได้', 'warning');
    }
    return;
  }
  const modal = document.getElementById('calendarIcsModal');
  if (!modal) return;

  window.calendarState.pendingIcsEvents = [];
  document.getElementById('icsPreviewContainer').innerHTML = `
    <div class="text-center py-6 text-xs text-muted-foreground">
      ยังไม่ได้เลือกไฟล์ .ics กรุณาอัปโหลดหรือลากไฟล์มาวางด้านบน
    </div>
  `;
  document.getElementById('btnConfirmIcsImport').classList.add('hidden');
  const fileInput = document.getElementById('calIcsFileInput');
  if (fileInput) fileInput.value = '';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCalendarIcsModal() {
  const modal = document.getElementById('calendarIcsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleIcsFileSelected(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const text = evt.target.result;
      const parsedEvents = parseIcsText(text);

      if (!parsedEvents || parsedEvents.length === 0) {
        showToast('ไม่พบข้อมูลกิจกรรมในไฟล์ .ics ที่อัปโหลด', 'warning');
        return;
      }

      window.calendarState.pendingIcsEvents = parsedEvents;
      renderIcsPreviewList(parsedEvents);
      showToast(`ตรวจพบ ${parsedEvents.length} กิจกรรมในไฟล์ .ics`, 'success');
    } catch (err) {
      console.error('Error parsing ICS:', err);
      showToast('ไม่สามารถอ่านไฟล์ .ics ได้ กรุณาตรวจสอบรูปแบบไฟล์', 'error');
    }
  };
  reader.readAsText(file);
}

function renderIcsPreviewList(events) {
  const container = document.getElementById('icsPreviewContainer');
  const confirmBtn = document.getElementById('btnConfirmIcsImport');
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = `<p class="text-xs text-muted-foreground text-center py-4">ไม่พบกิจกรรม</p>`;
    if (confirmBtn) confirmBtn.classList.add('hidden');
    return;
  }

  let html = `
    <div class="space-y-2.5">
      <div class="flex items-center justify-between text-xs font-bold text-muted-foreground pb-1 border-b border-border">
        <span>รายการกิจกรรมที่จะนำเข้า (${events.length} รายการ)</span>
        <label class="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" id="checkAllIcs" checked onchange="toggleSelectAllIcs(this.checked)" class="rounded text-primary focus:ring-primary">
          <span>เลือกทั้งหมด</span>
        </label>
      </div>
  `;

  events.forEach((evt, idx) => {
    html += `
      <div class="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border text-xs">
        <input type="checkbox" class="ics-item-check mt-1 rounded text-primary focus:ring-primary" checked data-index="${idx}">
        <div class="flex-1 min-w-0">
          <p class="font-bold text-foreground text-sm truncate">${evt.title}</p>
          <div class="flex items-center gap-2 text-muted-foreground mt-0.5 flex-wrap">
            <span><i data-lucide="calendar" class="w-3.5 h-3.5 text-primary inline-block"></i> ${evt.startDate}</span>
            ${!evt.isAllDay ? `<span><i data-lucide="clock" class="w-3.5 h-3.5 inline-block"></i> ${evt.startTime} - ${evt.endTime}</span>` : '<span class="text-primary font-medium">ตลอดวัน</span>'}
            ${evt.location ? `<span><i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-500 inline-block"></i> ${evt.location}</span>` : ''}
          </div>
          ${Array.isArray(evt.assignees) && evt.assignees.length > 0 ? `
            <div class="mt-1 flex flex-wrap gap-1">
              ${evt.assignees.map(a => `<span class="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 text-[10px] font-medium">👤 ${a.name} (${a.role})</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  if (confirmBtn) {
    confirmBtn.classList.remove('hidden');
    confirmBtn.textContent = `นำเข้าสู่ปฏิทิน (${events.length} รายการ)`;
  }
}

function toggleSelectAllIcs(checked) {
  document.querySelectorAll('.ics-item-check').forEach(cb => cb.checked = checked);
  updateIcsImportButtonCount();
}

function updateIcsImportButtonCount() {
  const checked = document.querySelectorAll('.ics-item-check:checked');
  const confirmBtn = document.getElementById('btnConfirmIcsImport');
  if (confirmBtn) {
    confirmBtn.textContent = `นำเข้าสู่ปฏิทิน (${checked.length} รายการ)`;
    confirmBtn.disabled = checked.length === 0;
  }
}

function confirmIcsImport() {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถนำเข้ากิจกรรมได้', 'warning');
    }
    return;
  }

  const checkboxes = document.querySelectorAll('.ics-item-check:checked');
  const selectedEvents = [];
  checkboxes.forEach(cb => {
    const idx = parseInt(cb.dataset.index, 10);
    if (window.calendarState.pendingIcsEvents[idx]) {
      selectedEvents.push(window.calendarState.pendingIcsEvents[idx]);
    }
  });

  if (selectedEvents.length === 0) {
    return showToast('กรุณาเลือกอย่างน้อย 1 กิจกรรมสำหรับนำเข้า', 'warning');
  }

  window.socket.emit('admin:importCalendarEvents', { events: selectedEvents });
  closeCalendarIcsModal();
}

// Event Detail Modal
function openCalendarEventDetailModal(eventId) {
  const events = (window.appState && window.appState.calendarEvents) || [];
  const evt = events.find(e => e.id === eventId);
  if (!evt) return;

  const modal = document.getElementById('calendarEventDetailModal');
  if (!modal) return;

  const catInfo = CALENDAR_CATEGORIES[evt.category] || CALENDAR_CATEGORIES.EVENT;

  document.getElementById('detailCalTitle').textContent = evt.title;
  document.getElementById('detailCalCategory').innerHTML = `
    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${catInfo.bg} ${catInfo.text} border ${catInfo.border}">
      <i data-lucide="${catInfo.icon || 'star'}" class="w-3.5 h-3.5 mr-1 inline-block"></i> ${catInfo.label}
    </span>
  `;
  document.getElementById('detailCalDate').textContent = `${evt.startDate} ${evt.endDate && evt.endDate !== evt.startDate ? 'ถึง ' + evt.endDate : ''}`;
  document.getElementById('detailCalTime').textContent = evt.isAllDay ? 'ตลอดทั้งวัน' : `${evt.startTime} - ${evt.endTime || '12:00'} น.`;
  document.getElementById('detailCalLocation').textContent = evt.location || '(ไม่ได้ระบุสถานที่)';
  document.getElementById('detailCalDesc').textContent = evt.description || '(ไม่มีรายละเอียดเพิ่มเติม)';

  // Assignees
  const assigneesBox = document.getElementById('detailCalAssignees');
  if (assigneesBox) {
    if (Array.isArray(evt.assignees) && evt.assignees.length > 0) {
      assigneesBox.innerHTML = evt.assignees.map(a => `
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-muted/60 border border-border">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
              ${(a.name || 'ผ')[0]}
            </div>
            <div>
              <p class="text-xs font-bold text-foreground">${a.name}</p>
              <p class="text-[11px] text-muted-foreground">${a.role || 'ผู้รับผิดชอบ'}</p>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600">มอบหมายแล้ว</span>
        </div>
      `).join('');
    } else {
      assigneesBox.innerHTML = `<p class="text-xs text-muted-foreground italic">ยังไม่มีผู้รับผิดชอบระบุไว้ในงานนี้</p>`;
    }
  }

  // Action buttons inside modal
  const btnDownloadIcs = document.getElementById('detailCalBtnDownloadIcs');
  if (btnDownloadIcs) {
    btnDownloadIcs.onclick = () => downloadCalendarEventIcs(evt.id);
  }
  const btnGoogleCal = document.getElementById('detailCalBtnGoogleCal');
  if (btnGoogleCal) {
    btnGoogleCal.onclick = () => openGoogleCalendarAdd(evt.id);
  }

  // Admin Actions inside Detail Modal (Only true if currentRole === 'ADMIN' && isAdminAuthenticated)
  const isAdmin = isCalendarAdmin();
  const headerBtnEdit = document.getElementById('detailCalHeaderBtnEdit');
  if (headerBtnEdit) {
    if (isAdmin) {
      headerBtnEdit.classList.remove('hidden');
      headerBtnEdit.classList.add('flex');
      headerBtnEdit.onclick = () => {
        closeCalendarEventDetailModal();
        openAddCalendarEventModal(evt.id);
      };
    } else {
      headerBtnEdit.classList.add('hidden');
      headerBtnEdit.classList.remove('flex');
      headerBtnEdit.onclick = null;
    }
  }

  const adminActions = document.getElementById('detailCalAdminActions');
  const btnEdit = document.getElementById('detailCalBtnEdit');
  const btnDelete = document.getElementById('detailCalBtnDelete');

  if (adminActions) {
    if (isAdmin) {
      adminActions.classList.remove('hidden');
      adminActions.classList.add('flex');
      if (btnEdit) {
        btnEdit.onclick = () => {
          closeCalendarEventDetailModal();
          openAddCalendarEventModal(evt.id);
        };
      }
      if (btnDelete) {
        btnDelete.onclick = () => {
          closeCalendarEventDetailModal();
          confirmDeleteCalendarEvent(evt.id, evt.title);
        };
      }
    } else {
      adminActions.classList.add('hidden');
      adminActions.classList.remove('flex');
      if (btnEdit) btnEdit.onclick = null;
      if (btnDelete) btnDelete.onclick = null;
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCalendarEventDetailModal() {
  const modal = document.getElementById('calendarEventDetailModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  const headerBtnEdit = document.getElementById('detailCalHeaderBtnEdit');
  if (headerBtnEdit) {
    headerBtnEdit.classList.add('hidden');
    headerBtnEdit.classList.remove('flex');
    headerBtnEdit.onclick = null;
  }
  const adminActions = document.getElementById('detailCalAdminActions');
  if (adminActions) {
    adminActions.classList.add('hidden');
    adminActions.classList.remove('flex');
  }
}

// Helpers
function setCalendarView(view) {
  window.calendarState.view = view;
  if (window.currentRole === 'ADMIN') renderAdminCalendarSection();
  else renderUserCalendarSection();
}

function setCalendarCategoryFilter(category) {
  window.calendarState.categoryFilter = category;
  if (window.currentRole === 'ADMIN') renderAdminCalendarSection();
  else renderUserCalendarSection();
}

function setCalendarAssigneeFilter(filter) {
  window.calendarState.assigneeFilter = filter;
  renderUserCalendarSection();
}

function handleCalendarSearchInput(val) {
  window.calendarState.searchQuery = val;
  if (window.currentRole === 'ADMIN') renderAdminCalendarSection();
  else renderUserCalendarSection();
}

function navigateCalendarMonth(delta) {
  if (delta === 0) {
    window.calendarState.currentDate = new Date();
  } else {
    const cur = window.calendarState.currentDate;
    window.calendarState.currentDate = new Date(cur.getFullYear(), cur.getMonth() + delta, 1);
  }
  if (window.currentRole === 'ADMIN') renderAdminCalendarSection();
  else renderUserCalendarSection();
}

// Expose functions to window
window.isCalendarAdmin = isCalendarAdmin;
window.parseIcsText = parseIcsText;
window.generateIcsString = generateIcsString;
window.downloadCalendarEventIcs = downloadCalendarEventIcs;
window.downloadAllCalendarEventsIcs = downloadAllCalendarEventsIcs;
window.openGoogleCalendarAdd = openGoogleCalendarAdd;
window.renderUserCalendarSection = renderUserCalendarSection;
window.renderAdminCalendarSection = renderAdminCalendarSection;
window.openAddCalendarEventModal = openAddCalendarEventModal;
window.openEditCalendarEventModal = openAddCalendarEventModal;
window.closeCalendarEventModal = closeCalendarEventModal;
window.saveCalendarEventFromModal = saveCalendarEventFromModal;
window.addAssigneeRow = addAssigneeRow;
window.confirmDeleteCalendarEvent = confirmDeleteCalendarEvent;
window.openCalendarIcsModal = openCalendarIcsModal;
window.closeCalendarIcsModal = closeCalendarIcsModal;
window.handleIcsFileSelected = handleIcsFileSelected;
window.toggleSelectAllIcs = toggleSelectAllIcs;
window.confirmIcsImport = confirmIcsImport;
window.openCalendarEventDetailModal = openCalendarEventDetailModal;
window.closeCalendarEventDetailModal = closeCalendarEventDetailModal;
window.setCalendarView = setCalendarView;
window.setCalendarCategoryFilter = setCalendarCategoryFilter;
window.setCalendarAssigneeFilter = setCalendarAssigneeFilter;
window.handleCalendarSearchInput = handleCalendarSearchInput;
window.navigateCalendarMonth = navigateCalendarMonth;

// =========================================================================
// 6. TODAY'S CALENDAR EVENT BANNER (Above Recommended Features Card)
// =========================================================================

let _todayEventTimer = null;
let _todayEventAutoPaused = false;

function renderTodayEventsBanner() {
  const banner = document.getElementById('userTodayEventBanner');
  if (!banner) return;

  // 1. Get today's local date based on user's device (วันเดือนปีบนอุปกรณ์ของผู้ใช้งาน)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const localTodayStr = `${year}-${month}-${day}`;

  // 2. Filter events occurring today
  const allEvents = (window.appState && Array.isArray(window.appState.calendarEvents))
    ? window.appState.calendarEvents
    : [];

  const todayEvents = allEvents.filter(evt => {
    if (!evt || !evt.startDate) return false;
    const start = String(evt.startDate).trim().slice(0, 10);
    const end = evt.endDate ? String(evt.endDate).trim().slice(0, 10) : start;
    return localTodayStr >= start && localTodayStr <= end;
  });

  // If no events match today, hide the banner completely
  if (todayEvents.length === 0) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    if (_todayEventTimer) {
      clearInterval(_todayEventTimer);
      _todayEventTimer = null;
    }
    return;
  }

  // Show banner
  banner.classList.remove('hidden');

  const thaiDay = now.getDate();
  const thaiMonth = THAI_MONTHS_SHORT[now.getMonth()] || '';

  // Active index for multi-event rotation
  if (window._todayEventActiveIdx === undefined || window._todayEventActiveIdx >= todayEvents.length) {
    window._todayEventActiveIdx = 0;
  }
  const currentIdx = window._todayEventActiveIdx;
  const evt = todayEvents[currentIdx] || todayEvents[0];
  const catInfo = CALENDAR_CATEGORIES[evt.category] || CALENDAR_CATEGORIES.EVENT;

  let timeText = 'ตลอดทั้งวัน';
  if (!evt.isAllDay && evt.startTime) {
    timeText = `${evt.startTime} - ${evt.endTime || '12:00'} น.`;
  }

  const hasMultiple = todayEvents.length > 1;

  banner.onclick = () => navigateToCalendarEvent(evt.id);

  banner.innerHTML = `
    <div class="py-2 px-3 sm:py-2.5 sm:px-3.5 flex items-center justify-between gap-2 w-full cursor-pointer hover:bg-muted/30 transition-colors">
      <!-- Left: "วันนี้" Badge -->
      <div class="px-2 h-7.5 rounded-xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
        <span class="text-xs font-black tracking-tight">วันนี้</span>
      </div>

      <!-- Center: Title & Important Info -->
      <div class="min-w-0 flex-1">
        <!-- Title Row: full width, complete activity title -->
        <h4 class="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors leading-snug" title="${evt.title}">
          ${evt.title}
        </h4>

        <!-- Details Row: Category, Time, Location -->
        <div class="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
          <span class="inline-flex items-center gap-0.5 font-semibold ${catInfo.text} shrink-0">
            <i data-lucide="${catInfo.icon || 'star'}" class="w-2.5 h-2.5 inline-block"></i> ${catInfo.label}
          </span>
          ${evt.startTime ? `
            <span class="shrink-0 flex items-center gap-1">
              • <i data-lucide="clock" class="w-2.5 h-2.5 inline-block"></i> ${timeText}
            </span>
          ` : '<span class="shrink-0">• ตลอดทั้งวัน</span>'}
          ${evt.location ? `
            <span class="truncate flex items-center gap-1">
              • <i data-lucide="map-pin" class="w-2.5 h-2.5 text-rose-500 shrink-0 inline-block"></i>
              <span class="truncate">${evt.location}</span>
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Right: Compact Navigation / CTA -->
      <div class="flex items-center gap-1 shrink-0 pl-0.5">
        <!-- Desktop: Prev / Next Buttons -->
        ${hasMultiple ? `
          <div class="hidden sm:flex items-center gap-0.5" onclick="event.stopPropagation()">
            <button type="button" onclick="cycleTodayEvent(-1)" class="w-5 h-5 rounded-md bg-card/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border flex items-center justify-center text-[9px] transition cursor-pointer active:scale-95" title="กิจกรรมก่อนหน้า">
              <i data-lucide="chevron-left" class="w-3 h-3 pointer-events-none"></i>
            </button>
            <button type="button" onclick="cycleTodayEvent(1)" class="w-5 h-5 rounded-md bg-card/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border flex items-center justify-center text-[9px] transition cursor-pointer active:scale-95" title="กิจกรรมถัดไป">
              <i data-lucide="chevron-right" class="w-3 h-3 pointer-events-none"></i>
            </button>
          </div>
        ` : ''}

        <!-- Mobile: Compact [ 1/2 › ] Pill if multiple, else simple chevron -->
        ${hasMultiple ? `
          <button type="button" onclick="event.stopPropagation(); cycleTodayEvent(1);" class="sm:hidden px-1.5 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-0.5 transition shrink-0 active:scale-95" title="กิจกรรมถัดไป">
            <span>${currentIdx + 1}/${todayEvents.length}</span>
            <i data-lucide="chevron-right" class="w-2.5 h-2.5"></i>
          </button>
        ` : `
          <div class="sm:hidden w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <i data-lucide="chevron-right" class="w-3 h-3"></i>
          </div>
        `}

        <!-- Desktop: View in Calendar Arrow -->
        <div class="hidden sm:flex w-6 h-6 rounded-full bg-primary/10 items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors ml-0.5">
          <i data-lucide="arrow-right" class="w-3 h-3"></i>
        </div>
      </div>
    </div>
  `;

  // Start auto-cycle timer if multiple events and not running
  if (hasMultiple && !_todayEventTimer) {
    _todayEventTimer = setInterval(() => {
      if (!_todayEventAutoPaused) {
        cycleTodayEvent(1);
      }
    }, 5000);
  } else if (!hasMultiple && _todayEventTimer) {
    clearInterval(_todayEventTimer);
    _todayEventTimer = null;
  }
}

function cycleTodayEvent(delta) {
  const allEvents = (window.appState && Array.isArray(window.appState.calendarEvents))
    ? window.appState.calendarEvents
    : [];
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const localTodayStr = `${year}-${month}-${day}`;

  const todayEvents = allEvents.filter(evt => {
    if (!evt || !evt.startDate) return false;
    const start = String(evt.startDate).trim().slice(0, 10);
    const end = evt.endDate ? String(evt.endDate).trim().slice(0, 10) : start;
    return localTodayStr >= start && localTodayStr <= end;
  });

  if (todayEvents.length <= 1) return;
  window._todayEventActiveIdx = ((window._todayEventActiveIdx || 0) + delta + todayEvents.length) % todayEvents.length;
  renderTodayEventsBanner();
}

function pauseTodayEventCycle() {
  _todayEventAutoPaused = true;
}

function resumeTodayEventCycle() {
  _todayEventAutoPaused = false;
}

function navigateToCalendarEvent(eventId) {
  // 1. Switch to user HOME view & CALENDAR tool subtab
  if (typeof window.switchRoleView === 'function' && window.currentRole !== 'USER') {
    window.switchRoleView('USER');
  }
  if (typeof window.switchUserTab === 'function') {
    window.switchUserTab('HOME');
  }
  if (typeof window.switchUserToolSubTab === 'function') {
    window.switchUserToolSubTab('CALENDAR');
  }
  if (window.calendarState && window.calendarState.view !== 'LIST') {
    if (typeof window.setCalendarView === 'function') {
      window.setCalendarView('LIST');
    }
  }

  // 2. Open event detail modal and smoothly scroll to the event card
  setTimeout(() => {
    if (eventId && typeof window.openCalendarEventDetailModal === 'function') {
      window.openCalendarEventDetailModal(eventId);
    }

    const eventEl = document.getElementById(`calEventItem_${eventId}`);
    if (eventEl) {
      eventEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      eventEl.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        eventEl.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 3000);
    } else {
      const calSec = document.getElementById('uToolSec_CALENDAR');
      if (calSec) calSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 120);
}

window.renderTodayEventsBanner = renderTodayEventsBanner;
window.cycleTodayEvent = cycleTodayEvent;
window.pauseTodayEventCycle = pauseTodayEventCycle;
window.resumeTodayEventCycle = resumeTodayEventCycle;
window.navigateToCalendarEvent = navigateToCalendarEvent;

