<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OpenSkyRealtimeService;
use Illuminate\Http\Request;

class RealtimeFlightController extends Controller
{
   public function __construct(
      private OpenSkyRealtimeService $realtimeService
   ) {}

   /**
    * Buscar todos os voos ativos em tempo real
    */
   public function index(Request $request)
   {
      try {
         // Validar parâmetros opcionais
         $request->validate([
            'limit' => 'integer|min:1|max:2000',
            'country' => 'string|max:50',
            'bbox' => 'string', // formato: "minLat,maxLat,minLon,maxLon"
         ]);

         $flights = [];

         // Buscar por região específica se bbox fornecida
         if ($request->has('bbox')) {
            $bbox = explode(',', $request->bbox);
            if (count($bbox) === 4) {
               $flights = $this->realtimeService->getFlightsByRegion(
                  (float) $bbox[0], // minLat
                  (float) $bbox[1], // maxLat
                  (float) $bbox[2], // minLon
                  (float) $bbox[3]  // maxLon
               );
            }
         }
         // Buscar por país
         elseif ($request->has('country')) {
            $flights = $this->realtimeService->getFlightsByCountry($request->country);
         }
         // Buscar todos
         else {
            $flights = $this->realtimeService->getLiveFlights();
         }

         // Aplicar limite
         $limit = $request->get('limit', 500);
         if (count($flights) > $limit) {
            $flights = array_slice($flights, 0, $limit);
         }

         return response()->json([
            'success' => true,
            'data' => $flights,
            'total' => count($flights),
            'timestamp' => now()->toISOString(),
            'cache_info' => [
               'cached' => true,
               'cache_duration' => config('services.opensky.cache_duration', 30)
            ]
         ]);
      } catch (\Exception $e) {
         return response()->json([
            'success' => false,
            'message' => 'Erro ao buscar dados de voos: ' . $e->getMessage(),
            'timestamp' => now()->toISOString()
         ], 500);
      }
   }

   /**
    * Obter estatísticas dos voos
    */
   public function stats()
   {
      try {
         $stats = $this->realtimeService->getFlightStats();

         return response()->json([
            'success' => true,
            'data' => $stats
         ]);
      } catch (\Exception $e) {
         return response()->json([
            'success' => false,
            'message' => 'Erro ao buscar estatísticas: ' . $e->getMessage()
         ], 500);
      }
   }

   /**
    * Buscar voos por região geográfica
    */
   public function byRegion(Request $request)
   {
      $request->validate([
         'min_lat' => 'required|numeric|between:-90,90',
         'max_lat' => 'required|numeric|between:-90,90',
         'min_lon' => 'required|numeric|between:-180,180',
         'max_lon' => 'required|numeric|between:-180,180',
      ]);

      try {
         $flights = $this->realtimeService->getFlightsByRegion(
            $request->min_lat,
            $request->max_lat,
            $request->min_lon,
            $request->max_lon
         );

         return response()->json([
            'success' => true,
            'data' => $flights,
            'total' => count($flights),
            'region' => [
               'min_lat' => $request->min_lat,
               'max_lat' => $request->max_lat,
               'min_lon' => $request->min_lon,
               'max_lon' => $request->max_lon,
            ]
         ]);
      } catch (\Exception $e) {
         return response()->json([
            'success' => false,
            'message' => 'Erro ao buscar voos da região: ' . $e->getMessage()
         ], 500);
      }
   }

   /**
    * Buscar voos por país
    */
   public function byCountry(Request $request, string $country)
   {
      try {
         $flights = $this->realtimeService->getFlightsByCountry($country);

         return response()->json([
            'success' => true,
            'data' => $flights,
            'total' => count($flights),
            'country' => $country
         ]);
      } catch (\Exception $e) {
         return response()->json([
            'success' => false,
            'message' => 'Erro ao buscar voos do país: ' . $e->getMessage()
         ], 500);
      }
   }

   /**
    * Limpar cache de dados
    */
   public function clearCache()
   {
      try {
         $this->realtimeService->clearCache();

         return response()->json([
            'success' => true,
            'message' => 'Cache limpo com sucesso'
         ]);
      } catch (\Exception $e) {
         return response()->json([
            'success' => false,
            'message' => 'Erro ao limpar cache: ' . $e->getMessage()
         ], 500);
      }
   }

   /**
    * Testar conectividade com API OpenSky
    */
   public function test()
   {
      try {
         $result = $this->realtimeService->testConnection();

         return response()->json([
            'success' => $result['success'],
            'data' => $result
         ]);
      } catch (\Exception $e) {
         return response()->json([
            'success' => false,
            'message' => 'Erro ao testar conexão: ' . $e->getMessage()
         ], 500);
      }
   }

   /**
    * Endpoint para polling automático (otimizado)
    */
   public function poll(Request $request)
   {
      $request->validate([
         'last_update' => 'date',
         'bbox' => 'string',
         'limit' => 'integer|min:1|max:1000'
      ]);

      try {
         $lastUpdate = $request->has('last_update')
            ? \Carbon\Carbon::parse($request->last_update)
            : now()->subMinutes(5);

         // Buscar dados
         $flights = [];
         if ($request->has('bbox')) {
            $bbox = explode(',', $request->bbox);
            if (count($bbox) === 4) {
               $flights = $this->realtimeService->getFlightsByRegion(...$bbox);
            }
         } else {
            $flights = $this->realtimeService->getLiveFlights();
         }

         // Filtrar apenas voos atualizados recentemente
         $flights = array_filter($flights, function ($flight) use ($lastUpdate) {
            return $flight['last_contact'] &&
               $flight['last_contact']->gt($lastUpdate);
         });

         // Aplicar limite
         $limit = $request->get('limit', 200);
         if (count($flights) > $limit) {
            $flights = array_slice($flights, 0, $limit);
         }

         return response()->json([
            'success' => true,
            'data' => array_values($flights),
            'total' => count($flights),
            'last_update' => now()->toISOString(),
            'polling' => true
         ]);
      } catch (\Exception $e) {
         return response()->json([
            'success' => false,
            'message' => 'Erro no polling: ' . $e->getMessage()
         ], 500);
      }
   }
}
