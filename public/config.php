<?php
/**
 * Database Configuration (config.php)
 * ระบบจัดการฐานข้อมูล COMSAN Meeting System
 */

// กำหนด Timezone สำหรับประเทศไทย
date_default_timezone_set('Asia/Bangkok');

// ข้อมูลการเชื่อมต่อฐานข้อมูล
define('DB_HOST', 'sql204.infinityfree.com');          // Hostname (เช่น localhost หรือ 127.0.0.1)
define('DB_PORT', '3306');               // Port (ปกติคือ 3306)
define('DB_NAME', 'if0_43235981_meet');     // ชื่อฐานข้อมูล
define('DB_USER', 'if0_43235981');               // ชื่อผู้ใช้งาน (XAMPP ค่าเริ่มต้นคือ root)
define('DB_PASS', 'meet2026');                   // รหัสผ่าน (XAMPP ค่าเริ่มต้นจะว่างไว้)
define('DB_CHARSET', 'utf8mb4');         // รองรับภาษาไทยและ Emoji แบบสมบูรณ์

// ========================================================
// การเชื่อมต่อผ่าน PDO
// ========================================================
$pdo = null;
$conn = null;

try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,        // แจ้งเตือนข้อผิดพลาดเป็น Exception
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,              // คืนค่าผลลัพธ์เป็น Associative Array
        PDO::ATTR_EMULATE_PREPARES   => false,                         // ปิด Emulate เพื่อความปลอดภัยสูงสุด
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET     // บังคับเข้ารหัสภาษาไทย
    ];

    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    $conn = $pdo;

} catch (PDOException $e) {
    error_log("Database Connection Error: " . $e->getMessage());
    $pdo = null;
    $conn = null;
}

// ฟังก์ชันช่วยเหลือสำหรับ Response JSON (สำหรับทำ API)
if (!function_exists('jsonResponse')) {
    function jsonResponse($status, $message, $data = null, $code = 200) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => $status,
            'message' => $message,
            'data' => $data
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
