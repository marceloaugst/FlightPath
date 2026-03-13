<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FlightController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Api\RealtimeFlightController;

// Dashboard principal (Inertia/React) - Dados em tempo real
Route::get('/', [DashboardController::class, 'index'])->name('home');
Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

// API endpoints para dados em tempo real
Route::prefix('api/realtime')->name('api.realtime.')->group(function () {
    Route::get('/flights', [RealtimeFlightController::class, 'index'])->name('flights');
    Route::get('/flights/stats', [RealtimeFlightController::class, 'stats'])->name('stats');
    Route::get('/flights/region', [RealtimeFlightController::class, 'byRegion'])->name('region');
    Route::get('/flights/country/{country}', [RealtimeFlightController::class, 'byCountry'])->name('country');
    Route::get('/flights/poll', [RealtimeFlightController::class, 'poll'])->name('poll');
    Route::post('/cache/clear', [RealtimeFlightController::class, 'clearCache'])->name('cache.clear');
    Route::get('/test', [RealtimeFlightController::class, 'test'])->name('test');
});

// API endpoint para dashboard refresh
Route::post('/api/dashboard/refresh', [DashboardController::class, 'refresh'])->name('api.dashboard.refresh');

// WebSocket API endpoints
Route::prefix('api/websocket')->name('api.websocket.')->group(function () {
    Route::post('/update-flights', function () {
        \App\Jobs\UpdateFlightsJob::dispatch()->onQueue('flights');
        return response()->json(['status' => 'dispatched', 'timestamp' => now()]);
    })->name('update-flights');

    Route::get('/status', function () {
        return response()->json([
            'websocket_active' => true,
            'last_update' => cache('flights_last_update'),
            'flights_count' => count(cache('flights_data', [])),
            'redis_connected' => cache()->getStore() instanceof \Illuminate\Cache\RedisStore
        ]);
    })->name('status');
});

// API endpoints legados (banco de dados)
Route::prefix('api')->name('api.')->group(function () {
    Route::get('/flights', [FlightController::class, 'index'])->name('flights');
    Route::get('/flights/active', [FlightController::class, 'active'])->name('flights.active');
});

// Rotas legadas (compatibilidade)
Route::get('/flights', [FlightController::class, 'index']);

// ── Endpoint Prometheus ───────────────────────────────────────────────────────
// Configure o Prometheus para fazer scrape GET /metrics
// Recomendação: proteger com IP allowlist no nível do servidor (nginx/caddy)
Route::get('/metrics', [\App\Http\Controllers\MetricsController::class, 'index'])
    ->name('metrics');
