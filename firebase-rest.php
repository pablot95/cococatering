<?php
// Helpers Firestore REST. Usa service account si existe; si no, cae a API key.

function coco_config_value($key, $default = null) {
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/mp-config.php';
        $config = is_file($path) ? require $path : [];
        if (!is_array($config)) $config = [];
    }
    $env = getenv($key);
    if ($env !== false && $env !== '') return $env;
    return $config[$key] ?? $default;
}

function firestore_project_id() {
    return coco_config_value('FIREBASE_PROJECT_ID', 'cococatering-aba04');
}

function firestore_api_key() {
    return coco_config_value('FIREBASE_API_KEY', 'AIzaSyD8tAHsCsRH1ZfXri3UsbDvt31gBYpoWME');
}

function firestore_b64url($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function firestore_access_token() {
    static $token = null;
    if ($token !== null) return $token;

    $servicePath = coco_config_value('FIREBASE_SERVICE_ACCOUNT', __DIR__ . '/firebase-service-account.json');
    if (!is_file($servicePath)) return null;

    $service = json_decode(file_get_contents($servicePath), true);
    if (!$service || empty($service['client_email']) || empty($service['private_key'])) return null;

    $now = time();
    $header = ['alg' => 'RS256', 'typ' => 'JWT'];
    $claim = [
        'iss' => $service['client_email'],
        'scope' => 'https://www.googleapis.com/auth/datastore',
        'aud' => $service['token_uri'] ?? 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600
    ];

    $unsigned = firestore_b64url(json_encode($header)) . '.' . firestore_b64url(json_encode($claim));
    $signature = '';
    if (!openssl_sign($unsigned, $signature, $service['private_key'], 'SHA256')) return null;
    $jwt = $unsigned . '.' . firestore_b64url($signature);

    $ch = curl_init($claim['aud']);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded']
    ]);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code < 200 || $code >= 300) return null;
    $payload = json_decode($response, true);
    $token = $payload['access_token'] ?? null;
    return $token;
}

function firestore_query_string($query) {
    $parts = [];
    foreach ($query as $key => $value) {
        if (is_array($value)) {
            foreach ($value as $item) {
                $parts[] = urlencode($key) . '=' . urlencode($item);
            }
        } else {
            $parts[] = urlencode($key) . '=' . urlencode($value);
        }
    }
    return implode('&', $parts);
}

function firestore_request($method, $path, $body = null, $query = []) {
    $projectId = firestore_project_id();
    $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/{$path}";
    $token = firestore_access_token();
    if (!$token) {
        $query['key'] = firestore_api_key();
    }
    if ($query) $url .= '?' . firestore_query_string($query);

    $headers = ['Content-Type: application/json'];
    if ($token) $headers[] = 'Authorization: Bearer ' . $token;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [$code, $response ? json_decode($response, true) : null];
}

function firestore_value($value) {
    if (is_array($value) && isset($value['__timestamp'])) return ['timestampValue' => $value['__timestamp']];
    if (is_null($value)) return ['nullValue' => null];
    if (is_bool($value)) return ['booleanValue' => $value];
    if (is_int($value)) return ['integerValue' => (string)$value];
    if (is_float($value)) return ['doubleValue' => $value];
    if (is_array($value)) {
        $fields = [];
        foreach ($value as $k => $v) $fields[$k] = firestore_value($v);
        return ['mapValue' => ['fields' => $fields]];
    }
    return ['stringValue' => (string)$value];
}

function firestore_decode_value($value) {
    if (isset($value['stringValue'])) return $value['stringValue'];
    if (isset($value['integerValue'])) return (int)$value['integerValue'];
    if (isset($value['doubleValue'])) return (float)$value['doubleValue'];
    if (isset($value['booleanValue'])) return (bool)$value['booleanValue'];
    if (array_key_exists('nullValue', $value)) return null;
    if (isset($value['timestampValue'])) return $value['timestampValue'];
    if (isset($value['arrayValue'])) {
        $items = $value['arrayValue']['values'] ?? [];
        return array_map('firestore_decode_value', $items);
    }
    if (isset($value['mapValue'])) {
        $out = [];
        foreach (($value['mapValue']['fields'] ?? []) as $k => $v) {
            $out[$k] = firestore_decode_value($v);
        }
        return $out;
    }
    return null;
}

function firestore_decode_document($document) {
    if (!$document || empty($document['fields'])) return null;
    $out = [];
    foreach ($document['fields'] as $key => $value) {
        $out[$key] = firestore_decode_value($value);
    }
    if (!empty($document['name'])) {
        $parts = explode('/', $document['name']);
        $out['id'] = end($parts);
    }
    return $out;
}

function firestore_get($path) {
    [$code, $doc] = firestore_request('GET', $path);
    if ($code < 200 || $code >= 300) return null;
    return firestore_decode_document($doc);
}

function firestore_list($collection) {
    [$code, $payload] = firestore_request('GET', $collection);
    if ($code < 200 || $code >= 300 || empty($payload['documents'])) return [];
    return array_map('firestore_decode_document', $payload['documents']);
}

function firestore_patch($path, $data) {
    $fields = [];
    $query = ['updateMask.fieldPaths' => []];
    foreach ($data as $key => $value) {
        $fields[$key] = firestore_value($value);
        $query['updateMask.fieldPaths'][] = $key;
    }
    return firestore_request('PATCH', $path, ['fields' => $fields], $query);
}
?>
