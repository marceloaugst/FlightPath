<?php

require_once 'vendor/autoload.php';

use Illuminate\Http\Client\Factory as Http;

echo "🔗 Teste OpenSky Network API\n";
echo "============================\n\n";

// Credenciais
$clientId = 'marcelo.augsd@gmail.com-api-client';
$clientSecret = 'cKO8UNkzJyOt2Ls4OjqUjm2NOSp1wuhj';
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
echo "   - Client ID: $clientId\n";
echo "   - SSL Verify: false\n\n";

try {
   $http = new Http();

   echo "1. Testando conexão...\n";

   $response = $http->timeout(30)
      ->withBasicAuth($clientId, $clientSecret)
      ->withOptions($options)
      ->get("$apiUrl/states/all?icao24=a1b2c3");

   if ($response->successful()) {
      echo "   ✅ Conexão bem-sucedida!\n";
      echo "   📊 Status: " . $response->status() . "\n";

      $data = $response->json();
      if (isset($data['states'])) {
         $count = count($data['states'] ?? []);
         echo "   ✈️  Dados recebidos: $count registros\n";
      }

      echo "\n🎉 Teste concluído com sucesso!\n";
   } else {
      echo "   ❌ Erro HTTP: " . $response->status() . "\n";
      echo "   📄 Resposta: " . $response->body() . "\n";
   }
} catch (Exception $e) {
   echo "   ❌ Erro na conexão: " . $e->getMessage() . "\n";

   if (strpos($e->getMessage(), 'cURL error 60') !== false) {
      echo "\n💡 Dica: Erro SSL detectado. Configuração SSL bypass está ativa.\n";
   }
}

echo "\n🏁 Fim do teste\n";
