/**
 * COMSAN Meeting System - Voting & Motion Components
 */

function getOptionIcon(optId) {
  if (optId === 'APPROVE') return '<i data-lucide="thumbs-up" class="w-5 h-5"></i>';
  if (optId === 'REJECT') return '<i data-lucide="thumbs-down" class="w-5 h-5"></i>';
  if (optId === 'ABSTAIN') return '<i data-lucide="minus" class="w-5 h-5"></i>';
  return '<i data-lucide="circle-dot" class="w-5 h-5"></i>';
}

function getOptionSubText(optId, label) {
  if (optId === 'APPROVE') return 'อนุมัติตามญัตติที่เสนอ';
  if (optId === 'REJECT') return 'ไม่อนุมัติญัตติที่เสนอ';
  if (optId === 'ABSTAIN') return 'ไม่ประสงค์ลงมติในญัตตินี้';
  return `เลือกตัวเลือก "${label}"`;
}

function selectDraftVoteOption(motionId, optionId) {
  window.pendingVoteChoices[motionId] = optionId;
  renderVotingCardsSafe();
}

function confirmUserVote(motionId) {
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || !state) return;
  const m = (state.motions || []).find(item => item.id === motionId);
  if (!m || !m.isOpen) return;
  const chosen = window.pendingVoteChoices[motionId] || (m.votes ? m.votes[userId] : null);
  if (!chosen) {
    showToast('กรุณาแตะเลือกตัวเลือกก่อนกดยืนยันลงมติ', 'warning');
    return;
  }
  submitUserVote(motionId, chosen);
}

function submitUserVote(motionId, choice) {
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || !state) return;
  const m = (state.motions || []).find(item => item.id === motionId);
  if (!m || !m.isOpen) return;
  if (!m.votes) m.votes = {};
  m.votes[userId] = choice;
  window.pendingVoteChoices[motionId] = choice;
  window.saveLocalState();
  window.socket.emit('user:vote', { userId, motionId, choice });
  renderVotingCardsSafe();
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast('บันทึกผลการลงมติของคุณเรียบร้อยแล้ว!', 'success');
}

function openAutoVotePopup(motionId) {
  const userId = window.currentUserId;
  const state = window.appState;
  if (!userId || window.currentRole !== 'USER' || !state) return;
  const mot = (state.motions || []).find(m => m.id === motionId);
  if (!mot || !mot.isOpen) return;

  window.currentPopupMotionId = mot.id;
  const modal = document.getElementById('autoVotePopupModal');
  const titleEl = document.getElementById('autoVotePopupTitle');
  const subEl = document.getElementById('autoVotePopupSub');
  const optsEl = document.getElementById('autoVotePopupOptions');
  if (!modal || !titleEl || !optsEl) return;

  optsEl.className = 'flex flex-col gap-3 overflow-y-auto pr-1 flex-1 min-h-0 py-1';

  titleEl.innerHTML = `${mot.title} ${mot.isSecret ? '<span class="text-xs text-purple-500 font-bold ml-1">(โหวตลับ)</span>' : ''}`;
  subEl.textContent = mot.isSecret
    ? 'ญัตตินี้เป็นการโหวตลับ ระบบจะไม่แสดงว่าคุณเลือกตัวเลือกใด (แตะที่ตัวเลือกเพื่อลงมติ)'
    : 'แตะเลือกตัวเลือกด้านล่างเพื่อส่งคะแนนของคุณทันที';

  const opts = typeof window.getMotionOptions === 'function' ? window.getMotionOptions(mot) : (mot.options || []);
  const myVote = mot.votes ? mot.votes[userId] : null;

  optsEl.innerHTML = opts.map(opt => {
    const isSelected = myVote === opt.id;
    const safeImg = opt.image ? opt.image.replace(/'/g, "\\'") : '';
    const safeLbl = String(opt.label || '').replace(/'/g, "\\'");

    return `
      <div onclick="submitVoteFromPopup('${mot.id}', '${opt.id}')"
        class="shrink-0 cursor-pointer rounded-2xl border-2 overflow-hidden transition shadow-sm ${isSelected ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/70 ring-2 ring-indigo-500/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400'}">
        ${opt.image ? `
          <div class="relative w-full bg-slate-100 dark:bg-slate-950">
            <img src="${opt.image}" class="w-full h-32 sm:h-40 object-cover block" />
            <button type="button" onclick="event.stopPropagation(); openImagePreview('${safeImg}', '${safeLbl}')"
              title="คลิกเพื่อขยายดูรูปเต็ม"
              class="absolute top-2.5 right-2.5 z-10 px-2.5 py-1.5 rounded-full bg-black/70 hover:bg-black text-white text-[11px] font-bold backdrop-blur-sm flex items-center gap-1.5 shadow-md transition active:scale-95">
              <i data-lucide="zoom-in" class="w-3.5 h-3.5"></i> <span>ขยายรูป</span>
            </button>
          </div>
        ` : ''}
        <div class="w-full py-3.5 px-4 flex items-center justify-between gap-3">
          <span class="text-sm font-extrabold text-slate-900 dark:text-white">${opt.label}</span>
          <span class="px-3 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300'}">
            ${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5"></i> เลือกแล้ว' : 'กดเลือกโหวต'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeAutoVotePopup() {
  const modal = document.getElementById('autoVotePopupModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  window.currentPopupMotionId = null;
}

function submitVoteFromPopup(motionId, choice) {
  submitUserVote(motionId, choice);
  closeAutoVotePopup();
}

function buildChoiceVoteCardHtml(mot, motNumber, me, state) {
  const opts = typeof window.getMotionOptions === 'function' ? window.getMotionOptions(mot) : (mot.options || []);
  const savedVote = (mot.votes && me) ? mot.votes[me.id] : null;
  const activeSelection = window.pendingVoteChoices[mot.id] || savedVote;
  const selectedOptObj = opts.find(o => o.id === activeSelection);
  const isClosed = !mot.isOpen;
  const totalUsers = (state.users || []).length || 60;
  const votedCount = mot.votes ? Object.keys(mot.votes).length : 0;
  const meetingDateStr = (state.meeting && state.meeting.date) ? state.meeting.date : 'วันนี้';

  const statusBadgeHtml = isClosed
    ? `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-muted text-muted-foreground">ปิดแล้ว</div>`
    : `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">กำลังเปิดโหวต</div>`;

  return `
    <div class="rounded-lg border border-border bg-card text-card-foreground shadow-sm shadow-card hover:shadow-lg transition-all flex flex-col justify-between">
      <div class="flex flex-col space-y-1.5 p-6 pb-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="tracking-tight text-lg font-semibold text-foreground leading-snug">${mot.title}</h3>
              ${statusBadgeHtml}
            </div>
            <div class="flex items-center gap-1.5 flex-wrap mt-1.5">
              <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold border-transparent bg-secondary text-secondary-foreground text-xs">
                ${mot.isSecret ? 'โหวตลับ' : 'ทั่วไป'}
              </div>
              ${savedVote ? `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">✔ โหวตแล้ว (${selectedOptObj ? selectedOptObj.label : savedVote})</span>` : ''}
            </div>
            <p class="text-sm text-muted-foreground mt-2">วาระการประชุม • ญัตติที่ ${String(motNumber).padStart(2, '0')} (${opts.map(o => o.label).join(' / ')})</p>
          </div>
        </div>
      </div>

      <div class="p-6 pt-0 space-y-3">
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <div class="flex items-center space-x-1">
            <i data-lucide="calendar" class="h-3.5 w-3.5"></i>
            <span>${meetingDateStr}</span>
          </div>
          <div class="flex items-center space-x-1">
            <i data-lucide="users" class="h-3.5 w-3.5"></i>
            <span>โหวตแล้ว ${votedCount}/${totalUsers} คน</span>
          </div>
        </div>

        ${!isClosed ? `
          <div class="pt-1 space-y-2 border-t border-border/60">
            <div class="grid grid-cols-1 gap-1.5 pt-1">
              ${opts.map(opt => {
                const isSelected = activeSelection === opt.id;
                const safeImg = opt.image ? opt.image.replace(/'/g, "\\'") : '';
                const safeLbl = String(opt.label || '').replace(/'/g, "\\'");
                return `
                  <div onclick="selectDraftVoteOption('${mot.id}', '${opt.id}')"
                    class="w-full text-left cursor-pointer rounded-md p-2.5 border transition flex flex-col gap-2 ${isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-input bg-background hover:bg-muted/50'}">
                    ${opt.image ? `
                      <div class="relative w-full">
                        <img src="${opt.image}" class="w-full h-28 object-cover rounded-md block" />
                        <button type="button" onclick="event.stopPropagation(); openImagePreview('${safeImg}', '${safeLbl}')"
                          class="absolute top-2 right-2 z-10 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] font-medium flex items-center gap-1">
                          <i data-lucide="zoom-in" class="w-3 h-3"></i> <span>ขยาย</span>
                        </button>
                      </div>
                    ` : ''}
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs sm:text-sm font-medium text-foreground truncate">${opt.label}</span>
                      <span class="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px] ${isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/40'}">
                        ${isSelected ? '✓' : ''}
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <button type="button" onclick="confirmUserVote('${mot.id}')"
              class="w-full inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold h-9 px-3 gradient-primary text-primary-foreground shadow-xs hover:opacity-95 transition cursor-pointer">
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
              <span>ยืนยันลงมติ ${selectedOptObj ? `• ${selectedOptObj.label}` : ''}</span>
            </button>
          </div>
        ` : ''}

        <div class="flex gap-2 pt-1">
          <button type="button" onclick="openChoiceVoteDetailModal('${mot.id}', 'BALLOT')" class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-white h-9 rounded-md px-3 flex-1 cursor-pointer">
            <i data-lucide="eye" class="h-3.5 w-3.5"></i>
            <span>${isClosed ? 'ดูตัวอย่าง' : 'คูหาลงคะแนน'}</span>
          </button>
          <button type="button" onclick="openChoiceVoteDetailModal('${mot.id}', 'RESULTS')" class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 flex-1 cursor-pointer">
            <span>ดูผลลัพธ์</span>
          </button>
        </div>
        <div class="pt-0.5">
          <button type="button" onclick="openAdminSection('VOTING')" class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-white w-full text-xs h-8 px-3 cursor-pointer">
            <i data-lucide="settings" class="h-3.5 w-3.5"></i>
            <span>จัดการการโหวต</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderVotingCardsSafe() {
  const userId = window.currentUserId;
  const state = window.appState;
  if (!state) return;
  const me = (state.users || []).find(u => u.id === userId) || (state.users && state.users[0]) || { id: userId || 'COMSAN-01' };
  const votingArea = document.getElementById('userVotingArea');
  const homeOpenVotesBox = document.getElementById('userHomeOpenVotesBox');

  const allMotions = Array.isArray(state.motions) ? state.motions : [];

  // 1. Render Home "การลงคะแนนที่เปิดอยู่" box (Matching 01_home.png)
  if (homeOpenVotesBox) {
    const openMotions = allMotions
      .map((mot, idx) => ({ mot, motNumber: idx + 1 }))
      .filter(item => item.mot.isOpen);

    if (openMotions.length === 0) {
      homeOpenVotesBox.innerHTML = `
        <div class="rounded-lg border border-border bg-card text-card-foreground shadow-sm shadow-card">
          <div class="p-8 text-center text-muted-foreground">ไม่มีการลงคะแนนที่เปิดอยู่ในขณะนี้</div>
        </div>
      `;
    } else {
      homeOpenVotesBox.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${openMotions.map(({ mot, motNumber }) => buildChoiceVoteCardHtml(mot, motNumber, me, state)).join('')}
        </div>
      `;
    }
  }

  // 2. Render "/all-votes" page (#userVotingArea) (Matching 02_all_votes.png)
  if (!votingArea) return;

  const searchInput = document.getElementById('userVoteSearchInput');
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

  if (allMotions.length === 0) {
    votingArea.innerHTML = `
      <div class="rounded-lg border border-border bg-card text-card-foreground shadow-sm shadow-card">
        <div class="p-12 text-center text-muted-foreground">ยังไม่มีรายการการลงคะแนนในระบบ</div>
      </div>
    `;
    return;
  }

  const sortedMotions = allMotions.map((mot, originalIdx) => ({
    mot,
    originalIdx,
    motNumber: originalIdx + 1
  })).filter(({ mot }) => {
    if (!query) return true;
    return String(mot.title || '').toLowerCase().includes(query);
  }).sort((a, b) => {
    if (a.mot.isOpen && !b.mot.isOpen) return -1;
    if (!a.mot.isOpen && b.mot.isOpen) return 1;
    return b.originalIdx - a.originalIdx;
  });

  if (sortedMotions.length === 0) {
    votingArea.innerHTML = `
      <div class="rounded-lg border border-border bg-card text-card-foreground shadow-sm shadow-card">
        <div class="p-12 text-center text-muted-foreground">ไม่พบรายการการลงคะแนนที่ค้นหา</div>
      </div>
    `;
    return;
  }

  votingArea.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${sortedMotions.map(({ mot, motNumber }) => buildChoiceVoteCardHtml(mot, motNumber, me, state)).join('')}
    </div>
  `;

  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function openChoiceVoteDetailModal(motionId, mode = 'RESULTS') {
  const state = window.appState;
  if (!state || !Array.isArray(state.motions)) return;
  const motIdx = state.motions.findIndex(m => m.id === motionId);
  if (motIdx === -1) return;
  const mot = state.motions[motIdx];
  const modal = document.getElementById('choiceVoteDetailModal');
  const content = document.getElementById('choiceVoteDetailModalContent');
  if (!modal || !content) return;

  window._activeChoiceModalMotionId = motionId;
  window._activeChoiceModalMode = mode;

  const opts = typeof window.getMotionOptions === 'function' ? window.getMotionOptions(mot) : (mot.options || []);
  const userId = window.currentUserId;
  const savedVote = (mot.votes && userId) ? mot.votes[userId] : null;
  const activeSelection = window.pendingVoteChoices[mot.id] || savedVote;
  const totalUsers = (state.users || []).length || 60;
  const votesMap = mot.votes || {};
  const votedCount = Object.keys(votesMap).length;
  const participationPct = totalUsers > 0 ? Math.round((votedCount / totalUsers) * 100) : 0;

  if (mode === 'BALLOT') {
    content.innerHTML = `
      <div class="rounded-xl border border-border bg-card text-card-foreground shadow-xl overflow-hidden">
        <div class="p-6 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${mot.isOpen ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}">
                  ${mot.isOpen ? 'กำลังเปิดลงคะแนน' : 'ตัวอย่างการลงคะแนน (ปิดแล้ว)'}
                </span>
                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                  ${mot.isSecret ? 'โหวตลับ' : 'ทั่วไป'}
                </span>
              </div>
              <h3 class="text-xl font-bold text-foreground mt-2">${mot.title}</h3>
              <p class="text-xs text-muted-foreground mt-1">เลือกตัวเลือกที่คุณต้องการลงคะแนน (เลือกได้ 1 ตัวเลือก)</p>
            </div>
            <button type="button" onclick="closeChoiceVoteDetailModal()" class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <i data-lucide="x" class="h-4 w-4"></i>
            </button>
          </div>

          <div class="space-y-2.5 pt-2">
            ${opts.map(opt => {
              const isSelected = activeSelection === opt.id;
              return `
                <div onclick="${mot.isOpen ? `selectDraftVoteOption('${mot.id}', '${opt.id}'); openChoiceVoteDetailModal('${mot.id}', 'BALLOT');` : ''}"
                  class="rounded-lg border p-4 flex items-center justify-between gap-3 transition ${mot.isOpen ? 'cursor-pointer' : ' opacity-75'} ${isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border bg-background hover:bg-muted/40'}">
                  <div class="flex items-center gap-3">
                    <span class="w-5 h-5 rounded-full border flex items-center justify-center text-xs ${isSelected ? 'border-primary bg-primary text-white' : 'border-muted-foreground/40'}">
                      ${isSelected ? '●' : ''}
                    </span>
                    <span class="font-medium text-sm text-foreground">${opt.label}</span>
                  </div>
                  ${savedVote === opt.id ? `<span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">คะแนนปัจจุบันของคุณ</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onclick="openChoiceVoteDetailModal('${mot.id}', 'RESULTS')" class="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-white h-9 px-4">
              ดูผลลัพธ์
            </button>
            ${mot.isOpen ? `
              <button type="button" onclick="confirmUserVote('${mot.id}'); closeChoiceVoteDetailModal();" class="inline-flex items-center justify-center rounded-md text-xs font-semibold gradient-primary text-primary-foreground h-9 px-5 shadow-xs">
                ยืนยันการลงคะแนน
              </button>
            ` : `
              <button type="button" onclick="closeChoiceVoteDetailModal()" class="inline-flex items-center justify-center rounded-md text-xs font-medium bg-primary text-primary-foreground h-9 px-4">
                ปิดหน้าต่าง
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  } else {
    // RESULTS MODE (Matches sub_vote_results.png 100%)
    const tallies = opts.map(opt => {
      const count = Object.values(votesMap).filter(v => v === opt.id).length;
      const pct = votedCount > 0 ? Math.round((count / votedCount) * 100) : 0;
      return { ...opt, count, pct };
    }).sort((a, b) => b.count - a.count);

    const maxCount = tallies.length > 0 ? tallies[0].count : 0;

    content.innerHTML = `
      <div class="rounded-xl border border-border bg-card text-card-foreground shadow-xl overflow-hidden">
        <div class="p-6 space-y-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-bold text-foreground">${mot.title}</h3>
                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${mot.isOpen ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}">
                  ${mot.isOpen ? 'กำลังเปิดโหวต' : 'ปิดแล้ว'}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-1">สรุปผลการลงคะแนนเสียงในที่ประชุม</p>
            </div>
            <button type="button" onclick="closeChoiceVoteDetailModal()" class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <i data-lucide="x" class="h-4 w-4"></i>
            </button>
          </div>

          <!-- 3 Summary Stat Cards (Matches sub_vote_results.png) -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg border border-border bg-background p-3.5 text-center">
              <p class="text-2xl font-bold text-primary">${votedCount}</p>
              <p class="text-xs text-muted-foreground mt-0.5">ผู้ลงคะแนน</p>
            </div>
            <div class="rounded-lg border border-border bg-background p-3.5 text-center">
              <p class="text-2xl font-bold text-foreground">${totalUsers}</p>
              <p class="text-xs text-muted-foreground mt-0.5">ผู้มีสิทธิ์ทั้งหมด</p>
            </div>
            <div class="rounded-lg border border-border bg-background p-3.5 text-center">
              <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${participationPct}%</p>
              <p class="text-xs text-muted-foreground mt-0.5">อัตราการมีส่วนร่วม</p>
            </div>
          </div>

          <!-- Option Progress Bars -->
          <div class="space-y-3">
            <h4 class="text-sm font-semibold text-foreground">ผลการนับคะแนนแยกตามตัวเลือก</h4>
            ${tallies.map((t, idx) => {
              const isWinner = maxCount > 0 && t.count === maxCount;
              return `
                <div class="rounded-lg border ${isWinner ? 'border-primary/40 bg-primary/[0.03]' : 'border-border bg-background'} p-3.5 space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2 font-semibold text-foreground">
                      <span>${t.label}</span>
                      ${isWinner ? '<span class="inline-flex items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold">👑 คะแนนสูงสุด</span>' : ''}
                    </div>
                    <span class="text-xs font-semibold text-muted-foreground">${t.count} คะแนน (${t.pct}%)</span>
                  </div>
                  <div class="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500 ${isWinner ? 'gradient-primary' : 'bg-primary/60'}" style="width: ${t.pct}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onclick="openChoiceVoteDetailModal('${mot.id}', 'BALLOT')" class="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-white h-9 px-4">
              ดูหน้าคูหาลงคะแนน
            </button>
            <button type="button" onclick="closeChoiceVoteDetailModal()" class="inline-flex items-center justify-center rounded-md text-xs font-medium bg-primary text-primary-foreground h-9 px-4">
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    `;
  }

  modal.classList.remove('hidden');
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
}

function closeChoiceVoteDetailModal() {
  const modal = document.getElementById('choiceVoteDetailModal');
  if (modal) modal.classList.add('hidden');
}

window.openChoiceVoteDetailModal = openChoiceVoteDetailModal;
window.closeChoiceVoteDetailModal = closeChoiceVoteDetailModal;

function handleMotionTypeChange() {
  const select = document.getElementById('motionTypeSelect');
  if (!select) return;
  const type = select.value;
  const builder = document.getElementById('customOptionsBuilder');
  if (builder) builder.classList.toggle('hidden', type !== 'CUSTOM');
  if (type === 'CUSTOM') renderDraftCustomOptions();
}

function addDraftCustomOption() {
  window.draftCustomOptions.push({ id: 'OPT-' + Date.now(), label: '', image: null });
  renderDraftCustomOptions();
}

function removeDraftCustomOption(idx) {
  if (window.draftCustomOptions.length <= 2) {
    showToast('ต้องมีอย่างน้อย 2 ตัวเลือก', 'warning');
    return;
  }
  window.draftCustomOptions.splice(idx, 1);
  renderDraftCustomOptions();
}

function updateDraftOptionLabel(idx, val) {
  if (window.draftCustomOptions[idx]) {
    window.draftCustomOptions[idx].label = val;
  }
}

function handleDraftOptionImage(e, idx) {
  const file = e.target.files[0];
  if (!file || !window.draftCustomOptions[idx]) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 320;
      let w = img.width, h = img.height;
      if (w > h && w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
      else if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      window.draftCustomOptions[idx].image = canvas.toDataURL('image/jpeg', 0.8);
      renderDraftCustomOptions();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function clearDraftOptionImage(idx) {
  if (window.draftCustomOptions[idx]) {
    window.draftCustomOptions[idx].image = null;
    renderDraftCustomOptions();
  }
}

function renderDraftCustomOptions() {
  const container = document.getElementById('draftCustomOptionsList');
  if (!container) return;
  container.innerHTML = window.draftCustomOptions.map((opt, idx) => `
    <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
      <span class="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-500 font-bold text-xs flex items-center justify-center shrink-0">${idx + 1}</span>
      <input type="text" value="${opt.label.replace(/"/g, '&quot;')}" oninput="updateDraftOptionLabel(${idx}, this.value)"
        placeholder="ชื่อตัวเลือกที่ ${idx + 1}..." required
        class="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs" />
      ${opt.image ? `<button type="button" onclick="clearDraftOptionImage(${idx})" class="text-rose-500 text-xs px-2">ลบรูป</button>` : `
        <label class="cursor-pointer px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold shrink-0 flex items-center gap-1">
          <i data-lucide="image" class="w-3.5 h-3.5 text-indigo-500"></i> <span>รูป</span>
          <input type="file" accept="image/*" onchange="handleDraftOptionImage(event, ${idx})" class="hidden" />
        </label>
      `}
      <button type="button" onclick="removeDraftCustomOption(${idx})" class="p-2 text-rose-500 hover:opacity-80 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </div>
  `).join('');
}

function createMotion(e) {
  if (e && e.preventDefault) e.preventDefault();
  const titleInput = document.getElementById('motionTitleInput');
  const title = titleInput.value.trim();
  const type = document.getElementById('motionTypeSelect').value;
  const isSecret = document.getElementById('motionSecretCheckbox').checked;
  if (!title) return;

  let options = [
    { id: 'APPROVE', label: 'เห็นชอบ', image: null },
    { id: 'REJECT', label: 'ไม่เห็นชอบ', image: null },
    { id: 'ABSTAIN', label: 'งดออกเสียง', image: null }
  ];
  if (type === 'CUSTOM') {
    const cleaned = window.draftCustomOptions.map((o, idx) => ({
      id: o.id || `OPT-${idx + 1}`,
      label: String(o.label || '').trim(),
      image: o.image || null
    })).filter(o => o.label !== '');
    if (cleaned.length < 2) return showToast('กรุณากรอกชื่อตัวเลือกอย่างน้อย 2 ตัวเลือก', 'error');
    options = cleaned;
  }

  const newMotion = {
    id: `M-${Date.now().toString().slice(-4)}`,
    title,
    type,
    isSecret,
    options,
    isOpen: true,
    votes: {}
  };
  window.appState.motions.push(newMotion);
  window.saveLocalState();
  window.socket.emit('admin:createMotion', newMotion);
  titleInput.value = '';
  document.getElementById('motionSecretCheckbox').checked = false;
  if (typeof window.renderAll === 'function') window.renderAll();
  showToast(`เปิดญัตติใหม่: "${title}" เรียบร้อยแล้ว`, 'success');
}

function deleteMotion(motionId) {
  if (!confirm('ยืนยันการลบญัตตินี้หรือไม่?')) return;
  window.appState.motions = window.appState.motions.filter(m => m.id !== motionId);
  window.saveLocalState();
  window.socket.emit('admin:deleteMotion', motionId);
  if (typeof window.renderAll === 'function') window.renderAll();
}

function toggleMotionStatus(motionId) {
  const m = window.appState.motions.find(item => item.id === motionId);
  if (m) {
    if (!m.isOpen && window.appState.meeting && window.appState.meeting.isEnded) {
      showToast('ไม่สามารถเปิดโหวตได้เนื่องจากการประชุมจบลงแล้ว กรุณาเปิดการประชุมก่อน', 'error');
      return;
    }
    m.isOpen = !m.isOpen;
    window.saveLocalState();
    window.socket.emit('admin:toggleMotion', motionId);
    if (typeof window.renderAll === 'function') window.renderAll();
  }
}

function toggleRealtimeSetting() {
  const checked = document.getElementById('toggleRealtimeVote').checked;
  window.appState.meeting.realtimeVoting = checked;
  window.saveLocalState();
  window.socket.emit('admin:toggleRealtime', checked);
  if (typeof window.renderAll === 'function') window.renderAll();
}

let initialMotionsRecorded = false;

function checkOpenMotionsPopup() {
  const state = window.appState;
  if (!state || !Array.isArray(state.motions)) return;
  if (!window.seenOpenMotionIds) window.seenOpenMotionIds = new Set();

  if (!initialMotionsRecorded) {
    state.motions.forEach(m => {
      window.seenOpenMotionIds.add(m.id);
    });
    initialMotionsRecorded = true;
  }

  const uid = window.currentUserId;
  state.motions.filter(m => m.isOpen).forEach(m => {
    if (!window.seenOpenMotionIds.has(m.id)) {
      window.seenOpenMotionIds.add(m.id);
      const alreadyVoted = Boolean(m.votes && uid && m.votes[uid]);
      if (window.currentRole === 'USER' && uid && !alreadyVoted) {
        openAutoVotePopup(m.id);
      }
    }
  });
  if (window.currentPopupMotionId) {
    const activeMot = state.motions.find(m => m.id === window.currentPopupMotionId);
    if (!activeMot || !activeMot.isOpen) closeAutoVotePopup();
  }
}

function updateRaiseHandUserUI() {
  const state = window.appState;
  if (!state) return;
  const queue = state.raiseHandQueue || [];
  const myIdx = window.currentUserId ? queue.findIndex(q => q.userId === window.currentUserId) : -1;
  const isInQueue = myIdx !== -1;

  const statusPill = document.getElementById('raiseStatusPill');
  const outerCircle = document.getElementById('raiseOuterCircle');
  const checkBadge = document.getElementById('raiseCheckBadge');
  const mainTitle = document.getElementById('raiseMainTitle');
  const subDesc = document.getElementById('raiseSubDesc');
  const myOrderNum = document.getElementById('raiseMyOrderNum');
  const waitBeforeNum = document.getElementById('raiseWaitBeforeNum');
  const timeText = document.getElementById('raiseTimeText');
  const actionBtn = document.getElementById('btnMainRaiseAction');
  const mNavBtn = document.getElementById('mNav_RAISE');
  const mNavLbl = document.getElementById('mNavLabel_RAISE');
  const uBadgeRaise = document.getElementById('uBadge_RAISE');

  if (uBadgeRaise) uBadgeRaise.classList.toggle('hidden', !isInQueue);

  if (mNavBtn && mNavLbl) {
    mNavBtn.className = isInQueue
      ? 'absolute -top-5 inset-x-0 mx-auto w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300 bg-emerald-600 text-white active:scale-95 shadow-[0_4px_14px_rgba(16,185,129,0.35)]'
      : 'absolute -top-5 inset-x-0 mx-auto w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300 bg-primary text-primary-foreground active:scale-95 shadow-[0_4px_14px_hsl(var(--primary)/0.25)]';
    mNavLbl.className = 'sr-only';
  }

  if (statusPill && outerCircle && mainTitle) {
    if (isInQueue) {
      const myItem = queue[myIdx];
      statusPill.className = 'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold';
      statusPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> อยู่ในคิวขอพูด';
      outerCircle.className = 'w-full h-full rounded-full bg-emerald-500/15 border-8 border-emerald-500/10 flex items-center justify-center text-5xl text-emerald-600 dark:text-emerald-400 transition-all';
      if (checkBadge) { checkBadge.classList.remove('hidden'); checkBadge.classList.add('flex'); }
      mainTitle.textContent = 'อยู่ในคิวรอพูดแล้ว';
      subDesc.textContent = 'ระบบได้บันทึกคิวของคุณแล้ว กรุณารอประธานหรือผู้ดำเนินการเรียกชื่อ';
      if (myOrderNum) myOrderNum.textContent = myIdx + 1;
      if (waitBeforeNum) waitBeforeNum.textContent = myIdx;
      if (timeText) timeText.textContent = myItem ? myItem.time : '-';
      if (actionBtn) {
        actionBtn.className = 'w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-1.5';
        actionBtn.innerHTML = '<i data-lucide="hand" class="w-5 h-5"></i> <span>กดยกเลิกการยกมือ (เอามือลง)</span>';
      }
    } else {
      statusPill.className = 'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold';
      statusPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span> ยังไม่ได้ยกมือ';
      outerCircle.className = 'w-full h-full rounded-full bg-indigo-500/10 border-8 border-indigo-500/15 flex items-center justify-center text-5xl text-indigo-600 dark:text-indigo-400 transition-all';
      if (checkBadge) { checkBadge.classList.add('hidden'); checkBadge.classList.remove('flex'); }
      mainTitle.textContent = 'กดปุ่มเพื่อขอยกมือพูด';
      subDesc.textContent = 'แตะที่ปุ่มด้านล่างเพื่อส่งสัญญาณไปยังหน้าจอผู้ดำเนินรายการ';
      if (myOrderNum) myOrderNum.textContent = '-';
      if (waitBeforeNum) waitBeforeNum.textContent = queue.length;
      if (timeText) timeText.textContent = '-';
      if (actionBtn) {
        actionBtn.className = 'w-full py-4 rounded-2xl btn-primary-gradient text-white font-extrabold text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5';
        actionBtn.innerHTML = '<i data-lucide="hand" class="w-5 h-5"></i> <span>กดยกมือขอพูดทันที</span>';
      }
    }
  }

  // Live queue list rendering in user view
  const userLiveQueueList = document.getElementById('userLiveRaiseHandQueueBox');
  const userLiveQueueItems = document.getElementById('userViewQueueItems');
  if (userLiveQueueList && userLiveQueueItems) {
    if (queue.length > 0) {
      userLiveQueueList.classList.remove('hidden');
      userLiveQueueItems.innerHTML = queue.map((q, idx) => {
        const isMe = window.currentUserId && q.userId === window.currentUserId;
        return `
          <div class="p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${isMe ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}">${idx + 1}</span>
              <div class="truncate">
                <span class="font-extrabold ${isMe ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}">${q.nickname}</span>
                <span class="text-slate-400 text-[11px] ml-1">(${q.position || '-'})</span>
              </div>
            </div>
            <span class="text-[11px] text-slate-400 shrink-0 font-medium">${q.time}</span>
          </div>
        `;
      }).join('');
    } else {
      userLiveQueueList.classList.add('hidden');
    }
  }
}

// Window attachments
window.getOptionIcon = getOptionIcon;
window.getOptionSubText = getOptionSubText;
window.selectDraftVoteOption = selectDraftVoteOption;
window.confirmUserVote = confirmUserVote;
window.submitUserVote = submitUserVote;
window.openAutoVotePopup = openAutoVotePopup;
window.closeAutoVotePopup = closeAutoVotePopup;
window.submitVoteFromPopup = submitVoteFromPopup;
window.renderVotingCardsSafe = renderVotingCardsSafe;
window.handleMotionTypeChange = handleMotionTypeChange;
window.addDraftCustomOption = addDraftCustomOption;
window.removeDraftCustomOption = removeDraftCustomOption;
window.updateDraftOptionLabel = updateDraftOptionLabel;
window.handleDraftOptionImage = handleDraftOptionImage;
window.clearDraftOptionImage = clearDraftOptionImage;
window.renderDraftCustomOptions = renderDraftCustomOptions;
window.createMotion = createMotion;
window.deleteMotion = deleteMotion;
window.toggleMotionStatus = toggleMotionStatus;
window.toggleRealtimeSetting = toggleRealtimeSetting;
window.checkOpenMotionsPopup = checkOpenMotionsPopup;
window.updateRaiseHandUserUI = updateRaiseHandUserUI;
