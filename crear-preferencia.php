<?php
// crear-preferencia.php
// Backend simple en PHP para MercadoPago (Ideal para Hostinger)

// Habilitar CORS para que funcione desde tu dominio
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Si es una petición OPTIONS (pre-vuelo del navegador), terminar aquí con éxito
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// =======================================================================
// 🔒 CONFIGURACIÓN DE SEGURIDAD
// =======================================================================
// IMPORTANTE: Reemplaza esto con tu ACCESS_TOKEN de producción de MercadoPago.
// Puedes encontrarlo en: https://www.mercadopago.com.ar/developers/panel
// Empieza con "APP_USR-..."
$accessToken = 'APP_USR-1994671338029929-121617-616567dcc8aed895c33977bb1eb37d82-2513559413'; 

// =======================================================================
// PROCESAMIENTO
// =======================================================================

// 1. Recibir los datos del carrito enviados desde checkout.js
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validar que llegaron datos
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibieron datos JSON válidos']);
    exit;
}

// 2. Preparar la estructura de datos tal cual la pide MercadoPago
// Documentación: https://www.mercadopago.com.ar/developers/es/reference/preferences/_checkout_preferences/post
$preferenceData = [
    'items' => $data['items'],
    'payer' => $data['payer'],
    'back_urls' => $data['back_urls'],
    'auto_return' => $data['auto_return'],
    'metadata' => isset($data['metadata']) ? $data['metadata'] : []
];

// 3. Enviar los datos a la API de MercadoPago usando cURL (desde el servidor)
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => 'https://api.mercadopago.com/checkout/preferences',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => json_encode($preferenceData),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $accessToken
    ],
]);

$response = curl_exec($curl);
$err = curl_error($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);

curl_close($curl);

// 4. Devolver la respuesta de MercadoPago a tu checkout.js
if ($err) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión con MercadoPago: ' . $err]);
} else {
    // Devolver exactamente lo que respondió MercadoPago (incluyendo el ID de preferencia)
    http_response_code($httpCode);
    echo $response;
}
?>