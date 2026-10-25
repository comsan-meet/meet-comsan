<?php
/**
 * COMSAN Meeting System - Real-time State Synchronization API (PHP Backend)
 * 
 * Supports:
 * 1. Action-based Realtime Mutations over GET and POST (Bypasses InfinityFree OpenResty 403 POST error)
 * 2. High-performance State Polling with Version Checking
 * 3. Automatic Recovery & State Initialization
 */

// Enable error reporting during execution but output only clean JSON
error_reporting(0);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$stateFile = __DIR__ . '/meeting_state.json';
$rootStateFile = file_exists(__DIR__ . '/meeting_state_v5.json')
    ? __DIR__ . '/meeting_state_v5.json'
    : (file_exists(__DIR__ . '/../meeting_state_v5.json') 
        ? __DIR__ . '/../meeting_state_v5.json' 
        : (file_exists(__DIR__ . '/../../meeting_state_v5.json') ? __DIR__ . '/../../meeting_state_v5.json' : null));

/**
 * Load current meeting state from meeting_state.json or fallback to root template
 */
function loadStateData($stateFile, $rootStateFile) {
    if (file_exists($stateFile)) {
        $content = @file_get_contents($stateFile);
        if ($content) {
            $data = json_decode($content, true);
            if ($data && isset($data['state']) && is_array($data['state'])) {
                return $data;
            }
        }
    }

    // Fallback: seed from root meeting_state_v5.json
    if ($rootStateFile && file_exists($rootStateFile)) {
        $content = @file_get_contents($rootStateFile);
        if ($content) {
            $data = json_decode($content, true);
            if ($data && is_array($data)) {
                $record = [
                    'state' => $data,
                    'version' => 1,
                    'updated_at' => round(microtime(true) * 1000)
                ];
                @file_put_contents($stateFile, json_encode($record, JSON_UNESCAPED_UNICODE));
                return $record;
            }
        }
    }

    // Default clean fallback
    $defaultState = [
        'meeting' => [
            'isStarted' => false,
            'isEnded' => false,
            'title' => 'การประชุมชมรมสันทนาการ (COMSAN)',
            'format' => 'ONSITE',
            'date' => date('Y-m-d'),
            'startTime' => '17:00',
            'lateTime' => '17:15',
            'endTime' => '19:00'
        ],
        'users' => [],
        'raiseHandQueue' => [],
        'motions' => [],
        'chats' => [],
        'chatLogs' => [],
        'files' => [],
        'calendarEvents' => [],
        'projects' => [],
        'randomizer' => ['lastWinner' => null, 'history' => []]
    ];
    $record = [
        'state' => $defaultState,
        'version' => 1,
        'updated_at' => round(microtime(true) * 1000)
    ];
    @file_put_contents($stateFile, json_encode($record, JSON_UNESCAPED_UNICODE));
    return $record;
}

/**
 * Save updated state record to disk
 */
function saveStateData($stateFile, $record) {
    $json = json_encode($record, JSON_UNESCAPED_UNICODE);
    return @file_put_contents($stateFile, $json) !== false;
}

/**
 * Apply meeting action to state (matches client-side ActionReducer)
 */
function applyServerAction(&$state, $action, $payload, $userId = null, $role = 'USER') {
    if (!is_array($state)) $state = [];
    if (!isset($state['users']) || !is_array($state['users'])) $state['users'] = [];
    if (!isset($state['motions']) || !is_array($state['motions'])) $state['motions'] = [];
    if (!isset($state['chats']) || !is_array($state['chats'])) $state['chats'] = [];
    if (!isset($state['files']) || !is_array($state['files'])) $state['files'] = [];
    if (!isset($state['raiseHandQueue']) || !is_array($state['raiseHandQueue'])) $state['raiseHandQueue'] = [];
    if (!isset($state['calendarEvents']) || !is_array($state['calendarEvents'])) $state['calendarEvents'] = [];
    if (!isset($state['meeting']) || !is_array($state['meeting'])) $state['meeting'] = [];

    $nowMs = round(microtime(true) * 1000);
    $todayISO = date('Y-m-d');
    $timeStr = date('H:i');

    switch ($action) {
        // --- 1. MEETING MANAGEMENT ---
        case 'admin:startMeeting':
            $info = is_array($payload) ? $payload : [];
            // Reset attendance
            foreach ($state['users'] as &$u) {
                $u['checkedIn'] = false;
                $u['checkInTimeStr'] = '-';
                $u['checkInTimestamp'] = null;
                $u['isLate'] = false;
                $u['isLeave'] = false;
                $u['leaveReason'] = '';
                $u['attendedMinutes'] = 0;
                $u['raiseHandCount'] = 0;
                $u['note'] = '';
                $u['noteSubmitted'] = false;
            }
            unset($u);

            $state['raiseHandQueue'] = [];
            $state['meeting']['isStarted'] = true;
            $state['meeting']['isEnded'] = false;
            $state['meeting']['startedAtMs'] = $nowMs;
            $state['meeting']['title'] = !empty($info['title']) ? trim($info['title']) : 'การประชุมชมรมสันทนาการ (COMSAN)';
            $state['meeting']['format'] = (!empty($info['format']) && $info['format'] === 'ONLINE') ? 'ONLINE' : 'ONSITE';
            $state['meeting']['date'] = !empty($info['date']) ? $info['date'] : $todayISO;
            $state['meeting']['startTime'] = !empty($info['startTime']) ? $info['startTime'] : '17:00';
            $state['meeting']['lateTime'] = !empty($info['lateTime']) ? $info['lateTime'] : '17:15';
            $state['meeting']['endTime'] = !empty($info['endTime']) ? $info['endTime'] : '19:00';
            if ($state['meeting']['format'] === 'ONLINE') {
                $state['meeting']['onlinePlatform'] = !empty($info['onlinePlatform']) ? $info['onlinePlatform'] : 'GOOGLE_MEET';
                $state['meeting']['onlineUrl'] = !empty($info['onlineUrl']) ? trim($info['onlineUrl']) : '';
                $state['meeting']['onlinePasscode'] = !empty($info['onlinePasscode']) ? trim($info['onlinePasscode']) : '';
            }
            break;

        case 'admin:endMeeting':
            $state['meeting']['isStarted'] = false;
            $state['meeting']['isEnded'] = true;
            $state['meeting']['endedAtMs'] = $nowMs;
            break;

        case 'admin:updateMeetingInfo':
            if (is_array($payload)) {
                foreach ($payload as $k => $v) {
                    $state['meeting'][$k] = $v;
                }
            }
            break;

        // --- 2. ATTENDANCE & CHECK-IN ---
        case 'admin:checkIn':
        case 'user:checkIn':
        case 'user:checkInWithAdminQr':
            $targetUid = is_array($payload) ? ($payload['userId'] ?? $userId) : ($payload ?: $userId);
            if ($targetUid) {
                $isLate = false;
                $lateTime = $state['meeting']['lateTime'] ?? '17:15';
                if ($timeStr > $lateTime) {
                    $isLate = true;
                }
                foreach ($state['users'] as &$u) {
                    if (strval($u['id'] ?? '') === strval($targetUid)) {
                        $u['checkedIn'] = true;
                        $u['checkInTimeStr'] = $timeStr;
                        $u['checkInTimestamp'] = $nowMs;
                        $u['isLate'] = $isLate;
                        $u['isLeave'] = false;
                        break;
                    }
                }
                unset($u);
            }
            break;

        case 'user:requestLeave':
            $targetUid = is_array($payload) ? ($payload['userId'] ?? $userId) : ($payload ?: $userId);
            $reason = is_array($payload) ? ($payload['reason'] ?? '') : '';
            if ($targetUid) {
                foreach ($state['users'] as &$u) {
                    if (strval($u['id'] ?? '') === strval($targetUid)) {
                        $u['isLeave'] = true;
                        $u['leaveReason'] = $reason;
                        break;
                    }
                }
                unset($u);
            }
            break;

        case 'user:updateNote':
            $targetUid = is_array($payload) ? ($payload['userId'] ?? $userId) : ($payload ?: $userId);
            $noteText = is_array($payload) ? ($payload['note'] ?? '') : '';
            if ($targetUid) {
                foreach ($state['users'] as &$u) {
                    if (strval($u['id'] ?? '') === strval($targetUid)) {
                        $u['note'] = $noteText;
                        $u['noteSubmitted'] = true;
                        break;
                    }
                }
                unset($u);
            }
            break;

        // --- 3. RAISE HAND QUEUE ---
        case 'user:raiseHand':
            $targetUid = is_array($payload) ? ($payload['userId'] ?? $userId) : ($payload ?: $userId);
            if ($targetUid) {
                $alreadyInQueue = false;
                foreach ($state['raiseHandQueue'] as $q) {
                    if (strval($q['userId'] ?? '') === strval($targetUid)) {
                        $alreadyInQueue = true;
                        break;
                    }
                }
                if (!$alreadyInQueue) {
                    $state['raiseHandQueue'][] = [
                        'userId' => $targetUid,
                        'timestamp' => $nowMs,
                        'timeStr' => $timeStr
                    ];
                }
                foreach ($state['users'] as &$u) {
                    if (strval($u['id'] ?? '') === strval($targetUid)) {
                        $u['raiseHandCount'] = ($u['raiseHandCount'] ?? 0) + 1;
                        break;
                    }
                }
                unset($u);
            }
            break;

        case 'user:lowerHand':
        case 'admin:lowerHand':
            $targetUid = is_array($payload) ? ($payload['userId'] ?? $userId) : ($payload ?: $userId);
            if ($targetUid) {
                $state['raiseHandQueue'] = array_values(array_filter($state['raiseHandQueue'], function ($q) use ($targetUid) {
                    return strval($q['userId'] ?? '') !== strval($targetUid);
                }));
            }
            break;

        // --- 4. CHAT SYSTEM ---
        case 'chat:send':
            if (is_array($payload) && (!empty($payload['text']) || !empty($payload['imgUrl']))) {
                if (empty($payload['id'])) {
                    $payload['id'] = 'msg_' . $nowMs . '_' . substr(md5(uniqid()), 0, 5);
                }
                if (empty($payload['timestamp'])) {
                    $payload['timestamp'] = $nowMs;
                }
                if (empty($payload['time'])) {
                    $payload['time'] = $timeStr;
                }
                $state['chats'][] = $payload;

                // Keep chat array within reasonable bounds (last 300 messages)
                if (count($state['chats']) > 300) {
                    $state['chats'] = array_slice($state['chats'], -300);
                }
            }
            break;

        case 'chat:delete':
            $msgId = is_array($payload) ? ($payload['msgId'] ?? $payload['id'] ?? '') : $payload;
            if ($msgId) {
                $state['chats'] = array_values(array_filter($state['chats'], function ($m) use ($msgId) {
                    return strval($m['id'] ?? '') !== strval($msgId);
                }));
            }
            break;

        case 'admin:clearChat':
            $state['chats'] = [];
            break;

        // --- 5. VOTING (MOTIONS) ---
        case 'voting:createMotion':
            if (is_array($payload)) {
                if (empty($payload['id'])) {
                    $payload['id'] = 'vote_' . $nowMs;
                }
                $payload['status'] = 'OPEN';
                $payload['createdAt'] = date('c');
                $state['motions'][] = $payload;
            }
            break;

        case 'voting:castVote':
            if (is_array($payload)) {
                $motionId = $payload['motionId'] ?? '';
                $optId = $payload['optionId'] ?? '';
                $voterId = $payload['userId'] ?? $userId;
                if ($motionId && $voterId) {
                    foreach ($state['motions'] as &$m) {
                        if (strval($m['id'] ?? '') === strval($motionId) && ($m['status'] ?? '') === 'OPEN') {
                            if (!isset($m['voters']) || !is_array($m['voters'])) $m['voters'] = [];
                            $m['voters'][$voterId] = $optId;
                            break;
                        }
                    }
                    unset($m);
                }
            }
            break;

        case 'voting:closeMotion':
            $motionId = is_array($payload) ? ($payload['motionId'] ?? $payload['id'] ?? '') : $payload;
            if ($motionId) {
                foreach ($state['motions'] as &$m) {
                    if (strval($m['id'] ?? '') === strval($motionId)) {
                        $m['status'] = 'CLOSED';
                        break;
                    }
                }
                unset($m);
            }
            break;

        case 'voting:reopenMotion':
            $motionId = is_array($payload) ? ($payload['motionId'] ?? $payload['id'] ?? '') : $payload;
            if ($motionId) {
                foreach ($state['motions'] as &$m) {
                    if (strval($m['id'] ?? '') === strval($motionId)) {
                        $m['status'] = 'OPEN';
                        break;
                    }
                }
                unset($m);
            }
            break;

        case 'voting:deleteMotion':
            $motionId = is_array($payload) ? ($payload['motionId'] ?? $payload['id'] ?? '') : $payload;
            if ($motionId) {
                $state['motions'] = array_values(array_filter($state['motions'], function ($m) use ($motionId) {
                    return strval($m['id'] ?? '') !== strval($motionId);
                }));
            }
            break;

        // --- 6. RANDOMIZER ---
        case 'admin:startRandomSpin':
            if (is_array($payload)) {
                $state['randomizer'] = $payload;
            }
            break;

        // --- 7. FILES ---
        case 'admin:togglePinFile':
            $fId = is_array($payload) ? ($payload['fileId'] ?? $payload['id'] ?? '') : $payload;
            if ($fId) {
                foreach ($state['files'] as &$f) {
                    if (strval($f['id'] ?? '') === strval($fId)) {
                        $f['pinned'] = empty($f['pinned']);
                        break;
                    }
                }
                unset($f);
            }
            break;

        case 'file:delete':
            $fId = is_array($payload) ? ($payload['fileId'] ?? $payload['id'] ?? '') : $payload;
            if ($fId) {
                $state['files'] = array_values(array_filter($state['files'], function ($f) use ($fId) {
                    return strval($f['id'] ?? '') !== strval($fId);
                }));
            }
            break;

        // --- 8. CALENDAR ---
        case 'admin:addCalendarEvent':
            if (is_array($payload)) {
                if (empty($payload['id'])) {
                    $payload['id'] = 'evt_' . $nowMs;
                }
                $state['calendarEvents'][] = $payload;
            }
            break;

        case 'admin:updateCalendarEvent':
            if (is_array($payload) && !empty($payload['id'])) {
                foreach ($state['calendarEvents'] as &$evt) {
                    if (strval($evt['id'] ?? '') === strval($payload['id'])) {
                        $evt = array_merge($evt, $payload);
                        break;
                    }
                }
                unset($evt);
            }
            break;

        case 'admin:deleteCalendarEvent':
            $evtId = is_array($payload) ? ($payload['eventId'] ?? $payload['id'] ?? '') : $payload;
            if ($evtId) {
                $state['calendarEvents'] = array_values(array_filter($state['calendarEvents'], function ($e) use ($evtId) {
                    return strval($e['id'] ?? '') !== strval($evtId);
                }));
            }
            break;

        // --- 9. PROJECTS MANAGEMENT ---
        case 'admin:createProject':
            if (is_array($payload)) {
                if (!isset($state['projects']) || !is_array($state['projects'])) {
                    $state['projects'] = [];
                }
                $targetId = !empty($payload['id']) ? trim(strval($payload['id'])) : ('PRJ-' . $nowMs . '-' . substr(md5(uniqid(mt_rand(), true)), 0, 4));
                $payload['id'] = $targetId;
                if (empty($payload['createdAt'])) {
                    $payload['createdAt'] = date('c');
                }
                $payload['updatedAt'] = date('c');

                $found = false;
                foreach ($state['projects'] as &$p) {
                    if (strval($p['id'] ?? '') === $targetId) {
                        $p = array_merge($p, $payload);
                        $found = true;
                        break;
                    }
                }
                unset($p);
                if (!$found) {
                    array_unshift($state['projects'], $payload);
                }

                // Deduplicate
                $uniquePrjs = [];
                $seenPIds = [];
                foreach ($state['projects'] as $prj) {
                    $pid = strval($prj['id'] ?? '');
                    if ($pid && !isset($seenPIds[$pid])) {
                        $seenPIds[$pid] = true;
                        $uniquePrjs[] = $prj;
                    }
                }
                $state['projects'] = $uniquePrjs;
            }
            break;

        case 'admin:updateProject':
            if (is_array($payload) && !empty($payload['id'])) {
                if (!isset($state['projects']) || !is_array($state['projects'])) {
                    $state['projects'] = [];
                }
                $targetId = trim(strval($payload['id']));
                $payload['updatedAt'] = date('c');

                $found = false;
                foreach ($state['projects'] as &$p) {
                    if (strval($p['id'] ?? '') === $targetId) {
                        $p = array_merge($p, $payload);
                        $found = true;
                        break;
                    }
                }
                unset($p);
                if (!$found) {
                    array_unshift($state['projects'], $payload);
                }

                // Deduplicate
                $uniquePrjs = [];
                $seenPIds = [];
                foreach ($state['projects'] as $prj) {
                    $pid = strval($prj['id'] ?? '');
                    if ($pid && !isset($seenPIds[$pid])) {
                        $seenPIds[$pid] = true;
                        $uniquePrjs[] = $prj;
                    }
                }
                $state['projects'] = $uniquePrjs;
            }
            break;

        case 'admin:deleteProject':
            $targetId = is_array($payload) ? ($payload['projectId'] ?? $payload['id'] ?? '') : $payload;
            if ($targetId && isset($state['projects']) && is_array($state['projects'])) {
                $targetId = trim(strval($targetId));
                $state['projects'] = array_values(array_filter($state['projects'], function ($p) use ($targetId) {
                    return strval($p['id'] ?? '') !== $targetId;
                }));
            }
            break;

        // --- 10. FULL OR PARTIAL STATE UPDATE ---
        case 'state:update':
        case 'state:save':
        case 'saveLocalState':
            if (is_array($payload) && isset($payload['meeting'])) {
                $state = $payload;
            }
            break;

        default:
            // Unhandled action
            break;
    }
}

// ----------------------------------------------------
// PROCESS INCOMING REQUEST
// ----------------------------------------------------

$action = null;
$payload = null;
$userId = null;
$role = 'USER';
$directState = null;

// A. Check POST body (JSON or Form)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    if ($rawInput) {
        $json = json_decode($rawInput, true);
        if ($json) {
            $action = $json['action'] ?? $json['act'] ?? null;
            $payload = $json['payload'] ?? $json['p'] ?? null;
            $userId = $json['userId'] ?? $json['u'] ?? null;
            $role = $json['role'] ?? $json['r'] ?? 'USER';
            if (isset($json['state']) && is_array($json['state'])) {
                $directState = $json['state'];
            }
            if (isset($json['chatMessage']) && is_array($json['chatMessage'])) {
                $action = 'chat:send';
                $payload = $json['chatMessage'];
            }
        }
    }
    if (!$action && !empty($_POST['action'])) {
        $action = $_POST['action'];
        $payload = !empty($_POST['payload']) ? (is_array($_POST['payload']) ? $_POST['payload'] : json_decode($_POST['payload'], true)) : null;
        $userId = $_POST['userId'] ?? null;
        $role = $_POST['role'] ?? 'USER';
    }
}

// B. Check GET query parameters (Critical for InfinityFree OpenResty 403 Bypass)
if (!$action && !empty($_GET['act'])) {
    $action = $_GET['act'];
    $userId = $_GET['u'] ?? null;
    $role = $_GET['r'] ?? 'USER';
    if (!empty($_GET['p'])) {
        $decoded = json_decode($_GET['p'], true);
        $payload = ($decoded !== null) ? $decoded : $_GET['p'];
    }
} elseif (!$action && !empty($_GET['action'])) {
    $action = $_GET['action'];
    $userId = $_GET['userId'] ?? null;
    $role = $_GET['role'] ?? 'USER';
    if (!empty($_GET['payload'])) {
        $decoded = json_decode($_GET['payload'], true);
        $payload = ($decoded !== null) ? $decoded : $_GET['payload'];
    }
}

// Load current state record
$currentRecord = loadStateData($stateFile, $rootStateFile);
$currentState = $currentRecord['state'] ?? [];
$currentVer = (int)($currentRecord['version'] ?? 1);
$nowMs = round(microtime(true) * 1000);

// If an action or direct state was provided, mutate and save
if ($directState !== null || $action !== null) {
    if ($directState !== null) {
        $currentState = $directState;
    }
    if ($action !== null) {
        applyServerAction($currentState, $action, $payload, $userId, $role);
    }

    $newVer = $currentVer + 1;
    $newRecord = [
        'state' => $currentState,
        'version' => $newVer,
        'updated_at' => $nowMs,
        'last_action' => $action ?: 'state:update'
    ];

    saveStateData($stateFile, $newRecord);

    echo json_encode([
        'status' => 'success',
        'version' => $newVer,
        'action' => $action,
        'updated_at' => $nowMs
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET State Query / Polling
$clientVer = isset($_GET['v']) ? (int)$_GET['v'] : 0;

if ($clientVer > 0 && $clientVer >= $currentVer) {
    echo json_encode([
        'status' => 'not_modified',
        'version' => $currentVer,
        'updated_at' => $currentRecord['updated_at'] ?? 0
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Return latest full state
echo json_encode([
    'status' => 'success',
    'version' => $currentVer,
    'updated_at' => $currentRecord['updated_at'] ?? 0,
    'state' => $currentState
], JSON_UNESCAPED_UNICODE);
