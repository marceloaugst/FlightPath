<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class OpenSkyRealtimeService
{
    private string $apiUrl;
    private string $tokenUrl;
    private string $clientId;
    private string $clientSecret;
    private int $cacheDuration;
    private int $timeout;
    private bool $sslVerify;
    private string $tokenCacheKey = 'opensky_access_token';

    public function __construct()
    {
        $this->apiUrl = config('services.opensky.api_url', 'https://opensky-network.org/api');
        $this->tokenUrl = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
        $this->clientId = config('services.opensky.client_id');
        $this->clientSecret = config('services.opensky.client_secret');
        $this->cacheDuration = config('services.opensky.cache_duration', 30);
        $this->timeout = config('services.opensky.timeout', 30);
        $this->sslVerify = config('services.opensky.ssl_verify', true);
    }

    /**
     * Obter configurações HTTP para requisições
     */
    private function getHttpOptions(): array
    {
        $options = [];

        if (!$this->sslVerify) {
            $options = [
                'verify' => false,
                'curl' => [
                    CURLOPT_SSL_VERIFYPEER => false,
                    CURLOPT_SSL_VERIFYHOST => false,
                ]
            ];
        }

        return $options;
    }

    /**
     * Obter access token OAuth2
     */
    private function getAccessToken(): string
    {
        $cacheKey = $this->tokenCacheKey;

        // Verificar se já temos um token válido em cache
        $cachedToken = Cache::get($cacheKey);
        if ($cachedToken) {
            return $cachedToken;
        }

        try {
            Log::info('OpenSky OAuth2: Solicitando novo token');

            $response = Http::timeout(30)
                ->withOptions($this->getHttpOptions())
                ->asForm()
                ->post($this->tokenUrl, [
                    'grant_type' => 'client_credentials',
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret
                ]);

            if (!$response->successful()) {
                throw new Exception('Falha ao obter token OAuth2: ' . $response->body());
            }

            $tokenData = $response->json();
            $accessToken = $tokenData['access_token'] ?? null;
            $expiresIn = $tokenData['expires_in'] ?? 1800; // 30 minutos default

            if (!$accessToken) {
                throw new Exception('Token de acesso não encontrado na resposta');
            }

            // Cache o token por 25 minutos (5 min antes de expirar para segurança)
            $cacheMinutes = max(1, ($expiresIn / 60) - 5);
            Cache::put($cacheKey, $accessToken, now()->addMinutes($cacheMinutes));

            Log::info('OpenSky OAuth2: Token obtido com sucesso', [
                'expires_in' => $expiresIn,
                'cache_minutes' => $cacheMinutes
            ]);

            return $accessToken;
        } catch (Exception $e) {
            Log::error('OpenSky OAuth2: Erro ao obter token', [
                'error' => $e->getMessage(),
                'client_id' => $this->clientId
            ]);
            throw $e;
        }
    }

    /**
     * Criar cliente HTTP configurado
     */
    private function createHttpClient()
    {
        $accessToken = $this->getAccessToken();

        return Http::timeout($this->timeout)
            ->withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'User-Agent' => 'OpenSky Flight Tracker/1.0',
                'Accept' => 'application/json'
            ])
            ->withOptions($this->getHttpOptions());
    }

    /**
     * Busca dados de voos em tempo real da API com autenticação
     */
    public function getLiveFlights(array $options = [])
    {
        $cacheKey = 'opensky_live_flights_' . md5(serialize($options));

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($options) {
            try {
                $url = $this->buildApiUrl($options);

                $response = $this->createHttpClient()->get($url);

                if ($response->failed()) {
                    Log::warning('OpenSky API request failed', [
                        'status' => $response->status(),
                        'url' => $url,
                        'body' => $response->body()
                    ]);
                    return [];
                }

                $data = $response->json();
                return $this->processFlightData($data['states'] ?? []);
            } catch (\Exception $e) {
                Log::error('Error fetching live flights from OpenSky API', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return [];
            }
        });
    }

    /**
     * Busca voos por região específica (mais eficiente)
     */
    public function getFlightsByRegion(float $minLat, float $maxLat, float $minLon, float $maxLon)
    {
        return $this->getLiveFlights([
            'lamin' => $minLat,
            'lamax' => $maxLat,
            'lomin' => $minLon,
            'lomax' => $maxLon
        ]);
    }

    /**
     * Busca voos por país
     */
    public function getFlightsByCountry(string $icaoCode)
    {
        $cacheKey = "opensky_flights_country_{$icaoCode}";

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($icaoCode) {
            try {
                $url = "{$this->apiUrl}/states/all";

                $response = $this->createHttpClient()->get($url);

                if ($response->failed()) {
                    return [];
                }

                $data = $response->json();
                $flights = $this->processFlightData($data['states'] ?? []);

                // Filtrar por país
                return collect($flights)->filter(function ($flight) use ($icaoCode) {
                    return $flight['origin_country'] === $icaoCode;
                })->values()->toArray();
            } catch (\Exception $e) {
                Log::error('Error fetching flights by country', [
                    'country' => $icaoCode,
                    'error' => $e->getMessage()
                ]);
                return [];
            }
        });
    }

    /**
     * Constrói URL da API com parâmetros
     */
    private function buildApiUrl(array $options = []): string
    {
        $url = "{$this->apiUrl}/states/all";

        if (!empty($options)) {
            $url .= '?' . http_build_query($options);
        }

        return $url;
    }

    /**
     * Processa dados brutos da API em formato estruturado
     */
    private function processFlightData(array $states): array
    {
        $flights = [];

        foreach ($states as $state) {
            if (!is_array($state) || count($state) < 17) {
                continue;
            }

            $flight = $this->parseFlightState($state);

            if ($this->isValidFlight($flight)) {
                $flights[] = $flight;
            }
        }

        return $flights;
    }

    /**
     * Parse estado de voo individual
     */
    private function parseFlightState(array $state): array
    {
        return [
            'icao24' => $state[0] ?? null,
            'callsign' => isset($state[1]) ? trim($state[1]) : null,
            'origin_country' => $state[2] ?? null,
            'time_position' => isset($state[3]) ? Carbon::createFromTimestamp($state[3]) : null,
            'last_contact' => isset($state[4]) ? Carbon::createFromTimestamp($state[4]) : null,
            'longitude' => is_numeric($state[5]) ? (float) $state[5] : null,
            'latitude' => is_numeric($state[6]) ? (float) $state[6] : null,
            'baro_altitude' => is_numeric($state[7]) ? (float) $state[7] : null,
            'on_ground' => $state[8] ?? false,
            'velocity' => is_numeric($state[9]) ? (float) $state[9] : null,
            'true_track' => is_numeric($state[10]) ? (float) $state[10] : null,
            'vertical_rate' => is_numeric($state[11]) ? (float) $state[11] : null,
            'sensors' => $state[12] ?? null,
            'geo_altitude' => is_numeric($state[13]) ? (float) $state[13] : null,
            'squawk' => $state[14] ?? null,
            'spi' => $state[15] ?? false,
            'position_source' => $state[16] ?? null,

            // Campos calculados
            'speed_kmh' => isset($state[9]) && is_numeric($state[9]) ? round((float)$state[9] * 3.6, 1) : null,
            'altitude_ft' => isset($state[7]) && is_numeric($state[7]) ? round((float)$state[7] * 3.28084) : null,
        ];
    }

    /**
     * Valida se o voo tem dados úteis
     */
    private function isValidFlight(array $flight): bool
    {
        // Deve ter ICAO24
        if (empty($flight['icao24'])) {
            return false;
        }

        // Se tem coordenadas, devem ser válidas
        if ($flight['latitude'] !== null && $flight['longitude'] !== null) {
            if (!$this->isValidCoordinate($flight['latitude'], $flight['longitude'])) {
                return false;
            }
        }

        // Não incluir voos muito antigos (mais de 2 horas)
        if ($flight['last_contact'] && $flight['last_contact']->diffInHours(now()) > 2) {
            return false;
        }

        return true;
    }

    /**
     * Valida coordenadas geográficas
     */
    private function isValidCoordinate(?float $lat, ?float $lng): bool
    {
        if ($lat === null || $lng === null) {
            return false;
        }

        return $lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180;
    }

    /**
     * Obter estatísticas rápidas dos dados
     */
    public function getFlightStats(): array
    {
        $cacheKey = 'opensky_flight_stats';

        return Cache::remember($cacheKey, $this->cacheDuration, function () {
            $flights = $this->getLiveFlights();

            return [
                'total' => count($flights),
                'with_position' => collect($flights)->where('latitude', '!==', null)->count(),
                'countries' => collect($flights)->pluck('origin_country')->unique()->filter()->count(),
                'airborne' => collect($flights)->where('on_ground', false)->count(),
                'last_updated' => now()->toISOString()
            ];
        });
    }

    /**
     * Limpar cache de dados
     */
    public function clearCache(): void
    {
        Cache::forget('opensky_live_flights_*');
        Cache::forget('opensky_flight_stats');
        Log::info('OpenSky cache cleared');
    }

    /**
     * Testar conectividade com a API
     */
    public function testConnection(): array
    {
        try {
            Log::info('OpenSky Test: Iniciando teste de conexão', [
                'api_url' => $this->apiUrl,
                'client_id' => $this->clientId,
                'ssl_verify' => $this->sslVerify
            ]);

            // Primeiro vamos obter um token
            $accessToken = $this->getAccessToken();

            $response = Http::timeout(10)
                ->withHeaders(['Authorization' => 'Bearer ' . $accessToken])
                ->withOptions($this->getHttpOptions())
                ->get("{$this->apiUrl}/states/all?icao24=a1b2c3");

            Log::info('OpenSky Test: Resposta recebida', [
                'status' => $response->status(),
                'successful' => $response->successful()
            ]);

            return [
                'success' => $response->successful(),
                'status' => $response->status(),
                'authenticated' => $response->status() !== 401,
                'response_time' => 'N/A',
                'ssl_verify' => $this->sslVerify,
                'api_url' => $this->apiUrl,
                'token_obtained' => !empty($accessToken)
            ];
        } catch (\Exception $e) {
            Log::error('OpenSky Test: Erro na conexão', [
                'error' => $e->getMessage(),
                'code' => $e->getCode()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'ssl_verify' => $this->sslVerify,
                'api_url' => $this->apiUrl,
                'token_obtained' => false
            ];
        }
    }
}
