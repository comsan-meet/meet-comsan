/**
 * COMSAN Meeting System - Admin Analytics & Interactive Charts Component
 * Supports: Vote Results & Attendance Rates in Doughnut, Pie, and Bar charts.
 */

let adminChartMetric = 'VOTE'; // 'VOTE' | 'ATTENDANCE'
let adminChartType = 'doughnut'; // 'doughnut' | 'pie' | 'bar'
let adminChartSelectedMotionId = null;
let adminChartInstance = null;

function setAdminChartMetric(metric) {
  adminChartMetric = metric;
  window.adminChartMetric = metric;
  updateChartControlButtons();
  renderAdminAnalyticsChart();
}

function setAdminChartType(type) {
  adminChartType = type;
  window.adminChartType = type;
  updateChartControlButtons();
  renderAdminAnalyticsChart();
}

function handleAdminChartMotionChange(motionId) {
  adminChartSelectedMotionId = motionId;
  window.adminChartSelectedMotionId = motionId;
  renderAdminAnalyticsChart();
}

function updateChartControlButtons() {
  const btnVote = document.getElementById('btnChartMetric_VOTE');
  const btnAtt = document.getElementById('btnChartMetric_ATTENDANCE');
  if (btnVote) {
    btnVote.className = adminChartMetric === 'VOTE'
      ? 'flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-card text-primary shadow-xs border border-primary/30 ring-1 ring-primary/20'
      : 'flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground';
  }
  if (btnAtt) {
    btnAtt.className = adminChartMetric === 'ATTENDANCE'
      ? 'flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-card text-primary shadow-xs border border-primary/30 ring-1 ring-primary/20'
      : 'flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground';
  }

  ['doughnut', 'pie', 'bar'].forEach(type => {
    const btn = document.getElementById(`btnChartType_${type}`);
    if (btn) {
      btn.className = adminChartType === type
        ? 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 bg-card text-primary shadow-xs border border-primary/30 ring-1 ring-primary/20'
        : 'px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 text-muted-foreground hover:text-foreground';
    }
  });

  const motionBox = document.getElementById('adminChartMotionFilterBox');
  const attBox = document.getElementById('adminChartAttendanceFilterBox');
  if (motionBox) motionBox.classList.toggle('hidden', adminChartMetric !== 'VOTE');
  if (attBox) {
    attBox.classList.toggle('hidden', adminChartMetric === 'VOTE');
    const attCount = document.getElementById('adminChartAttendanceUserCount');
    if (attCount && window.appState) {
      const uCount = (window.appState.users || []).length;
      attCount.textContent = `สมาชิกทั้งหมด ${uCount} คน`;
    }
  }
}

function renderAdminAnalyticsChart() {
  const state = window.appState;
  if (!state) return;
  const canvas = document.getElementById('adminAnalyticsChartCanvas');
  const emptyState = document.getElementById('adminChartEmptyState');
  const summaryHeader = document.getElementById('adminChartSummaryHeader');
  const breakdownList = document.getElementById('adminChartBreakdownList');
  if (!canvas) return;

  if (window.adminChartMetric) adminChartMetric = window.adminChartMetric;
  if (window.adminChartType) adminChartType = window.adminChartType;
  if (window.adminChartSelectedMotionId) adminChartSelectedMotionId = window.adminChartSelectedMotionId;

  updateChartControlButtons();

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const users = (typeof window.getSummaryUsers === 'function') ? window.getSummaryUsers() : (state.users || []);
  const totalUsers = users.length;

  let labels = [];
  let dataValues = [];
  let bgColors = [];
  let borderColors = [];
  let headerHTML = '';
  let breakdownHTML = '';
  let hasData = false;

  if (adminChartMetric === 'VOTE') {
    const motions = state.motions || [];
    const motionSelect = document.getElementById('adminChartMotionSelect');
    const motionBadge = document.getElementById('adminChartMotionStatusBadge');

    if (motions.length === 0) {
      hasData = false;
      if (motionSelect) motionSelect.innerHTML = `<option value="">ยังไม่มีญัตติ</option>`;
      if (motionBadge) motionBadge.innerHTML = '';
      headerHTML = `<p class="text-xs text-muted-foreground">ยังไม่มีญัตติที่เปิดโหวตในระบบ</p>`;
      breakdownHTML = `<p class="text-xs text-muted-foreground text-center py-6">สามารถสร้างญัตติใหม่ได้ที่เมนู "การโหวต"</p>`;
    } else {
      hasData = true;
      if (!adminChartSelectedMotionId || !motions.some(m => m.id === adminChartSelectedMotionId)) {
        // Default to the first open motion, or the last motion
        const openMot = motions.find(m => m.isOpen);
        adminChartSelectedMotionId = openMot ? openMot.id : motions[motions.length - 1].id;
        window.adminChartSelectedMotionId = adminChartSelectedMotionId;
      }

      if (motionSelect) {
        motionSelect.innerHTML = motions.map(m => {
          const isSel = m.id === adminChartSelectedMotionId ? 'selected' : '';
          const indicator = m.isOpen ? '🟢 ' : '';
          return `<option value="${m.id}" ${isSel}>${indicator}${m.title}</option>`;
        }).join('');
      }

      const currentMotion = motions.find(m => m.id === adminChartSelectedMotionId) || motions[motions.length - 1];
      if (motionBadge) {
        motionBadge.innerHTML = currentMotion.isOpen
          ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">กำลังเปิดโหวต</span>`
          : `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border whitespace-nowrap">ปิดการโหวตแล้ว</span>`;
      }

      const opts = typeof window.getMotionOptions === 'function' ? window.getMotionOptions(currentMotion) : (currentMotion.options || []);
      const votesMap = currentMotion.votes || {};
      const votesValues = Object.values(votesMap);
      const totalVotesCast = votesValues.length;
      const turnoutPercent = totalUsers > 0 ? ((totalVotesCast / totalUsers) * 100).toFixed(1) : 0;

      headerHTML = `
        <div>
          <h4 class="text-xs font-bold text-foreground">${currentMotion.title} ${currentMotion.isSecret ? '<span class="text-purple-500 font-semibold">(โหวตลับ)</span>' : ''}</h4>
          <p class="text-[11px] text-muted-foreground">ใช้สิทธิ์แล้ว ${totalVotesCast} จาก ${totalUsers} คน (${turnoutPercent}%)</p>
        </div>
        <span class="text-xs font-extrabold text-primary">${totalVotesCast} เสียง</span>
      `;

      opts.forEach((opt, idx) => {
        const count = votesValues.filter(v => v === opt.id).length;
        const percent = totalVotesCast > 0 ? ((count / totalVotesCast) * 100).toFixed(1) : 0;
        labels.push(opt.label);
        dataValues.push(count);

        let color = '#6366f1';
        let barClass = 'bg-indigo-500';
        if (opt.id === 'APPROVE') {
          color = '#10b981';
          barClass = 'bg-emerald-500';
        } else if (opt.id === 'REJECT') {
          color = '#f43f5e';
          barClass = 'bg-rose-500';
        } else if (opt.id === 'ABSTAIN') {
          color = '#f59e0b';
          barClass = 'bg-amber-500';
        } else {
          const palette = ['#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
          color = palette[idx % palette.length];
        }
        bgColors.push(color);
        borderColors.push(color);

        breakdownHTML += `
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="flex items-center gap-1.5 font-medium text-foreground truncate">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${color}"></span>
                <span class="truncate">${opt.label}</span>
              </span>
              <span class="font-bold text-foreground shrink-0">${count} เสียง <span class="text-muted-foreground font-normal text-[11px]">(${percent}%)</span></span>
            </div>
            <div class="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" style="width: ${percent}%; background-color: ${color}"></div>
            </div>
          </div>
        `;
      });
    }
  } else {
    // Attendance Metric
    hasData = totalUsers > 0;
    const onTime = users.filter(u => u.checkedIn && !u.isLate && !u.isLeave).length;
    const late = users.filter(u => u.checkedIn && u.isLate && !u.isLeave).length;
    const leave = users.filter(u => u.isLeave).length;
    const absent = users.filter(u => !u.checkedIn && !u.isLeave).length;
    const totalPresent = onTime + late;
    const presentPercent = totalUsers > 0 ? ((totalPresent / totalUsers) * 100).toFixed(1) : 0;

    headerHTML = `
      <div>
        <h4 class="text-xs font-bold text-foreground">อัตราการเข้าร่วมประชุม</h4>
        <p class="text-[11px] text-muted-foreground">เข้าประชุมจริง ${totalPresent} จาก ${totalUsers} คน (${presentPercent}%)</p>
      </div>
      <span class="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">${presentPercent}%</span>
    `;

    const items = [
      { label: 'มาทันเวลา', count: onTime, color: '#10b981' },
      { label: 'มาสาย', count: late, color: '#f59e0b' },
      { label: 'แจ้งลา', count: leave, color: '#0ea5e9' },
      { label: 'ยังไม่มา / ขาด', count: absent, color: '#f43f5e' }
    ];

    items.forEach(it => {
      labels.push(it.label);
      dataValues.push(it.count);
      bgColors.push(it.color);
      borderColors.push(it.color);

      const percent = totalUsers > 0 ? ((it.count / totalUsers) * 100).toFixed(1) : 0;
      breakdownHTML += `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-1.5 font-medium text-foreground">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${it.color}"></span>
              <span>${it.label}</span>
            </span>
            <span class="font-bold text-foreground">${it.count} คน <span class="text-muted-foreground font-normal text-[11px]">(${percent}%)</span></span>
          </div>
          <div class="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" style="width: ${percent}%; background-color: ${it.color}"></div>
          </div>
        </div>
      `;
    });
  }

  if (summaryHeader) summaryHeader.innerHTML = headerHTML;
  if (breakdownList) breakdownList.innerHTML = breakdownHTML;

  if (emptyState) {
    emptyState.classList.toggle('hidden', hasData);
  }
  canvas.classList.toggle('hidden', !hasData);

  if (!hasData) {
    if (typeof Chart !== 'undefined') {
      const existing = Chart.getChart(canvas);
      if (existing) existing.destroy();
    }
    if (adminChartInstance) {
      try { adminChartInstance.destroy(); } catch (e) {}
      adminChartInstance = null;
      window.adminChartInstance = null;
    }
    return;
  }

  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js library is not yet loaded');
    return;
  }

  // Destroy previous chart instance before re-creating
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    try { existingChart.destroy(); } catch (e) {}
  }
  if (adminChartInstance) {
    try { adminChartInstance.destroy(); } catch (e) {}
    adminChartInstance = null;
    window.adminChartInstance = null;
  }

  const isBar = adminChartType === 'bar';
  const ctx = canvas.getContext('2d');

  adminChartInstance = new Chart(ctx, {
    type: adminChartType,
    data: {
      labels: labels,
      datasets: [{
        label: adminChartMetric === 'VOTE' ? 'คะแนนโหวต' : 'จำนวนสมาชิก',
        data: dataValues,
        backgroundColor: bgColors,
        borderColor: isBar ? bgColors : (isDark ? '#0f172a' : '#ffffff'),
        borderWidth: isBar ? 0 : 2,
        borderRadius: isBar ? 8 : 0,
        hoverOffset: isBar ? 0 : 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 350
      },
      cutout: adminChartType === 'doughnut' ? '65%' : undefined,
      plugins: {
        legend: {
          display: !isBar,
          position: 'bottom',
          labels: {
            color: textColor,
            font: { family: 'Prompt, sans-serif', size: 11 },
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12
          }
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDark ? '#ffffff' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 12,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              const sum = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : 0;
              const unit = adminChartMetric === 'VOTE' ? 'เสียง' : 'คน';
              return ` ${context.label}: ${val} ${unit} (${pct}%)`;
            }
          }
        }
      },
      scales: isBar ? {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Prompt, sans-serif', size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Prompt, sans-serif', size: 10 }, precision: 0 }
        }
      } : {}
    }
  });
  window.adminChartInstance = adminChartInstance;
}

// Window attachments
window.adminChartMetric = adminChartMetric;
window.adminChartType = adminChartType;
window.adminChartSelectedMotionId = adminChartSelectedMotionId;
window.adminChartInstance = adminChartInstance;
window.setAdminChartMetric = setAdminChartMetric;
window.setAdminChartType = setAdminChartType;
window.handleAdminChartMotionChange = handleAdminChartMotionChange;
window.renderAdminAnalyticsChart = renderAdminAnalyticsChart;
