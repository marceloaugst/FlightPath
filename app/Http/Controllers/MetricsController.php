<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Cache;

class MetricsController extends Controller
{
   /**
    * Endpoint Prometheus — expõe métricas no formato text/plain 0.0.4.
    * Configurar o Prometheus para fazer scrape de GET /metrics.
    */
   public function index()
   {
      /** @var array $flights */
      $flights = Cache::get('flights_data', []);

      $total       = count($flights);
      $airborne    = 0;
      $onGround    = 0;
      $lowAltitude = 0;

      foreach ($flights as $flight) {
         if ($flight['on_ground'] ?? false) {
            $onGround++;
         } else {
            $airborne++;
            $alt = $flight['baro_altitude'] ?? null;
            if ($alt !== null && $alt > 0 && $alt < 1000) {
               $lowAltitude++;
            }
         }
      }

      $areaEntries = (int) Cache::get('prometheus_area_entries', 0);
      $disappeared  = (int) Cache::get('prometheus_disappeared', 0);
      $lastUpdate   = Cache::get('flights_last_update');
      $tsUnix       = $lastUpdate ? $lastUpdate->timestamp : time();

      $lines = [];

      // ── Totais ────────────────────────────────────────────────────────────
      $lines[] = '# HELP opensky_flights_total Total de aeronaves monitoradas';
      $lines[] = '# TYPE opensky_flights_total gauge';
      $lines[] = "opensky_flights_total {$total}";

      $lines[] = '# HELP opensky_flights_airborne Aeronaves em voo';
      $lines[] = '# TYPE opensky_flights_airborne gauge';
      $lines[] = "opensky_flights_airborne {$airborne}";

      $lines[] = '# HELP opensky_flights_on_ground Aeronaves em solo';
      $lines[] = '# TYPE opensky_flights_on_ground gauge';
      $lines[] = "opensky_flights_on_ground {$onGround}";

      // ── Alertas de altitude baixa ─────────────────────────────────────────
      $lines[] = '# HELP opensky_flights_low_altitude Aeronaves em voo abaixo de 1000 m';
      $lines[] = '# TYPE opensky_flights_low_altitude gauge';
      $lines[] = "opensky_flights_low_altitude {$lowAltitude}";

      // ── Altitude por aeronave ─────────────────────────────────────────────
      $lines[] = '# HELP opensky_flight_altitude_meters Altitude barométrica por aeronave (metros)';
      $lines[] = '# TYPE opensky_flight_altitude_meters gauge';

      foreach ($flights as $flight) {
         $alt = $flight['baro_altitude'] ?? null;
         if ($alt === null || ($flight['on_ground'] ?? false)) {
            continue;
         }
         $callsign = $this->escapeLabel(trim($flight['callsign'] ?? ''));
         $icao24   = $this->escapeLabel($flight['icao24'] ?? 'unknown');
         $country  = $this->escapeLabel($flight['origin_country'] ?? 'unknown');
         $altVal   = (float) $alt;
         $lines[]  = "opensky_flight_altitude_meters{callsign=\"{$callsign}\",icao24=\"{$icao24}\",country=\"{$country}\"} {$altVal}";
      }

      // ── Velocidade por aeronave ───────────────────────────────────────────
      $lines[] = '# HELP opensky_flight_velocity_ms Velocidade por aeronave (m/s)';
      $lines[] = '# TYPE opensky_flight_velocity_ms gauge';

      foreach ($flights as $flight) {
         $vel = $flight['velocity'] ?? null;
         if ($vel === null) continue;
         $callsign = $this->escapeLabel(trim($flight['callsign'] ?? ''));
         $icao24   = $this->escapeLabel($flight['icao24'] ?? 'unknown');
         $velVal   = (float) $vel;
         $lines[]  = "opensky_flight_velocity_ms{callsign=\"{$callsign}\",icao24=\"{$icao24}\"} {$velVal}";
      }

      // ── Contadores de eventos ─────────────────────────────────────────────
      $lines[] = '# HELP opensky_area_entries_total Total de aeronaves que entraram na área monitorada';
      $lines[] = '# TYPE opensky_area_entries_total counter';
      $lines[] = "opensky_area_entries_total {$areaEntries}";

      $lines[] = '# HELP opensky_disappeared_total Total de aeronaves que desapareceram do radar';
      $lines[] = '# TYPE opensky_disappeared_total counter';
      $lines[] = "opensky_disappeared_total {$disappeared}";

      // ── Timestamp da última atualização ──────────────────────────────────
      $lines[] = '# HELP opensky_last_update_timestamp Unix timestamp da última atualização dos voos';
      $lines[] = '# TYPE opensky_last_update_timestamp gauge';
      $lines[] = "opensky_last_update_timestamp {$tsUnix}";

      return response(implode("\n", $lines) . "\n", 200, [
         'Content-Type' => 'text/plain; version=0.0.4; charset=utf-8',
         'Cache-Control' => 'no-store',
      ]);
   }

   /** Escapa aspas duplas e barras invertidas em valores de label Prometheus. */
   private function escapeLabel(string $value): string
   {
      return str_replace(['\\', '"', "\n"], ['\\\\', '\\"', '\\n'], $value);
   }
}
