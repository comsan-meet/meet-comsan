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

// Calendar Color Palette Registry
const CALENDAR_COLOR_PALETTES = {
  indigo: { label: 'คราม (Indigo)', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-500', solid: 'bg-indigo-600', hex: '#6366f1' },
  blue: { label: 'น้ำเงิน (Blue)', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500', solid: 'bg-blue-600', hex: '#3b82f6' },
  emerald: { label: 'เขียวมรกต (Emerald)', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500', solid: 'bg-emerald-600', hex: '#10b981' },
  amber: { label: 'เหลืองอำพัน (Amber)', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500', solid: 'bg-amber-600', hex: '#f59e0b' },
  rose: { label: 'แดงกุหลาบ (Rose)', bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500', solid: 'bg-rose-600', hex: '#f43f5e' },
  purple: { label: 'ม่วง (Purple)', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500', solid: 'bg-purple-600', hex: '#a855f7' },
  cyan: { label: 'ฟ้าคราม (Cyan)', bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-500', solid: 'bg-cyan-600', hex: '#06b6d4' },
  pink: { label: 'ชมพู (Pink)', bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/30', dot: 'bg-pink-500', solid: 'bg-pink-600', hex: '#ec4899' },
  orange: { label: 'ส้มสด (Orange)', bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500', solid: 'bg-orange-600', hex: '#f97316' },
  teal: { label: 'เขียวไข่กา (Teal)', bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30', dot: 'bg-teal-500', solid: 'bg-teal-600', hex: '#14b8a6' },
  slate: { label: 'เทาเข้ม (Slate)', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500', solid: 'bg-slate-600', hex: '#64748b' }
};

// Dynamic Category Helpers
function getCalendarCategories() {
  const state = window.appState || {};
  if (Array.isArray(state.calendarCategories) && state.calendarCategories.length > 0) {
    return state.calendarCategories;
  }
  return [
    { key: 'EVENT', label: 'กิจกรรมชมรม', color: 'indigo', icon: 'star' },
    { key: 'MEETING', label: 'การประชุม', color: 'blue', icon: 'users' },
    { key: 'DEADLINE', label: 'กำหนดส่งงาน', color: 'rose', icon: 'clock' },
    { key: 'WORKSHOP', label: 'เวิร์กช็อป / อบรม', color: 'amber', icon: 'laptop' }
  ];
}

function getCategoryMeta(key) {
  const categories = getCalendarCategories();
  const found = categories.find(c => c && c.key === key) || categories[0] || {
    key: 'EVENT', label: 'กิจกรรมชมรม', color: 'indigo', icon: 'star'
  };
  const colorKey = found.color || 'indigo';
  const colorMeta = CALENDAR_COLOR_PALETTES[colorKey] || CALENDAR_COLOR_PALETTES.indigo;
  return {
    ...found,
    bg: colorMeta.bg,
    text: colorMeta.text,
    border: colorMeta.border,
    dot: colorMeta.dot,
    solid: colorMeta.solid,
    hex: colorMeta.hex,
    icon: found.icon || 'star'
  };
}

// Backwards-compatible proxy for existing CALENDAR_CATEGORIES[key] references
const CALENDAR_CATEGORIES = new Proxy({}, {
  get(target, prop) {
    return getCategoryMeta(prop);
  }
});

// Event Visual Styles (Custom Event Color + Category Meta)
function getEventVisualStyles(evt) {
  if (!evt) return getCategoryMeta('EVENT');
  const catMeta = getCategoryMeta(evt.category);
  const prjColor = evt.projectColor || (evt.isProjectEvent ? (evt.color || 'indigo') : null);
  const colorKey = prjColor || evt.color || catMeta.color || 'indigo';
  const palette = CALENDAR_COLOR_PALETTES[colorKey] || CALENDAR_COLOR_PALETTES.indigo;
  return {
    colorKey,
    bg: palette.bg,
    text: palette.text,
    border: palette.border,
    dot: catMeta.dot, // Dot on left is ALWAYS Category Color
    solid: palette.solid,
    hex: palette.hex,
    catMeta
  };
}

// Gather all calendar events for the Main Club Calendar (Club Events + Project Events)
function getAllCalendarEventsForMain() {
  const state = window.appState || {};
  const clubEvents = (Array.isArray(state.calendarEvents) ? state.calendarEvents : []).map(e => ({
    ...e,
    isProjectEvent: false
  }));

  const projectEvents = [];
  let rawProjects = [];
  if (typeof window.getProjectsList === 'function') {
    try { rawProjects = window.getProjectsList(); } catch (e) {}
  }
  if (!rawProjects || rawProjects.length === 0) {
    rawProjects = Array.isArray(state.projects) ? state.projects : [];
  }

  // Deduplicate projects by ID
  const seenPrjIds = new Set();
  const projects = [];
  (rawProjects || []).forEach(p => {
    if (p && p.id && !seenPrjIds.has(p.id)) {
      seenPrjIds.add(p.id);
      projects.push(p);
    }
  });

  projects.forEach(p => {
    const isShown = (p.showInMainCalendar === true || p.showInMainCalendar === 'true') ||
      (p.showInMainCalendar !== false && p.showInMainCalendar !== 'false');
    const prjColor = p.calendarColor || p.color || 'indigo';
    if (isShown && Array.isArray(p.calendarEvents)) {
      p.calendarEvents.forEach(e => {
        if (!e) return;
        projectEvents.push({
          ...e,
          color: e.color || prjColor,
          projectColor: prjColor,
          isProjectEvent: true,
          projectId: p.id,
          projectTitle: p.title || 'โครงการ',
          projectCode: p.code || ''
        });
      });
    }
  });

  return [...clubEvents, ...projectEvents].sort((a, b) => {
    const da = `${a.startDate || ''} ${a.startTime || '00:00'}`;
    const db = `${b.startDate || ''} ${b.startTime || '00:00'}`;
    return da.localeCompare(db);
  });
}

/**
 * Helper to verify if the active session is currently an authenticated Admin
 * Only ADMIN can create, update, delete events, import ICS, or manage categories.
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
  const events = getAllCalendarEventsForMain();
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

  const events = getAllCalendarEventsForMain();
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

  // Build HTML (Clean Comsan Choice Calendar Layout)
  let html = `
    <div class="space-y-4">
      <!-- Search & Filter Bar (Matching Choice Style) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="relative flex-1">
          <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"></i>
          <input type="text" placeholder="ค้นหากำหนดการ, สถานที่, ผู้รับผิดชอบ..."
            value="${window.calendarState.searchQuery || ''}"
            oninput="handleCalendarSearchInput(this.value)"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" onclick="downloadAllCalendarEventsIcs()"
            class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-white h-10 px-3">
            <i data-lucide="download" class="h-4 w-4"></i>
            <span>บันทึก .ics</span>
          </button>
          <div class="bg-muted p-1 rounded-lg flex items-center gap-1 border border-border/60 h-10">
            <button type="button" onclick="setCalendarView('LIST')"
              class="px-3 py-1 rounded-md text-xs font-medium transition ${window.calendarState.view === 'LIST' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}">
              รายการ
            </button>
            <button type="button" onclick="setCalendarView('MONTH')"
              class="px-3 py-1 rounded-md text-xs font-medium transition ${window.calendarState.view === 'MONTH' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}">
              เดือน
            </button>
          </div>
        </div>
      </div>

      <!-- Horizontal Rounded-Full Filter Pills -->
      <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button type="button" onclick="setCalendarAssigneeFilter('ALL'); setCalendarCategoryFilter('ALL');"
          class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors h-8 rounded-full px-3.5 shrink-0 ${window.calendarState.assigneeFilter === 'ALL' && window.calendarState.categoryFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'border border-input bg-background hover:bg-accent hover:text-white'}">
          ทั้งหมด (${totalEventsCount})
        </button>
        <button type="button" onclick="setCalendarAssigneeFilter('MY_TASKS')"
          class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors h-8 rounded-full px-3.5 shrink-0 ${window.calendarState.assigneeFilter === 'MY_TASKS' ? 'bg-primary text-primary-foreground' : 'border border-input bg-background hover:bg-accent hover:text-white'}">
          งานที่ฉันรับผิดชอบ (${myTasksCount})
        </button>
        <button type="button" onclick="setCalendarAssigneeFilter('ALL'); setCalendarCategoryFilter('MEETING');"
          class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors h-8 rounded-full px-3.5 shrink-0 ${window.calendarState.categoryFilter === 'MEETING' ? 'bg-primary text-primary-foreground' : 'border border-input bg-background hover:bg-accent hover:text-white'}">
          การประชุม
        </button>
        <button type="button" onclick="setCalendarAssigneeFilter('ALL'); setCalendarCategoryFilter('EVENT');"
          class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors h-8 rounded-full px-3.5 shrink-0 ${window.calendarState.categoryFilter === 'EVENT' ? 'bg-primary text-primary-foreground' : 'border border-input bg-background hover:bg-accent hover:text-white'}">
          กิจกรรมชมรม
        </button>
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
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

// =========================================================================
// 3. RENDERING: ADMIN CALENDAR SECTION
// =========================================================================

function renderAdminCalendarSection() {
  const container = document.getElementById('aTab_CALENDAR');
  if (!container) return;

  const events = getAllCalendarEventsForMain();
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
        <h4 class="font-extrabold text-base sm:text-lg text-foreground">
          ${THAI_MONTHS[month]} ${year + 543}
        </h4>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <button type="button" onclick="navigateCalendarMonth(0)"
            class="h-8 px-3 rounded-full border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95" title="กลับไปเดือนปัจจุบัน">
            วันนี้
          </button>
          <div class="flex items-center gap-1">
            <button type="button" onclick="navigateCalendarMonth(-1)"
              class="w-8 h-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition shadow-2xs cursor-pointer active:scale-95" title="เดือนก่อนหน้า">
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            <button type="button" onclick="navigateCalendarMonth(1)"
              class="w-8 h-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition shadow-2xs cursor-pointer active:scale-95" title="เดือนถัดไป">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          </div>
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
    const dayEvents = events.filter(e => {
      const sd = String(e.startDate || '').slice(0, 10);
      const ed = String(e.endDate || e.startDate || '').slice(0, 10);
      return sd && sd <= dayDateStr && dayDateStr <= (ed >= sd ? ed : sd);
    });
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
            const styles = getEventVisualStyles(e);
            const catMeta = styles.catMeta || getCategoryMeta(e.category);
            return `
              <div onclick="openCalendarEventDetailModal('${e.id}')"
                class="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate cursor-pointer transition ${styles.bg} ${styles.text} border ${styles.border} hover:scale-[1.02] flex items-center justify-between group/chip"
                title="${e.title}${e.projectTitle ? ' (' + e.projectTitle + ')' : ''} (${e.startTime || ''}) - คลิกเพื่อดูรายละเอียด">
                <span class="truncate flex-1 flex items-center gap-1 min-w-0">
                  <span class="w-1.5 h-1.5 rounded-full ${styles.dot} shrink-0" title="ประเภท: ${catMeta.label}"></span>
                  ${(e.startTime && !e.isAllDay && String(e.startDate).slice(0, 10) === dayDateStr) ? `<span class="opacity-75 mr-0.5 shrink-0">${e.startTime}</span>` : ''}
                  <span class="truncate font-semibold">${e.title}</span>
                </span>
                ${canManage ? `
                  <button type="button" onclick="event.stopPropagation(); openAddCalendarEventModal('${e.id}', null, '${e.projectId || ''}')"
                    class="opacity-0 group-hover/chip:opacity-100 hover:scale-125 ml-1 text-inherit hover:text-primary transition shrink-0 p-0.5 cursor-pointer"
                    title="แก้ไขงานนี้ทันที">
                    <i data-lucide="square-pen" class="w-2.5 h-2.5"></i>
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

/**
 * Generate prominent Eye-Catching Date Badge (Frame with Month & Day)
 */
function getEventDateBadgeInfo(evt) {
  const startIso = String(evt.startDate || '').slice(0, 10);
  const endIso = String(evt.endDate || evt.startDate || '').slice(0, 10);
  const isMultiDay = Boolean(startIso && endIso && endIso > startIso);

  const fmtThai = (iso) => {
    const pp = String(iso || '').split('-');
    if (pp.length !== 3) return null;
    const mn = (typeof THAI_MONTHS !== 'undefined' && THAI_MONTHS[parseInt(pp[1], 10) - 1]) || pp[1];
    return { d: parseInt(pp[2], 10), m: mn, y: parseInt(pp[0], 10) + 543, rawM: parseInt(pp[1], 10) };
  };

  let monthText = 'กิจกรรม';
  let dayText = '•';
  let yearText = '';

  if (startIso) {
    const s = fmtThai(startIso);
    if (s) {
      const mIdx = s.rawM - 1;
      monthText = (typeof THAI_MONTHS_SHORT !== 'undefined' && THAI_MONTHS_SHORT[mIdx]) ? THAI_MONTHS_SHORT[mIdx] : s.m;
      dayText = String(s.d);
      yearText = String(s.y);

      if (isMultiDay && endIso) {
        const e = fmtThai(endIso);
        if (e) {
          if (s.rawM === e.rawM) {
            dayText = `${s.d}-${e.d}`;
          } else {
            const eMIdx = e.rawM - 1;
            const endMonthShort = (typeof THAI_MONTHS_SHORT !== 'undefined' && THAI_MONTHS_SHORT[eMIdx]) ? THAI_MONTHS_SHORT[eMIdx] : e.m;
            dayText = `${s.d}-${e.d}`;
            monthText = `${monthText}-${endMonthShort}`;
          }
        }
      }
    }
  }

  let borderClass = 'border-primary/40 dark:border-primary/50';
  let headerClass = 'bg-primary text-primary-foreground';
  let numClass = 'text-primary';
  let bgClass = 'bg-primary/5 dark:bg-primary/10';

  if (evt.category === 'DEADLINE') {
    borderClass = 'border-rose-500/40 dark:border-rose-500/50';
    headerClass = 'bg-rose-600 text-white';
    numClass = 'text-rose-600 dark:text-rose-400';
    bgClass = 'bg-rose-500/5 dark:bg-rose-500/10';
  } else if (evt.category === 'WORKSHOP') {
    borderClass = 'border-amber-500/40 dark:border-amber-500/50';
    headerClass = 'bg-amber-500 text-slate-950 font-black';
    numClass = 'text-amber-600 dark:text-amber-400';
    bgClass = 'bg-amber-500/5 dark:bg-amber-500/10';
  }

  const html = `
    <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${borderClass} ${bgClass} select-none shrink-0 shadow-2xs group-hover:scale-102 transition-transform">
      <span class="px-2 py-0.5 rounded-full ${headerClass} font-black text-[11px] sm:text-xs whitespace-nowrap leading-tight shrink-0 shadow-2xs min-w-[22px] text-center inline-flex items-center justify-center">
        ${dayText}
      </span>
      <span class="text-xs font-bold ${numClass} whitespace-nowrap pr-1">
        ${monthText}${yearText ? ' ' + yearText : ''}
      </span>
    </div>
  `;

  return { monthText, dayText, yearText, html };
}

function renderAgendaListView(events, currentUser, isAdmin = false) {
  const canManage = Boolean(isAdmin && isCalendarAdmin());
  if (events.length === 0) {
    return `
      <div class="rounded-lg border border-border bg-card text-card-foreground shadow-sm shadow-card p-10 text-center space-y-3 mt-4">
        <p class="text-sm text-muted-foreground">ไม่พบกำหนดการที่ตรงตามเงื่อนไขการค้นหา</p>
        ${canManage ? `
          <div class="pt-1">
            <button type="button" onclick="openAddCalendarEventModal()" class="inline-flex items-center justify-center rounded-md text-xs font-semibold bg-primary text-primary-foreground h-9 px-4">
              + เพิ่มกำหนดการแรก
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  let html = `<div class="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 mt-4">`;

  events.forEach(evt => {
    const styles = getEventVisualStyles(evt);
    const catInfo = styles.catMeta || CALENDAR_CATEGORIES.EVENT;

    // Format Thai Date matching Choice (e.g. "19 ตุลาคม 2569")
    let dateStr = evt.startDate || '';
    let thaiFullDateStr = dateStr || 'ไม่ระบุวันที่';
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10) + 543;
        const mIdx = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const mName = (typeof THAI_MONTHS !== 'undefined' && THAI_MONTHS[mIdx]) ? THAI_MONTHS[mIdx] : parts[1];
        thaiFullDateStr = `${d} ${mName} ${y}`;
      }
    }

    const fmtThai = (iso) => {
      const pp = String(iso || '').split('-');
      if (pp.length !== 3) return iso || '';
      const mn = (typeof THAI_MONTHS !== 'undefined' && THAI_MONTHS[parseInt(pp[1], 10) - 1]) || pp[1];
      return { d: parseInt(pp[2], 10), m: mn, y: parseInt(pp[0], 10) + 543 };
    };
    const endIso = String(evt.endDate || evt.startDate || '').slice(0, 10);
    const startIso = String(evt.startDate || '').slice(0, 10);
    const isMultiDay = Boolean(startIso && endIso && endIso > startIso);
    if (isMultiDay) {
      const a = fmtThai(startIso), b = fmtThai(endIso);
      if (a.y === b.y && a.m === b.m) thaiFullDateStr = `${a.d} - ${b.d} ${b.m} ${b.y}`;
      else if (a.y === b.y) thaiFullDateStr = `${a.d} ${a.m} - ${b.d} ${b.m} ${b.y}`;
      else thaiFullDateStr = `${a.d} ${a.m} ${a.y} - ${b.d} ${b.m} ${b.y}`;
      const dayCount = Math.round((new Date(endIso) - new Date(startIso)) / 86400000) + 1;
      thaiFullDateStr += ` (${dayCount} วัน)`;
    }

    // Time text
    let timeText = 'ตลอดทั้งวัน';
    if (!evt.isAllDay && evt.startTime) {
      timeText = `${evt.startTime}${evt.endTime ? ' - ' + evt.endTime : ''} น.`;
    }

    const lastIso = (endIso && endIso >= startIso) ? endIso : startIso;
    const isPast = lastIso && lastIso < todayIso;
    const isToday = startIso && startIso <= todayIso && todayIso <= lastIso;
    const statusBadge = isToday
      ? `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">วันนี้</div>`
      : (isPast
        ? `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-muted text-muted-foreground">เสร็จสิ้น</div>`
        : `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-primary/10 text-primary">กำลังจะมาถึง</div>`);

    const isMeAssigned = currentUser && Array.isArray(evt.assignees) && evt.assignees.some(a => {
      if (a.userId && a.userId === currentUser.id) return true;
      if (a.name && (a.name.includes(currentUser.firstName) || a.name.includes(currentUser.nickname))) return true;
      return false;
    });

    const dateBadge = getEventDateBadgeInfo(evt);

    html += `
      <div id="calEventItem_${evt.id}" onclick="openCalendarEventDetailModal('${evt.id}')" class="rounded-2xl border border-border bg-card text-card-foreground shadow-sm shadow-card cursor-pointer hover:shadow-lg transition-all flex flex-col justify-between group p-4 sm:p-5 space-y-3.5">
        <div>
          <!-- Top Row: Prominent Date Badge & Status -->
          <div class="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
            ${dateBadge.html}
            ${statusBadge}
          </div>

          <!-- Title -->
          <h3 class="tracking-tight text-base sm:text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
            ${evt.title}
          </h3>

          <!-- Category, Project & Assignee Tag -->
          <div class="flex items-center gap-1.5 flex-wrap mt-2">
            ${evt.isProjectEvent ? `
              <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${styles.bg} ${styles.text} border ${styles.border} truncate max-w-[220px]" title="${evt.projectTitle}">
                <i data-lucide="folder-kanban" class="w-3 h-3 shrink-0"></i>
                <span class="truncate">${evt.projectTitle}</span>
              </span>
            ` : ''}
            <div class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold text-xs ${catInfo.bg} ${catInfo.text} ${catInfo.border}">
              <span class="w-1.5 h-1.5 rounded-full ${catInfo.dot} shrink-0"></span>
              <i data-lucide="${catInfo.icon || 'star'}" class="w-3 h-3 shrink-0"></i>
              <span>${catInfo.label}</span>
            </div>
            ${isMeAssigned ? `
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                ★ งานของคุณ
              </span>
            ` : ''}
          </div>

          <!-- Description -->
          ${evt.description ? `<p class="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">${evt.description}</p>` : ''}
        </div>

        <!-- Details & Actions Footer -->
        <div class="space-y-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <div class="flex items-center gap-2">
            <i data-lucide="clock" class="h-3.5 w-3.5 shrink-0 text-muted-foreground"></i>
            <span>${timeText}</span>
          </div>
          <div class="flex items-center gap-2">
            <i data-lucide="map-pin" class="h-3.5 w-3.5 shrink-0 text-muted-foreground"></i>
            <span class="truncate">${evt.location || 'ห้องประชุมชมรมคมสัน'}</span>
          </div>

          ${Array.isArray(evt.assignees) && evt.assignees.length > 0 ? `
            <div class="pt-1 flex items-center gap-1.5 flex-wrap">
              <span class="text-xs font-medium text-muted-foreground">ผู้รับผิดชอบ:</span>
              ${evt.assignees.map(a => `
                <span class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                  ${a.name}${a.role ? ' (' + a.role + ')' : ''}
                </span>
              `).join('')}
            </div>
          ` : ''}

          <!-- Bottom Action Buttons -->
          <div class="pt-2 flex items-center justify-between gap-2 border-t border-border/50" onclick="event.stopPropagation()">
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="downloadCalendarEventIcs('${evt.id}')" class="inline-flex items-center gap-1 rounded-md border border-input bg-background hover:bg-accent hover:text-white px-2.5 py-1 text-xs font-medium text-foreground transition">
                <i data-lucide="download" class="h-3.5 w-3.5"></i> <span>.ics</span>
              </button>
              <button type="button" onclick="openGoogleCalendarAdd('${evt.id}')" class="inline-flex items-center gap-1 rounded-md border border-input bg-background hover:bg-accent hover:text-white px-2.5 py-1 text-xs font-medium text-foreground transition">
                <i data-lucide="calendar-plus" class="h-3.5 w-3.5"></i> <span>Google Cal</span>
              </button>
            </div>

            ${canManage ? `
              <div class="flex items-center gap-1.5 ml-auto">
                <button type="button" onclick="openAddCalendarEventModal('${evt.id}', null, '${evt.projectId || ''}')"
                  class="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition !w-8 !h-8 !min-w-0 !p-0 !gap-0 inline-flex items-center justify-center shrink-0 cursor-pointer" title="แก้ไข" aria-label="แก้ไข"><i data-lucide="pencil" class="h-4 w-4 pointer-events-none"></i></button>
                <button type="button" onclick="confirmDeleteCalendarEvent('${evt.id}', '${(evt.title || '').replace(/'/g, "\\'")}', '${evt.projectId || ''}')"
                  class="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition !w-8 !h-8 !min-w-0 !p-0 !gap-0 inline-flex items-center justify-center shrink-0 cursor-pointer" title="ลบ" aria-label="ลบ"><i data-lucide="trash-2" class="h-4 w-4 pointer-events-none"></i></button>
              </div>
            ` : `
              <button type="button" onclick="openCalendarEventDetailModal('${evt.id}')"
                class="text-xs font-medium text-primary hover:underline ml-auto">
                ดูรายละเอียด
              </button>
            `}
          </div>
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

// ==========================================
// CATEGORY MANAGEMENT MODAL & CONTROLS
// ==========================================
function openCalendarCategoryModal() {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถจัดการประเภทกิจกรรมได้', 'warning');
    }
    return;
  }
  const modal = document.getElementById('calendarCategoryModal');
  if (!modal) return;
  renderCalendarCategoriesList();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCalendarCategoryModal() {
  const modal = document.getElementById('calendarCategoryModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function renderCalendarCategoriesList() {
  const container = document.getElementById('calendarCategoriesListContainer');
  const badge = document.getElementById('catCountBadge');
  if (!container) return;

  const categories = getCalendarCategories();
  if (badge) badge.textContent = `${categories.length} ประเภท`;

  container.innerHTML = categories.map(cat => {
    const colorMeta = CALENDAR_COLOR_PALETTES[cat.color] || CALENDAR_COLOR_PALETTES.indigo;
    const isProtected = ['EVENT', 'MEETING', 'DEADLINE'].includes(cat.key);
    return `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/80 hover:bg-muted/40 transition">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-7 h-7 rounded-lg ${colorMeta.bg} ${colorMeta.text} flex items-center justify-center shrink-0 border ${colorMeta.border}">
            <i data-lucide="${cat.icon || 'star'}" class="w-3.5 h-3.5"></i>
          </span>
          <div class="min-w-0">
            <p class="text-xs font-bold text-foreground truncate">${cat.label}</p>
            <p class="text-[10px] text-muted-foreground font-mono">ID: ${cat.key} • สี: ${colorMeta.label.split(' ')[0]}</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${categories.length > 1 ? `
            <button type="button" onclick="deleteCalendarCategory('${cat.key}', '${cat.label}')"
              class="w-7 h-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition cursor-pointer"
              title="ลบประเภทนี้">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

async function addNewCalendarCategory() {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถจัดการประเภทกิจกรรมได้', 'warning');
    }
    return;
  }
  const labelInput = document.getElementById('newCatLabel');
  const colorSelect = document.getElementById('newCatColor');
  const iconSelect = document.getElementById('newCatIcon');

  const label = (labelInput?.value || '').trim();
  if (!label) {
    if (typeof showToast === 'function') showToast('กรุณากรอกชื่อประเภทกิจกรรม', 'warning');
    return;
  }

  const color = colorSelect?.value || 'indigo';
  const icon = iconSelect?.value || 'star';
  const key = 'CAT_' + Date.now().toString(36).toUpperCase();

  const categories = [...getCalendarCategories()];
  categories.push({ key, label, color, icon });

  if (window.appState) {
    window.appState.calendarCategories = categories;
  }

  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:updateCalendarCategories', { categories });
  }

  if (typeof window.saveLocalState === 'function') window.saveLocalState();

  if (labelInput) labelInput.value = '';
  renderCalendarCategoriesList();
  populateCategorySelectOptions();

  // Refresh calendar views
  if (typeof renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') renderAdminCalendarSection();
  if (typeof renderUserCalendarSection === 'function') renderUserCalendarSection();
  if (typeof window.renderProjectCalendarView === 'function' && window.activeDetailProjectId) {
    window.renderProjectCalendarView(window.activeDetailProjectId);
  }
  if (typeof window.renderFormCalendarEvents === 'function') {
    window.renderFormCalendarEvents();
  }

  if (typeof showToast === 'function') showToast(`เพิ่มประเภท "${label}" เรียบร้อยแล้ว`, 'success');
}

async function deleteCalendarCategory(key, label) {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถจัดการประเภทกิจกรรมได้', 'warning');
    }
    return;
  }
  const confirmed = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: 'ยืนยันการลบประเภทกิจกรรม',
        message: `คุณต้องการลบประเภท "${label}" ออกจากระบบหรือไม่? กิจกรรมที่ใช้ประเภทนี้จะยังคงอยู่`,
        confirmText: 'ลบประเภท',
        isDanger: true,
        icon: 'trash-2'
      })
    : confirm(`คุณต้องการลบประเภท "${label}" หรือไม่?`);

  if (!confirmed) return;

  let categories = [...getCalendarCategories()].filter(c => c.key !== key);
  if (categories.length === 0) {
    categories = [{ key: 'EVENT', label: 'กิจกรรมทั่วไป', color: 'indigo', icon: 'star' }];
  }

  if (window.appState) {
    window.appState.calendarCategories = categories;
  }

  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:updateCalendarCategories', { categories });
  }

  if (typeof window.saveLocalState === 'function') window.saveLocalState();

  renderCalendarCategoriesList();
  populateCategorySelectOptions();

  // Refresh calendar views
  if (typeof renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') renderAdminCalendarSection();
  if (typeof renderUserCalendarSection === 'function') renderUserCalendarSection();
  if (typeof window.renderProjectCalendarView === 'function' && window.activeDetailProjectId) {
    window.renderProjectCalendarView(window.activeDetailProjectId);
  }
  if (typeof window.renderFormCalendarEvents === 'function') {
    window.renderFormCalendarEvents();
  }

  if (typeof showToast === 'function') showToast(`ลบประเภท "${label}" เรียบร้อยแล้ว`, 'info');
}

// Populate Category Dropdown Options in Modal
function populateCategorySelectOptions(selectedKey = 'EVENT') {
  const select = document.getElementById('calCategory');
  if (!select) return;

  const categories = getCalendarCategories();
  select.innerHTML = categories.map(c => `
    <option value="${c.key}" ${c.key === selectedKey ? 'selected' : ''}>${c.label}</option>
  `).join('');
}

// Render Event Color Swatches in Event Modal
function renderEventColorPicker(selectedColor = 'indigo') {
  const group = document.getElementById('calColorPickerGroup');
  const hiddenInput = document.getElementById('calColor');
  const labelEl = document.getElementById('calColorLabel');
  if (!group || !hiddenInput) return;

  const chosen = selectedColor || 'indigo';
  hiddenInput.value = chosen;
  if (labelEl) {
    labelEl.textContent = CALENDAR_COLOR_PALETTES[chosen]?.label || chosen;
  }

  group.innerHTML = Object.entries(CALENDAR_COLOR_PALETTES).map(([k, p]) => {
    const isSelected = k === chosen;
    return `
      <button type="button" onclick="selectEventColor('${k}')"
        class="w-6 h-6 rounded-full ${p.solid} transition-all duration-200 cursor-pointer flex items-center justify-center ${isSelected ? 'ring-2 ring-primary ring-offset-2 scale-110 shadow-sm' : 'hover:scale-105 opacity-80 hover:opacity-100'}"
        title="${p.label}">
        ${isSelected ? '<i data-lucide="check" class="w-3 h-3 text-white pointer-events-none"></i>' : ''}
      </button>
    `;
  }).join('');

  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function selectEventColor(colorKey) {
  renderEventColorPicker(colorKey);
}

// Add / Edit Modal
function openAddCalendarEventModal(eventIdToEdit = null, defaultDate = null, projectId = null) {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถจัดการกิจกรรมได้', 'warning');
    }
    return;
  }
  const modal = document.getElementById('calendarEventModal');
  if (!modal) return;

  const state = window.appState || {};
  const users = state.users || [];
  const allProjects = (typeof window.getProjectsList === 'function' ? window.getProjectsList() : state.projects) || [];

  let targetProjectId = projectId || (document.getElementById('calProjectId')?.value) || null;
  let currentProject = null;
  let event = null;

  // 1. Robust event & project discovery
  if (eventIdToEdit) {
    // If targetProjectId was provided, check that project first
    if (targetProjectId) {
      currentProject = allProjects.find(p => p && p.id === targetProjectId) || null;
      if (currentProject && Array.isArray(currentProject.calendarEvents)) {
        event = currentProject.calendarEvents.find(e => e && e.id === eventIdToEdit) || null;
      }
    }

    // If not found in targetProjectId, search across ALL projects
    if (!event) {
      for (const p of allProjects) {
        if (p && Array.isArray(p.calendarEvents)) {
          const found = p.calendarEvents.find(e => e && e.id === eventIdToEdit);
          if (found) {
            event = found;
            currentProject = p;
            targetProjectId = p.id;
            break;
          }
        }
      }
    }

    // If still not found, search in club calendar events
    if (!event && Array.isArray(state.calendarEvents)) {
      const found = state.calendarEvents.find(e => e && e.id === eventIdToEdit);
      if (found) {
        event = found;
        currentProject = null;
        targetProjectId = null;
      }
    }
  } else {
    // If adding a new event
    if (targetProjectId) {
      currentProject = allProjects.find(p => p && p.id === targetProjectId) || null;
    }
  }

  const modalIcon = document.getElementById('calModalIcon');
  if (modalIcon) {
    if (typeof updateIcon === 'function') {
      updateIcon(modalIcon, event ? 'square-pen' : 'calendar-plus');
    } else {
      modalIcon.setAttribute('data-lucide', event ? 'square-pen' : 'calendar-plus');
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }
  }

  // Set Project ID context
  const prjInput = document.getElementById('calProjectId');
  if (prjInput) prjInput.value = targetProjectId || '';

  const titlePrefix = currentProject ? `[${currentProject.title}] ` : '';
  document.getElementById('calModalTitle').textContent = event
    ? (currentProject ? `แก้ไขกิจกรรมโครงการ: ${currentProject.title}` : 'แก้ไขตารางงานชมรม')
    : (currentProject ? `เพิ่มกิจกรรมโครงการ: ${currentProject.title}` : 'เพิ่มตารางงานใหม่');

  document.getElementById('calEventId').value = event ? event.id : '';
  document.getElementById('calTitle').value = event ? event.title : '';

  // Populate dynamic categories and color swatches
  populateCategorySelectOptions(event ? event.category : 'EVENT');
  const defaultEventColor = (currentProject && (currentProject.calendarColor || currentProject.color)) || 'indigo';
  renderEventColorPicker(event ? (event.color || defaultEventColor) : defaultEventColor);
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
        confirmDeleteCalendarEvent(event.id, event.title, targetProjectId);
      };
    } else {
      delBtn.classList.add('hidden');
      delBtn.classList.remove('flex');
      delBtn.onclick = null;
    }
  }

  // Setup project assignees & roles datalists
  const stakeholderData = (targetProjectId && typeof window.getProjectStakeholdersForCalendar === 'function')
    ? window.getProjectStakeholdersForCalendar(targetProjectId)
    : { stakeholders: [], roles: [] };

  window._currentCalStakeholders = stakeholderData.stakeholders || [];

  const noticeEl = document.getElementById('calProjectAssigneeNotice');
  if (noticeEl) {
    if (targetProjectId && stakeholderData.stakeholders && stakeholderData.stakeholders.length > 0) {
      noticeEl.textContent = `✨ สามารถเลือกผู้รับผิดชอบ (${stakeholderData.stakeholders.length} คน) และหน้าที่จากโครงการนี้ได้`;
      noticeEl.classList.remove('hidden');
    } else {
      noticeEl.classList.add('hidden');
    }
  }

  // Populate calAssigneeNameList datalist
  let nameDatalist = document.getElementById('calAssigneeNameList');
  if (!nameDatalist) {
    nameDatalist = document.createElement('datalist');
    nameDatalist.id = 'calAssigneeNameList';
    document.body.appendChild(nameDatalist);
  }
  let nameOptionsHtml = '';
  if (stakeholderData.stakeholders && stakeholderData.stakeholders.length > 0) {
    nameOptionsHtml += stakeholderData.stakeholders.map(s => {
      const label = s.duty ? `${s.group}: ${s.duty}` : s.group;
      return `<option value="${s.displayName}">${label}</option>`;
    }).join('');
  }
  users.forEach(u => {
    const val = u.nickname ? `${u.nickname} (${u.firstName} ${u.lastName})` : `${u.firstName} ${u.lastName}`;
    nameOptionsHtml += `<option value="${val}">สมาชิกชมรม (${u.position || 'สมาชิก'})</option>`;
  });
  nameDatalist.innerHTML = nameOptionsHtml;

  // Populate calAssigneeRoleList datalist
  let roleDatalist = document.getElementById('calAssigneeRoleList');
  if (!roleDatalist) {
    roleDatalist = document.createElement('datalist');
    roleDatalist.id = 'calAssigneeRoleList';
    document.body.appendChild(roleDatalist);
  }
  const allRoles = (stakeholderData.roles && stakeholderData.roles.length > 0)
    ? stakeholderData.roles
    : [
      'หัวหน้าโครงการ', 'รองหัวหน้าโครงการ', 'ผู้ประสานงานโครงการ', 'เลขานุการโครงการ',
      'ฝ่ายสถานที่และอุปกรณ์', 'ฝ่ายพิธีการและสันทนาการ', 'ฝ่ายทะเบียนและต้อนรับ',
      'ฝ่ายสวัสดิการและพยาบาล', 'ฝ่ายสื่อ สารสนเทศและประชาสัมพันธ์',
      'ฝ่ายการเงินและงบประมาณ', 'ฝ่ายประเมินผล', 'ผู้รับผิดชอบกิจกรรม'
    ];
  roleDatalist.innerHTML = allRoles.map(r => `<option value="${r}"></option>`).join('');

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

  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 cal-assignee-row';
  row.innerHTML = `
    <div class="flex-1 min-w-0">
      <input type="text" list="calAssigneeNameList" placeholder="ชื่อผู้รับผิดชอบ หรือพิมพ์เลือก..." value="${name || ''}"
        oninput="handleAssigneeNameInput(this)"
        class="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/70 focus:bg-card focus:ring-1 focus:ring-primary outline-none assignee-name">
    </div>
    <div class="flex-1 min-w-0">
      <input type="text" list="calAssigneeRoleList" placeholder="บทบาทหน้าที่ (เลือกหรือพิมพ์)..." value="${role || ''}"
        class="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/70 focus:bg-card focus:ring-1 focus:ring-primary outline-none assignee-role">
    </div>
    <button type="button" onclick="this.closest('.cal-assignee-row').remove()"
      class="w-8 h-8 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition shrink-0 cursor-pointer" title="ลบผู้รับผิดชอบนี้">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;
  container.appendChild(row);
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

function handleAssigneeNameInput(input) {
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  const row = input.closest('.cal-assignee-row');
  if (!row) return;
  const roleInput = row.querySelector('.assignee-role');
  if (!roleInput || roleInput.value.trim() !== '') return;

  const stakeholders = window._currentCalStakeholders || [];
  const match = stakeholders.find(s => s.displayName === val || s.name === val || (s.nickname && val.includes(s.nickname)));
  if (match && (match.duty || match.dept)) {
    roleInput.value = match.duty || match.dept;
  }
}
window.handleAssigneeNameInput = handleAssigneeNameInput;

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

  const projectId = (document.getElementById('calProjectId')?.value || '').trim();
  const chosenColor = document.getElementById('calColor')?.value || 'indigo';

  const eventData = {
    id: id || undefined,
    title,
    category,
    color: chosenColor,
    startDate,
    startTime,
    endDate,
    endTime,
    isAllDay,
    location,
    description,
    assignees,
    createdSource: 'MANUAL',
    projectId: projectId || undefined
  };

  // Case A: Saving to Project Calendar
  if (projectId) {
    const allProjects = (typeof window.getProjectsList === 'function' ? window.getProjectsList() : window.appState?.projects) || [];
    const prj = allProjects.find(p => p && p.id === projectId);
    if (prj) {
      if (!Array.isArray(prj.calendarEvents)) prj.calendarEvents = [];
      if (id) {
        const evIdx = prj.calendarEvents.findIndex(e => e.id === id);
        if (evIdx !== -1) {
          prj.calendarEvents[evIdx] = { ...prj.calendarEvents[evIdx], ...eventData, updatedAt: new Date().toISOString() };
        } else {
          prj.calendarEvents.unshift(eventData);
        }
      } else {
        eventData.id = 'evt_prj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        prj.calendarEvents.unshift(eventData);
      }
      prj.updatedAt = new Date().toISOString();

      // Emit project calendar update
      if (window.socket && typeof window.socket.emit === 'function') {
        window.socket.emit('admin:updateProjectCalendar', {
          projectId,
          calendarEvents: prj.calendarEvents,
          showInMainCalendar: prj.showInMainCalendar !== false
        });
      }
      if (typeof window.saveLocalState === 'function') window.saveLocalState();

      // Re-render project calendar and badges
      if (typeof window.renderProjectCalendarView === 'function') {
        window.renderProjectCalendarView(projectId);
      }
      if (typeof window.renderFormCalendarEvents === 'function') {
        window.renderFormCalendarEvents(projectId);
      }
      const countBadge = document.getElementById('prjDetailCalCountBadge');
      if (countBadge) countBadge.textContent = prj.calendarEvents.length;
      const totalBadge = document.getElementById('prjCalEventsTotalBadge');
      if (totalBadge) totalBadge.textContent = `${prj.calendarEvents.length} กิจกรรม`;

      // Refresh main calendar if showInMainCalendar is true
      if (prj.showInMainCalendar !== false) {
        if (typeof renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') renderAdminCalendarSection();
        if (typeof renderUserCalendarSection === 'function') renderUserCalendarSection();
        if (typeof renderTodayEventsBanner === 'function') renderTodayEventsBanner();
      }
      showToast('บันทึกกิจกรรมในโครงการเรียบร้อยแล้ว', 'success');
    } else {
      showToast('ไม่พบโครงการที่ระบุ', 'error');
    }
  } else {
    // Case B: Saving to Club Main Calendar
    if (id) {
      window.socket.emit('admin:updateCalendarEvent', eventData);
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
  }

  closeCalendarEventModal();
}

async function confirmDeleteCalendarEvent(eventId, title, projectId = null) {
  if (!isCalendarAdmin()) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถลบกิจกรรมได้', 'warning');
    }
    return;
  }
  let targetProjectId = projectId || (document.getElementById('calProjectId')?.value) || null;
  const allProjects = (typeof window.getProjectsList === 'function' ? window.getProjectsList() : window.appState?.projects) || [];
  if (!targetProjectId && eventId) {
    const foundPrj = allProjects.find(p => p && Array.isArray(p.calendarEvents) && p.calendarEvents.some(e => e && e.id === eventId));
    if (foundPrj) targetProjectId = foundPrj.id;
  }
  const confirmed = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: 'ยืนยันการลบกิจกรรมปฏิทิน',
        message: `คุณต้องการลบกิจกรรม "${title}" ออกจากปฏิทินหรือไม่?`,
        confirmText: 'ลบกิจกรรม',
        isDanger: true,
        icon: 'trash-2'
      })
    : confirm(`คุณต้องการลบกิจกรรม "${title}" หรือไม่?`);
  if (!confirmed) return;

  if (targetProjectId) {
    const allProjects = (typeof window.getProjectsList === 'function' ? window.getProjectsList() : window.appState?.projects) || [];
    const prj = allProjects.find(p => p && p.id === targetProjectId);
    if (prj && Array.isArray(prj.calendarEvents)) {
      prj.calendarEvents = prj.calendarEvents.filter(e => e.id !== eventId);
      prj.updatedAt = new Date().toISOString();
      if (window.socket && typeof window.socket.emit === 'function') {
        window.socket.emit('admin:updateProjectCalendar', {
          projectId: targetProjectId,
          calendarEvents: prj.calendarEvents,
          showInMainCalendar: prj.showInMainCalendar !== false
        });
      }
      if (typeof window.saveLocalState === 'function') window.saveLocalState();
      if (typeof window.renderProjectCalendarView === 'function') {
        window.renderProjectCalendarView(targetProjectId);
      }
      if (typeof window.renderFormCalendarEvents === 'function') {
        window.renderFormCalendarEvents(targetProjectId);
      }
      const countBadge = document.getElementById('prjDetailCalCountBadge');
      if (countBadge) countBadge.textContent = prj.calendarEvents.length;
      const totalBadge = document.getElementById('prjCalEventsTotalBadge');
      if (totalBadge) totalBadge.textContent = `${prj.calendarEvents.length} กิจกรรม`;

      if (prj.showInMainCalendar !== false) {
        if (typeof renderAdminCalendarSection === 'function' && window.currentRole === 'ADMIN') renderAdminCalendarSection();
        if (typeof renderUserCalendarSection === 'function') renderUserCalendarSection();
        if (typeof renderTodayEventsBanner === 'function') renderTodayEventsBanner();
      }
      showToast(`ลบกิจกรรม "${title}" ออกจากโครงการแล้ว`, 'info');
      return;
    }
  }

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
  const events = getAllCalendarEventsForMain();
  let evt = events.find(e => e.id === eventId);
  if (!evt && window.activeDetailProjectId) {
    const allProjects = (typeof window.getProjectsList === 'function' ? window.getProjectsList() : window.appState?.projects) || [];
    const prj = allProjects.find(p => p && p.id === window.activeDetailProjectId);
    if (prj && Array.isArray(prj.calendarEvents)) {
      evt = prj.calendarEvents.find(e => e.id === eventId);
      if (evt) {
        evt = { ...evt, isProjectEvent: true, projectId: prj.id, projectTitle: prj.title };
      }
    }
  }
  if (!evt) return;

  const modal = document.getElementById('calendarEventDetailModal');
  if (!modal) return;

  const styles = getEventVisualStyles(evt);
  const catInfo = styles.catMeta;

  document.getElementById('detailCalTitle').textContent = evt.title;
  let categoryBadgeHtml = `
    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${catInfo.bg} ${catInfo.text} border ${catInfo.border} shrink-0">
      <span class="w-1.5 h-1.5 rounded-full ${catInfo.dot} shrink-0"></span>
      <i data-lucide="${catInfo.icon || 'star'}" class="w-3.5 h-3.5 inline-block"></i>
      <span>${catInfo.label}</span>
    </span>
  `;
  if (evt.isProjectEvent) {
    categoryBadgeHtml += `
      <button type="button" onclick="closeCalendarEventDetailModal(); openProjectDetailModal('${evt.projectId}');"
        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles.bg} ${styles.text} border ${styles.border} hover:opacity-85 cursor-pointer transition min-w-0 max-w-[220px] sm:max-w-[280px] shadow-2xs group/prjBadge"
        title="${(evt.projectTitle || '').replace(/"/g, '&quot;')} (คลิกเพื่อเปิดดูโครงการ)">
        <i data-lucide="folder-kanban" class="w-3.5 h-3.5 shrink-0"></i>
        <span class="truncate block">${evt.projectTitle}</span>
      </button>
    `;
  }
  document.getElementById('detailCalCategory').innerHTML = categoryBadgeHtml;

  // Prominent Date Badge in detail modal
  const dateBadgeEl = document.getElementById('detailCalDateBadge');
  if (dateBadgeEl) {
    const dateBadgeInfo = getEventDateBadgeInfo(evt);
    dateBadgeEl.innerHTML = dateBadgeInfo.html;
  }

  // Thai-formatted full date text
  const startIsoDetail = String(evt.startDate || '').slice(0, 10);
  const endIsoDetail = String(evt.endDate || evt.startDate || '').slice(0, 10);
  const fmtThaiDetail = (iso) => {
    const pp = String(iso || '').split('-');
    if (pp.length !== 3) return iso;
    const mn = THAI_MONTHS[parseInt(pp[1], 10) - 1] || pp[1];
    return `${parseInt(pp[2], 10)} ${mn} ${parseInt(pp[0], 10) + 543}`;
  };
  let detailDateStr = fmtThaiDetail(startIsoDetail);
  if (endIsoDetail && endIsoDetail > startIsoDetail) {
    detailDateStr += ` – ${fmtThaiDetail(endIsoDetail)}`;
  }
  document.getElementById('detailCalDate').textContent = detailDateStr;
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
        openAddCalendarEventModal(evt.id, null, evt.projectId || null);
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
          openAddCalendarEventModal(evt.id, null, evt.projectId || null);
        };
      }
      if (btnDelete) {
        btnDelete.onclick = () => {
          closeCalendarEventDetailModal();
          confirmDeleteCalendarEvent(evt.id, evt.title, evt.projectId || null);
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

// Export project calendar & category functions to window
window.CALENDAR_COLOR_PALETTES = CALENDAR_COLOR_PALETTES;
window.getCalendarCategories = getCalendarCategories;
window.getCategoryMeta = getCategoryMeta;
window.getEventVisualStyles = getEventVisualStyles;
window.getAllCalendarEventsForMain = getAllCalendarEventsForMain;
window.openCalendarCategoryModal = openCalendarCategoryModal;
window.closeCalendarCategoryModal = closeCalendarCategoryModal;
window.addNewCalendarCategory = addNewCalendarCategory;
window.deleteCalendarCategory = deleteCalendarCategory;
window.selectEventColor = selectEventColor;
window.openAddCalendarEventModal = openAddCalendarEventModal;
window.closeCalendarEventModal = closeCalendarEventModal;
window.saveCalendarEventFromModal = saveCalendarEventFromModal;
window.confirmDeleteCalendarEvent = confirmDeleteCalendarEvent;
window.openCalendarEventDetailModal = openCalendarEventDetailModal;
window.closeCalendarEventDetailModal = closeCalendarEventDetailModal;
window.parseIcsText = parseIcsText;
window.generateIcsString = generateIcsString;

