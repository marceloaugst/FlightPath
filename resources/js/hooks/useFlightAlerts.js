import { useState, useEffect, useRef, useCallback } from "react";

// ── Limites configuráveis ──────────────────────────────────────────────────────
const LOW_ALT_THRESHOLD_M = 1000; // Altitude baixa < 1 000 m (~3 300 ft)
const MAX_ALERTS = 50; // Máximo de alertas retidos em memória

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Hook que compara o conjunto anterior de voos com o atual e emite três
 * categorias de alertas (compatíveis com as regras Prometheus/AlertManager):
 *
 *  • area_entry    — nova aeronave apareceu na área monitorada
 *  • low_altitude  — aeronave em voo abaixo de LOW_ALT_THRESHOLD_M metros
 *  • disappeared   — aeronave presente antes sumiu do radar
 */
export function useFlightAlerts(flights) {
    const [alerts, setAlerts] = useState([]);
    const previousMapRef = useRef(null); // Map<icao24, flight>
    const lowAltActiveRef = useRef(new Set()); // icao24 já alertados por alt baixa

    const dismissAlert = useCallback((id) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, []);

    const dismissAll = useCallback(() => setAlerts([]), []);

    useEffect(() => {
        if (!flights || flights.length === 0) return;

        // Inicialização — primeira carga não gera alertas, apenas registra base
        if (previousMapRef.current === null) {
            previousMapRef.current = new Map(flights.map((f) => [f.icao24, f]));
            // Registrar os que já estão em altitude baixa na inicialização
            for (const f of flights) {
                const alt = f.baro_altitude;
                if (
                    !f.on_ground &&
                    alt != null &&
                    alt > 0 &&
                    alt < LOW_ALT_THRESHOLD_M
                ) {
                    lowAltActiveRef.current.add(f.icao24);
                }
            }
            return;
        }

        const previous = previousMapRef.current;
        const currentMap = new Map(flights.map((f) => [f.icao24, f]));
        const newAlerts = [];

        // 1 — Entrada em área (aeronave nova)
        for (const flight of flights) {
            if (!previous.has(flight.icao24)) {
                newAlerts.push({
                    id: generateId(),
                    type: "area_entry",
                    flight,
                    timestamp: new Date(),
                });
            }
        }

        // 2 — Altitude baixa (só alerta quando a condição aparece pela primeira vez)
        for (const flight of flights) {
            const alt = flight.baro_altitude;
            const isLow =
                !flight.on_ground &&
                alt != null &&
                alt > 0 &&
                alt < LOW_ALT_THRESHOLD_M;

            if (isLow && !lowAltActiveRef.current.has(flight.icao24)) {
                lowAltActiveRef.current.add(flight.icao24);
                newAlerts.push({
                    id: generateId(),
                    type: "low_altitude",
                    flight,
                    timestamp: new Date(),
                    details: { altitude_m: Math.round(alt) },
                });
            } else if (!isLow) {
                // Sair da condição de altitude baixa → liberar para re-alertar
                lowAltActiveRef.current.delete(flight.icao24);
            }
        }

        // 3 — Desapareceu do radar
        for (const [icao24, flight] of previous) {
            if (!currentMap.has(icao24)) {
                lowAltActiveRef.current.delete(icao24);
                newAlerts.push({
                    id: generateId(),
                    type: "disappeared",
                    flight,
                    timestamp: new Date(),
                });
            }
        }

        if (newAlerts.length > 0) {
            setAlerts((prev) => [...newAlerts, ...prev].slice(0, MAX_ALERTS));
        }

        previousMapRef.current = currentMap;
    }, [flights]);

    return { alerts, unreadCount: alerts.length, dismissAlert, dismissAll };
}
