<?php

require_once 'vendor/autoload.php';

use Illuminate\Http\Client\Factory as Http;

echo "🔗 Diagnóstico OpenSky Network API\n";
echo "==================================\n\n";

$http = new Http();
$options = [
   'verify' => false,
   'curl' => [
      CURLOPT_SSL_VERIFYPEER => false,
      CURLOPT_SSL_VERIFYHOST => false,
   ]
];

$apiUrl = 'https://opensky-network.org/api';

// Teste 1: Endpoint público sem autenticação
echo "1. Testando endpoint público (sem auth)...\n";
try {
   $response = $http->timeout(30)
      ->withOptions($options)
      ->get("$apiUrl/states/all?lamin=45.8389&lomin=5.9962&lamax=47.8229&lomax=10.5226");

   if ($response->successful()) {
      echo "   ✅ Endpoint público funciona! Status: " . $response->status() . "\n";
      $data = $response->json();
      $count = count($data['states'] ?? []);
      echo "   📊 Voos encontrados: $count\n";
   } else {
      echo "   ❌ Erro no endpoint público: " . $response->status() . "\n";
      echo "   📄 Resposta: " . substr($response->body(), 0, 200) . "...\n";
   }
} catch (Exception $e) {
   echo "   ❌ Erro: " . $e->getMessage() . "\n";
}

echo "\n";

// Teste 2: Verificar URL e credenciais
echo "2. Testando credenciais com diferentes formatos...\n";

$clientId = 'marcelo.augsd@gmail.com-api-client';
$clientSecret = 'cKO8UNkzJyOt2Ls4OjqUjm2NOSp1wuhj';

// Teste com endpoint específico (sem query)
try {
   echo "   2a. Testando endpoint básico com auth...\n";
   $response = $http->timeout(30)
      ->withBasicAuth($clientId, $clientSecret)
      ->withOptions($options)
      ->get("$apiUrl/states/all");

   echo "      Status: " . $response->status() . "\n";
   if (!$response->successful()) {
      echo "      Resposta: " . substr($response->body(), 0, 200) . "...\n";
   }
} catch (Exception $e) {
   echo "      Erro: " . $e->getMessage() . "\n";
}

// Teste com header manual
try {
   echo "   2b. Testando com header Authorization manual...\n";
   $auth = base64_encode($clientId . ':' . $clientSecret);
   $response = $http->timeout(30)
      ->withHeaders(['Authorization' => 'Basic ' . $auth])
      ->withOptions($options)
      ->get("$apiUrl/states/all");

   echo "      Status: " . $response->status() . "\n";
   if (!$response->successful()) {
      echo "      Resposta: " . substr($response->body(), 0, 200) . "...\n";
   }
} catch (Exception $e) {
   echo "      Erro: " . $e->getMessage() . "\n";
}

echo "\n";

// Teste 3: Verificar se credenciais são do tipo correto
echo "3. Verificando formato das credenciais...\n";
echo "   Client ID: '$clientId' (length: " . strlen($clientId) . ")\n";
echo "   Client Secret: '" . substr($clientSecret, 0, 10) . "...' (length: " . strlen($clientSecret) . ")\n";
echo "   Base64 Auth: " . substr(base64_encode($clientId . ':' . $clientSecret), 0, 20) . "...\n";

echo "\n";

// Teste 4: Endpoint de informações da API
echo "4. Testando endpoint de informações...\n";
try {
   $response = $http->timeout(30)
      ->withOptions($options)
      ->get("$apiUrl/");

   echo "   Status: " . $response->status() . "\n";
   if ($response->successful()) {
      echo "   📄 Resposta da raiz da API: " . substr($response->body(), 0, 300) . "...\n";
   }
} catch (Exception $e) {
   echo "   Erro: " . $e->getMessage() . "\n";
}

echo "\n🏁 Fim do diagnóstico\n";
