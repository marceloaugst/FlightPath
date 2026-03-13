<?php

namespace App\Console\Commands;

use App\Models\Flight;
use Illuminate\Console\Command;
use Carbon\Carbon;

class CreateTestFlights extends Command
{
   /**
    * O nome e a assinatura do comando.
    */
   protected $signature = 'flights:test';

   /**
    * A descrição do comando.
    */
   protected $description = 'Cria voos de teste para demonstração';

   /**
    * Execute o comando.
    */
   public function handle()
   {
      $this->info('🛫 Criando voos de teste...');

      $testFlights = [
         // Voos na América do Sul
         [
            'icao24' => 'a12345',
            'callsign' => 'TAM3054',
            'origin_country' => 'Brazil',
            'latitude' => -23.5505,
            'longitude' => -46.6333,
            'altitude' => 10000,
            'velocity' => 250.5,
            'true_track' => 45.0,
         ],
         [
            'icao24' => 'b67890',
            'callsign' => 'GOL1843',
            'origin_country' => 'Brazil',
            'latitude' => -22.9068,
            'longitude' => -43.1729,
            'altitude' => 8500,
            'velocity' => 180.2,
            'true_track' => 120.0,
         ],
         // Voos na Europa
         [
            'icao24' => 'c11223',
            'callsign' => 'BAW123',
            'origin_country' => 'United Kingdom',
            'latitude' => 51.5074,
            'longitude' => -0.1278,
            'altitude' => 12000,
            'velocity' => 300.1,
            'true_track' => 90.0,
         ],
         [
            'icao24' => 'd44556',
            'callsign' => 'AFR456',
            'origin_country' => 'France',
            'latitude' => 48.8566,
            'longitude' => 2.3522,
            'altitude' => 9500,
            'velocity' => 220.7,
            'true_track' => 180.0,
         ],
         // Voos nos EUA
         [
            'icao24' => 'e78901',
            'callsign' => 'UAL789',
            'origin_country' => 'United States',
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'altitude' => 11000,
            'velocity' => 280.3,
            'true_track' => 270.0,
         ],
         [
            'icao24' => 'f23456',
            'callsign' => 'AAL234',
            'origin_country' => 'United States',
            'latitude' => 34.0522,
            'longitude' => -118.2437,
            'altitude' => 7500,
            'velocity' => 195.8,
            'true_track' => 315.0,
         ],
         // Voos na Ásia
         [
            'icao24' => 'g56789',
            'callsign' => 'ANA567',
            'origin_country' => 'Japan',
            'latitude' => 35.6762,
            'longitude' => 139.6503,
            'altitude' => 13000,
            'velocity' => 320.5,
            'true_track' => 225.0,
         ],
      ];

      $created = 0;
      foreach ($testFlights as $flightData) {
         $flightData['last_contact'] = Carbon::now()->subMinutes(rand(1, 30));

         Flight::updateOrCreate(
            ['icao24' => $flightData['icao24']],
            $flightData
         );
         $created++;
      }

      $this->info("✅ {$created} voos de teste criados!");
      $this->line('Acesse http://127.0.0.1:8000 para ver o mapa em ação! 🗺️');

      return Command::SUCCESS;
   }
}
