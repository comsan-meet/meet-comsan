<?php
/**
 * COMSAN Meeting System - Universal Entry Point & Auto-Router for InfinityFree
 * 
 * Automatically detects file layout:
 * 1. Subfolder layout: htdocs/public/index.html
 * 2. Root layout: htdocs/index.html
 * 3. Shows live diagnostic file explorer if index.html is missing
 */

// Candidate locations for the web app index
$candidates = [
    'public/index.html'  => __DIR__ . '/public/index.html',
    'public/index.php'   => __DIR__ . '/public/index.php',
    'index.html'         => __DIR__ . '/index.html',
    'Public/index.html'  => __DIR__ . '/Public/index.html',
    'Public/index.php'   => __DIR__ . '/Public/index.php',
];

$activeAppUrl = null;
$activeAppPath = null;

foreach ($candidates as $url => $path) {
    if (file_exists($path)) {
        $activeAppUrl = $url;
        $activeAppPath = $path;
        break;
    }
}

// Fallback search: scan one level of subdirectories
if (!$activeAppUrl) {
    $subdirs = @glob(__DIR__ . '/*', GLOB_ONLYDIR);
    if ($subdirs) {
        foreach ($subdirs as $sd) {
            $checkHtml = $sd . '/index.html';
            $checkPhp  = $sd . '/index.php';
            if (file_exists($checkHtml)) {
                $activeAppUrl = basename($sd) . '/index.html';
                $activeAppPath = $checkHtml;
                break;
            } elseif (file_exists($checkPhp) && realpath($checkPhp) !== realpath(__FILE__)) {
                $activeAppUrl = basename($sd) . '/index.php';
                $activeAppPath = $checkPhp;
                break;
            }
        }
    }
}

// Direct routing if accessed normally (not in ?status=1 or ?diagnose=1 mode)
$isExplicitStatus = isset($_GET['status']) || isset($_GET['diagnose']);

if (!$isExplicitStatus && !isset($_GET['api']) && $activeAppUrl) {
    // If index.html is directly in root, serve it directly
    if ($activeAppUrl === 'index.html') {
        header('Content-Type: text/html; charset=utf-8');
        readfile($activeAppPath);
        exit;
    }
    // If in subfolder, redirect so browser resolves relative assets (css/js) correctly
    header("Location: " . $activeAppUrl);
    exit;
}

// Check Database Connection
$dbConnected = false;
$dbMessage = '';
$dbDetails = [];

$cfgPath = file_exists(__DIR__ . '/config.php') ? __DIR__ . '/config.php' : (file_exists(__DIR__ . '/public/config.php') ? __DIR__ . '/public/config.php' : null);

if ($cfgPath && file_exists($cfgPath)) {
    try {
        require_once $cfgPath;
        if (isset($pdo)) {
            $stmt = $pdo->query("SELECT VERSION() AS db_ver, DATABASE() AS cur_db");
            $info = $stmt->fetch();
            $dbConnected = true;
            $dbMessage = "เชื่อมต่อฐานข้อมูล MySQL / MariaDB สำเร็จ";
            $dbDetails = [
                'host' => defined('DB_HOST') ? DB_HOST : 'localhost',
                'database' => $info['cur_db'] ?? (defined('DB_NAME') ? DB_NAME : ''),
                'version' => $info['db_ver'] ?? 'Unknown'
            ];
        }
    } catch (Exception $e) {
        $dbConnected = false;
        $dbMessage = "ไม่สามารถเชื่อมต่อฐานข้อมูล: " . $e->getMessage();
    }
} else {
    $dbMessage = "ยังไม่พบไฟล์ config.php";
}

// Inspect current directory contents for diagnostics
$scannedItems = [];
$dirHandle = @opendir(__DIR__);
if ($dirHandle) {
    while (($file = readdir($dirHandle)) !== false) {
        if ($file !== '.' && $file !== '..') {
            $isDir = is_dir(__DIR__ . '/' . $file);
            $scannedItems[] = [
                'name' => $file,
                'isDir' => $isDir,
                'size' => $isDir ? '-' : round(filesize(__DIR__ . '/' . $file) / 1024, 1) . ' KB'
            ];
        }
    }
    closedir($dirHandle);
    usort($scannedItems, function($a, $b) {
        if ($a['isDir'] !== $b['isDir']) return $b['isDir'] - $a['isDir'];
        return strcmp($a['name'], $b['name']);
    });
}

// Check public/ folder contents if it exists
$publicItems = [];
if (is_dir(__DIR__ . '/public')) {
    $pHandle = @opendir(__DIR__ . '/public');
    if ($pHandle) {
        while (($pf = readdir($pHandle)) !== false) {
            if ($pf !== '.' && $pf !== '..') {
                $isDir = is_dir(__DIR__ . '/public/' . $pf);
                $publicItems[] = [
                    'name' => $pf,
                    'isDir' => $isDir,
                    'size' => $isDir ? '-' : round(filesize(__DIR__ . '/public/' . $pf) / 1024, 1) . ' KB'
                ];
            }
        }
        closedir($pHandle);
        usort($publicItems, function($a, $b) {
            if ($a['isDir'] !== $b['isDir']) return $b['isDir'] - $a['isDir'];
            return strcmp($a['name'], $b['name']);
        });
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COMSAN Meeting System - ตัวจัดการระบบและสถานะเซิร์ฟเวอร์</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Prompt', sans-serif; }
        code, pre { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-xl w-full bg-slate-800/90 border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
        <!-- Header -->
        <div class="flex items-center gap-4 border-b border-slate-700/60 pb-5">
            <div class="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-2xl font-bold shadow-inner shrink-0">
                CS
            </div>
            <div>
                <h1 class="text-xl sm:text-2xl font-bold text-white">COMSAN Meeting System</h1>
                <p class="text-xs text-slate-400">ระบบจัดการการประชุมชมรมสันทนาการ</p>
            </div>
        </div>

        <!-- Detection Status Alert -->
        <?php if ($activeAppUrl): ?>
            <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <span class="text-emerald-400 text-xl font-bold">✓</span>
                <div>
                    <h3 class="text-sm font-bold text-emerald-300">พบไฟล์ระบบประชุมเรียบร้อยแล้ว</h3>
                    <p class="text-xs text-slate-300 mt-0.5">
                        ตำแหน่งไฟล์: <code class="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono"><?php echo htmlspecialchars($activeAppUrl); ?></code>
                    </p>
                </div>
            </div>
        <?php else: ?>
            <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                <span class="text-rose-400 text-xl font-bold">✕</span>
                <div class="space-y-1">
                    <h3 class="text-sm font-bold text-rose-300">ยังตรวจไม่พบไฟล์ index.html ในเซิร์ฟเวอร์ (เป็นสาเหตุของ 404)</h3>
                    <p class="text-xs text-slate-300 leading-relaxed">
                        กรุณาตรวจสอบว่าได้อัปโหลดไฟล์ <code class="bg-slate-900 px-1.5 py-0.5 rounded text-rose-400 font-mono">index.html</code> เข้าไปในโฟลเดอร์ <code class="bg-slate-900 px-1.5 py-0.5 rounded font-mono">htdocs/public/</code> หรือ <code class="bg-slate-900 px-1.5 py-0.5 rounded font-mono">htdocs/</code> แล้วหรือยัง
                    </p>
                </div>
            </div>
        <?php endif; ?>

        <!-- Database Status Box -->
        <div class="p-4 rounded-2xl <?php echo $dbConnected ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-amber-500/10 border-amber-500/20'; ?> border space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-400">สถานะการเชื่อมต่อฐานข้อมูล MySQL:</span>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold <?php echo $dbConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'; ?>">
                    <?php echo $dbConnected ? 'เชื่อมต่อสำเร็จ (Connected)' : 'รอดำเนินการ (Pending)'; ?>
                </span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed font-mono"><?php echo htmlspecialchars($dbMessage); ?></p>
            <?php if ($dbConnected && !empty($dbDetails)): ?>
                <div class="pt-2 border-t border-slate-700/40 text-xs text-slate-400 space-y-1">
                    <div>Host: <span class="text-slate-200 font-mono"><?php echo htmlspecialchars($dbDetails['host']); ?></span></div>
                    <div>Database: <span class="text-slate-200 font-mono"><?php echo htmlspecialchars($dbDetails['database']); ?></span></div>
                    <div>MySQL Version: <span class="text-slate-200 font-mono"><?php echo htmlspecialchars($dbDetails['version']); ?></span></div>
                </div>
            <?php endif; ?>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2.5 pt-1">
            <?php if ($activeAppUrl): ?>
                <a href="<?php echo htmlspecialchars($activeAppUrl); ?>" class="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30">
                    <span>เข้าสู่ระบบ COMSAN Meeting</span>
                    <span>→</span>
                </a>
            <?php else: ?>
                <button type="button" disabled class="w-full py-3.5 px-4 rounded-xl bg-slate-700/50 text-slate-400 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                    <span>กำลังรอไฟล์ index.html บน Hosting...</span>
                </button>
            <?php endif; ?>
            
            <a href="index.php?status=1" class="w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-700/50 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                <span>🔄 รีเฟรชตรวจสอบสถานะไฟล์และฐานข้อมูล</span>
            </a>
        </div>

        <!-- Server File Explorer Diagnostic (Helps user instantly see missing files) -->
        <details class="text-xs bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 cursor-pointer">
            <summary class="font-bold text-slate-300 select-none flex items-center justify-between">
                <span>📁 รายชื่อไฟล์ที่เซิร์ฟเวอร์ตรวจพบในโฟลเดอร์นี้ (คลิกเพื่อดู)</span>
                <span class="text-slate-500 font-mono text-[11px]"><?php echo count($scannedItems); ?> รายการ</span>
            </summary>
            
            <div class="mt-3 space-y-3 font-mono text-[11px]">
                <div>
                    <span class="text-slate-400 font-semibold block mb-1">โฟลเดอร์หลัก (htdocs):</span>
                    <div class="max-h-36 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                        <?php foreach ($scannedItems as $it): ?>
                            <div class="flex items-center justify-between text-slate-300">
                                <span class="<?php echo $it['isDir'] ? 'text-indigo-400 font-bold' : ($it['name'] === 'index.html' ? 'text-emerald-400 font-bold' : ''); ?>">
                                    <?php echo $it['isDir'] ? '📁 ' : '📄 '; ?><?php echo htmlspecialchars($it['name']); ?>
                                </span>
                                <span class="text-slate-500 text-[10px]"><?php echo $it['size']; ?></span>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <?php if (!empty($publicItems)): ?>
                    <div>
                        <span class="text-slate-400 font-semibold block mb-1">โฟลเดอร์ htdocs/public:</span>
                        <div class="max-h-36 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                            <?php foreach ($publicItems as $pit): ?>
                                <div class="flex items-center justify-between text-slate-300">
                                    <span class="<?php echo $pit['isDir'] ? 'text-indigo-400 font-bold' : ($pit['name'] === 'index.html' ? 'text-emerald-400 font-bold' : ''); ?>">
                                        <?php echo $pit['isDir'] ? '📁 ' : '📄 '; ?><?php echo htmlspecialchars($pit['name']); ?>
                                    </span>
                                    <span class="text-slate-500 text-[10px]"><?php echo $pit['size']; ?></span>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </details>
    </div>
</body>
</html>
