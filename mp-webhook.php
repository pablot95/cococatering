<?php
require_once __DIR__ . '/firebase-rest.php';

header("Content-Type: application/json");

function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function now_timestamp() {
    return ['__timestamp' => gmdate('c')];
}

function safe_id($value) {
    return preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)$value);
}

function number_or_zero($value) {
    return is_numeric($value) ? (float)$value : 0;
}

function product_collections_for_webhook() {
    return [
        'tortasClasicas', 'tortasDecoradas', 'fingersFrios', 'fingersCalientes',
        'boxSalados', 'boxDulces', 'shots', 'combosDulces', 'desayunos', 'menuEventos'
    ];
}

function find_product_path($productId) {
    $safe = safe_id($productId);
    if (!$safe) return null;
    foreach (product_collections_for_webhook() as $collection) {
        $product = firestore_get("{$collection}/{$safe}");
        if ($product) return "{$collection}/{$safe}";
    }
    return null;
}

function debit_stock_once($orderId, $order, $paymentId) {
    if (!$orderId || !$order || (($order['stockDebitedPaymentId'] ?? '') === (string)$paymentId)) return;
    $productos = $order['productos'] ?? [];
    if (!$productos || !is_array($productos)) return;

    foreach ($productos as $item) {
        $path = find_product_path($item['id'] ?? '');
        if (!$path) continue;
        $product = firestore_get($path);
        if (!$product || !isset($product['stock']) || !is_numeric($product['stock'])) continue;

        $qty = max(1, (int)number_or_zero($item['cantidad'] ?? $item['quantity'] ?? 1));
        $newStock = max(0, ((int)$product['stock']) - $qty);
        firestore_patch($path, ['stock' => $newStock]);
    }

    firestore_patch("orders/{$orderId}", [
        'stockDebitedPaymentId' => (string)$paymentId,
        'stockDebitedAt' => now_timestamp()
    ]);
}

function load_expected_source($orderId, $solicitudId) {
    $order = $orderId ? firestore_get('orders/' . safe_id($orderId)) : null;
    if (!$solicitudId && $order && !empty($order['solicitudId'])) {
        $solicitudId = $order['solicitudId'];
    }

    $solicitud = $solicitudId ? firestore_get('solicitudes/' . safe_id($solicitudId)) : null;
    $serviceId = $solicitud['serviceId'] ?? ($order['serviceId'] ?? null);
    $expected = 0;

    if ($solicitud) {
        $expected = number_or_zero($solicitud['total'] ?? $solicitud['subtotal'] ?? 0);
    } elseif ($order) {
        $expected = number_or_zero($order['total'] ?? $order['subtotal'] ?? 0);
    }

    return [$order, $solicitud, $serviceId, (int)round($expected)];
}

$accessToken = coco_config_value('MP_ACCESS_TOKEN', '');
if (!$accessToken || strpos($accessToken, 'PEGAR_ACCESS_TOKEN') !== false) {
    json_response(['error' => 'MP_ACCESS_TOKEN no configurado'], 500);
}

$body = json_decode(file_get_contents('php://input'), true);
$paymentId = $_GET['data_id'] ?? $_GET['id'] ?? null;
$type = $_GET['type'] ?? $_GET['topic'] ?? ($body['type'] ?? '');

if (!$paymentId && isset($body['data']['id'])) $paymentId = $body['data']['id'];
if (!$paymentId && isset($body['id'])) $paymentId = $body['id'];

if (!$paymentId || ($type && $type !== 'payment')) {
    json_response(['received' => true]);
}

$ch = curl_init("https://api.mercadopago.com/v1/payments/" . urlencode($paymentId));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken]
]);
$paymentResponse = curl_exec($ch);
$paymentCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($paymentCode < 200 || $paymentCode >= 300) {
    json_response(['error' => 'No se pudo consultar el pago', 'status' => $paymentCode], 500);
}

$payment = json_decode($paymentResponse, true);
if (($payment['status'] ?? '') !== 'approved') {
    json_response(['received' => true, 'status' => $payment['status'] ?? null]);
}

$metadata = $payment['metadata'] ?? [];
$orderId = $metadata['firestore_order_id'] ?? $metadata['firestoreOrderId'] ?? $payment['external_reference'] ?? null;
$solicitudId = $metadata['solicitud_id'] ?? $metadata['solicitudId'] ?? null;
$serviceIdMeta = $metadata['service_id'] ?? $metadata['serviceId'] ?? null;
$monto = (int)round(number_or_zero($payment['transaction_amount'] ?? 0));
$safePaymentId = safe_id($paymentId);
$today = gmdate('Y-m-d');
$now = now_timestamp();

[$order, $solicitud, $serviceId, $expectedTotal] = load_expected_source($orderId, $solicitudId);
if ($serviceIdMeta) $serviceId = $serviceIdMeta;
if (!$solicitudId && $solicitud) $solicitudId = $solicitud['id'] ?? null;

if ($expectedTotal > 0 && $monto + 1 < $expectedTotal) {
    firestore_patch("admin_pagos/mp_{$safePaymentId}", [
        'orderId' => $orderId,
        'solicitudId' => $solicitudId,
        'paymentId' => (string)$paymentId,
        'fecha' => $today,
        'monto' => $monto,
        'medioPago' => 'MercadoPago',
        'notas' => 'Pago aprobado con monto menor al esperado. Revisar manualmente.',
        'origen' => 'mercadopago_monto_invalido',
        'creadoEn' => $now
    ]);
    json_response(['received' => true, 'ignored' => 'amount_mismatch'], 200);
}

if ($orderId) {
    firestore_patch('orders/' . safe_id($orderId), [
        'status' => 'paid',
        'paymentStatus' => 'approved',
        'paymentId' => (string)$paymentId,
        'serviceId' => $serviceId,
        'updatedAt' => $now
    ]);
    debit_stock_once(safe_id($orderId), $order, $paymentId);
}

if ($solicitudId) {
    firestore_patch('solicitudes/' . safe_id($solicitudId), [
        'status' => 'paid',
        'paymentId' => (string)$paymentId,
        'serviceId' => $serviceId,
        'paymentDate' => $now,
        'updatedAt' => $now
    ]);
}

if ($serviceId && $monto > 0) {
    firestore_patch("admin_pagos/mp_{$safePaymentId}", [
        'servicioId' => $serviceId,
        'orderId' => $orderId,
        'solicitudId' => $solicitudId,
        'paymentId' => (string)$paymentId,
        'fecha' => $today,
        'monto' => $monto,
        'medioPago' => 'MercadoPago',
        'notas' => 'Pago registrado automaticamente desde webhook',
        'origen' => 'mercadopago',
        'creadoEn' => $now
    ]);

    firestore_patch('admin_servicios/' . safe_id($serviceId), [
        'estadoPago' => 'completo',
        'montoPagado' => $monto,
        'paymentStatus' => 'approved',
        'paymentId' => (string)$paymentId,
        'orderId' => $orderId,
        'solicitudId' => $solicitudId,
        'actualizadoEn' => $now
    ]);
}

json_response(['received' => true, 'paymentId' => $paymentId, 'orderId' => $orderId, 'serviceId' => $serviceId]);
?>
