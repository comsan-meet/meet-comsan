/**
 * COMSAN Meeting System - Randomizer Component (Lucky Wheel & Slot)
 */

const DEFAULT_WHEEL_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

// Initialize globals safely
window.randomizerMode = window.randomizerMode || 'WHEEL';
window.randomizerSource = window.randomizerSource || 'MEMBERS';
window.customRandomItems = window.customRandomItems || [];
window.WHEEL_COLORS = (window.WHEEL_COLORS && window.WHEEL_COLORS.length > 0) ? window.WHEEL_COLORS : DEFAULT_WHEEL_COLORS;
window.randomPool = window.randomPool || [];

function toggleSecretBiasPanel() {
  window.isSecretBiasOpen = !window.isSecretBiasOpen;
  const panel = document.getElementById('secretBiasPanel');
  if (panel) panel.classList.toggle('hidden', !window.isSecretBiasOpen);
  renderRandomizerPoolUI();
}

function setRandomizerMode(mode) {
  window.randomizerMode = (mode || 'WHEEL').toUpperCase();
  ['WHEEL', 'SLOT', 'CARD'].forEach(m => {
    const btn = document.getElementById(`randMode_${m}`);
    if (btn) {
      btn.className = m === window.randomizerMode
        ? 'py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition bg-amber-500 text-slate-950 shadow-sm'
        : 'py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';
    }
  });
}

function setRandomizerSource(src) {
  window.randomizerSource = src;
  const btnMem = document.getElementById('randSrc_MEMBERS');
  const btnCus = document.getElementById('randSrc_CUSTOM');
  const on = 'py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition bg-indigo-600 text-white shadow-sm';
  const off = 'py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';
  if (btnMem) btnMem.className = src === 'MEMBERS' ? on : off;
  if (btnCus) btnCus.className = src === 'CUSTOM' ? on : off;

  const memBox = document.getElementById('randomMembersFilterBox');
  const cusBox = document.getElementById('randomCustomBuilderBox');
  if (memBox) memBox.classList.toggle('hidden', src !== 'MEMBERS');
  if (cusBox) cusBox.classList.toggle('hidden', src !== 'CUSTOM');
  rebuildRandomMemberPool();
}

function rebuildRandomMemberPool() {
  const state = window.appState;
  if (!state) return;

  if (window.randomizerSource === 'CUSTOM') {
    window.randomPool = window.customRandomItems;
    renderRandomizerPoolUI();
    drawWheelCanvas('adminPreviewWheelCanvas', getEnabledRandomItems(), 0);
    return;
  }

  const allRoles = [...new Set((state.users || []).map(u => u.position || 'สมาชิก'))];
  if (!window.selectedRolesForRandom || window.selectedRolesForRandom.size === 0) {
    window.selectedRolesForRandom = new Set(allRoles);
  }

  const roleBox = document.getElementById('randomRoleCheckboxes');
  if (roleBox) {
    roleBox.innerHTML = allRoles.map(role => {
      const checked = window.selectedRolesForRandom.has(role);
      return `
        <label class="px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${checked ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleRandomRole('${role.replace(/'/g, "\\'")}')" class="accent-indigo-600 rounded" />
          <span>${role}</span>
        </label>
      `;
    }).join('');
  }

  const onlyCheckedIn = document.getElementById('randOnlyCheckedIn') && document.getElementById('randOnlyCheckedIn').checked;
  const oldWeights = {};
  (window.randomPool || []).forEach(item => { oldWeights[item.id] = item.weight; });

  const rawUsers = Array.isArray(state.users) ? state.users : [];
  window.randomPool = rawUsers
    .filter(u => {
      const roleMatch = !window.selectedRolesForRandom || window.selectedRolesForRandom.size === 0 || window.selectedRolesForRandom.has(u.position || 'สมาชิก');
      const checkMatch = !onlyCheckedIn || (u.checkedIn && !u.isLeave);
      return roleMatch && checkMatch;
    })
    .map(u => ({
      id: u.id,
      label: `${u.nickname || u.firstName || 'สมาชิก'} (${u.firstName || ''})`.trim(),
      sub: u.position || 'สมาชิก',
      weight: oldWeights[u.id] !== undefined ? oldWeights[u.id] : 1,
      enabled: true
    }));

  renderRandomizerPoolUI();
  drawWheelCanvas('adminPreviewWheelCanvas', getEnabledRandomItems(), 0);
}

function toggleRandomRole(role) {
  if (!window.selectedRolesForRandom) window.selectedRolesForRandom = new Set();
  if (window.selectedRolesForRandom.has(role)) window.selectedRolesForRandom.delete(role);
  else window.selectedRolesForRandom.add(role);
  rebuildRandomMemberPool();
}

function addRandomCustomItem() {
  const input = document.getElementById('randomCustomItemInput');
  const val = input ? input.value.trim() : '';
  if (!val) return;
  window.customRandomItems.push({ id: 'C-' + Date.now(), label: val, weight: 1, enabled: true });
  if (input) input.value = '';
  rebuildRandomMemberPool();
}

function removeRandomCustomItem(id) {
  window.customRandomItems = window.customRandomItems.filter(i => i.id !== id);
  rebuildRandomMemberPool();
}

function toggleRandomPoolItem(id) {
  const item = (window.randomPool || []).find(i => i.id === id);
  if (item) {
    item.enabled = !item.enabled;
    renderRandomizerPoolUI();
    drawWheelCanvas('adminPreviewWheelCanvas', getEnabledRandomItems(), 0);
  }
}

function updateRandomItemWeight(id, val) {
  const item = (window.randomPool || []).find(i => i.id === id);
  if (item) item.weight = Math.max(0, Number(val) || 0);
}

function getEnabledRandomItems() {
  return (window.randomPool || []).filter(i => i.enabled);
}

function renderRandomizerPoolUI() {
  const listEl = document.getElementById('randomPoolItemsList');
  const countEl = document.getElementById('randomPoolCount');
  const enabledItems = getEnabledRandomItems();
  if (countEl) countEl.textContent = enabledItems.length;
  if (!listEl) return;

  if (!window.randomPool || window.randomPool.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">ไม่มีรายชื่อที่ตรงกับเงื่อนไข</p>`;
    return;
  }

  listEl.innerHTML = window.randomPool.map(item => `
    <div class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
      <label class="flex items-center gap-2 cursor-pointer truncate flex-1">
        <input type="checkbox" ${item.enabled ? 'checked' : ''} onchange="toggleRandomPoolItem('${item.id}')" class="accent-indigo-600 rounded" />
        <span class="font-semibold ${item.enabled ? 'text-slate-900 dark:text-white' : 'line-through text-slate-400'} truncate">${item.label}</span>
        ${item.sub ? `<span class="text-[10px] text-slate-400">(${item.sub})</span>` : ''}
      </label>
      <div class="flex items-center gap-1.5 shrink-0">
        ${window.isSecretBiasOpen ? `
          <span class="text-[10px] text-rose-400 font-bold">โอกาส:</span>
          <input type="number" min="0" max="999" value="${item.weight}" oninput="updateRandomItemWeight('${item.id}', this.value)"
            class="w-14 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-rose-500/40 text-center text-xs font-bold text-rose-500" />
        ` : ''}
        ${window.randomizerSource === 'CUSTOM' ? `
          <button type="button" onclick="removeRandomCustomItem('${item.id}')" class="text-rose-500 hover:bg-rose-500/10 p-1 rounded">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function pickWeightedIndex(items) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const weights = items.map(i => Math.max(0, Number(i.weight ?? 1)));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) return Math.floor(Math.random() * items.length);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return items.length - 1;
}

function triggerAdminSpin() {
  const items = getEnabledRandomItems();
  if (!items || items.length < 2) {
    if (typeof showToast === 'function') {
      showToast('ต้องมีรายชื่ออย่างน้อย 2 รายการเพื่อทำการสุ่ม!', 'error');
    }
    return;
  }
  const mode = (window.randomizerMode || 'WHEEL').toUpperCase();
  const winnerIndex = pickWeightedIndex(items);
  const winnerLabel = items[winnerIndex].label;
  const spinPayload = {
    mode: mode,
    items: items.map(i => ({ id: i.id, label: i.label })),
    winnerIndex,
    winnerLabel
  };

  const record = {
    id: Date.now(),
    mode: mode,
    winnerLabel,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
  const state = window.appState;
  if (state) {
    if (!state.randomizer) state.randomizer = { lastWinner: null, history: [] };
    state.randomizer.lastWinner = record;
    state.randomizer.history.unshift(record);
    state.randomizer.history = state.randomizer.history.slice(0, 15);
    if (typeof window.saveLocalState === 'function') window.saveLocalState();
  }

  // 1. Send over socket to broadcast to all other clients
  if (window.socket && typeof window.socket.emit === 'function') {
    window.socket.emit('admin:startRandomSpin', spinPayload);
  }

  // 2. ALWAYS play popup animation for Admin immediately (zero lag)
  playRandomizerPopupAnimation(spinPayload);
}

function drawWheelCanvas(canvasId, items, rotationRad = 0) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width || 300, h = canvas.height || 300;
  const cx = w / 2, cy = h / 2;
  const r = Math.min(cx, cy) - 6;

  ctx.clearRect(0, 0, w, h);
  if (!items || items.length === 0) {
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const palette = (window.WHEEL_COLORS && window.WHEEL_COLORS.length > 0) ? window.WHEEL_COLORS : DEFAULT_WHEEL_COLORS;
  const arc = (Math.PI * 2) / items.length;

  items.forEach((item, i) => {
    const startAngle = rotationRad + i * arc;
    const endAngle = startAngle + arc;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length];
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Prompt, sans-serif';
    ctx.fillText(String(item.label || '').slice(0, 16), r - 14, 4);
    ctx.restore();
  });
}

function playRandomizerPopupAnimation(payload) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) return;
  const modal = document.getElementById('randomPopupModal');
  const wheelBox = document.getElementById('popupWheelBox');
  const slotBox = document.getElementById('popupSlotBox');
  const slotText = document.getElementById('popupSlotText');
  const giftBox = document.getElementById('popupGiftBox');
  const giftLid = document.getElementById('giftBoxLid');
  const giftWinnerCard = document.getElementById('giftWinnerCard');
  const giftWinnerLabel = document.getElementById('giftWinnerLabel');
  const giftAura = document.getElementById('giftAura');
  const giftContainer = document.getElementById('giftBoxContainer');
  const winnerBanner = document.getElementById('popupWinnerBanner');
  const titleEl = document.getElementById('popupRandomTitle');

  // Clear any existing spin timers
  if (window._spinTimers && Array.isArray(window._spinTimers)) {
    window._spinTimers.forEach(t => clearTimeout(t));
  }
  if (window._spinIntervals && Array.isArray(window._spinIntervals)) {
    window._spinIntervals.forEach(i => clearInterval(i));
  }
  window._spinTimers = [];
  window._spinIntervals = [];

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (winnerBanner) winnerBanner.classList.add('hidden');

  const items = payload.items;
  const n = items.length;
  const winnerIdx = (typeof payload.winnerIndex === 'number' && payload.winnerIndex >= 0) ? payload.winnerIndex : 0;
  const duration = 4200;
  const startTime = performance.now();
  const mode = (payload.mode || 'WHEEL').toUpperCase();

  // Reset display elements
  if (wheelBox) wheelBox.classList.add('hidden');
  if (slotBox) slotBox.classList.add('hidden');
  if (giftBox) {
    giftBox.classList.add('hidden');
    giftBox.classList.remove('flex');
  }

  if (mode === 'WHEEL') {
    if (titleEl) titleEl.textContent = '🎡 กำลังหมุนวงล้อสุ่ม...';
    if (wheelBox) wheelBox.classList.remove('hidden');
    const sliceAngle = (Math.PI * 2) / n;
    const targetRotation = (Math.PI * 2 * 7) - (winnerIdx * sliceAngle + sliceAngle / 2);

    function animateWheel(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const easeOut = 1 - Math.pow(1 - t, 4);
      drawWheelCanvas('popupWheelCanvas', items, targetRotation * easeOut);
      if (t < 1) {
        requestAnimationFrame(animateWheel);
      } else {
        finishRandomSpin(payload.winnerLabel);
      }
    }
    requestAnimationFrame(animateWheel);
  } else if (mode === 'CARD' || mode === 'GIFT') {
    if (titleEl) titleEl.textContent = '🎁 กำลังเปิดกล่องสุ่มของขวัญ...';
    if (giftBox) {
      giftBox.classList.remove('hidden');
      giftBox.classList.add('flex');
    }

    // Reset Gift components
    if (giftLid) {
      giftLid.style.transform = 'translateY(0) rotate(0deg)';
      giftLid.style.opacity = '1';
    }
    if (giftAura) {
      giftAura.style.opacity = '0';
      giftAura.style.transform = 'scale(0.75)';
    }
    if (giftWinnerCard) {
      giftWinnerCard.style.transform = 'scale(0.5) translateY(0)';
      giftWinnerCard.style.opacity = '0';
    }
    if (giftWinnerLabel) {
      giftWinnerLabel.textContent = payload.winnerLabel;
    }
    if (giftContainer) {
      giftContainer.style.transform = 'rotate(0deg)';
    }

    // Phase 1: Wiggle / Shake gift box excitement (0ms - 2000ms)
    let wobbleStep = 0;
    const wobbleInterval = setInterval(() => {
      wobbleStep++;
      if (!giftContainer) return;
      const angle = (wobbleStep % 2 === 0 ? 1 : -1) * (4 + (wobbleStep % 3));
      const jumpY = (wobbleStep % 4 === 0 ? -4 : 0);
      giftContainer.style.transform = `rotate(${angle}deg) translateY(${jumpY}px)`;
    }, 90);
    window._spinIntervals.push(wobbleInterval);

    // Phase 2: Lid pops off & Golden Light bursts (at 2000ms)
    const lidTimer = setTimeout(() => {
      clearInterval(wobbleInterval);
      if (giftContainer) giftContainer.style.transform = 'rotate(0deg) translateY(0)';
      if (titleEl) titleEl.textContent = '✨ กล่องของขวัญเปิดแล้ว!';

      if (giftLid) {
        giftLid.style.transform = 'translateY(-65px) rotate(-16deg)';
        giftLid.style.opacity = '0.2';
      }
      if (giftAura) {
        giftAura.style.opacity = '1';
        giftAura.style.transform = 'scale(1.4)';
      }
    }, 2000);
    window._spinTimers.push(lidTimer);

    // Phase 3: Winner card floats out of the box (at 2500ms)
    const cardTimer = setTimeout(() => {
      if (giftWinnerCard) {
        giftWinnerCard.style.transform = 'scale(1) translateY(-45px)';
        giftWinnerCard.style.opacity = '1';
      }
      try {
        if (typeof playNotificationSound === 'function') {
          playNotificationSound('vote');
        }
      } catch (e) {}
    }, 2500);
    window._spinTimers.push(cardTimer);

    // Phase 4: Finalize
    const finishTimer = setTimeout(() => {
      finishRandomSpin(payload.winnerLabel);
    }, 3800);
    window._spinTimers.push(finishTimer);

  } else {
    // SLOT MODE
    if (titleEl) titleEl.textContent = '🎰 กำลังหมุนสล็อตสุ่มชื่อ...';
    if (slotBox) slotBox.classList.remove('hidden');
    const stepInterval = setInterval(() => {
      if (slotText) slotText.textContent = items[Math.floor(Math.random() * n)].label;
    }, 85);
    window._spinIntervals.push(stepInterval);
    const finishTimer = setTimeout(() => {
      clearInterval(stepInterval);
      if (slotText) slotText.textContent = payload.winnerLabel;
      finishRandomSpin(payload.winnerLabel);
    }, duration);
    window._spinTimers.push(finishTimer);
  }
}

function finishRandomSpin(winnerLabel) {
  try {
    if (typeof playNotificationSound === 'function') {
      playNotificationSound('hand');
    }
  } catch (e) {}
  const title = document.getElementById('popupRandomTitle');
  const winner = document.getElementById('popupWinnerName');
  const banner = document.getElementById('popupWinnerBanner');
  if (title) title.textContent = '✨ การสุ่มเสร็จสิ้น!';
  if (winner) winner.textContent = winnerLabel;
  if (banner) banner.classList.remove('hidden');
  if (typeof window.renderAll === 'function') window.renderAll();
}

function closeRandomPopup() {
  if (window._spinTimers && Array.isArray(window._spinTimers)) {
    window._spinTimers.forEach(t => clearTimeout(t));
  }
  if (window._spinIntervals && Array.isArray(window._spinIntervals)) {
    window._spinIntervals.forEach(i => clearInterval(i));
  }
  window._spinTimers = [];
  window._spinIntervals = [];

  const modal = document.getElementById('randomPopupModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  const giftBox = document.getElementById('popupGiftBox');
  const giftLid = document.getElementById('giftBoxLid');
  const giftWinnerCard = document.getElementById('giftWinnerCard');
  const giftAura = document.getElementById('giftAura');
  const giftContainer = document.getElementById('giftBoxContainer');
  if (giftBox) {
    giftBox.classList.add('hidden');
    giftBox.classList.remove('flex');
  }
  if (giftLid) {
    giftLid.style.transform = '';
    giftLid.style.opacity = '';
  }
  if (giftAura) {
    giftAura.style.opacity = '0';
    giftAura.style.transform = '';
  }
  if (giftWinnerCard) {
    giftWinnerCard.style.transform = '';
    giftWinnerCard.style.opacity = '0';
  }
  if (giftContainer) {
    giftContainer.style.transform = '';
  }
}

// Window attachments
window.toggleSecretBiasPanel = toggleSecretBiasPanel;
window.setRandomizerMode = setRandomizerMode;
window.setRandomizerSource = setRandomizerSource;
window.rebuildRandomMemberPool = rebuildRandomMemberPool;
window.toggleRandomRole = toggleRandomRole;
window.addRandomCustomItem = addRandomCustomItem;
window.removeRandomCustomItem = removeRandomCustomItem;
window.toggleRandomPoolItem = toggleRandomPoolItem;
window.updateRandomItemWeight = updateRandomItemWeight;
window.getEnabledRandomItems = getEnabledRandomItems;
window.renderRandomizerPoolUI = renderRandomizerPoolUI;
window.triggerAdminSpin = triggerAdminSpin;
window.drawWheelCanvas = drawWheelCanvas;
window.playRandomizerPopupAnimation = playRandomizerPopupAnimation;
window.finishRandomSpin = finishRandomSpin;
window.closeRandomPopup = closeRandomPopup;
