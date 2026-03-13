<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use App\Models\Flight;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class OpenSkyService
{
   /**
    * Busca dados da API OpenSky
    */
   public function getFlights()
   {
      try {
         $response = Http::timeout(30)->get('https://opensky-network.org/api/states/all');

         if ($response->failed()) {
            Log::warning('Falha ao buscar dados da OpenSky API', [
               'status' => $response->status(),
               'body' => $response->body()
            ]);
            return [];
         }

         $data = $response->json();
         return $data['states'] ?? [];
      } catch (\Exception $e) {
         Log::error('Erro ao buscar dados da OpenSky API', [
            'error' => $e->getMessage()
         ]);
         return [];
      }
   }

   /**
    * Processa e salva os dados dos voos
    */
   public function updateFlights()
   {
      $flights = $this->getFlights();
      $savedCount = 0;
      $updatedCount = 0;

      foreach ($flights as $flightData) {
         $parsed = $this->parseFlightData($flightData);

         if ($parsed && $this->isValidFlight($parsed)) {
            $flight = Flight::updateOrCreate(
               ['icao24' => $parsed['icao24']],
               $parsed
            );

            if ($flight->wasRecentlyCreated) {
               $savedCount++;
            } else {
               $updatedCount++;
            }
         }
      }

      Log::info('Voos atualizados', [
         'total_received' => count($flights),
         'saved' => $savedCount,
         'updated' => $updatedCount
      ]);

      return [
         'total' => count($flights),
         'saved' => $savedCount,
         'updated' => $updatedCount
      ];
   }

   /**
    * Parse dos dados de voo da API OpenSky
    * Baseado na documentação: https://opensky-network.org/apidoc/rest.html
    */
   private function parseFlightData($data)
   {
      if (!is_array($data) || count($data) < 17) {
         return null;
      }

      return [
         'icao24' => $data[0],
         'callsign' => $data[1] ? trim($data[1]) : null,
         'origin_country' => $data[2],
         'last_contact' => $data[4] ? Carbon::createFromTimestamp($data[4]) : null,
         'longitude' => is_numeric($data[5]) ? (float) $data[5] : null,
         'latitude' => is_numeric($data[6]) ? (float) $data[6] : null,
         'altitude' => is_numeric($data[7]) ? (int) $data[7] : null,
         'velocity' => is_numeric($data[9]) ? (float) $data[9] : null,
         'true_track' => is_numeric($data[10]) ? (float) $data[10] : null,
         'vertical_rate' => is_numeric($data[11]) ? (float) $data[11] : null,
         'sensors' => is_array($data[12]) ? json_encode($data[12]) : null,
         'geo_altitude' => is_numeric($data[13]) ? (float) $data[13] : null,
         'squawk' => $data[14],
         'spi' => $data[15],
         'position_source' => is_numeric($data[16]) ? (int) $data[16] : null,
      ];
   }

   /**
    * Valida se os dados do voo são úteis
    */
   private function isValidFlight($flightData)
   {
      // Precisa ter pelo menos ICAO24
      if (empty($flightData['icao24'])) {
         return false;
      }

      // Se tem coordenadas, elas devem ser válidas
      if ($flightData['latitude'] && $flightData['longitude']) {
         if (!$this->isValidCoordinate($flightData['latitude'], $flightData['longitude'])) {
            return false;
         }
      }

      return true;
   }

   /**
    * Valida coordenadas
    */
   private function isValidCoordinate($lat, $lng)
   {
      return $lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180;
   }

   /**
    * Limpa voos antigos (mais de 24 horas)
    */
   public function cleanOldFlights()
   {
      $deleted = Flight::where('last_contact', '<', now()->subHours(24))->delete();

      Log::info('Voos antigos removidos', ['count' => $deleted]);

      return $deleted;
   }

   /**
    * Busca voos ativos para o frontend
    */
   public function getActiveFlights()
   {
      return Flight::withPosition()
         ->active()
         ->orderBy('last_contact', 'desc')
         ->get()
         ->map(function ($flight) {
            return [
               'icao24' => $flight->icao24,
               'callsign' => $flight->callsign,
               'origin_country' => $flight->origin_country,
               'latitude' => (float) $flight->latitude,
               'longitude' => (float) $flight->longitude,
               'altitude' => $flight->altitude,
               'velocity' => $flight->velocity,
               'true_track' => $flight->true_track,
               'last_contact' => $flight->last_contact ? $flight->last_contact->timestamp : null,
            ];
         });
   }
}
