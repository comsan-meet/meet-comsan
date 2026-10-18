const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. First extract userDashboard content
const userDashboardMatch = html.match(/<div id="userDashboard"[^>]*>([\s\S]*?)<\/main>/i);
if (!userDashboardMatch) {
  console.error('Could not find userDashboard in index.html!');
  process.exit(1);
}
const userDashboardInner = userDashboardMatch[1];

// 2. Extract adminView content
const adminViewMatch = html.match(/<main id="adminView"[^>]*>([\s\S]*?)<\/main>/i);
if (!adminViewMatch) {
  console.error('Could not find adminView in index.html!');
  process.exit(1);
}
const adminViewInner = adminViewMatch[1];

// 3. Extract mobileBottomNav
const mobileNavMatch = html.match(/<nav id="mobileBottomNav"[\s\S]*?<\/nav>/i);
if (!mobileNavMatch) {
  console.error('Could not find mobileBottomNav in index.html!');
  process.exit(1);
}
const mobileBottomNavHtml = mobileNavMatch[0];

// 4. Extract PDF template
const pdfMatch = html.match(/<!-- HIDDEN PRINT TEMPLATE[\s\S]*?<\/div>\s*<\/div>/i);
const pdfTemplateHtml = pdfMatch ? pdfMatch[0] : '';

// 5. Extract all modals (from start of body to before TOP HEADER BAR)
const bodyStart = html.indexOf('<body');
const bodyTagEnd = html.indexOf('>', bodyStart) + 1;
const topHeaderComment = html.indexOf('<!-- ========================================================= -->\n  <!-- TOP HEADER BAR');
const modalsHtml = html.slice(bodyTagEnd, topHeaderComment).trim();

// 6. Settings Modal HTML (Choice Style)
const settingsModalHtml = `
  <!-- ========================================================= -->
  <!-- POP-UP MODAL 7: SETTINGS & THEME MODAL (Comsan Choice)    -->
  <!-- ========================================================= -->
  <div id="settingsModal" class="fixed inset-0 bg-background/80 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
    <div class="bg-card border border-border rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-card text-card-foreground space-y-6">
      <div class="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h2 class="text-2xl font-bold font-['Poppins']">ตั้งค่า</h2>
          <p class="text-xs text-muted-foreground mt-0.5">ปรับแต่งประสบการณ์ของคุณ</p>
        </div>
        <button type="button" onclick="closeSettingsModal()" class="w-8 h-8 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- รูปลักษณ์ (Appearance) -->
      <div class="space-y-3">
        <div>
          <h3 class="text-sm font-semibold text-foreground">รูปลักษณ์</h3>
          <p class="text-xs text-muted-foreground">เลือกธีมที่คุณต้องการ</p>
        </div>
        <div class="space-y-2">
          <div onclick="setAppearance('light')" id="appOpt_light" class="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <i class="fa-regular fa-sun text-sm text-foreground"></i>
            <span class="text-sm font-medium">สว่าง</span>
          </div>
          <div onclick="setAppearance('dark')" id="appOpt_dark" class="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <i class="fa-regular fa-moon text-sm text-foreground"></i>
            <span class="text-sm font-medium">มืด</span>
          </div>
          <div onclick="setAppearance('system')" id="appOpt_system" class="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <i class="fa-solid fa-desktop text-sm text-foreground"></i>
            <span class="text-sm font-medium">ตามระบบ</span>
          </div>
        </div>
      </div>

      <!-- ธีมสี (Color Theme) -->
      <div class="space-y-3">
        <div>
          <h3 class="text-sm font-semibold text-foreground">ธีมสี</h3>
          <p class="text-xs text-muted-foreground">เลือกชุดสีหลักของแอปพลิเคชัน</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div onclick="setColorPalette('default')" id="palOpt_default" class="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <span class="w-4 h-4 rounded-full bg-[#6366f1] shrink-0"></span>
            <span class="text-sm font-medium flex-1">น้ำเงินคราม (ค่าเริ่มต้น)</span>
            <i class="fa-solid fa-check text-xs text-primary hidden check-icon"></i>
          </div>
          <div onclick="setColorPalette('ocean')" id="palOpt_ocean" class="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <span class="w-4 h-4 rounded-full bg-[#0ea5e9] shrink-0"></span>
            <span class="text-sm font-medium flex-1">ฟ้าทะเล</span>
            <i class="fa-solid fa-check text-xs text-primary hidden check-icon"></i>
          </div>
          <div onclick="setColorPalette('emerald')" id="palOpt_emerald" class="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <span class="w-4 h-4 rounded-full bg-[#10b981] shrink-0"></span>
            <span class="text-sm font-medium flex-1">เขียวมรกต</span>
            <i class="fa-solid fa-check text-xs text-primary hidden check-icon"></i>
          </div>
          <div onclick="setColorPalette('violet')" id="palOpt_violet" class="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <span class="w-4 h-4 rounded-full bg-[#8b5cf6] shrink-0"></span>
            <span class="text-sm font-medium flex-1">ม่วงไวโอเลต</span>
            <i class="fa-solid fa-check text-xs text-primary hidden check-icon"></i>
          </div>
          <div onclick="setColorPalette('rose')" id="palOpt_rose" class="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <span class="w-4 h-4 rounded-full bg-[#f43f5e] shrink-0"></span>
            <span class="text-sm font-medium flex-1">ชมพูกุหลาบ</span>
            <i class="fa-solid fa-check text-xs text-primary hidden check-icon"></i>
          </div>
          <div onclick="setColorPalette('amber')" id="palOpt_amber" class="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <span class="w-4 h-4 rounded-full bg-[#f59e0b] shrink-0"></span>
            <span class="text-sm font-medium flex-1">ส้มอำพัน</span>
            <i class="fa-solid fa-check text-xs text-primary hidden check-icon"></i>
          </div>
        </div>
      </div>

      <!-- ภาษา (Language) -->
      <div class="space-y-3">
        <div>
          <h3 class="text-sm font-semibold text-foreground">ภาษา</h3>
          <p class="text-xs text-muted-foreground">เลือกภาษาที่คุณต้องการ</p>
        </div>
        <div class="space-y-2">
          <div class="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition">
            <i class="fa-solid fa-language text-sm text-foreground"></i>
            <span class="text-sm font-medium">English (อังกฤษ)</span>
          </div>
          <div class="flex items-center gap-3 p-3.5 rounded-xl border-2 border-primary bg-primary/5 text-primary cursor-pointer transition">
            <i class="fa-solid fa-language text-sm text-primary"></i>
            <span class="text-sm font-medium">ไทย</span>
          </div>
        </div>
      </div>

      <!-- เกี่ยวกับ (About) -->
      <div class="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
        <h3 class="text-sm font-semibold text-foreground">เกี่ยวกับ</h3>
        <p class="text-xs text-muted-foreground">Meeting by Comsan เวอร์ชัน 2.0.1</p>
        <p class="text-xs text-muted-foreground/80 pt-1">แพลตฟอร์มการประชุมและการลงมติที่ทันสมัยสำหรับชมรมและองค์กร • เครือข่ายชมรมคมสัน</p>
      </div>
    </div>
  </div>
`;

// 7. Standalone Auth Screen (Choice Auth)
const authScreenHtml = `
  <!-- ========================================================= -->
  <!-- 1. STANDALONE AUTH SCREEN (Matching choice_auth.png 100%) -->
  <!-- ========================================================= -->
  <div id="authScreen" class="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 transition-colors select-none">
    <div class="w-full max-w-md space-y-6">
      <!-- Centered Squircle Brand Header -->
      <div class="text-center space-y-2">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs mb-1">
          <i class="fa-solid fa-users text-2xl"></i>
        </div>
        <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground font-['Poppins']">Meeting</h1>
        <p class="text-sm text-muted-foreground">ยินดีต้อนรับกลับสู่ Meeting</p>
      </div>

      <!-- Auth Card -->
      <div class="bg-card text-card-foreground border border-border/80 rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
        <div class="space-y-1">
          <h2 class="text-xl font-bold text-foreground">เข้าสู่ระบบบัญชีของคุณ</h2>
          <p class="text-xs sm:text-sm text-muted-foreground">กรอกข้อมูลเพื่อเข้าสู่การประชุม</p>
        </div>

        <form onsubmit="handleUserLogin(event)" class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-foreground">ชื่อเล่น หรือ รหัสนักศึกษา</label>
            <input type="text" id="userLoginName" placeholder="เช่น แมทธิว, ชิเชียร์, น้ำหวาน หรือ รหัสนักศึกษา" required
              class="w-full h-11 px-3.5 py-2 rounded-xl bg-background/50 border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all" />
          </div>
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-foreground">รหัสผ่าน</label>
            <input type="password" id="userLoginPass" placeholder="กรอกรหัสผ่านของคุณ" required
              class="w-full h-11 px-3.5 py-2 rounded-xl bg-background/50 border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all" />
          </div>
          <p id="userLoginError" class="text-xs text-destructive hidden font-medium">ไม่พบชื่อผู้ใช้งาน หรือรหัสผ่านไม่ถูกต้อง!</p>
          <button type="submit" class="w-full h-11 px-4 py-2 font-medium text-white shadow-xs rounded-xl gradient-primary transition-all duration-200 active:scale-[0.98] mt-2">
            เข้าสู่ระบบ
          </button>
          <button type="button" onclick="requestAdminAccess()" class="w-full text-center text-xs text-primary hover:underline font-medium pt-2 transition">
            เข้าสู่ระบบในฐานะผู้ดูแลระบบ (ADMIN) ?
          </button>
        </form>
      </div>

      <!-- Auth Footer -->
      <div class="text-center space-y-2 text-xs text-muted-foreground pt-2">
        <p>หากพบปัญหาในการใช้งาน ติดต่อที่ <a href="mailto:comsan.choice@gmail.com" class="text-primary hover:underline font-medium">comsan.choice@gmail.com</a> หรือพี่แมทธิว</p>
        <p class="text-[11px] opacity-75">© 2026 Meeting by Comsan. สงวนลิขสิทธิ์ • ในเครือเดียวกับ Choice by Comsan</p>
      </div>
    </div>
  </div>
`;

// 8. Main App Workspace Layout (Choice Layout)
const appLayoutHtml = `
  <!-- ========================================================= -->
  <!-- 2. MAIN APP WORKSPACE (Matching comsan-choice.vercel.app) -->
  <!-- ========================================================= -->
  <div id="appLayout" class="min-h-screen bg-background text-foreground flex flex-col md:flex-row hidden">
    <!-- MOBILE BACKDROP -->
    <div id="sidebarBackdrop" onclick="closeMobileSidebar()" class="fixed inset-0 bg-black/60 z-30 hidden md:hidden"></div>

    <!-- MOBILE HEADER (Sticky Top Bar on mobile) -->
    <header id="mobileHeader" class="md:hidden sticky top-0 z-30 px-4 py-3 border-b border-border bg-card/85 backdrop-blur-md flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-xs">
          <i class="fa-solid fa-users text-xs"></i>
        </div>
        <div>
          <h1 class="text-xl font-bold font-['Poppins'] text-foreground leading-tight">Meeting</h1>
          <p class="text-[10px] text-muted-foreground">ระบบจัดการประชุม • คมสัน</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
          <button type="button" onclick="switchRoleView('USER')" id="btnRoleUserMobile" class="px-2 py-1 rounded text-xs font-semibold gradient-primary text-white">
            <i class="fa-regular fa-user"></i>
          </button>
          <button type="button" onclick="requestAdminAccess()" id="btnRoleAdminMobile" class="px-2 py-1 rounded text-xs font-semibold text-muted-foreground hover:text-foreground">
            <i class="fa-solid fa-user-shield"></i>
          </button>
        </div>
        <button type="button" onclick="toggleTheme()" class="h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center shadow-xs">
          <i class="fa-regular fa-moon text-xs"></i>
        </button>
        <button type="button" onclick="openSettingsModal()" class="h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center shadow-xs">
          <i class="fa-solid fa-gear text-xs"></i>
        </button>
      </div>
    </header>

    <!-- DESKTOP SIDEBAR (<aside>) -->
    <aside id="appSidebar" class="hidden md:flex flex-col w-64 lg:w-72 shrink-0 border-r border-border bg-card/85 backdrop-blur-md sticky top-0 h-screen z-40 select-none justify-between transition-colors">
      <div class="p-4 space-y-4 overflow-y-auto">
        <!-- Logo & Brand Header -->
        <div class="flex items-center gap-3 px-2 py-1.5 cursor-pointer select-none" onclick="switchUserTab('HOME')">
          <div class="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-xs shrink-0">
            <i class="fa-solid fa-users text-sm"></i>
          </div>
          <div class="flex flex-col min-w-0">
            <h1 class="font-['Poppins'] font-medium text-2xl leading-tight text-foreground">Meeting</h1>
            <p class="text-xs text-muted-foreground mt-0.5 truncate">ระบบจัดการประชุม • คมสัน</p>
          </div>
        </div>

        <!-- Quick Action Button (Choice style) -->
        <button type="button" onclick="handleSidebarQuickAction()" class="inline-flex items-center whitespace-nowrap text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border hover:bg-muted/80 w-full justify-between gap-2 bg-card text-foreground border-border shadow-2xs rounded-xl py-2.5 h-11 px-3.5 font-medium transition-colors">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-plus text-primary text-xs"></i>
            <span id="sidebarQuickActionText">สร้างวาระ / ยกมือ</span>
          </div>
          <i class="fa-solid fa-chevron-right text-muted-foreground/60 text-xs"></i>
        </button>

        <!-- Live Meeting Status Box -->
        <div class="sidebar-detail-box p-3.5 rounded-xl gradient-primary text-white space-y-2 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-white/80 uppercase tracking-wider">สถานะการประชุม</span>
            <span id="sidebarPulseDot" class="w-2 h-2 rounded-full bg-white/60"></span>
          </div>
          <p id="meetingStateBadge" class="text-xs font-bold text-white">การประชุมยังไม่เริ่ม</p>
          <div class="grid grid-cols-2 gap-1.5 pt-1 text-center">
            <div class="bg-white/10 p-1.5 rounded-lg backdrop-blur-xs">
              <p class="text-[10px] text-white/80">เริ่มไปแล้ว</p>
              <p id="sidebarMeetingElapsed" class="text-xs font-bold text-emerald-200">ยังไม่เริ่ม</p>
            </div>
            <div class="bg-white/10 p-1.5 rounded-lg backdrop-blur-xs">
              <p class="text-[10px] text-white/80">เวลาตัดสาย</p>
              <p id="sidebarCutoffTime" class="text-xs font-bold text-amber-200">17:15 น.</p>
            </div>
          </div>
        </div>

        <!-- User Nav Menu -->
        <div id="sidebarUserMenu" class="space-y-1">
          <div class="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">เมนูหลัก</div>
          <a onclick="switchUserTab('HOME')" id="uNav_HOME" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-primary/10 text-primary transition-colors cursor-pointer group">
            <i class="fa-solid fa-house h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">หน้าหลัก</span>
          </a>
          <a onclick="switchUserTab('HOME'); switchUserToolSubTab('SEATS');" id="uNav_SEATS" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-solid fa-users h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">ผังที่นั่ง & สมาชิก</span>
          </a>
          <a onclick="switchUserTab('VOTE')" id="uNav_VOTE" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-solid fa-check-to-slot h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">การลงมติ (โหวต)</span>
            <span id="uBadge_VOTE" class="ml-auto px-2 py-0.5 text-[11px] rounded-full bg-primary/10 text-primary font-semibold">0</span>
          </a>
          <a onclick="switchUserTab('RAISE')" id="uNav_RAISE" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-regular fa-hand h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">ยกมือขอพูด</span>
            <span id="uBadge_RAISE" class="ml-auto hidden px-2 py-0.5 text-[10px] rounded-full bg-emerald-500 text-white font-bold">ในคิว</span>
          </a>
          <a onclick="switchUserTab('HOME'); switchUserToolSubTab('FILES');" id="uNav_FILES" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-regular fa-folder-open h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">เอกสารการประชุม</span>
          </a>
          <a onclick="switchUserTab('CHAT')" id="uNav_CHAT" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-regular fa-comment-dots h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">แชทห้องประชุม</span>
            <span id="uBadge_CHAT" class="ml-auto hidden px-2 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-bold">ใหม่</span>
          </a>
          <a onclick="switchUserTab('PROFILE')" id="uNav_PROFILE" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-regular fa-user h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">โปรไฟล์</span>
          </a>
        </div>

        <!-- Admin Nav Menu -->
        <div id="sidebarAdminMenu" class="hidden space-y-1">
          <div class="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">ระบบจัดการ</div>
          <a onclick="switchAdminTab('DASHBOARD')" id="aNav_DASHBOARD" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-primary/10 text-primary transition-colors cursor-pointer group">
            <i class="fa-solid fa-table-cells h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">Dashboard ภาพรวม</span>
          </a>
          <a onclick="switchAdminTab('CHECKIN')" id="aNav_CHECKIN" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-solid fa-qrcode h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">ตั้งค่า & เช็คชื่อ</span>
          </a>
          <a onclick="switchAdminTab('VOTING')" id="aNav_VOTING" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-solid fa-hand h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">การโหวต & คิวยกมือ</span>
            <span id="aBadge_QUEUE" class="ml-auto px-2 py-0.5 text-[10px] rounded-full bg-amber-500 text-slate-950 font-bold">0</span>
          </a>
          <a onclick="switchAdminTab('RANDOM')" id="aNav_RANDOM" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-solid fa-dharmachakra h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">สุ่มหรรษา</span>
          </a>
          <a onclick="switchAdminTab('STREAM')" id="aNav_STREAM" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-solid fa-tv h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">การถ่ายทอดสด</span>
          </a>
          <a onclick="switchAdminTab('FILES')" id="aNav_FILES" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-solid fa-folder-open h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">เอกสารแนบ</span>
          </a>
          <a onclick="switchAdminTab('CHAT')" id="aNav_CHAT" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-regular fa-comments h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">แชทห้องประชุม</span>
            <span id="aBadge_CHAT" class="ml-auto hidden px-2 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-bold">ใหม่</span>
          </a>
          <a onclick="switchAdminTab('SUMMARY')" id="aNav_SUMMARY" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-solid fa-clipboard-check h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">สรุปผลประชุม</span>
          </a>
          <a onclick="switchAdminTab('MEMBERS')" id="aNav_MEMBERS" class="sidebar-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer group">
            <i class="fa-solid fa-file-excel h-4 w-4 shrink-0 transition-transform group-hover:scale-105"></i>
            <span class="truncate">นำเข้าสมาชิก & โน้ต</span>
          </a>
        </div>
      </div>

      <!-- Aside Footer: Profile Card + Utility Toolbar (Choice Style) -->
      <div class="p-3 border-t border-border/60 bg-muted/20 space-y-2">
        <div onclick="switchUserTab('PROFILE')" class="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-muted/60 transition-all border border-border/40 bg-card/60 shadow-2xs group">
          <span class="relative flex overflow-hidden rounded-full h-9 w-9 border border-background shadow-xs shrink-0 bg-primary/10 text-primary items-center justify-center font-bold text-xs" id="sidebarAvatarContainer">
            <span id="sidebarUserInitials">U</span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1">
              <span class="text-sm font-medium text-foreground truncate block" id="sidebarProfileName">ผู้ใช้งาน</span>
              <i class="fa-solid fa-circle-check text-primary text-xs shrink-0" id="sidebarVerifiedIcon"></i>
            </div>
            <p class="text-[11px] text-muted-foreground truncate" id="sidebarProfileRole">ผู้เข้าร่วมประชุม</p>
          </div>
          <i class="fa-solid fa-chevron-right text-muted-foreground/60 text-xs group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0"></i>
        </div>

        <!-- Toolbar row -->
        <div class="flex items-center justify-between pt-1 px-1">
          <div class="flex items-center gap-1">
            <button type="button" onclick="openSettingsModal()" class="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer" title="ตั้งค่าระบบ">
              <i class="fa-solid fa-gear text-xs"></i>
            </button>
            <button type="button" onclick="toggleTheme()" class="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer" title="เปลี่ยนธีม">
              <i id="sidebarThemeIcon" class="fa-regular fa-moon text-xs"></i>
            </button>
            <button type="button" onclick="showToast('ภาษาปัจจุบัน: ไทย (TH)', 'info')" class="h-8 px-2 inline-flex items-center justify-center rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer" title="เปลี่ยนภาษา">
              TH
            </button>
          </div>
          <button type="button" onclick="logoutUser()" class="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer" title="ออกจากระบบ">
            <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
          </button>
        </div>
      </div>
    </aside>

    <!-- MAIN CONTENT COLUMN -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Desktop Page Title & Top Actions Header (Choice layout) -->
      <div id="desktopMainHeader" class="hidden md:flex pt-6 pb-2 px-6 lg:px-8 items-center justify-between">
        <div>
          <h1 class="text-3xl font-medium font-['Poppins'] text-foreground tracking-tight" id="desktopHeadingTitle">Meeting</h1>
          <p class="text-sm text-muted-foreground mt-1" id="desktopHeadingSubtitle">ระบบจัดการประชุม • คมสัน</p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Switch Role Pill Button (User <-> Admin) -->
          <div class="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
            <button type="button" onclick="switchRoleView('USER')" id="btnRoleUser" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition gradient-primary text-white shadow-xs">
              <i class="fa-regular fa-user mr-1"></i> <span>สมาชิก</span>
            </button>
            <button type="button" onclick="requestAdminAccess()" id="btnRoleAdmin" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition text-muted-foreground hover:text-foreground">
              <i class="fa-solid fa-user-shield mr-1"></i> <span>ADMIN</span>
            </button>
          </div>
          <!-- Action Buttons (Choice style) -->
          <button type="button" onclick="openSettingsModal()" class="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted/80 text-foreground transition shadow-2xs" title="ตั้งค่าระบบและธีมสี">
            <i class="fa-solid fa-palette text-xs"></i>
          </button>
          <button type="button" onclick="emergencyResetCache()" class="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted/80 text-foreground transition shadow-2xs" title="รีเฟรชข้อมูล">
            <i class="fa-solid fa-rotate text-xs"></i>
          </button>
        </div>
      </div>

      <!-- MAIN SCROLLABLE CONTENT WORKSPACE -->
      <div class="main-content-container flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-2 pb-24 md:pb-10">
        <main id="userView" class="max-w-4xl mx-auto w-full">
          <!-- User Dashboard -->
          <div id="userDashboard" class="space-y-5">
            ${userDashboardInner}
          </div>
        </main>
        <main id="adminView" class="hidden max-w-5xl mx-auto w-full space-y-6">
          ${adminViewInner}
        </main>
      </div>
    </div>

    <!-- Mobile Bottom Navigation (Choice Style) -->
    ${mobileBottomNavHtml}
  </div>
`;

// Extract scripts at the end of the file
const scriptStart = html.indexOf('<!-- ======================================================== -->\n  <!-- MODULAR JAVASCRIPT ARCHITECTURE');
const scriptsHtml = html.slice(scriptStart);

// Construct new full HTML
const headPart = html.slice(0, bodyTagEnd);

const fullNewHtml = `${headPart}
${modalsHtml}
${settingsModalHtml}
${authScreenHtml}
${appLayoutHtml}
${pdfTemplateHtml}
${scriptsHtml}`;

fs.writeFileSync(indexPath, fullNewHtml, 'utf8');
console.log('Successfully refactored public/index.html to Choice architecture! File size:', fullNewHtml.length);
