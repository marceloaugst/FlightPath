<?php

require_once 'vendor/autoload.php';

use Illuminate\Http\Client\Factory as Http;

echo "🔗 Teste OpenSky Network API OAuth2\n";
echo "===================================\n\n";

// Credenciais
$clientId = 'marcelo.augsd@gmail.com-api-client';
$clientSecret = 'cKO8UNkzJyOt2Ls4OjqUjm2NOSp1wuhj';
$tokenUrl = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
$apiUrl = 'https://opensky-network.org/api';

// HTTP options
$options = [
   'verify' => false,
   'curl' => [
      CURLOPT_SSL_VERIFYPEER => false,
      CURLOPT_SSL_VERIFYHOST => false,
   ]
];

echo "📋 Configurações:\n";
echo "   - API URL: $apiUrl\n";
echo "   - Token URL: $tokenUrl\n";
echo "   - Client ID: $clientId\n";
echo "   - SSL Verify: false\n\n";

try {
   $http = new Http();

   echo "1. Obtendo token OAuth2...\n";

   // Obter token OAuth2
   $tokenResponse = $http->timeout(30)
      ->withOptions($options)
      ->asForm()
      ->post($tokenUrl, [
         'grant_type' => 'client_credentials',
         'client_id' => $clientId,
         'client_secret' => $clientSecret
      ]);

   if (!$tokenResponse->successful()) {
      echo "   ❌ Erro ao obter token: " . $tokenResponse->status() . "\n";
      echo "   📄 Resposta: " . $tokenResponse->body() . "\n";
      exit(1);
   }

   $tokenData = $tokenResponse->json();
   $accessToken = $tokenData['access_token'] ?? null;
   $expiresIn = $tokenData['expires_in'] ?? 'não informado';

   if (!$accessToken) {
      echo "   ❌ Token não encontrado na resposta\n";
      echo "   📄 Resposta completa: " . json_encode($tokenData, JSON_PRETTY_PRINT) . "\n";
      exit(1);
   }

   echo "   ✅ Token obtido com sucesso!\n";
   echo "   🔑 Token: " . substr($accessToken, 0, 20) . "...\n";
   echo "   ⏰ Expira em: $expiresIn segundos\n\n";

   echo "2. Testando API com token Bearer...\n";

   $apiResponse = $http->timeout(30)
      ->withHeaders(['Authorization' => 'Bearer ' . $accessToken])
      ->withOptions($options)
      ->get("$apiUrl/states/all?icao24=a1b2c3");

   if ($apiResponse->successful()) {
      echo "   ✅ API funcionando!\n";
      echo "   📊 Status: " . $apiResponse->status() . "\n";

      $data = $apiResponse->json();
      if (isset($data['states'])) {
         $count = count($data['states'] ?? []);
         echo "   ✈️  Dados recebidos: $count registros\n";
         if ($count > 0) {
            echo "   📋 Primeiro registro: " . json_encode($data['states'][0], JSON_PRETTY_PRINT) . "\n";
         }
      }

      echo "\n🎉 Teste OAuth2 concluído com sucesso!\n";
   } else {
      echo "   ❌ Erro na API: " . $apiResponse->status() . "\n";
      echo "   📄 Resposta: " . $apiResponse->body() . "\n";
   }
} catch (Exception $e) {
   echo "   ❌ Erro na execução: " . $e->getMessage() . "\n";
}

echo "\n🏁 Fim do teste OAuth2\n";
