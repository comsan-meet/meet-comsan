<?php
/**
 * COMSAN Meeting System - Public Entry Point
 * Automatically serves index.html on Apache/InfinityFree
 * Prevents 403 Forbidden directory listing errors
 */

header('Content-Type: text/html; charset=utf-8');

$htmlFile = __DIR__ . '/index.html';
if (file_exists($htmlFile)) {
    readfile($htmlFile);
    exit;
} else {
    http_response_code(404);
    echo "<h1>COMSAN Meeting System</h1><p>index.html not found in public directory.</p>";
    exit;
}
