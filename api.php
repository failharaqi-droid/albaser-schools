<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$configFile = __DIR__ . '/hostinger-config.json';

function getDbConnection() {
    global $configFile;
    if (!file_exists($configFile)) {
        return null;
    }
    $config = json_decode(file_get_contents($configFile), true);
    if (!$config) return null;
    
    try {
        $pdo = new PDO("mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4", $config['user'], $config['password']);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS app_state (
          store_key VARCHAR(255) PRIMARY KEY,
          store_value LONGTEXT
        )");
        
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'health') {
    $pdo = getDbConnection();
    echo json_encode(['status' => 'ok', 'mode' => $pdo ? 'online' : (file_exists($configFile) ? 'error' : 'not_configured')]);
    exit();
}

if ($action === 'setup' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $host = $input['host'] ?? '';
    $user = $input['user'] ?? '';
    $password = $input['password'] ?? '';
    $database = $input['database'] ?? '';
    
    try {
        $pdo = new PDO("mysql:host={$host};dbname={$database};charset=utf8mb4", $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec("CREATE TABLE IF NOT EXISTS app_state (
          store_key VARCHAR(255) PRIMARY KEY,
          store_value LONGTEXT
        )");
        
        file_put_contents($configFile, json_encode([
            'host' => $host,
            'user' => $user,
            'password' => $password,
            'database' => $database
        ]));
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit();
}

if ($action === 'sync') {
    $pdo = getDbConnection();
    if (!$pdo) {
        http_response_code(400);
        echo json_encode(['error' => 'not_configured']);
        exit();
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->prepare("SELECT store_value FROM app_state WHERE store_key = 'main_db'");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            echo json_encode(['data' => json_decode($row['store_value'])]);
        } else {
            echo json_encode(['data' => null]);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = file_get_contents('php://input');
        $stmt = $pdo->prepare("INSERT INTO app_state (store_key, store_value) VALUES ('main_db', ?) ON DUPLICATE KEY UPDATE store_value = VALUES(store_value)");
        
        if ($stmt->execute([$data])) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save data']);
        }
    }
    exit();
}

http_response_code(404);
echo json_encode(['error' => 'Not found: ' . $action]);
