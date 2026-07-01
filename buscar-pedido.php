<?php
// Busca solicitudes por email + codigo desde backend para no exponer listados publicos.

require_once __DIR__ . '/firebase-rest.php';

function buscar_json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function buscar_headers() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($origin) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        if ($originHost && strtolower($originHost) === strtolower($host)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
    }
    header('Content-Type: application/json');
}

buscar_headers();
if ($_SERVER['REQUEST_METHOD'] !== 'GET') buscar_json(['error' => 'Metodo no permitido'], 405);

$email = strtolower(trim($_GET['email'] ?? ''));
$codigo = strtoupper(trim($_GET['codigo'] ?? ''));
if (!$email || !$codigo || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    buscar_json(['pedidos' => []]);
}

$matches = [];
foreach (firestore_list('solicitudes') as $pedido) {
    if (strtolower(trim($pedido['email'] ?? '')) === $email && strtoupper(trim($pedido['codigo'] ?? '')) === $codigo) {
        $matches[] = $pedido;
        if (count($matches) >= 5) break;
    }
}

buscar_json(['pedidos' => $matches]);
?>
