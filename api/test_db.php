<?php
/**
 * Test MySQL / MariaDB Database Connection API
 * COMSAN Meeting System
 */

// Allow CORS for local development and cross-origin testing
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check for parameters from POST (JSON or form data) or GET
$rawInput = file_get_contents('php://input');
$jsonData = json_decode($rawInput, true);

$host = $jsonData['host'] ?? $_POST['host'] ?? $_GET['host'] ?? null;
$port = $jsonData['port'] ?? $_POST['port'] ?? $_GET['port'] ?? '3306';
$dbname = $jsonData['dbname'] ?? $_POST['dbname'] ?? $_GET['dbname'] ?? null;
$user = $jsonData['user'] ?? $_POST['user'] ?? $_GET['user'] ?? null;
$pass = $jsonData['pass'] ?? $_POST['pass'] ?? $_GET['pass'] ?? '';

// If no credentials supplied via request, try loading from config.php
if (!$host || !$dbname || !$user) {
    $cfgPath = file_exists(__DIR__ . '/config.php') ? __DIR__ . '/config.php' : (file_exists(__DIR__ . '/../config.php') ? __DIR__ . '/../config.php' : (file_exists(__DIR__ . '/../../config.php') ? __DIR__ . '/../../config.php' : null));
    if ($cfgPath) {
        require_once $cfgPath;
        $host = defined('DB_HOST') ? DB_HOST : 'localhost';
        $port = defined('DB_PORT') ? DB_PORT : '3306';
        $dbname = defined('DB_NAME') ? DB_NAME : 'comsan_meeting';
        $user = defined('DB_USER') ? DB_USER : 'root';
        $pass = defined('DB_PASS') ? DB_PASS : '';
    } else {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'กรุณาระบุข้อมูลการเชื่อมต่อ Host, Database Name และ Username'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Attempt PDO Connection
try {
    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5 // 5 seconds timeout
    ];

    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Test a basic query
    $stmt = $pdo->query("SELECT VERSION() AS db_version, DATABASE() AS current_db");
    $result = $stmt->fetch();

    echo json_encode([
        'status' => 'success',
        'message' => 'เชื่อมต่อฐานข้อมูล MySQL / MariaDB สำเร็จ!',
        'data' => [
            'host' => $host,
            'port' => $port,
            'database' => $result['current_db'] ?? $dbname,
            'version' => $result['db_version'] ?? 'Unknown',
            'connected_at' => date('Y-m-d H:i:s')
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    $errorMsg = $e->getMessage();
    
    // Provide friendly Thai troubleshooting hints
    $hint = '';
    if (strpos($errorMsg, 'Access denied') !== false) {
        $hint = ' (ชื่อผู้ใช้ Username หรือ รหัสผ่าน Password ไม่ถูกต้อง)';
    } elseif (strpos($errorMsg, 'Unknown database') !== false) {
        $hint = ' (ไม่พบชื่อฐานข้อมูลนี้ในเซิร์ฟเวอร์ กรุณาสร้าง Database ก่อนใน phpMyAdmin หรือ Control Panel)';
    } elseif (strpos($errorMsg, 'Connection refused') !== false || strpos($errorMsg, 'getaddrinfo failed') !== false) {
        $hint = ' (ไม่สามารถเชื่อมต่อไปยัง Host ที่ระบุได้ ตรวจสอบ Host และ Port หรือ MySQL service บนเซิร์ฟเวอร์)';
    }

    echo json_encode([
        'status' => 'error',
        'message' => 'เชื่อมต่อฐานข้อมูลล้มเหลว: ' . $errorMsg . $hint,
        'code' => $e->getCode()
    ], JSON_UNESCAPED_UNICODE);
}
