<?php

namespace App\Jobs;

use App\Events\FlightsUpdated;
use App\Services\OpenSkyService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Exception;

class UpdateFlightsJob implements ShouldQueue
{
   use InteractsWithQueue, Queueable, SerializesModels;

   public int $timeout = 120;
   public int $tries = 3;
   public int $maxExceptions = 2;
   public array $backoff = [30, 60, 120];

   public function __construct()
   {
      // Job configuration
   }

   /**
    * Execute the job.
    */
   public function handle(OpenSkyService $openSkyService): void
   {
      Log::info('UpdateFlightsJob: Starting flight update process');

      try {
         // Buscar voos da API OpenSky
         $flightsData = $openSkyService->getFlights();

         if (!$flightsData) {
            Log::warning('UpdateFlightsJob: No flight data received from API');
            return;
         }

         // Processar e cachear dados
         $processedFlights = $this->processFlightData($flightsData);
         $stats = $this->calculateStats($processedFlights);

         // ── Contadores Prometheus: entradas em área e desaparecimentos ────
         $this->updatePrometheusCounters($processedFlights);

         // Cache final data
         Cache::put('flights_data', $processedFlights, now()->addMinutes(5));
         Cache::put('flights_stats', $stats, now()->addMinutes(5));
         Cache::put('flights_last_update', now(), now()->addMinutes(5));

         // Broadcast via WebSocket
         broadcast(new FlightsUpdated($processedFlights, $stats));

         Log::info('UpdateFlightsJob: Successfully updated {count} flights', [
            'count' => count($processedFlights),
            'stats' => $stats
         ]);
      } catch (Exception $e) {
         Log::error('UpdateFlightsJob: Failed to update flights', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
         ]);

         throw $e;
      }
   }

   /**
    * Process raw flight data from API
    */
   private function processFlightData(array $flightsData): array
   {
      $processed = [];
      $maxFlights = 500; // Increased for stress testing

      if (isset($flightsData['states']) && is_array($flightsData['states'])) {
         $count = 0;

         foreach ($flightsData['states'] as $state) {
            if ($count >= $maxFlights) break;

            // Skip flights without position
            if (empty($state[6]) || empty($state[5])) {
               continue;
            }

            $flight = [
               'icao24' => $state[0] ?? null,
               'callsign' => trim($state[1] ?? ''),
               'origin_country' => $state[2] ?? null,
               'time_position' => $state[3] ?? null,
               'last_contact' => $state[4] ?? null,
               'longitude' => (float) $state[5],
               'latitude' => (float) $state[6],
               'baro_altitude' => $state[7] ?? null,
               'on_ground' => (bool) $state[8],
               'velocity' => $state[9] ?? null,
               'true_track' => $state[10] ?? null,
               'vertical_rate' => $state[11] ?? null,
               'geo_altitude' => $state[13] ?? null,
               'squawk' => $state[14] ?? null,
               'spi' => (bool) ($state[15] ?? false),
               'position_source' => $state[16] ?? null,
            ];

            // Calculate speed in km/h
            if ($flight['velocity']) {
               $flight['speed_kmh'] = round($flight['velocity'] * 3.6);
            }

            $processed[] = $flight;
            $count++;
         }
      }

      return $processed;
   }

   /**
    * Atualiza contadores Prometheus comparando conjunto anterior com o atual.
    * Registra novas entradas em área e aeronaves que desapareceram do radar.
    */
   private function updatePrometheusCounters(array $currentFlights): void
   {
      $currentIcao24  = array_column($currentFlights, 'icao24');
      $previousIcao24 = Cache::get('prometheus_known_icao24', []);

      if (!empty($previousIcao24)) {
         // Novas aeronaves (entradas em área)
         $newEntries = array_diff($currentIcao24, $previousIcao24);
         if (!empty($newEntries)) {
            $prev = (int) Cache::get('prometheus_area_entries', 0);
            Cache::put('prometheus_area_entries', $prev + count($newEntries), now()->addDays(30));
         }

         // Aeronaves que sumiram (desaparecidas)
         $gone = array_diff($previousIcao24, $currentIcao24);
         if (!empty($gone)) {
            $prev = (int) Cache::get('prometheus_disappeared', 0);
            Cache::put('prometheus_disappeared', $prev + count($gone), now()->addDays(30));
         }
      }

      Cache::put('prometheus_known_icao24', $currentIcao24, now()->addMinutes(10));
   }

   /**
    * Calculate flight statistics
    */
   private function calculateStats(array $flights): array
   {
      $total = count($flights);
      $withPosition = 0;
      $airborne = 0;
      $countries = [];

      foreach ($flights as $flight) {
         if (!empty($flight['longitude']) && !empty($flight['latitude'])) {
            $withPosition++;
         }

         if (!$flight['on_ground']) {
            $airborne++;
         }

         if (!empty($flight['origin_country'])) {
            $countries[$flight['origin_country']] = true;
         }
      }

      return [
         'total' => $total,
         'with_position' => $withPosition,
         'airborne' => $airborne,
         'countries' => count($countries),
         'updated_at' => now()->toISOString()
      ];
   }

   /**
    * Handle job failure
    */
   public function failed(Exception $exception): void
   {
      Log::error('UpdateFlightsJob: Job failed permanently', [
         'error' => $exception->getMessage(),
         'attempts' => $this->attempts()
      ]);

      // Set error state in cache
      Cache::put('flights_error', [
         'message' => 'Failed to update flight data: ' . $exception->getMessage(),
         'timestamp' => now()->toISOString()
      ], now()->addMinutes(10));
   }
}
