<?php

namespace App\Http\Controllers;

use App\Services\OpenSkyRealtimeService;
use Inertia\Inertia;

class DashboardController extends Controller
{
   public function __construct(private OpenSkyRealtimeService $realtimeService) {}

   /**
    * Exibir o dashboard principal com dados em tempo real
    */
   public function index()
   {
      try {
         // Buscar voos em tempo real da API
         $flights = $this->realtimeService->getLiveFlights();

         // Filtrar apenas voos com posição válida para o mapa
         $flightsWithPosition = array_filter($flights, function ($flight) {
            return $flight['latitude'] !== null &&
               $flight['longitude'] !== null &&
               !$flight['on_ground'];
         });

         // Estatísticas
         $stats = [
            'total' => count($flights),
            'with_position' => count($flightsWithPosition),
            'countries' => count(array_unique(array_column($flights, 'origin_country'))),
            'airborne' => count(array_filter($flights, fn($f) => !$f['on_ground'])),
            'last_updated' => now()->toISOString()
         ];

         return Inertia::render('Dashboard', [
            'flights' => array_values($flightsWithPosition),
            'stats' => $stats,
            'realtime' => true,
            'cache_duration' => config('services.opensky.cache_duration', 30)
         ]);
      } catch (\Exception $e) {
         \Log::error('Dashboard error: ' . $e->getMessage());

         return Inertia::render('Dashboard', [
            'flights' => [],
            'stats' => [
               'total' => 0,
               'with_position' => 0,
               'countries' => 0,
               'airborne' => 0,
               'last_updated' => now()->toISOString()
            ],
            'error' => 'Erro ao buscar dados em tempo real: ' . $e->getMessage(),
            'realtime' => true
         ]);
      }
   }

   /**
    * API endpoint para refresh automático
    */
   public function refresh()
   {
      try {
         $flights = $this->realtimeService->getLiveFlights();

         // Filtrar voos com posição
         $flightsWithPosition = array_filter($flights, function ($flight) {
            return $flight['latitude'] !== null &&
               $flight['longitude'] !== null;
         });

         $stats = [
            'total' => count($flights),
            'with_position' => count($flightsWithPosition),
            'countries' => count(array_unique(array_column($flights, 'origin_country'))),
            'airborne' => count(array_filter($flights, fn($f) => !$f['on_ground'])),
            'last_updated' => now()->toISOString()
         ];

         return response()->json([
            'success' => true,
            'flights' => array_values($flightsWithPosition),
            'stats' => $stats,
            'timestamp' => now()->toISOString()
         ]);
      } catch (\Exception $e) {
         return response()->json([
            'success' => false,
            'message' => 'Erro ao atualizar dados: ' . $e->getMessage(),
            'flights' => [],
            'stats' => [
               'total' => 0,
               'with_position' => 0,
               'countries' => 0,
               'airborne' => 0,
               'last_updated' => now()->toISOString()
            ]
         ], 500);
      }
   }
}
