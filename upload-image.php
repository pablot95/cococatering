<?php
// upload-image.php - Sube imágenes a la carpeta /productos/

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No se recibió ningún archivo']);
    exit;
}

$file = $_FILES['image'];

// Validar tamaño (máx. 5 MB)
if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'El archivo supera los 5 MB']);
    exit;
}

// Validar tipo MIME
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Solo se permiten imágenes (jpg, png, webp, gif)']);
    exit;
}

// Sanitizar nombre de archivo (solo letras, números, guiones, puntos)
$originalName = basename($file['name']);
$safeName = preg_replace('/[^a-zA-Z0-9.\-_]/', '-', $originalName);

$destDir = __DIR__ . '/productos/';
if (!is_dir($destDir)) {
    mkdir($destDir, 0755, true);
}

$destPath = $destDir . $safeName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se pudo guardar el archivo']);
    exit;
}

echo json_encode(['success' => true, 'filename' => $safeName]);
