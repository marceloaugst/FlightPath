<?php

namespace App\Console\Commands;

use App\Services\OpenSkyRealtimeService;
use Illuminate\Console\Command;

class TestOpenSkyConnection extends Command
{
   /**
    * O nome e a assinatura do comando.
    */
   protected $signature = 'opensky:test {--detailed : Mostrar informações detalhadas}';

   /**
    * A descrição do comando.
    */
   protected $description = 'Testa a conexão com a API OpenSky Network usando credenciais';

   /**
    * Execute o comando.
    */
   public function handle(OpenSkyRealtimeService $service)
   {
      $this->info('🔗 Testando conexão com OpenSky Network API...');
      $this->newLine();

      // Debug da configuração
      $this->line('🔧 Configurações:');
      $this->line('   - API URL: ' . config('services.opensky.api_url'));
      $this->line('   - Client ID: ' . config('services.opensky.client_id'));
      $this->line('   - SSL Verify: ' . (config('services.opensky.ssl_verify') ? 'true' : 'false'));
      $this->newLine();

      // Teste básico de conectividade
      $this->line('1. Testando autenticação...');
      $connectionTest = $service->testConnection();

      if ($connectionTest['success']) {
         $this->info('   ✅ Conexão bem-sucedida!');

         if (isset($connectionTest['authenticated'])) {
            $auth = $connectionTest['authenticated'] ? 'Autenticado' : 'Sem autenticação';
            $this->line("   🔐 Status: {$auth}");
         }

         if (isset($connectionTest['response_time'])) {
            $this->line("   ⏱️  Tempo de resposta: {$connectionTest['response_time']}");
         }
      } else {
         $this->error('   ❌ Falha na conexão');
         if (isset($connectionTest['error'])) {
            $this->line("   Erro: {$connectionTest['error']}");
         }
         if (isset($connectionTest['status'])) {
            $this->line("   Status HTTP: {$connectionTest['status']}");
         }
         return Command::FAILURE;
      }

      $this->newLine();

      // Teste de busca de dados
      $this->line('2. Testando busca de dados de voos...');
      try {
         $flights = $service->getLiveFlights();
         $count = count($flights);

         if ($count > 0) {
            $this->info("   ✅ {$count} voos encontrados!");

            // Mostrar estatísticas básicas
            $withPosition = count(array_filter($flights, fn($f) => $f['latitude'] && $f['longitude']));
            $countries = count(array_unique(array_column($flights, 'origin_country')));
            $airborne = count(array_filter($flights, fn($f) => !$f['on_ground']));

            $this->line("   📊 Com posição: {$withPosition}");
            $this->line("   🌍 Países: {$countries}");
            $this->line("   🛫 Voando: {$airborne}");
         } else {
            $this->warn('   ⚠️  Nenhum voo encontrado (pode ser normal)');
         }
      } catch (\Exception $e) {
         $this->error('   ❌ Erro ao buscar voos');
         $this->line("   Erro: {$e->getMessage()}");
         return Command::FAILURE;
      }

      $this->newLine();

      // Teste de estatísticas
      $this->line('3. Testando estatísticas...');
      try {
         $stats = $service->getFlightStats();
         $this->info('   ✅ Estatísticas obtidas:');
         $this->table(
            ['Métrica', 'Valor'],
            [
               ['Total de voos', $stats['total'] ?? 'N/A'],
               ['Com posição', $stats['with_position'] ?? 'N/A'],
               ['Países', $stats['countries'] ?? 'N/A'],
               ['No ar', $stats['airborne'] ?? 'N/A'],
               ['Última atualização', $stats['last_updated'] ?? 'N/A'],
            ]
         );
      } catch (\Exception $e) {
         $this->warn('   ⚠️  Erro ao obter estatísticas');
         $this->line("   Erro: {$e->getMessage()}");
      }

      // Informações detalhadas se solicitado
      if ($this->option('detailed')) {
         $this->newLine();
         $this->line('📋 Informações detalhadas:');

         // Configurações
         $this->line('   Configurações:');
         $this->line('   - API URL: ' . config('services.opensky.api_url'));
         $this->line('   - Client ID: ' . config('services.opensky.client_id'));
         $this->line('   - Cache Duration: ' . config('services.opensky.cache_duration') . 's');
         $this->line('   - Timeout: ' . config('services.opensky.timeout') . 's');

         // Amostra de dados se houver voos
         if (!empty($flights) && count($flights) > 0) {
            $this->newLine();
            $this->line('   Amostra de dados (primeiro voo):');
            $firstFlight = $flights[0];
            $this->table(
               ['Campo', 'Valor'],
               [
                  ['ICAO24', $firstFlight['icao24'] ?? 'N/A'],
                  ['Callsign', $firstFlight['callsign'] ?? 'N/A'],
                  ['País', $firstFlight['origin_country'] ?? 'N/A'],
                  ['Latitude', $firstFlight['latitude'] ?? 'N/A'],
                  ['Longitude', $firstFlight['longitude'] ?? 'N/A'],
                  ['Altitude', $firstFlight['baro_altitude'] ?? 'N/A'],
                  ['Velocidade', $firstFlight['velocity'] ?? 'N/A'],
                  ['Em solo', $firstFlight['on_ground'] ? 'Sim' : 'Não'],
               ]
            );
         }
      }

      $this->newLine();
      $this->info('🎉 Teste concluído com sucesso!');
      $this->line('A aplicação está pronta para usar dados em tempo real da OpenSky Network.');

      return Command::SUCCESS;
   }
}
