/**
 * COMSAN Meeting System - Real-time Chat Component (Instagram DM 2-Stage Experience)
 * Stage 1: Inbox View (Search Bar + Instagram Notes + Active Messages Only + Clear Chat + Auto-Sort)
 * Stage 2: Room View (1-on-1 / Group Chat + Photo & Video Upload + Live Preview & Lightbox)
 */

let isAdminMemberDropdownOpen = false;
window.igChatViewMode = window.igChatViewMode || 'INBOX'; // 'INBOX' | 'ROOM'
window.igInboxFilter = window.igInboxFilter || 'ALL'; // 'ALL' | 'CHANNELS' | 'MEMBERS'
window.stagedChatMedia = null; // { url, type: 'image' | 'video', name }
window.unreadChatPartners = window.unreadChatPartners || {};

window.adminIgChatViewMode = window.adminIgChatViewMode || 'INBOX'; // 'INBOX' | 'ROOM'
window.adminSelectedChatPartner = window.adminSelectedChatPartner || 'ALL';
window.adminIgInboxFilter = window.adminIgInboxFilter || 'ALL'; // 'ALL' | 'MAIN' | 'MEMBERS'
window.stagedAdminChatMedia = null; // { url, type: 'image' | 'video', name }

// Default sample feelings/notes so the Instagram Notes row looks lively out of the box
const DEFAULT_MEMBER_NOTES = {
  'COMSAN-02': 'พร้อมโหวตแล้ว ✨',
  'COMSAN-03': 'สู้ๆ ทุกคน 🔥',
  'COMSAN-04': 'มีไอเดียใหม่ 💡',
  'COMSAN-05': 'กำลังอ่านวาระ 📄',
  'COMSAN-06': 'ตื่นเต้นจัง 🎉'
};

function getMemberStatusNote(userObj) {
  if (!userObj) return '';
  if (typeof userObj.statusNote === 'string') {
    return userObj.statusNote.trim();
  }
  return DEFAULT_MEMBER_NOTES[userObj.id] || '';
}

function escapeHtmlSafe(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Dismissed Inbox Conversations Helper
 * Tracks conversations dismissed/hidden from the "ข้อความใหม่" (New Messages) inbox view.
 * 
 * IMPORTANT:
 * - This ONLY dismisses the conversation room from the "ข้อความใหม่" list.
 * - This does NOT delete messages from the chat room or database.
 * - If the user re-opens the chat room (via search or member list), ALL messages remain fully intact and visible.
 * - If new messages arrive in the room, it automatically reappears in "ข้อความใหม่".
 */
function getDismissedInboxMap(userId) {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(`comsan_dismissed_inbox_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveDismissedInboxMap(userId, map) {
  if (!userId) return;
  try {
    localStorage.setItem(`comsan_dismissed_inbox_${userId}`, JSON.stringify(map || {}));
  } catch (e) {
    // ignore storage quota errors
  }
}

function clearIgConversation(partnerId) {
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || !state || !partnerId) return;

  const dismissedMap = getDismissedInboxMap(userId);
  const existingMsgs = filterMessagesForConversation(userId, partnerId);
  let maxMsgTs = Date.now();
  existingMsgs.forEach(m => {
    const t = Number(m.timestamp) || Number(m.id) || 0;
    if (t >= maxMsgTs) maxMsgTs = t + 1000;
  });
  dismissedMap[partnerId] = maxMsgTs;
  saveDismissedInboxMap(userId, dismissedMap);

  if (window.unreadChatPartners && window.unreadChatPartners[partnerId]) {
    delete window.unreadChatPartners[partnerId];
  }

  renderFloatingChat(false);
  if (typeof showToast === 'function') {
    showToast('ลบห้องแชทออกจากหน้าข้อความใหม่แล้ว', 'info');
  }
}

function clearAllIgConversations() {
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || !state) return;

  const dismissedMap = getDismissedInboxMap(userId);
  let maxTs = Date.now();
  (state.chats || []).forEach(m => {
    const t = Number(m.timestamp) || Number(m.id) || 0;
    if (t >= maxTs) maxTs = t + 1000;
  });

  dismissedMap['ALL'] = maxTs;
  dismissedMap['ADMIN'] = maxTs;
  (state.users || []).forEach(u => {
    dismissedMap[u.id] = maxTs;
  });
  saveDismissedInboxMap(userId, dismissedMap);

  window.unreadChatPartners = {};
  renderFloatingChat(false);
  if (typeof showToast === 'function') {
    showToast('เคลียร์รายการห้องแชทในหน้าข้อความใหม่เรียบร้อยแล้ว ✨', 'success');
  }
}

function toggleMemberChatDropdown() {
  window.isMemberDropdownOpen = !window.isMemberDropdownOpen;
  const dropdown = document.getElementById('memberChatDropdownPanel');
  const icon = document.getElementById('memberChatDropdownIcon');
  if (dropdown) dropdown.classList.toggle('hidden', !window.isMemberDropdownOpen);
  if (icon) icon.className = 'w-3 h-3 transition-transform duration-200 ' + (window.isMemberDropdownOpen ? 'rotate-180' : '');
  if (window.isMemberDropdownOpen) renderFloatingChatContacts();
}

function toggleAdminMemberChatDropdown() {
  isAdminMemberDropdownOpen = !isAdminMemberDropdownOpen;
  const panel = document.getElementById('adminMemberChatDropdownPanel');
  const icon = document.getElementById('adminMemberChatDropdownIcon');
  if (panel) panel.classList.toggle('hidden', !isAdminMemberDropdownOpen);
  if (icon) icon.className = 'w-3 h-3 transition-transform duration-200 ' + (isAdminMemberDropdownOpen ? 'rotate-180' : '');
  if (isAdminMemberDropdownOpen) renderAdminChatContactsList();
}

/**
 * Stage Navigation: Open a specific conversation room (Stage 2)
 */
function openIgChatRoom(partnerId, openMediaPicker = false) {
  window.activeChatPartner = partnerId || 'ALL';
  window.igChatViewMode = 'ROOM';
  if (window.unreadChatPartners && partnerId) {
    delete window.unreadChatPartners[partnerId];
  }

  const isDesktop = window.innerWidth >= 768;
  const inboxView = document.getElementById('igChatInboxView');
  const roomView = document.getElementById('igChatRoomView');
  if (inboxView) {
    if (isDesktop) {
      inboxView.classList.remove('hidden');
    } else {
      inboxView.classList.add('hidden');
    }
  }
  if (roomView) roomView.classList.remove('hidden');

  renderFloatingChat(true);

  if (isDesktop) {
    renderIgInboxList();
  }

  if (openMediaPicker) {
    setTimeout(() => {
      triggerChatMediaPicker();
    }, 120);
  }
}

/**
 * Stage Navigation: Return to the Instagram DM Inbox / User List (Stage 1)
 */
function closeIgChatRoom() {
  window.igChatViewMode = 'INBOX';
  const inboxView = document.getElementById('igChatInboxView');
  const roomView = document.getElementById('igChatRoomView');
  if (roomView) roomView.classList.add('hidden');
  if (inboxView) inboxView.classList.remove('hidden');
  if (window.innerWidth >= 768) {
    window.activeChatPartner = null;
  }

  renderIgInboxView();
}

function handleChatPartnerHeaderClick() {
  if (window.activeChatPartner && window.activeChatPartner !== 'ALL' && window.activeChatPartner !== 'ADMIN') {
    if (typeof window.openMemberProfilePopup === 'function') {
      window.openMemberProfilePopup(window.activeChatPartner);
    }
  } else {
    closeIgChatRoom();
  }
}

function selectChatRoom(partnerId) {
  openIgChatRoom(partnerId, false);
}

function selectAdminChatRoom(partnerId) {
  window.adminSelectedChatPartner = partnerId;
  if (partnerId !== 'ALL') {
    isAdminMemberDropdownOpen = false;
    const panel = document.getElementById('adminMemberChatDropdownPanel');
    if (panel) panel.classList.add('hidden');
  }
  renderAdminChatSection(true);
}

/**
 * Filter Pills in Stage 1 Inbox ('ALL' | 'CHANNELS' | 'MEMBERS')
 */
function setIgInboxFilter(filter) {
  window.igInboxFilter = filter || 'ALL';
  const filters = ['ALL', 'CHANNELS', 'MEMBERS'];
  filters.forEach(f => {
    const btn = document.getElementById(`igFilterBtn_${f}`);
    if (!btn) return;
    if (f === window.igInboxFilter) {
      btn.className = 'px-3 py-1.5 rounded-full text-xs font-bold transition bg-primary/15 text-primary whitespace-nowrap shrink-0';
    } else {
      btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold transition bg-muted/70 text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0';
    }
  });
  const clearAllBtn = document.getElementById('igClearAllChatsBtn');
  if (clearAllBtn) {
    clearAllBtn.classList.toggle('hidden', window.igInboxFilter !== 'ALL');
  }
  renderIgInboxList();
}

function clearIgInboxSearch() {
  const input = document.getElementById('igInboxSearchInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  renderIgInboxList();
}

/**
 * Stage 1.3: Render Instagram Notes Row (Circular avatars with floating feeling bubbles)
 */
function renderIgNotesRow() {
  const row = document.getElementById('igChatNotesRow');
  const state = window.appState;
  const userId = window.currentUserId;
  if (!row || !state || !userId) return;

  const users = state.users || [];
  const me = users.find(u => u.id === userId);
  const myInitial = me ? (me.nickname || me.firstName || 'U').charAt(0) : 'U';
  const myNote = me && typeof me.statusNote === 'string' ? me.statusNote.trim() : '';

  const handleEl = document.getElementById('igInboxMyHandle');
  if (handleEl && me) {
    handleEl.textContent = me.nickname ? `${me.nickname} (${me.firstName})` : me.id;
  }

  let html = `
    <!-- Current User Note ("โน้ตของคุณ") -->
    <div onclick="openIgNoteModal()" class="relative flex flex-col items-center shrink-0 w-[74px] cursor-pointer group select-none pt-4">
      <!-- Floating Thought Bubble -->
      <div class="absolute top-0 z-10 flex flex-col items-center pointer-events-none">
        <div class="px-2 py-0.5 rounded-2xl bg-card border border-border shadow-sm text-[10px] leading-tight font-semibold ${myNote ? 'text-foreground' : 'text-muted-foreground'} max-w-[80px] truncate text-center group-hover:scale-105 transition">
          ${escapeHtmlSafe(myNote || 'ความรู้สึก...')}
        </div>
        <div class="w-2 h-2 rounded-full bg-card border border-border -mt-1"></div>
        <div class="w-1 h-1 rounded-full bg-card border border-border mt-0.5"></div>
      </div>
      <!-- Avatar Circle -->
      <div class="relative w-14 h-14 rounded-full p-0.5 ${myNote ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500' : 'bg-border'} flex items-center justify-center shadow-xs">
        <div class="w-full h-full rounded-full bg-card overflow-hidden flex items-center justify-center shadow-inner">
          <img loading="lazy" decoding="async" referrerpolicy="no-referrer" class="w-full h-full rounded-full object-cover select-none pointer-events-none" src="${getUserAvatarUrl(me)}" alt="me" />
        </div>
        <span class="absolute bottom-0 right-0 w-5 h-5 rounded-full gradient-primary text-white ring-2 ring-card flex items-center justify-center text-[10px] shadow-xs">
          <i data-lucide="${myNote ? 'pencil' : 'plus'}" class="w-2.5 h-2.5"></i>
        </span>
      </div>
      <span class="mt-1 text-[11px] font-medium text-muted-foreground truncate max-w-[72px] text-center">โน้ตของคุณ</span>
    </div>
  `;

  // Sort other members so those with notes appear first in the Notes row
  const otherUsers = users.filter(u => u.id !== userId);
  const sortedForNotes = [...otherUsers].sort((a, b) => {
    const noteA = getMemberStatusNote(a);
    const noteB = getMemberStatusNote(b);
    if (noteA && !noteB) return -1;
    if (!noteA && noteB) return 1;
    return 0;
  });

  sortedForNotes.slice(0, 18).forEach(u => {
    const note = getMemberStatusNote(u);
    const initial = (u.nickname || u.firstName || 'U').charAt(0);
    const isOnline = Boolean(u.checkedIn && !u.isLeave);
    html += `
      <div onclick="openIgChatRoom('${u.id}')" class="relative flex flex-col items-center shrink-0 w-[72px] cursor-pointer group select-none pt-4">
        ${note ? `
          <div class="absolute top-0 z-10 flex flex-col items-center pointer-events-none">
            <div class="px-2 py-0.5 rounded-2xl bg-card border border-border shadow-sm text-[10px] leading-tight font-semibold text-foreground max-w-[80px] truncate text-center group-hover:scale-105 transition">
              ${escapeHtmlSafe(note)}
            </div>
            <div class="w-2 h-2 rounded-full bg-card border border-border -mt-1"></div>
            <div class="w-1 h-1 rounded-full bg-card border border-border mt-0.5"></div>
          </div>
        ` : ''}
        <div class="relative w-14 h-14 rounded-full p-0.5 ${note ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600' : 'bg-muted/80 group-hover:bg-primary/40'} transition flex items-center justify-center shadow-xs cursor-pointer" onclick="event.stopPropagation(); openMemberProfilePopup('${u.id}')">
          <div class="w-full h-full rounded-full bg-card overflow-hidden flex items-center justify-center shadow-inner">
            <img loading="lazy" decoding="async" referrerpolicy="no-referrer" class="w-full h-full rounded-full object-cover select-none pointer-events-none" src="${getUserAvatarUrl(u)}" alt="${escapeHtmlSafe(u.nickname || u.firstName)}" />
          </div>
          ${isOnline ? '<span class="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card"></span>' : ''}
        </div>
        <span class="mt-1 text-[11px] font-medium text-foreground/90 truncate max-w-[70px] text-center">${escapeHtmlSafe(u.nickname || u.firstName)}</span>
      </div>
    `;
  });

  row.innerHTML = html;
}

/**
 * Instagram Note Modal Controllers
 */
function openIgNoteModal() {
  const modal = document.getElementById('igNoteModal');
  const input = document.getElementById('igNoteInput');
  const avatarEl = document.getElementById('igNoteModalAvatar');
  const state = window.appState;
  const userId = window.currentUserId;
  if (!modal || !state) return;

  const me = (state.users || []).find(u => u.id === userId);
  const currentNote = me && typeof me.statusNote === 'string' ? me.statusNote : '';

  if (avatarEl && me) {
    if (typeof window.updateAvatarElement === 'function') {
      window.updateAvatarElement(avatarEl, me);
    } else {
      avatarEl.textContent = (me.nickname || me.firstName || 'U').charAt(0);
    }
  }
  if (input) {
    input.value = currentNote;
  }
  updateIgNoteLivePreview();
  modal.classList.remove('hidden');
  setTimeout(() => {
    if (input) input.focus();
  }, 80);
}

function closeIgNoteModal() {
  const modal = document.getElementById('igNoteModal');
  if (modal) modal.classList.add('hidden');
}

function updateIgNoteLivePreview() {
  const input = document.getElementById('igNoteInput');
  const preview = document.getElementById('igNoteLivePreviewText');
  if (!preview) return;
  const val = input ? input.value.trim() : '';
  preview.textContent = val || 'แชร์ความคิดหรือความรู้สึก...';
}

function setQuickIgNote(text) {
  const input = document.getElementById('igNoteInput');
  if (input) {
    input.value = text;
    updateIgNoteLivePreview();
    input.focus();
  }
}

function saveMyIgNote() {
  const input = document.getElementById('igNoteInput');
  const state = window.appState;
  const userId = window.currentUserId || (typeof window.getCurrentUser === 'function' && window.getCurrentUser()?.id) || localStorage.getItem('comsan_current_user_id');
  if (!state) return;
  if (!userId) {
    if (typeof showToast === 'function') {
      showToast('กรุณาเข้าสู่ระบบก่อนตั้งโน้ต', 'warning');
    }
    return;
  }

  const noteText = (input ? input.value : '').trim().slice(0, 60);
  const me = (state.users || []).find(u => u.id === userId);
  if (me) {
    me.statusNote = noteText;
    me.statusNoteUpdatedAt = noteText ? Date.now() : null;
  }
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('user:statusNote', { userId, statusNote: noteText });
  }
  closeIgNoteModal();
  if (typeof window.renderAll === 'function') {
    window.renderAll();
  } else {
    renderIgNotesRow();
    renderIgInboxList();
  }
  if (typeof showToast === 'function') {
    showToast(noteText ? 'อัปเดตโน้ตความรู้สึกของคุณแล้ว ✨' : 'ลบโน้ตความรู้สึกแล้ว', 'success');
  }
}

function clearMyIgNote() {
  const input = document.getElementById('igNoteInput');
  if (input) input.value = '';
  saveMyIgNote();
}

/**
 * Stage 1.5: Render Auto-Sorting Conversation List (Instagram DM Inbox)
 * - In "ข้อความใหม่" (ALL): ONLY shows conversations that have incoming/active messages (unless searching in search bar)
 * - Dismissed conversations are hidden from this view until a new message arrives or user searches/opens from members list.
 * - Conversations with the newest messages automatically move to the top!
 */
function renderIgInboxList() {
  const listEl = document.getElementById('igChatConversationList');
  const searchInput = document.getElementById('igInboxSearchInput');
  const clearBtn = document.getElementById('igInboxSearchClearBtn');
  const clearAllChatsBtn = document.getElementById('igClearAllChatsBtn');
  const countEl = document.getElementById('chatOnlineUsersCount');
  const state = window.appState;
  const userId = window.currentUserId;
  if (!listEl || !state || !userId) return;

  const users = state.users || [];
  if (countEl) countEl.textContent = users.length;

  const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !keyword);
  }

  // Build unified conversation descriptors
  const items = [];

  // 1. All Meeting Room ('ALL')
  if (window.igInboxFilter === 'ALL' || window.igInboxFilter === 'CHANNELS') {
    const allMsgs = filterMessagesForConversation(userId, 'ALL');
    const lastAllMsg = allMsgs.length > 0 ? allMsgs[allMsgs.length - 1] : null;
    items.push({
      id: 'ALL',
      type: 'CHANNEL',
      title: 'ห้องประชุมรวม (ทุกคน)',
      subtitleRole: 'ห้องสนทนาหลัก',
      searchText: 'ห้องประชุมรวม ทุกคนประกาศ all public',
      note: '',
      isOnline: true,
      lastMsg: lastAllMsg,
      lastTimestamp: lastAllMsg ? (Number(lastAllMsg.timestamp) || Number(lastAllMsg.id) || 2) : 0,
      msgCount: allMsgs.length,
      basePriority: 100
    });

    // 2. Admin Room ('ADMIN')
    const adminMsgs = filterMessagesForConversation(userId, 'ADMIN');
    const lastAdminMsg = adminMsgs.length > 0 ? adminMsgs[adminMsgs.length - 1] : null;
    items.push({
      id: 'ADMIN',
      type: 'CHANNEL',
      title: 'ผู้ดำเนินการประชุม (ADMIN)',
      subtitleRole: 'ผู้ดูแลระบบ',
      searchText: 'ผู้ดำเนินการ แอดมิน admin เลขา ประธาน',
      note: 'พร้อมช่วยเหลือสมาชิก 🛠️',
      isOnline: true,
      lastMsg: lastAdminMsg,
      lastTimestamp: lastAdminMsg ? (Number(lastAdminMsg.timestamp) || Number(lastAdminMsg.id) || 1) : 0,
      msgCount: adminMsgs.length,
      basePriority: 90
    });
  }

  // 3. Individual Members (1-on-1 DM)
  if (window.igInboxFilter === 'ALL' || window.igInboxFilter === 'MEMBERS') {
    users.forEach((u, idx) => {
      if (u.id === userId) return;
      const msgs = filterMessagesForConversation(userId, u.id);
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const note = getMemberStatusNote(u);
      const isOnline = Boolean(u.checkedIn && !u.isLeave);
      items.push({
        id: u.id,
        type: 'MEMBER',
        user: u,
        title: `${u.nickname} (${u.firstName} ${u.lastName || ''})`.trim(),
        initial: (u.nickname || u.firstName || 'U').charAt(0),
        subtitleRole: u.position || 'สมาชิก',
        searchText: `${u.id} ${u.nickname || ''} ${u.firstName || ''} ${u.lastName || ''} ${u.position || ''} ${note}`.toLowerCase(),
        note,
        isOnline,
        lastMsg,
        lastTimestamp: lastMsg ? (Number(lastMsg.timestamp) || Number(lastMsg.id) || 1) : 0,
        msgCount: msgs.length,
        basePriority: isOnline ? (50 - idx * 0.1) : (20 - idx * 0.1)
      });
    });
  }

  const dismissedMap = getDismissedInboxMap(userId);

  // Filter:
  // - If on 'ALL' ("ข้อความใหม่") and NOT searching (!keyword), ONLY show conversations that actually have messages (item.msgCount > 0)
  //   AND have newer messages than the dismissed timestamp!
  // - If searching (keyword present), allow matching any user or room so user can find and message anyone.
  const filtered = items.filter(item => {
    if (keyword) {
      return item.title.toLowerCase().includes(keyword) || item.searchText.includes(keyword);
    }
    if (window.igInboxFilter === 'ALL') {
      const dismissedAt = Number(dismissedMap[item.id] || 0);
      const isDismissed = dismissedAt > 0 && item.lastTimestamp <= dismissedAt;
      return item.msgCount > 0 && !isDismissed;
    }
    return true;
  });

  if (clearAllChatsBtn) {
    clearAllChatsBtn.classList.toggle('hidden', window.igInboxFilter !== 'ALL' || (filtered.length === 0 && !keyword));
  }

  // Sort: Conversations with newest messages jump right to the top!
  filtered.sort((a, b) => {
    if (a.lastTimestamp > 0 || b.lastTimestamp > 0) {
      if (b.lastTimestamp !== a.lastTimestamp) {
        return b.lastTimestamp - a.lastTimestamp;
      }
    }
    return b.basePriority - a.basePriority;
  });

  if (filtered.length === 0) {
    if (window.igInboxFilter === 'ALL' && !keyword) {
      listEl.innerHTML = `
        <div class="py-16 px-4 text-center space-y-3 select-none">
          <div class="w-14 h-14 rounded-full bg-muted/70 mx-auto flex items-center justify-center text-muted-foreground text-xl">
            <i data-lucide="messages-square" class="w-6 h-6"></i>
          </div>
          <div class="space-y-1">
            <p class="text-xs sm:text-sm font-bold text-foreground">ยังไม่มีข้อความใหม่</p>
            <p class="text-[11px] text-muted-foreground">ค้นหาชื่อเพื่อนด้านบน หรือแตะที่แถบ "สมาชิก" เพื่อเริ่มส่งข้อความ</p>
          </div>
          <div class="flex items-center justify-center gap-2 pt-1">
            <button type="button" onclick="openIgChatRoom('ALL')"
              class="px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition">
              เปิดห้องประชุมรวม
            </button>
            <button type="button" onclick="setIgInboxFilter('MEMBERS')"
              class="px-3.5 py-1.5 rounded-full bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition">
              ดูรายชื่อสมาชิก
            </button>
          </div>
        </div>
      `;
    } else {
      listEl.innerHTML = `
        <div class="py-16 text-center space-y-2 select-none">
          <div class="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
            <i data-lucide="search" class="w-3.5 h-3.5"></i>
          </div>
          <p class="text-xs font-semibold text-foreground">ไม่พบรายชื่อหรือห้องสนทนาที่ค้นหา</p>
          <p class="text-[11px] text-muted-foreground">ลองค้นหาด้วยชื่อเล่น ชื่อจริง หรือตำแหน่ง</p>
        </div>
      `;
    }
    return;
  }

  listEl.innerHTML = filtered.map(item => {
    const lastMsg = item.lastMsg;
    const isUnread = Boolean(window.unreadChatPartners && window.unreadChatPartners[item.id]);
    let previewText = '';
    let timeLabel = '';

    if (lastMsg) {
      const isMe = lastMsg.senderId === userId;
      const prefix = isMe ? 'คุณ: ' : (item.id === 'ALL' ? `${(lastMsg.sender || '').split(' ')[0]}: ` : '');
      if (lastMsg.mediaType === 'image') {
        previewText = `${prefix}📷 ส่งรูปภาพ${lastMsg.text ? ' • ' + lastMsg.text : ''}`;
      } else if (lastMsg.mediaType === 'video') {
        previewText = `${prefix}🎬 ส่งวิดีโอ${lastMsg.text ? ' • ' + lastMsg.text : ''}`;
      } else {
        previewText = `${prefix}${lastMsg.text || ''}`;
      }
      timeLabel = lastMsg.time ? ` · ${lastMsg.time}` : '';
    } else if (item.id === 'ALL') {
      previewText = 'แตะเพื่อพูดคุยในห้องประชุมรวม';
    } else if (item.id === 'ADMIN') {
      previewText = 'แตะเพื่อส่งข้อความถึงผู้ดำเนินการ';
    } else {
      if (item.isOnline) {
        previewText = `ใช้งานอยู่ • ${item.subtitleRole}`;
      } else if (item.user && item.user.isLeave) {
        previewText = `แจ้งลาประชุม • ${item.subtitleRole}`;
      } else {
        previewText = `ยังไม่เข้าประชุม • ${item.subtitleRole}`;
      }
    }

    // Avatar rendering
    let avatarHtml = '';
    if (item.id === 'ALL') {
      avatarHtml = `
        <div class="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 via-primary to-purple-600 flex items-center justify-center shrink-0 shadow-xs">
          <div class="w-full h-full rounded-full bg-card flex items-center justify-center text-primary text-base">
            <i data-lucide="users" class="w-5 h-5"></i>
          </div>
          <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card"></span>
        </div>
      `;
    } else if (item.id === 'ADMIN') {
      avatarHtml = `
        <div class="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shrink-0 shadow-xs">
          <div class="w-full h-full rounded-full bg-card flex items-center justify-center text-amber-500 text-base">
            <i data-lucide="shield" class="w-5 h-5"></i>
          </div>
          <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card"></span>
        </div>
      `;
    } else {
      avatarHtml = `
        <div onclick="event.stopPropagation(); openMemberProfilePopup('${item.user ? item.user.id : item.id}')"
          class="relative w-12 h-12 rounded-full p-0.5 ${lastMsg ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600' : 'bg-border'} flex items-center justify-center shrink-0 shadow-xs cursor-pointer hover:scale-105 transition"
          title="ดูโปรไฟล์">
          <div class="w-full h-full rounded-full bg-card overflow-hidden flex items-center justify-center shadow-inner">
            <img loading="lazy" decoding="async" referrerpolicy="no-referrer" class="w-full h-full rounded-full object-cover select-none pointer-events-none" src="${getUserAvatarUrl(item.user || item.id)}" alt="${escapeHtmlSafe(item.title)}" onerror="this.onerror=null; this.src='https://api.dicebear.com/10.x/gaze/svg?seed=user&backgroundColor=ff5d8f,ffb703,43aa8b,4d96ff,b57bff';" />
          </div>
          ${item.isOnline ? '<span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card"></span>' : ''}
        </div>
      `;
    }

    const isDesktop = window.innerWidth >= 768;
    const isRoomMode = window.igChatViewMode === 'ROOM' || isDesktop;
    const isActive = isRoomMode && window.activeChatPartner === item.id;

    return `
      <div onclick="openIgChatRoom('${item.id}')"
        class="w-full px-2.5 py-2.5 rounded-2xl ${isActive ? 'bg-primary/10 border border-primary/20 shadow-xs' : 'hover:bg-muted/60 active:bg-muted'} transition flex items-center justify-between gap-2.5 cursor-pointer select-none group">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          ${avatarHtml}
          <div class="min-w-0 flex-1 space-y-0.5">
            <div class="flex items-center gap-1.5 min-w-0">
              <h4 class="text-xs sm:text-sm ${isUnread || lastMsg ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'} truncate">
                ${escapeHtmlSafe(item.title)}
              </h4>
              <span class="px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground text-[9px] font-semibold shrink-0">
                ${escapeHtmlSafe(item.subtitleRole)}
              </span>
            </div>
            <div class="flex items-center gap-1 text-xs ${isUnread ? 'font-bold text-foreground' : (lastMsg ? 'font-medium text-foreground/80' : 'text-muted-foreground')} truncate">
              <span class="truncate">${escapeHtmlSafe(previewText)}</span>
              <span class="text-[11px] text-muted-foreground shrink-0">${escapeHtmlSafe(timeLabel)}</span>
            </div>
          </div>
        </div>

        <!-- Right Status / Clear Chat & Quick Camera Action -->
        <div class="flex items-center gap-1 shrink-0">
          ${isUnread ? `<span class="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mr-1"></span>` : ''}
          ${item.msgCount > 0 ? `
            <button type="button" onclick="event.stopPropagation(); clearIgConversation('${item.id}');"
              class="w-7 h-7 rounded-full text-muted-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition"
              title="ลบห้องแชทนี้ออกจากหน้าข้อความใหม่">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
          <button type="button" onclick="event.stopPropagation(); openIgChatRoom('${item.id}', true);"
            class="w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition"
            title="ส่งรูปภาพหรือวิดีโอทันที">
            <i data-lucide="camera" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderIgInboxView() {
  renderIgNotesRow();
  renderIgInboxList();
}

function renderFloatingChatContacts() {
  renderIgInboxList();
}

function renderAdminChatContactsList() {
  const contactEl = document.getElementById('adminChatContactList');
  const searchInput = document.getElementById('adminChatMemberSearchInput');
  const state = window.appState;
  if (!contactEl || !state) return;
  const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const members = (state.users || []).filter(u => !keyword || u.nickname.toLowerCase().includes(keyword) || u.firstName.toLowerCase().includes(keyword));

  contactEl.innerHTML = members.length === 0
    ? `<p class="text-[11px] text-slate-400 text-center py-2">ไม่พบรายชื่อสมาชิก</p>`
    : members.map(u => `
        <button type="button" onclick="selectAdminChatRoom('${u.id}')"
          class="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${window.adminSelectedChatPartner === u.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700'}">
          <span>👤 ${escapeHtmlSafe(u.nickname)} (${escapeHtmlSafe(u.firstName)})</span>
          <span class="text-[10px] opacity-75">${escapeHtmlSafe(u.position)}</span>
        </button>
      `).join('');
}

function filterMessagesForConversation(viewerId, partnerId) {
  const state = window.appState;
  if (!state || !state.chats) return [];

  return state.chats.filter(c => {
    if (partnerId === 'ALL') return c.target === 'ALL';
    const sId = c.senderId || (c.sender && c.sender.includes('ADMIN') ? 'ADMIN' : null);
    return (sId === viewerId && c.target === partnerId) || (sId === partnerId && c.target === viewerId);
  });
}

/**
 * Media Upload (Image & Video) + Staging Preview Bar + Lightbox
 */
function triggerChatMediaPicker() {
  const fileInput = document.getElementById('chatMediaFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

function compressImageFileToDataUrl(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleChatMediaSelect(event) {
  const file = event && event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  if (!isVideo && !isImage) {
    if (typeof showToast === 'function') {
      showToast('กรุณาเลือกไฟล์รูปภาพหรือวิดีโอเท่านั้น', 'error');
    }
    return;
  }

  // Max size check (30MB for video, 15MB for image)
  const maxBytes = isVideo ? 30 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    if (typeof showToast === 'function') {
      showToast(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${isVideo ? '30MB' : '15MB'})`, 'error');
    }
    return;
  }

  try {
    let dataUrl = '';
    if (isImage) {
      dataUrl = await compressImageFileToDataUrl(file);
    } else {
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    window.stagedChatMedia = {
      url: dataUrl,
      type: isVideo ? 'video' : 'image',
      name: file.name || (isVideo ? 'video.mp4' : 'image.jpg')
    };

    renderStagedChatMediaPreview();
  } catch (err) {
    console.error('Error reading media file:', err);
    if (typeof showToast === 'function') {
      showToast('ไม่สามารถอ่านไฟล์สื่อได้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  }
}

function renderStagedChatMediaPreview() {
  const bar = document.getElementById('chatMediaPreviewBar');
  const thumb = document.getElementById('chatMediaPreviewThumb');
  const badge = document.getElementById('chatMediaPreviewTypeBadge');
  const nameEl = document.getElementById('chatMediaPreviewName');

  if (!bar || !thumb) return;

  if (!window.stagedChatMedia) {
    bar.classList.add('hidden');
    thumb.innerHTML = '';
    return;
  }

  const { url, type, name } = window.stagedChatMedia;
  bar.classList.remove('hidden');

  if (badge) {
    badge.innerHTML = type === 'video' ? '🎬 วิดีโอ' : '📷 รูปภาพ';
  }
  if (nameEl) {
    nameEl.textContent = name;
  }

  if (type === 'video') {
    thumb.innerHTML = `
      <div class="relative w-full h-full flex items-center justify-center bg-black">
        <video src="${url}" class="w-full h-full object-cover" muted playsinline preload="metadata"></video>
        <span class="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs">
          <i data-lucide="play" class="w-3 h-3"></i>
        </span>
      </div>
    `;
  } else {
    thumb.innerHTML = `<img src="${url}" alt="Preview" class="w-full h-full object-cover" />`;
  }
}

function clearChatMediaAttachment() {
  window.stagedChatMedia = null;
  const fileInput = document.getElementById('chatMediaFileInput');
  if (fileInput) fileInput.value = '';
  renderStagedChatMediaPreview();
}

function previewStagedMediaFullscreen() {
  if (!window.stagedChatMedia) return;
  openChatMediaLightbox(
    window.stagedChatMedia.url,
    window.stagedChatMedia.type,
    `ตัวอย่างก่อนส่ง: ${window.stagedChatMedia.name}`
  );
}

function openChatMediaLightboxByMsgId(msgId, fallbackUrl, fallbackType, fallbackCaption) {
  const state = window.appState;
  let msg = null;
  if (state && Array.isArray(state.chats)) {
    msg = state.chats.find(c => String(c.id) === String(msgId));
  }
  const url = msg?.mediaUrl || fallbackUrl;
  const type = msg?.mediaType || fallbackType || 'image';
  const caption = msg?.text || fallbackCaption || (msg?.sender ? `ส่งโดย ${msg.sender}` : '');
  if (url) {
    openChatMediaLightbox(url, type, caption);
  }
}

function openChatMediaLightbox(url, type = 'image', caption = '') {
  const modal = document.getElementById('chatMediaLightboxModal');
  const body = document.getElementById('chatLightboxBody');
  const capEl = document.getElementById('chatLightboxCaption');
  const dlBtn = document.getElementById('chatLightboxDownloadBtn');
  if (!modal || !body) return;

  if (type === 'video') {
    body.innerHTML = `
      <video src="${url}" controls autoplay playsinline onclick="event.stopPropagation()"
        class="max-h-[80vh] max-w-full rounded-2xl shadow-2xl bg-black object-contain"></video>
    `;
  } else {
    body.innerHTML = `
      <img src="${url}" alt="Fullscreen Preview" onclick="event.stopPropagation()"
        class="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl select-none" />
    `;
  }

  if (capEl) capEl.textContent = caption || '';
  if (dlBtn) {
    dlBtn.href = url;
    dlBtn.download = type === 'video' ? `comsan-video-${Date.now()}.mp4` : `comsan-image-${Date.now()}.jpg`;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modal.style.display = 'flex';
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function closeChatMediaLightbox() {
  const modal = document.getElementById('chatMediaLightboxModal');
  const body = document.getElementById('chatLightboxBody');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.display = 'none';
  }
  if (body) body.innerHTML = '';
}

function renderMessageMediaAttachmentHtml(c) {
  if (!c || !c.mediaUrl) return '';
  const isVideo = c.mediaType === 'video';
  const safeUrl = (c.mediaUrl || '').replace(/'/g, "\\'");
  const safeSender = (c.sender || '').replace(/'/g, "\\'");
  if (isVideo) {
    return `
      <div class="relative rounded-xl overflow-hidden bg-black/90 my-1 max-w-[260px] sm:max-w-[300px] border border-white/15">
        <video src="${c.mediaUrl}" controls playsinline preload="metadata" class="w-full max-h-60 object-cover"></video>
        <button type="button" onclick="openChatMediaLightboxByMsgId('${c.id}', '${safeUrl}', 'video', '${safeSender}')"
          class="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-xs transition !w-8 !h-8 !min-w-0 !p-0 !gap-0 inline-flex items-center justify-center shrink-0 cursor-pointer" title="เต็มจอ" aria-label="เต็มจอ"><i data-lucide="maximize" class="h-4 w-4 pointer-events-none"></i></button>
      </div>
    `;
  }
  return `
    <div role="button" tabindex="0" onclick="openChatMediaLightboxByMsgId('${c.id}', '${safeUrl}', 'image', '${safeSender}')"
      class="relative rounded-xl overflow-hidden my-1 max-w-[240px] sm:max-w-[280px] cursor-pointer group/media border border-white/15 select-none active:scale-[0.98] transition touch-manipulation">
      <img src="${c.mediaUrl}" alt="${escapeHtmlSafe(c.mediaName || 'รูปภาพในแชท')}" class="w-full max-h-60 object-cover group-hover/media:scale-[1.02] transition duration-200 pointer-events-none select-none" />
      <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-medium flex items-center gap-1 opacity-90 group-hover/media:opacity-100 transition pointer-events-none select-none">
        <i data-lucide="search" class="w-3.5 h-3.5 text-[9px]"></i> ดูรูปเต็ม
      </span>
    </div>
  `;
}

function sendFloatingChatMessage(e) {
  if (e && e.preventDefault) e.preventDefault();
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || !state) return;

  const input = document.getElementById('floatingChatInput');
  const text = input ? input.value.trim() : '';
  const staged = window.stagedChatMedia;

  if (!text && !staged) return;

  const me = (state.users || []).find(u => u.id === userId);
  if (!me) return;

  const nowTs = Date.now();
  const newMsg = {
    id: nowTs + Math.floor(Math.random() * 1000),
    timestamp: nowTs,
    sender: `${me.firstName} ${me.lastName} (${me.nickname})`,
    senderId: me.id,
    target: window.activeChatPartner || 'ALL',
    text,
    mediaUrl: staged ? staged.url : null,
    mediaType: staged ? staged.type : null,
    mediaName: staged ? staged.name : null,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  };

  appendChatLogLocal(newMsg);
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('chat:send', newMsg);
  }
  if (input) input.value = '';
  clearChatMediaAttachment();
  renderFloatingChat(true);
}

function appendChatLogLocal(newMsg) {
  if (!window.appState) return;
  window.appState.chatLogs = window.appState.chatLogs || [];
  window.appState.chatLogs.push({
    id: 'LOG-' + newMsg.id,
    msgId: String(newMsg.id),
    timestamp: newMsg.timestamp || Date.now(),
    sender: newMsg.sender,
    senderId: newMsg.senderId || null,
    target: newMsg.target || 'ALL',
    text: newMsg.text || '',
    mediaUrl: newMsg.mediaUrl || null,
    mediaType: newMsg.mediaType || null,
    mediaName: newMsg.mediaName || null,
    time: newMsg.time,
    dateStr: new Date(newMsg.timestamp || Date.now()).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
    deleted: false,
    deletedAt: null
  });
}

function sendAdminChat(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('adminChatInput');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  const nowTs = Date.now();
  const newMsg = {
    id: nowTs + Math.floor(Math.random() * 1000),
    timestamp: nowTs,
    sender: 'ผู้ดำเนินการ (ADMIN)',
    senderId: 'ADMIN',
    target: window.adminSelectedChatPartner,
    text,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  };
  appendChatLogLocal(newMsg);
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('chat:send', newMsg);
  }
  if (input) input.value = '';
  renderAdminChatSection(true);
}

async function deleteChatMessage(msgId) {
  const confirmed = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: 'ยืนยันการลบข้อความ',
        message: 'ต้องการลบข้อความนี้ออกจากห้องแชตหรือไม่?',
        confirmText: 'ลบข้อความ',
        isDanger: true,
        icon: 'trash-2'
      })
    : false;
  if (!confirmed) return;
  window.appState.chats = (window.appState.chats || []).filter(c => String(c.id) !== String(msgId));
  if (window.appState.chatLogs) {
    const targetLog = window.appState.chatLogs.find(l => String(l.msgId) === String(msgId));
    if (targetLog) {
      targetLog.deleted = true;
      targetLog.deletedAt = Date.now();
      targetLog.deletedTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
  }
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('chat:delete', msgId);
  }
  renderFloatingChat(false);
  renderAdminChatSection(false);
  if (typeof renderChatLogs === 'function') {
    renderChatLogs();
  }
}

function insertChatEmoji(emoji) {
  const input = document.getElementById('floatingChatInput');
  if (!input) return;
  input.value = (input.value ? input.value + ' ' : '') + emoji;
  input.focus();
}

function renderFloatingChatStories() {
  renderIgNotesRow();
}

function renderFloatingChat(forceScroll = false) {
  const state = window.appState;
  const userId = window.currentUserId;
  if (!state || !userId) return;

  // Always keep Stage 1 Inbox (Notes + Sorted Conversation List) up to date
  renderIgInboxView();

  const avatarEl = document.getElementById('floatingChatHeaderAvatar');
  if (avatarEl) {
    if (window.activeChatPartner === 'ALL') {
      avatarEl.innerHTML = '<i data-lucide="users" class="w-4 h-4"></i>';
    } else if (window.activeChatPartner === 'ADMIN') {
      avatarEl.innerHTML = '<i data-lucide="shield" class="text-amber-500 w-4 h-4"></i>';
    } else {
      const tUser = (state.users || []).find(u => u.id === window.activeChatPartner);
      if (typeof window.updateAvatarElement === 'function') {
        window.updateAvatarElement(avatarEl, tUser || window.activeChatPartner);
      } else {
        const init = tUser ? (tUser.nickname || tUser.firstName || 'U').charAt(0) : 'U';
        avatarEl.textContent = init;
      }
    }
  }

  const titleEl = document.getElementById('floatingChatActiveTitle');
  const subEl = document.getElementById('floatingChatPrivacySub');
  const onlineDot = document.getElementById('floatingChatOnlineDot');
  if (titleEl && subEl) {
    if (window.activeChatPartner === 'ALL') {
      titleEl.textContent = 'ห้องประชุมรวม (ทุกคน)';
      subEl.textContent = 'ใช้งานอยู่ • ข้อความสาธารณะเห็นทุกคน';
      if (onlineDot) onlineDot.classList.remove('hidden');
    } else if (window.activeChatPartner === 'ADMIN') {
      titleEl.textContent = 'ผู้ดำเนินการ (ADMIN)';
      subEl.textContent = 'ใช้งานอยู่ • แชตส่วนตัวกับแอดมิน';
      if (onlineDot) onlineDot.classList.remove('hidden');
    } else {
      const tUser = (state.users || []).find(u => u.id === window.activeChatPartner);
      const isOnline = Boolean(tUser && tUser.checkedIn && !tUser.isLeave);
      if (onlineDot) onlineDot.classList.toggle('hidden', !isOnline);
      const note = getMemberStatusNote(tUser);
      let statusText = 'ยังไม่เข้าประชุม';
      if (isOnline) {
        statusText = 'ใช้งานอยู่';
      } else if (tUser && tUser.isLeave) {
        statusText = tUser.leaveReason ? `แจ้งลา (${tUser.leaveReason})` : 'แจ้งลาประชุม';
      }
      titleEl.textContent = tUser ? `${tUser.nickname} (${tUser.firstName})` : 'แชตส่วนตัว';
      subEl.textContent = note
        ? `💭 "${note}" • ${statusText}`
        : `${statusText} • ${tUser ? (tUser.position || 'สมาชิก') : 'สนทนา 1-on-1'}`;
    }
  }

  const msgs = filterMessagesForConversation(userId, window.activeChatPartner);
  const msgBox = document.getElementById('floatingChatMessagesBox');
  if (!msgBox) return;

  msgBox.innerHTML = msgs.length === 0
    ? `
      <div class="flex flex-col items-center justify-center py-16 text-center space-y-3 select-none">
        <div class="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center text-2xl text-primary/70 shadow-inner">
          <i data-lucide="send" class="w-7 h-7"></i>
        </div>
        <div class="space-y-1">
          <h4 class="text-sm font-bold text-foreground">เริ่มส่งข้อความ รูปภาพ หรือวิดีโอ</h4>
          <p class="text-xs text-muted-foreground max-w-xs">ข้อความที่ส่งใหม่จะดันแชทนี้ขึ้นไปอยู่อันดับบนสุดโดยอัตโนมัติ</p>
        </div>
      </div>
    `
    : msgs.map((c, index) => {
        const isMe = c.senderId === userId;
        const isAdminSender = c.senderId === 'ADMIN';
        const initial = String(c.sender || 'U').charAt(0);
        const mediaHtml = renderMessageMediaAttachmentHtml(c);
        const textHtml = c.text ? `<div class="leading-relaxed break-words">${escapeHtmlSafe(c.text)}</div>` : '';

        const partnerId = window.activeChatPartner || 'ALL';
        const isDirectChat = partnerId !== 'ALL';
        const prevMsg = index > 0 ? msgs[index - 1] : null;
        const isConsecutiveFromSameUser = prevMsg && (
          (c.senderId && prevMsg.senderId && c.senderId === prevMsg.senderId) ||
          (c.sender && prevMsg.sender && c.sender === prevMsg.sender)
        );
        const showSenderHeader = !isMe && !isDirectChat && !isConsecutiveFromSameUser;

        if (isMe) {
          return `
            <div class="flex flex-col items-end ${isConsecutiveFromSameUser ? 'mt-1' : 'mt-2.5'} space-y-1 group">
              <div class="max-w-[80%] ${c.mediaUrl && !c.text ? 'p-1.5' : 'px-4 py-2.5'} rounded-2xl rounded-tr-xs text-xs sm:text-sm shadow-xs bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white">
                ${mediaHtml}
                ${textHtml}
              </div>
              <div class="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground/70">
                <span>${escapeHtmlSafe(c.time)}</span>
                <button type="button" onclick="deleteChatMessage('${c.id}')" class="opacity-0 group-hover:opacity-100 transition hover:text-rose-500" title="ลบข้อความ">
                  <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="flex flex-col items-start ${isConsecutiveFromSameUser ? 'mt-1' : 'mt-2.5'} space-y-1 group max-w-[85%] sm:max-w-[75%]">
              ${showSenderHeader ? `
                <div class="flex items-center gap-1.5 px-1 ${c.senderId && c.senderId !== 'ADMIN' ? 'cursor-pointer hover:opacity-85' : ''}" ${c.senderId && c.senderId !== 'ADMIN' ? `onclick="openMemberProfilePopup('${c.senderId}')" title="ดูโปรไฟล์"` : ''}>
                  <span class="w-5 h-5 rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center bg-primary/10"><img src="${getUserAvatarUrl(c.senderId || c.sender)}" class="w-full h-full object-cover select-none" alt="avatar" /></span>
                  <span class="text-[11px] font-bold text-foreground/90 truncate">${escapeHtmlSafe(c.sender)}</span>
                  ${isAdminSender ? '<span class="px-1.5 py-0.2 rounded-full bg-primary/15 text-primary text-[9px] font-bold">ADMIN</span>' : ''}
                </div>
              ` : ''}
              <div class="${c.mediaUrl && !c.text ? 'p-1.5' : 'px-4 py-2.5'} rounded-2xl ${isDirectChat || isConsecutiveFromSameUser ? 'rounded-2xl' : 'rounded-tl-xs'} text-xs sm:text-sm bg-card dark:bg-muted/80 text-foreground border border-border/60 shadow-2xs leading-relaxed break-words">
                ${mediaHtml}
                ${textHtml}
              </div>
              <div class="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground/70">
                <span>${escapeHtmlSafe(c.time)}</span>
              </div>
            </div>
          `;
        }
      }).join('');
  if (forceScroll) msgBox.scrollTop = msgBox.scrollHeight;
}

function openAdminIgChatRoom(partnerId) {
  window.adminSelectedChatPartner = partnerId || 'ALL';
  window.adminIgChatViewMode = 'ROOM';

  const isDesktop = window.innerWidth >= 768;
  const inboxView = document.getElementById('adminIgChatInboxView');
  const roomView = document.getElementById('adminIgChatRoomView');
  if (inboxView) {
    if (isDesktop) {
      inboxView.classList.remove('hidden');
    } else {
      inboxView.classList.add('hidden');
    }
  }
  if (roomView) roomView.classList.remove('hidden');

  renderAdminChatSection(true);

  if (isDesktop) {
    renderAdminIgInboxList();
  }
}

function closeAdminIgChatRoom() {
  window.adminIgChatViewMode = 'INBOX';
  const inboxView = document.getElementById('adminIgChatInboxView');
  const roomView = document.getElementById('adminIgChatRoomView');
  if (roomView) roomView.classList.add('hidden');
  if (inboxView) inboxView.classList.remove('hidden');
  if (window.innerWidth >= 768) {
    window.adminSelectedChatPartner = null;
  }

  renderAdminIgInboxView();
}

function handleAdminChatPartnerHeaderClick() {
  if (window.adminSelectedChatPartner && window.adminSelectedChatPartner !== 'ALL') {
    if (typeof window.openMemberProfilePopup === 'function') {
      window.openMemberProfilePopup(window.adminSelectedChatPartner);
    }
  } else {
    closeAdminIgChatRoom();
  }
}

function selectAdminChatRoom(partnerId) {
  openAdminIgChatRoom(partnerId);
}

function setAdminIgInboxFilter(filter) {
  window.adminIgInboxFilter = filter || 'ALL';
  ['ALL', 'MAIN', 'MEMBERS'].forEach(f => {
    const btn = document.getElementById(`adminIgFilterBtn_${f}`);
    if (!btn) return;
    if (f === window.adminIgInboxFilter) {
      btn.className = 'px-3 py-1.5 rounded-full text-xs font-bold transition bg-primary/15 text-primary whitespace-nowrap shrink-0';
    } else {
      btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold transition bg-muted/70 text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0';
    }
  });
  const clearAllBtn = document.getElementById('adminIgClearAllChatsBtn');
  if (clearAllBtn) {
    clearAllBtn.classList.toggle('hidden', window.adminIgInboxFilter !== 'ALL');
  }
  renderAdminIgInboxList();
}

function clearAdminIgInboxSearch() {
  const input = document.getElementById('adminIgInboxSearchInput');
  const clearBtn = document.getElementById('adminIgInboxSearchClearBtn');
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.classList.add('hidden');
  renderAdminIgInboxList();
}

function renderAdminIgNotesRow() {
  const row = document.getElementById('adminIgChatNotesRow');
  const state = window.appState;
  if (!row || !state) return;

  const users = state.users || [];
  const sortedUsers = [...users].sort((a, b) => {
    const noteA = getMemberStatusNote(a);
    const noteB = getMemberStatusNote(b);
    if (noteA && !noteB) return -1;
    if (!noteA && noteB) return 1;
    return 0;
  });

  let html = `
    <!-- Admin Note -->
    <div class="relative flex flex-col items-center shrink-0 w-[74px] cursor-pointer group select-none pt-4" onclick="openAdminIgChatRoom('ALL')">
      <!-- Floating Thought Bubble -->
      <div class="absolute top-0 z-10 flex flex-col items-center pointer-events-none">
        <div class="px-2 py-0.5 rounded-2xl bg-card border border-border shadow-xs text-[10px] leading-tight font-bold text-primary max-w-[80px] truncate text-center group-hover:scale-105 transition">
          ประกาศ 📢
        </div>
        <div class="w-2 h-2 rounded-full bg-card border border-border -mt-1"></div>
        <div class="w-1 h-1 rounded-full bg-card border border-border mt-0.5"></div>
      </div>
      <!-- Avatar Circle -->
      <div class="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-primary to-purple-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
        <div class="w-full h-full rounded-full bg-card flex items-center justify-center text-primary text-base font-bold shadow-inner">
          <i data-lucide="shield" class="w-4 h-4"></i>
        </div>
        <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-card"></span>
      </div>
      <span class="mt-1 text-[11px] font-semibold text-foreground text-center truncate max-w-[70px]">ห้องรวม</span>
    </div>
  `;

  sortedUsers.forEach(u => {
    const note = getMemberStatusNote(u);
    const initial = (u.nickname || u.firstName || 'U').charAt(0);
    const isOnline = Boolean(u.checkedIn && !u.isLeave);
    html += `
      <div class="relative flex flex-col items-center shrink-0 w-[72px] cursor-pointer group select-none pt-4" onclick="openAdminIgChatRoom('${u.id}')">
        ${note ? `
          <div class="absolute top-0 z-10 flex flex-col items-center pointer-events-none">
            <div class="px-2 py-0.5 rounded-2xl bg-card border border-border shadow-xs text-[10px] leading-tight font-semibold text-foreground max-w-[80px] truncate text-center group-hover:scale-105 transition">
              ${escapeHtmlSafe(note)}
            </div>
            <div class="w-2 h-2 rounded-full bg-card border border-border -mt-1"></div>
            <div class="w-1 h-1 rounded-full bg-card border border-border mt-0.5"></div>
          </div>
        ` : ''}
        <div class="relative w-14 h-14 rounded-full p-0.5 ${note ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600' : 'bg-muted/80 group-hover:bg-primary/40'} transition flex items-center justify-center shadow-xs cursor-pointer" onclick="event.stopPropagation(); openMemberProfilePopup('${u.id}')" title="ดูโปรไฟล์">
          <div class="w-full h-full rounded-full bg-card overflow-hidden flex items-center justify-center shadow-inner">
            <img loading="lazy" decoding="async" referrerpolicy="no-referrer" class="w-full h-full rounded-full object-cover select-none pointer-events-none" src="${getUserAvatarUrl(u)}" alt="${escapeHtmlSafe(u.nickname || u.firstName)}" />
          </div>
          ${isOnline ? '<span class="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card"></span>' : ''}
        </div>
        <span class="mt-1 text-[11px] font-medium text-foreground/90 truncate max-w-[70px] text-center">${escapeHtmlSafe(u.nickname || u.firstName)}</span>
      </div>
    `;
  });

  row.innerHTML = html;
}

function renderAdminIgInboxList() {
  const listEl = document.getElementById('adminIgChatConversationList');
  const searchInput = document.getElementById('adminIgInboxSearchInput');
  const clearBtn = document.getElementById('adminIgInboxSearchClearBtn');
  const clearAllChatsBtn = document.getElementById('adminIgClearAllChatsBtn');
  const state = window.appState;
  if (!listEl || !state) return;

  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  if (clearBtn) clearBtn.classList.toggle('hidden', query.length === 0);

  const users = state.users || [];
  const dismissedMap = getDismissedInboxMap('ADMIN');

  function getLastMessageFor(partnerId) {
    const msgs = filterMessagesForConversation('ADMIN', partnerId);
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  }

  const items = [];

  // Public Room
  if (window.adminIgInboxFilter !== 'MEMBERS') {
    const lastAll = getLastMessageFor('ALL');
    const lastTs = lastAll ? (Number(lastAll.timestamp) || Number(lastAll.id) || 0) : 0;
    const dismissedAt = Number(dismissedMap['ALL'] || 0);
    const isDismissed = dismissedAt > 0 && lastTs <= dismissedAt;

    if (window.adminIgInboxFilter !== 'MEMBERS') {
      items.push({
        id: 'ALL',
        name: 'ห้องประชุมรวม (ทุกคน)',
        sub: lastAll ? `${(lastAll.sender || '').split(' ')[0]}: ${lastAll.text || ''}` : 'ห้องแชตกลาง • แตะเพื่อเริ่มพูดคุย',
        isRoom: true,
        lastMsg: lastAll,
        lastTs: lastTs,
        isDismissed
      });
    }
  }

  // Members
  users.forEach(u => {
    const lastMsg = getLastMessageFor(u.id);
    const hasMsg = Boolean(lastMsg);
    const lastTs = lastMsg ? (Number(lastMsg.timestamp) || Number(lastMsg.id) || 0) : 0;
    const dismissedAt = Number(dismissedMap[u.id] || 0);
    const isDismissed = dismissedAt > 0 && lastTs <= dismissedAt;

    if (window.adminIgInboxFilter === 'MAIN') return;
    if (window.adminIgInboxFilter === 'ALL' && (!hasMsg || isDismissed) && !query) {
      return;
    }
    items.push({
      id: u.id,
      name: `${u.nickname} (${u.firstName} ${u.lastName || ''})`,
      sub: `${u.position || 'สมาชิก'} • ${u.major || ''}`,
      isRoom: false,
      user: u,
      lastMsg,
      lastTs: lastTs,
      isDismissed
    });
  });

  let filtered = items;
  if (query) {
    filtered = items.filter(it => it.name.toLowerCase().includes(query) || (it.sub && it.sub.toLowerCase().includes(query)) || (it.id && it.id.toLowerCase().includes(query)));
  }

  if (clearAllChatsBtn) {
    clearAllChatsBtn.classList.toggle('hidden', window.adminIgInboxFilter !== 'ALL' || (filtered.length === 0 && !query));
  }

  filtered.sort((a, b) => b.lastTs - a.lastTs);

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="py-16 text-center text-muted-foreground space-y-1 select-none">
        <i data-lucide="message-square-more" class="w-8 h-8 opacity-40 mx-auto"></i>
        <p class="text-xs font-semibold text-foreground">${window.adminIgInboxFilter === 'ALL' && !query ? 'ยังไม่มีข้อความใหม่' : 'ไม่พบข้อความหรือสมาชิกที่ค้นหา'}</p>
        <p class="text-[11px] text-muted-foreground">${window.adminIgInboxFilter === 'ALL' && !query ? 'ค้นหาชื่อสมาชิกด้านบน หรือแตะที่แถบ "สมาชิก" เพื่อเริ่มส่งข้อความ' : 'ลองค้นหาด้วยชื่อเล่น ชื่อจริง หรือตำแหน่ง'}</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(it => {
    const lastMsg = it.lastMsg;
    let previewText = '';
    let timeLabel = '';

    if (lastMsg) {
      const isMe = lastMsg.senderId === 'ADMIN';
      const prefix = isMe ? 'คุณ: ' : (it.id === 'ALL' ? `${(lastMsg.sender || '').split(' ')[0]}: ` : '');
      if (lastMsg.mediaType === 'image') {
        previewText = `${prefix}📷 ส่งรูปภาพ${lastMsg.text ? ' • ' + lastMsg.text : ''}`;
      } else if (lastMsg.mediaType === 'video') {
        previewText = `${prefix}🎬 ส่งวิดีโอ${lastMsg.text ? ' • ' + lastMsg.text : ''}`;
      } else {
        previewText = `${prefix}${lastMsg.text || ''}`;
      }
      timeLabel = lastMsg.time ? ` · ${lastMsg.time}` : '';
    } else if (it.id === 'ALL') {
      previewText = 'แตะเพื่อประกาศหรือพูดคุยในห้องรวม';
    } else {
      const isOnline = Boolean(it.user && it.user.checkedIn && !it.user.isLeave);
      if (isOnline) {
        previewText = `ใช้งานอยู่ • ${it.user ? (it.user.position || 'สมาชิก') : 'สมาชิก'}`;
      } else if (it.user && it.user.isLeave) {
        previewText = `แจ้งลาประชุม • ${it.user.position || 'สมาชิก'}`;
      } else {
        previewText = `ยังไม่เข้าประชุม • ${it.user ? (it.user.position || 'สมาชิก') : 'สมาชิก'}`;
      }
    }

    let avatarHtml = '';
    if (it.id === 'ALL') {
      avatarHtml = `
        <div class="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 via-primary to-purple-600 flex items-center justify-center shrink-0 shadow-xs">
          <div class="w-full h-full rounded-full bg-card flex items-center justify-center text-primary text-base">
            <i data-lucide="users" class="w-4 h-4"></i>
          </div>
          <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card"></span>
        </div>
      `;
    } else {
      const u = it.user || {};
      const initial = (u.nickname || u.firstName || 'U').charAt(0);
      const isOnline = Boolean(u.checkedIn && !u.isLeave);
      avatarHtml = `
        <div onclick="event.stopPropagation(); openMemberProfilePopup('${(it.user && it.user.id) || it.id}')"
          class="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-primary/30 to-muted flex items-center justify-center shrink-0 shadow-xs cursor-pointer hover:scale-105 transition"
          title="ดูโปรไฟล์">
          <div class="w-full h-full rounded-full bg-primary/10 text-primary flex items-center justify-center text-base font-bold overflow-hidden">
            ${typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(u, 'w-full h-full rounded-full') : escapeHtmlSafe(initial)}
          </div>
          ${isOnline ? '<span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card"></span>' : ''}
        </div>
      `;
    }

    const isDesktop = window.innerWidth >= 768;
    const isRoomMode = window.adminIgChatViewMode === 'ROOM' || isDesktop;
    const isActive = isRoomMode && window.adminSelectedChatPartner === it.id;

    return `
      <div onclick="openAdminIgChatRoom('${it.id}')"
        class="w-full p-3 flex items-center justify-between gap-3 ${isActive ? 'bg-primary/10 border border-primary/20 shadow-xs' : 'hover:bg-muted/40 active:bg-muted/60'} transition cursor-pointer group rounded-xl select-none">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          ${avatarHtml}
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <h4 class="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition">${escapeHtmlSafe(it.name)}</h4>
              <span class="text-[10px] text-muted-foreground shrink-0">${escapeHtmlSafe(timeLabel)}</span>
            </div>
            <p class="text-xs text-muted-foreground truncate leading-snug">${escapeHtmlSafe(previewText)}</p>
          </div>
        </div>
        ${it.lastMsg ? `
          <button type="button" onclick="event.stopPropagation(); clearAdminIgConversation('${it.id}');"
            class="w-8 h-8 rounded-full text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition shrink-0"
            title="ลบห้องแชทนี้ออกจากหน้าข้อความใหม่">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderAdminIgInboxView() {
  renderAdminIgNotesRow();
  renderAdminIgInboxList();
  const state = window.appState;
  const countEl = document.getElementById('adminChatOnlineCount');
  if (countEl && state && state.users) {
    countEl.textContent = state.users.length;
  }
}

function renderAdminChatContactsList() {
  renderAdminIgInboxList();
}

function renderAdminChatSection(forceScroll = false) {
  const state = window.appState;
  if (!state) return;

  renderAdminIgInboxView();

  const isDesktop = window.innerWidth >= 768;
  const isRoomMode = window.adminIgChatViewMode === 'ROOM';
  const inboxView = document.getElementById('adminIgChatInboxView');
  const roomView = document.getElementById('adminIgChatRoomView');

  if (!isRoomMode) {
    if (inboxView) inboxView.classList.remove('hidden');
    if (roomView) roomView.classList.add('hidden');
    return;
  } else {
    if (inboxView) {
      if (isDesktop) {
        inboxView.classList.remove('hidden');
      } else {
        inboxView.classList.add('hidden');
      }
    }
    if (roomView) roomView.classList.remove('hidden');
  }

  const boxEl = document.getElementById('adminChatMessagesBox');
  if (!boxEl) return;

  const partnerId = window.adminSelectedChatPartner || 'ALL';
  const avatarEl = document.getElementById('adminChatRoomAvatar');
  const titleEl = document.getElementById('adminChatRoomTitle');
  const subEl = document.getElementById('adminChatRoomSubtitle');
  const onlineDot = document.getElementById('adminChatRoomOnlineDot');

  if (partnerId === 'ALL') {
    if (avatarEl) avatarEl.innerHTML = '<i data-lucide="users" class="w-4 h-4"></i>';
    if (titleEl) titleEl.textContent = 'ห้องประชุมรวม (ทุกคน)';
    if (subEl) subEl.textContent = 'ใช้งานอยู่ • ข้อความสาธารณะเห็นทุกคน';
    if (onlineDot) onlineDot.classList.remove('hidden');
  } else {
    const tUser = (state.users || []).find(u => u.id === partnerId);
    const isOnline = Boolean(tUser && tUser.checkedIn && !tUser.isLeave);
    if (onlineDot) onlineDot.classList.toggle('hidden', !isOnline);
    let statusText = 'ยังไม่เข้าประชุม';
    if (isOnline) {
      statusText = 'ใช้งานอยู่';
    } else if (tUser && tUser.isLeave) {
      statusText = tUser.leaveReason ? `แจ้งลา (${tUser.leaveReason})` : 'แจ้งลาประชุม';
    }
    if (avatarEl) {
      if (typeof window.updateAvatarElement === 'function') {
        window.updateAvatarElement(avatarEl, tUser);
      } else {
        avatarEl.textContent = tUser ? (tUser.nickname || tUser.firstName || 'U').charAt(0) : 'U';
      }
    }
    const note = getMemberStatusNote(tUser);
    if (titleEl) titleEl.textContent = tUser ? `${tUser.nickname} (${tUser.firstName})` : 'แชตส่วนตัว';
    if (subEl) {
      subEl.textContent = note
        ? `💭 "${note}" • ${statusText}`
        : `${statusText} • ${tUser ? (tUser.position || 'สมาชิก') : 'สมาชิก'}`;
    }
  }

  const msgs = filterMessagesForConversation('ADMIN', partnerId);
  boxEl.innerHTML = msgs.length === 0
    ? `
      <div class="py-20 text-center text-muted-foreground space-y-2">
        <div class="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground text-xl">
          <i data-lucide="messages-square" class="w-6 h-6"></i>
        </div>
        <p class="text-xs font-semibold text-foreground">ยังไม่มีข้อความสนทนาในห้องนี้</p>
        <p class="text-[11px] text-muted-foreground">เริ่มพิมพ์ข้อความหรือส่งรูปภาพ/วิดีโอ เพื่อติดต่อกับสมาชิกได้ทันที</p>
      </div>
    `
    : msgs.map((c, index) => {
        const isMe = c.senderId === 'ADMIN';
        const initial = String(c.sender || 'U').charAt(0);
        const mediaHtml = renderMessageMediaAttachmentHtml(c);
        const textHtml = c.text ? `<div class="leading-relaxed break-words">${escapeHtmlSafe(c.text)}</div>` : '';

        const isDirectChat = partnerId !== 'ALL';
        const prevMsg = index > 0 ? msgs[index - 1] : null;
        const isConsecutiveFromSameUser = prevMsg && (
          (c.senderId && prevMsg.senderId && c.senderId === prevMsg.senderId) ||
          (c.sender && prevMsg.sender && c.sender === prevMsg.sender)
        );
        const showSenderHeader = !isMe && !isDirectChat && !isConsecutiveFromSameUser;

        return `
          <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isConsecutiveFromSameUser ? 'mt-1' : 'mt-2.5'} space-y-1">
            ${showSenderHeader ? `
              <div class="flex items-center gap-1.5 px-1 ${c.senderId && c.senderId !== 'ADMIN' ? 'cursor-pointer hover:opacity-85' : ''}" ${c.senderId && c.senderId !== 'ADMIN' ? `onclick="openMemberProfilePopup('${c.senderId}')" title="ดูโปรไฟล์"` : ''}>
                <span class="w-5 h-5 rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center bg-primary/10">
                  ${typeof window.getAvatarImageHtml === 'function' ? window.getAvatarImageHtml(c.senderId || c.sender, 'w-full h-full rounded-full') : escapeHtmlSafe(initial)}
                </span>
                <span class="text-[11px] font-bold text-foreground">${escapeHtmlSafe(c.sender)}</span>
              </div>
            ` : ''}
            <div class="max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-2xs ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}">
              ${mediaHtml}
              ${textHtml}
            </div>
            <div class="flex items-center gap-2 px-1 text-[10px] text-muted-foreground/70">
              <span>${escapeHtmlSafe(c.time)}</span>
              <button type="button" onclick="deleteChatMessage('${c.id}')" class="hover:text-rose-500 transition" title="ลบข้อความนี้">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');

  if (forceScroll) boxEl.scrollTop = boxEl.scrollHeight;
}

function triggerAdminChatMediaPicker() {
  const fileInput = document.getElementById('adminChatMediaFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

async function handleAdminChatMediaSelect(event) {
  const file = event && event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) {
    if (typeof showToast === 'function') showToast('กรุณาเลือกไฟล์รูปภาพหรือวิดีโอเท่านั้น', 'error');
    return;
  }
  const maxBytes = isVideo ? 30 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    if (typeof showToast === 'function') showToast(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${isVideo ? '30MB' : '15MB'})`, 'error');
    return;
  }

  try {
    let dataUrl = '';
    if (isImage) {
      dataUrl = await compressImageFileToDataUrl(file);
    } else {
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    window.stagedAdminChatMedia = {
      url: dataUrl,
      type: isVideo ? 'video' : 'image',
      name: file.name || (isVideo ? 'video.mp4' : 'image.jpg')
    };

    renderAdminStagedChatMediaPreview();
  } catch (err) {
    console.error('Error reading admin media file:', err);
    if (typeof showToast === 'function') showToast('ไม่สามารถอ่านไฟล์สื่อได้ กรุณาลองใหม่อีกครั้ง', 'error');
  }
}

function renderAdminStagedChatMediaPreview() {
  const bar = document.getElementById('adminChatMediaPreviewBar');
  const thumb = document.getElementById('adminChatMediaPreviewThumb');
  const badge = document.getElementById('adminChatMediaPreviewTypeBadge');
  const nameEl = document.getElementById('adminChatMediaPreviewName');

  if (!bar || !thumb) return;
  if (!window.stagedAdminChatMedia) {
    bar.classList.add('hidden');
    thumb.innerHTML = '';
    return;
  }

  const { url, type, name } = window.stagedAdminChatMedia;
  bar.classList.remove('hidden');

  if (badge) badge.innerHTML = type === 'video' ? '🎬 วิดีโอ' : '📷 รูปภาพ';
  if (nameEl) nameEl.textContent = name;

  if (type === 'video') {
    thumb.innerHTML = `
      <div class="relative w-full h-full flex items-center justify-center bg-black">
        <video src="${url}" class="w-full h-full object-cover" muted playsinline preload="metadata"></video>
        <span class="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs">
          <i data-lucide="play" class="w-3 h-3"></i>
        </span>
      </div>
    `;
  } else {
    thumb.innerHTML = `<img src="${url}" alt="Preview" class="w-full h-full object-cover" />`;
  }
}

function clearAdminChatMediaAttachment() {
  window.stagedAdminChatMedia = null;
  const fileInput = document.getElementById('adminChatMediaFileInput');
  if (fileInput) fileInput.value = '';
  renderAdminStagedChatMediaPreview();
}

function previewAdminStagedMediaFullscreen() {
  if (!window.stagedAdminChatMedia) return;
  openChatMediaLightbox(
    window.stagedAdminChatMedia.url,
    window.stagedAdminChatMedia.type,
    `ตัวอย่างก่อนส่ง (Admin): ${window.stagedAdminChatMedia.name}`
  );
}

function handleSendAdminIgChat(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('adminIgChatInput');
  const text = input ? input.value.trim() : '';
  const staged = window.stagedAdminChatMedia;

  if (!text && !staged) return;

  const nowTs = Date.now();
  const newMsg = {
    id: nowTs + Math.floor(Math.random() * 1000),
    timestamp: nowTs,
    sender: 'ผู้ดำเนินการ (ADMIN)',
    senderId: 'ADMIN',
    target: window.adminSelectedChatPartner || 'ALL',
    text,
    mediaUrl: staged ? staged.url : null,
    mediaType: staged ? staged.type : null,
    mediaName: staged ? staged.name : null,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  };

  window.appState.chats.push(newMsg);
  appendChatLogLocal(newMsg);
  window.saveLocalState();
  if (window.socket) {
    window.socket.emit('chat:send', newMsg);
  }
  if (input) input.value = '';
  clearAdminChatMediaAttachment();
  renderAdminChatSection(true);
}

function sendAdminChat(e) {
  handleSendAdminIgChat(e);
}

function clearAdminIgConversation(partnerId) {
  const state = window.appState;
  if (!state || !partnerId) return;

  const dismissedMap = getDismissedInboxMap('ADMIN');
  const existingMsgs = filterMessagesForConversation('ADMIN', partnerId);
  let maxMsgTs = Date.now();
  existingMsgs.forEach(m => {
    const t = Number(m.timestamp) || Number(m.id) || 0;
    if (t >= maxMsgTs) maxMsgTs = t + 1000;
  });
  dismissedMap[partnerId] = maxMsgTs;
  saveDismissedInboxMap('ADMIN', dismissedMap);

  renderAdminIgInboxList();
  if (typeof showToast === 'function') {
    showToast('ลบห้องแชทออกจากหน้าข้อความใหม่แล้ว', 'info');
  }
}

function clearAllAdminIgConversations() {
  const state = window.appState;
  if (!state) return;

  const dismissedMap = getDismissedInboxMap('ADMIN');
  let maxTs = Date.now();
  (state.chats || []).forEach(m => {
    const t = Number(m.timestamp) || Number(m.id) || 0;
    if (t >= maxTs) maxTs = t + 1000;
  });

  dismissedMap['ALL'] = maxTs;
  (state.users || []).forEach(u => {
    dismissedMap[u.id] = maxTs;
  });
  saveDismissedInboxMap('ADMIN', dismissedMap);

  renderAdminIgInboxList();
  if (typeof showToast === 'function') {
    showToast('เคลียร์รายการห้องแชทในหน้าข้อความใหม่เรียบร้อยแล้ว ✨', 'success');
  }
}

// Window attachments
window.toggleMemberChatDropdown = toggleMemberChatDropdown;
window.toggleAdminMemberChatDropdown = toggleAdminMemberChatDropdown;
window.openIgChatRoom = openIgChatRoom;
window.closeIgChatRoom = closeIgChatRoom;
window.handleChatPartnerHeaderClick = handleChatPartnerHeaderClick;
window.setIgInboxFilter = setIgInboxFilter;
window.clearIgInboxSearch = clearIgInboxSearch;
window.clearIgConversation = clearIgConversation;
window.clearAllIgConversations = clearAllIgConversations;
window.renderIgNotesRow = renderIgNotesRow;
window.renderIgInboxList = renderIgInboxList;
window.renderIgInboxView = renderIgInboxView;
window.openIgNoteModal = openIgNoteModal;
window.closeIgNoteModal = closeIgNoteModal;
window.updateIgNoteLivePreview = updateIgNoteLivePreview;
window.setQuickIgNote = setQuickIgNote;
window.saveMyIgNote = saveMyIgNote;
window.clearMyIgNote = clearMyIgNote;
window.triggerChatMediaPicker = triggerChatMediaPicker;
window.handleChatMediaSelect = handleChatMediaSelect;
window.clearChatMediaAttachment = clearChatMediaAttachment;
window.previewStagedMediaFullscreen = previewStagedMediaFullscreen;
window.openChatMediaLightboxByMsgId = openChatMediaLightboxByMsgId;
window.openChatMediaLightbox = openChatMediaLightbox;
window.closeChatMediaLightbox = closeChatMediaLightbox;
window.selectChatRoom = selectChatRoom;
window.selectAdminChatRoom = selectAdminChatRoom;
window.openAdminIgChatRoom = openAdminIgChatRoom;
window.closeAdminIgChatRoom = closeAdminIgChatRoom;
window.handleAdminChatPartnerHeaderClick = handleAdminChatPartnerHeaderClick;
window.setAdminIgInboxFilter = setAdminIgInboxFilter;
window.clearAdminIgInboxSearch = clearAdminIgInboxSearch;
window.renderAdminIgNotesRow = renderAdminIgNotesRow;
window.renderAdminIgInboxList = renderAdminIgInboxList;
window.renderAdminIgInboxView = renderAdminIgInboxView;
window.triggerAdminChatMediaPicker = triggerAdminChatMediaPicker;
window.handleAdminChatMediaSelect = handleAdminChatMediaSelect;
window.clearAdminChatMediaAttachment = clearAdminChatMediaAttachment;
window.previewAdminStagedMediaFullscreen = previewAdminStagedMediaFullscreen;
window.handleSendAdminIgChat = handleSendAdminIgChat;
window.clearAdminIgConversation = clearAdminIgConversation;
window.clearAllAdminIgConversations = clearAllAdminIgConversations;
window.renderFloatingChatContacts = renderFloatingChatContacts;
window.renderAdminChatContactsList = renderAdminChatContactsList;
window.filterMessagesForConversation = filterMessagesForConversation;
window.sendFloatingChatMessage = sendFloatingChatMessage;
window.sendAdminChat = sendAdminChat;
window.deleteChatMessage = deleteChatMessage;
window.renderFloatingChat = renderFloatingChat;
window.renderAdminChatSection = renderAdminChatSection;
window.insertChatEmoji = insertChatEmoji;
window.renderFloatingChatStories = renderFloatingChatStories;

// ============================================================================
// CHAT AUDIT LOGS (ADMIN ONLY - PERSISTENT AUDIT TRAIL)
// ============================================================================
let currentChatLogsFilter = 'ALL';

function openChatLogsModal() {
  if (!window.isAdminAuthenticated) {
    if (typeof showToast === 'function') {
      showToast('เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถดู Log แชทได้', 'error');
    }
    return;
  }

  const modal = document.getElementById('chatLogsModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
    else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  if (window.socket && window.socket.connected) {
    window.socket.emit('admin:getChatLogs', (logs) => {
      if (Array.isArray(logs) && logs.length > 0) {
        window.appState.chatLogs = logs;
        window.saveLocalState();
        renderChatLogs();
      }
    });
  }

  renderChatLogs();
}

function closeChatLogsModal() {
  const modal = document.getElementById('chatLogsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function setChatLogsFilter(filterType) {
  window.currentChatLogsFilter = filterType;
  const pills = ['ALL', 'MAIN', 'DM', 'DELETED'];
  pills.forEach(p => {
    const btn = document.getElementById(`chatLogFilterBtn_${p}`);
    if (btn) {
      if (p === filterType) {
        btn.className = 'px-2.5 py-1 rounded-full text-xs font-bold transition bg-primary text-white shadow-2xs whitespace-nowrap';
      } else {
        btn.className = 'px-2.5 py-1 rounded-full text-xs font-medium transition bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 whitespace-nowrap';
      }
    }
  });
  renderChatLogs();
}

function renderChatLogs() {
  const container = document.getElementById('chatLogsListContainer');
  if (!container) return;

  const state = window.appState;
  const rawLogs = (state && state.chatLogs) ? state.chatLogs : [];
  const users = (state && state.users) ? state.users : [];
  const searchInput = document.getElementById('chatLogsSearchInput');
  const search = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const filter = window.currentChatLogsFilter || 'ALL';

  const getUserDisplayName = (uid, fallbackName) => {
    if (uid === 'ADMIN') return 'ผู้ดูแลระบบ (ADMIN)';
    const u = users.find(x => x.id === uid);
    if (u) return `${u.nickname || u.firstName} (${u.id})`;
    return fallbackName || uid || 'ไม่ทราบชื่อ';
  };

  const getTargetBadge = (target) => {
    if (target === 'ALL') {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"><i data-lucide="users" class="w-3 h-3"></i> ห้องประชุมรวม</span>`;
    }
    const name = getUserDisplayName(target);
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"><i data-lucide="lock" class="w-3 h-3"></i> แชทเดี่ยว: ${escapeHtmlSafe(name)}</span>`;
  };

  // Counts
  const countAll = rawLogs.length;
  const countMain = rawLogs.filter(l => l.target === 'ALL').length;
  const countDm = rawLogs.filter(l => l.target !== 'ALL').length;
  const countDeleted = rawLogs.filter(l => l.deleted).length;

  const elAll = document.getElementById('chatLogCount_ALL');
  const elMain = document.getElementById('chatLogCount_MAIN');
  const elDm = document.getElementById('chatLogCount_DM');
  const elDel = document.getElementById('chatLogCount_DELETED');
  if (elAll) elAll.textContent = countAll;
  if (elMain) elMain.textContent = countMain;
  if (elDm) elDm.textContent = countDm;
  if (elDel) elDel.textContent = countDeleted;

  // Filter
  let filtered = [...rawLogs];
  if (filter === 'MAIN') {
    filtered = filtered.filter(l => l.target === 'ALL');
  } else if (filter === 'DM') {
    filtered = filtered.filter(l => l.target !== 'ALL');
  } else if (filter === 'DELETED') {
    filtered = filtered.filter(l => l.deleted);
  }

  // Search
  if (search) {
    filtered = filtered.filter(l => {
      const sName = (l.sender || '').toLowerCase();
      const sId = (l.senderId || '').toLowerCase();
      const tName = getUserDisplayName(l.target, l.target).toLowerCase();
      const txt = (l.text || '').toLowerCase();
      return sName.includes(search) || sId.includes(search) || tName.includes(search) || txt.includes(search);
    });
  }

  // Sort newest first
  filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-muted-foreground text-xs space-y-2">
        <i data-lucide="clipboard-list" class="w-8 h-8 opacity-30 mx-auto"></i>
        <p>ไม่พบรายการ Log แชทตามเงื่อนไขที่เลือก</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(log => {
    const senderDisplay = getUserDisplayName(log.senderId, log.sender);
    const targetBadge = getTargetBadge(log.target);
    const dateFormatted = log.dateStr ? `${log.dateStr} เวลา ${log.time || ''} น.` : (log.time || '-');
    const isDeleted = Boolean(log.deleted);
    const initial = (log.sender || '?').slice(0, 1).toUpperCase();

    const mediaHtml = log.mediaUrl ? `
      <div class="mt-2 p-2 rounded-xl bg-muted/40 border border-border/60 max-w-xs">
        ${log.mediaType === 'video'
          ? `<video src="${log.mediaUrl}" controls class="max-h-40 rounded-lg w-full object-cover"></video>`
          : `<img src="${log.mediaUrl}" alt="${escapeHtmlSafe(log.mediaName || 'รูปภาพ')}" class="max-h-40 rounded-lg w-full object-cover" />`
        }
        <p class="text-[10px] text-muted-foreground mt-1 truncate"><i data-lucide="paperclip" class="w-3 h-3 inline mr-1"></i>${escapeHtmlSafe(log.mediaName || 'ไฟล์แนบ')}</p>
      </div>
    ` : '';

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl border transition ${
        isDeleted
          ? 'bg-rose-500/[0.04] border-rose-500/35 dark:bg-rose-950/15'
          : 'bg-card border-border shadow-xs hover:border-primary/30'
      }">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/40">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
              ${escapeHtmlSafe(initial)}
            </span>
            <div class="min-w-0">
              <span class="text-xs font-bold text-foreground truncate block">${escapeHtmlSafe(senderDisplay)}</span>
              <span class="text-[10px] text-muted-foreground">${escapeHtmlSafe(dateFormatted)}</span>
            </div>
            <i data-lucide="arrow-right" class="w-3 h-3 text-muted-foreground/60 shrink-0 mx-0.5"></i>
            <div>${targetBadge}</div>
          </div>
          <div class="shrink-0">
            ${isDeleted
              ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <i data-lucide="trash-2" class="w-3 h-3"></i> ผู้ใช้ลบแล้ว ${log.deletedTimeStr ? `(${log.deletedTimeStr} น.)` : ''}
                 </span>`
              : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <i data-lucide="check-circle-2" class="w-3 h-3"></i> ส่งปกติ
                 </span>`
            }
          </div>
        </div>
        <div class="pt-2.5 text-xs text-foreground/90 leading-relaxed break-words whitespace-pre-wrap ${isDeleted ? 'opacity-90 font-medium' : ''}">
          ${escapeHtmlSafe(log.text || '(ไม่มีข้อความ)')}
          ${mediaHtml}
        </div>
      </div>
    `;
  }).join('');
}

function exportChatLogsToCSV() {
  const state = window.appState;
  const logs = (state && state.chatLogs) ? state.chatLogs : [];
  if (logs.length === 0) {
    if (typeof showToast === 'function') {
      showToast('ไม่มีข้อมูล Log แชทสำหรับส่งออก', 'info');
    }
    return;
  }
  const headers = ['ลำดับ', 'วันเวลา', 'รหัสผู้ส่ง', 'ชื่อผู้ส่ง', 'เป้าหมาย', 'ข้อความ', 'มีไฟล์แนบ', 'สถานะการลบ', 'เวลาที่ลบ'];
  const rows = logs.map((l, idx) => [
    idx + 1,
    `"${l.dateStr || ''} ${l.time || ''}"`,
    `"${l.senderId || ''}"`,
    `"${(l.sender || '').replace(/"/g, '""')}"`,
    `"${l.target || ''}"`,
    `"${(l.text || '').replace(/"/g, '""')}"`,
    l.mediaUrl ? 'มี' : 'ไม่มี',
    l.deleted ? 'ถูกลบแล้ว' : 'ปกติ',
    l.deletedTimeStr ? `"${l.deletedTimeStr}"` : '-'
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  if (typeof triggerUniversalBlobDownload === 'function') {
    triggerUniversalBlobDownload(blob, `comsan_chat_logs_${new Date().toISOString().slice(0, 10)}.csv`);
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comsan_chat_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  if (typeof showToast === 'function') {
    showToast('ส่งออก Log แชทเป็น CSV เรียบร้อยแล้ว', 'success');
  }
}

window.openChatLogsModal = openChatLogsModal;
window.closeChatLogsModal = closeChatLogsModal;
window.setChatLogsFilter = setChatLogsFilter;
window.renderChatLogs = renderChatLogs;
window.exportChatLogsToCSV = exportChatLogsToCSV;

// Synchronize responsive chat layout on window resize
window.addEventListener('resize', () => {
  const isDesktop = window.innerWidth >= 768;
  const userInbox = document.getElementById('igChatInboxView');
  const userRoom = document.getElementById('igChatRoomView');
  if (userInbox && userRoom) {
    if (isDesktop) {
      userInbox.classList.remove('hidden');
      if (window.igChatViewMode === 'ROOM' && window.activeChatPartner) {
        userRoom.classList.remove('hidden');
      }
    } else {
      if (window.igChatViewMode === 'ROOM' && window.activeChatPartner) {
        userInbox.classList.add('hidden');
        userRoom.classList.remove('hidden');
      } else {
        userInbox.classList.remove('hidden');
        userRoom.classList.add('hidden');
      }
    }
  }

  const adminInbox = document.getElementById('adminIgChatInboxView');
  const adminRoom = document.getElementById('adminIgChatRoomView');
  if (adminInbox && adminRoom) {
    if (isDesktop) {
      adminInbox.classList.remove('hidden');
      if (window.adminIgChatViewMode === 'ROOM' && window.adminSelectedChatPartner) {
        adminRoom.classList.remove('hidden');
      }
    } else {
      if (window.adminIgChatViewMode === 'ROOM' && window.adminSelectedChatPartner) {
        adminInbox.classList.add('hidden');
        adminRoom.classList.remove('hidden');
      } else {
        adminInbox.classList.remove('hidden');
        adminRoom.classList.add('hidden');
      }
    }
  }
});
