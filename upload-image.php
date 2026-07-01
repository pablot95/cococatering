<?php
// Sube imagenes a /productos/. Requiere usuario autenticado en Firebase Auth.

require_once __DIR__ . '/firebase-rest.php';

function upload_json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function upload_set_headers() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($origin) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        if ($originHost && strtolower($originHost) === strtolower($host)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
    }
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Content-Type: application/json');
}

function bearer_token() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $header, $m)) return trim($m[1]);
    return '';
}

function require_firebase_user() {
    $token = bearer_token();
    if (!$token) upload_json(['success' => false, 'error' => 'No autorizado'], 401);

    $url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . urlencode(firestore_api_key());
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['idToken' => $token])
    ]);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $payload = json_decode($response, true);
    if ($code < 200 || $code >= 300 || empty($payload['users'][0]['localId'])) {
        upload_json(['success' => false, 'error' => 'Sesion invalida'], 401);
    }
    return $payload['users'][0];
}

upload_set_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') upload_json(['success' => true]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') upload_json(['success' => false, 'error' => 'Metodo no permitido'], 405);

require_firebase_user();

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    upload_json(['success' => false, 'error' => 'No se recibio ningun archivo'], 400);
}

$file = $_FILES['image'];
if ($file['size'] > 5 * 1024 * 1024) {
    upload_json(['success' => false, 'error' => 'El archivo supera los 5 MB'], 400);
}

$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!isset($allowedTypes[$mimeType])) {
    upload_json(['success' => false, 'error' => 'Solo se permiten imagenes jpg, png, webp o gif'], 400);
}

$safeName = time() . '_' . substr(hash('sha256', uniqid('', true)), 0, 12) . '.' . $allowedTypes[$mimeType];
$destDir = __DIR__ . '/productos/';
if (!is_dir($destDir) && !mkdir($destDir, 0755, true)) {
    upload_json(['success' => false, 'error' => 'No se pudo crear la carpeta de destino'], 500);
}

$destPath = $destDir . $safeName;
if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    upload_json(['success' => false, 'error' => 'No se pudo guardar el archivo'], 500);
}

upload_json(['success' => true, 'filename' => $safeName]);
?>
