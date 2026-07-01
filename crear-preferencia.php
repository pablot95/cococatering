<?php
// Backend PHP para MercadoPago Checkout Pro.
// No confia en precios enviados desde el navegador: reconstruye el pago desde Firestore.

require_once __DIR__ . '/firebase-rest.php';

function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function set_cors_headers() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($origin) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        if ($originHost && strtolower($originHost) === strtolower($host)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
    }
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Content-Type: application/json");
}

function current_base_url() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    return $host ? "{$scheme}://{$host}" : '';
}

function same_host_url($url, $fallbackPath) {
    $base = current_base_url();
    if (!$base) return $fallbackPath;
    $fallback = $base . $fallbackPath;
    if (!$url) return $fallback;
    $parts = parse_url($url);
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (!$parts || empty($parts['host']) || strtolower($parts['host']) !== strtolower($host)) {
        return $fallback;
    }
    return $url;
}

function number_value($value) {
    if (is_numeric($value)) return (float)$value;
    return 0;
}

function sanitize_doc_id($id) {
    return preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)$id);
}

function product_collections() {
    return [
        'tortasClasicas', 'tortasDecoradas', 'fingersFrios', 'fingersCalientes',
        'boxSalados', 'boxDulces', 'shots', 'combosDulces', 'desayunos', 'menuEventos'
    ];
}

function normalize_name($name) {
    $name = strtolower(trim((string)$name));
    $name = preg_replace('/\s+/', ' ', $name);
    return str_replace(['–', '—'], '-', $name);
}

function find_catalog_product($item) {
    $id = sanitize_doc_id($item['id'] ?? '');
    $name = normalize_name($item['nombre'] ?? $item['name'] ?? '');

    foreach (product_collections() as $collection) {
        if ($id) {
            $product = firestore_get("{$collection}/{$id}");
            if ($product) return $product;
        }
    }

    if (!$name) return null;
    foreach (product_collections() as $collection) {
        foreach (firestore_list($collection) as $product) {
            $productName = normalize_name(($product['categoria'] ?? '') . ' ' . ($product['nombre'] ?? '') . ' ' . ($product['unidad'] ?? ''));
            if ($productName && strpos($productName, $name) !== false) return $product;
        }
    }
    return null;
}

function validate_catalog_total($order) {
    $productos = $order['productos'] ?? [];
    if (!$productos || !is_array($productos)) return null;

    $subtotal = 0;
    foreach ($productos as $item) {
        $product = find_catalog_product($item);
        if (!$product) return null;
        $price = number_value($product['precio'] ?? $product['price'] ?? 0);
        $qty = max(1, (int)number_value($item['cantidad'] ?? $item['quantity'] ?? 1));
        if ($price <= 0) return null;
        $subtotal += $price * $qty;
    }

    $envio = number_value($order['costoEnvio'] ?? 0);
    return (int)round($subtotal + max(0, $envio));
}

function load_payment_source($metadata) {
    $orderId = $metadata['firestore_order_id'] ?? $metadata['firestoreOrderId'] ?? null;
    $solicitudId = $metadata['solicitud_id'] ?? $metadata['solicitudId'] ?? null;

    if ($solicitudId) {
        $solicitud = firestore_get('solicitudes/' . sanitize_doc_id($solicitudId));
        if (!$solicitud || !in_array(($solicitud['status'] ?? ''), ['approved', 'paid'], true)) {
            json_response(['error' => 'La solicitud no existe o no esta aprobada para pago'], 400);
        }
        $total = (int)round(number_value($solicitud['total'] ?? $solicitud['subtotal'] ?? 0));
        if ($total <= 0) json_response(['error' => 'La solicitud no tiene un total valido'], 400);
        return [
            'total' => $total,
            'title' => 'Pedido Coco Catering ' . ($solicitud['codigo'] ?? $solicitudId),
            'external_reference' => $orderId ?: ('solicitud_' . sanitize_doc_id($solicitudId)),
            'metadata' => array_merge($metadata, [
                'solicitud_id' => $solicitudId,
                'service_id' => $metadata['service_id'] ?? $metadata['serviceId'] ?? ($solicitud['serviceId'] ?? '')
            ])
        ];
    }

    if (!$orderId) json_response(['error' => 'Falta referencia de orden para crear el pago'], 400);

    $order = firestore_get('orders/' . sanitize_doc_id($orderId));
    if (!$order) json_response(['error' => 'La orden no existe'], 400);

    if (!empty($order['solicitudId'])) {
        return load_payment_source(array_merge($metadata, ['solicitud_id' => $order['solicitudId']]));
    }

    $validatedTotal = validate_catalog_total($order);
    if (!$validatedTotal || $validatedTotal <= 0) {
        json_response(['error' => 'No se pudieron validar los productos del pedido'], 400);
    }

    return [
        'total' => $validatedTotal,
        'title' => 'Pedido Coco Catering',
        'external_reference' => $orderId,
        'metadata' => $metadata
    ];
}

set_cors_headers();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') json_response(['ok' => true]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['error' => 'Metodo no permitido'], 405);

$accessToken = coco_config_value('MP_ACCESS_TOKEN', '');
if (!$accessToken || strpos($accessToken, 'PEGAR_ACCESS_TOKEN') !== false) {
    json_response(['error' => 'Configuracion del servidor incompleta (MP_ACCESS_TOKEN)'], 500);
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);
if (!$data || !is_array($data)) json_response(['error' => 'No se recibieron datos JSON validos'], 400);

$metadata = isset($data['metadata']) && is_array($data['metadata']) ? $data['metadata'] : [];
$source = load_payment_source($metadata);
$base = current_base_url();

$preferenceData = [
    'items' => [[
        'title' => $source['title'],
        'quantity' => 1,
        'unit_price' => $source['total'],
        'currency_id' => 'ARS'
    ]],
    'payer' => $data['payer'] ?? [],
    'back_urls' => [
        'success' => same_host_url($data['back_urls']['success'] ?? '', '/html/success'),
        'failure' => same_host_url($data['back_urls']['failure'] ?? '', '/html/failure'),
        'pending' => same_host_url($data['back_urls']['pending'] ?? '', '/html/pending')
    ],
    'auto_return' => 'approved',
    'external_reference' => $source['external_reference'],
    'metadata' => $source['metadata']
];

if ($base) $preferenceData['notification_url'] = $base . '/mp-webhook.php';

$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => 'https://api.mercadopago.com/checkout/preferences',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
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

if ($err) {
    json_response(['error' => 'Error de conexion con MercadoPago: ' . $err], 500);
}

http_response_code($httpCode);
echo $response;
?>
