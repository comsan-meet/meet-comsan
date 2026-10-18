const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Settings Modal HTML
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

// Insert settingsModal right after adminLoginModal
if (!html.includes('id="settingsModal"')) {
  html = html.replace('<!-- ========================================================= -->\n  <!-- TOP HEADER BAR', `${settingsModalHtml}\n\n  <!-- ========================================================= -->\n  <!-- TOP HEADER BAR`);
}

// 2. Standalone Auth Screen HTML
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

// Replace old header and outer layout with Choice layout
// Let's find header start:
const headerStart = html.indexOf('<!-- TOP HEADER BAR');
const userDashboardStart = html.indexOf('<div id="userDashboard"');

if (headerStart !== -1 && userDashboardStart !== -1) {
  // Let's see what is between headerStart and userDashboardStart
  console.log('Found layout anchors:', headerStart, userDashboardStart);
}

fs.writeFileSync('scripts/choice_refactored_preview.txt', 'OK');
console.log('Script setup completed!');
