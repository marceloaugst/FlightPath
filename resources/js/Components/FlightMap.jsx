import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix para ícones do Leaflet no Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Cache para ícones pre-gerados (otimização de performance)
const iconCache = new Map();

// Ícone customizado para aviões com diferentes cores por altitude (memoizado)
const createAirplaneIcon = (rotation = 0, altitude = 0, onGround = false) => {
    const cacheKey = `${Math.round(rotation / 10) * 10}-${altitude > 12000 ? "high" : altitude > 6000 ? "mid" : altitude > 0 ? "low" : "ground"}-${onGround}`;

    if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey);
    }

    let color = "#2563eb"; // azul padrão
    let shadow = "0 0 10px rgba(37, 99, 235, 0.5)";

    if (onGround) {
        color = "#6b7280"; // cinza para no solo
        shadow = "0 0 8px rgba(107, 114, 128, 0.3)";
    } else if (altitude > 12000) {
        color = "#ef4444"; // vermelho para alta altitude
        shadow = "0 0 12px rgba(239, 68, 68, 0.6)";
    } else if (altitude > 6000) {
        color = "#f59e0b"; // amarelo para média altitude
        shadow = "0 0 10px rgba(245, 158, 11, 0.5)";
    } else if (altitude > 0) {
        color = "#22c55e"; // verde para baixa altitude
        shadow = "0 0 10px rgba(34, 197, 94, 0.5)";
    }

    const icon = L.divIcon({
        className: "custom-airplane-icon",
        html: `
      <div style="
        transform: rotate(${rotation}deg);
        font-size: 18px;
        color: ${color};
        filter: drop-shadow(${shadow});
        transition: all 0.3s ease;
      ">
        ${onGround ? "🛬" : "✈️"}
      </div>
    `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });

    iconCache.set(cacheKey, icon);
    return icon;
};

// Componente otimizado para atualizar o mapa quando os voos mudam
function MapUpdater({ flights, realtime }) {
    const map = useMap();

    const validFlights = useMemo(
        () =>
            flights.filter(
                (flight) =>
                    flight.latitude &&
                    flight.longitude &&
                    !isNaN(flight.latitude) &&
                    !isNaN(flight.longitude),
            ),
        [flights],
    );

    useEffect(() => {
        if (validFlights.length > 0) {
            const group = new L.featureGroup(
                validFlights.map((flight) =>
                    L.marker([flight.latitude, flight.longitude]),
                ),
            );

            map.fitBounds(group.getBounds(), {
                padding: [50, 50],
                maxZoom: realtime ? 6 : 4,
            });
        }
    }, [validFlights, map, realtime]);

    return null;
}

const MemoizedMapUpdater = memo(MapUpdater);

const FlightMap = memo(function FlightMap({
    flights = [],
    refreshing = false,
    realtime = false,
}) {
    const [expandedFlight, setExpandedFlight] = useState(null);

    // Centro padrão (mais focado na Europa/Atlântico para melhor visualização)
    const defaultCenter = [45, 0];
    const defaultZoom = realtime ? 3 : 2;

    // Memoização dos voos válidos (otimização crítica)
    const validFlights = useMemo(
        () =>
            flights.filter(
                (flight) =>
                    flight.latitude &&
                    flight.longitude &&
                    typeof flight.latitude === "number" &&
                    typeof flight.longitude === "number" &&
                    !isNaN(flight.latitude) &&
                    !isNaN(flight.longitude),
            ),
        [flights],
    );

    // Memoização das estatísticas do mapa
    const mapStats = useMemo(() => {
        const airborne = validFlights.filter((f) => !f.on_ground);
        const grounded = validFlights.filter((f) => f.on_ground);

        return {
            total: validFlights.length,
            airborne: airborne.length,
            grounded: grounded.length,
            highAltitude: airborne.filter((f) => (f.baro_altitude || 0) > 12000)
                .length,
            countries: [...new Set(validFlights.map((f) => f.origin_country))]
                .length,
        };
    }, [validFlights]);

    // Formatação de dados de voo melhorada e memoizada
    const formatFlightData = useCallback((flight) => {
        const altitude = flight.baro_altitude || flight.geo_altitude || 0;
        const speed =
            flight.speed_kmh || (flight.velocity ? flight.velocity * 3.6 : 0);
        const lastContact = flight.last_contact
            ? new Date(flight.last_contact)
            : null;

        return {
            ...flight,
            altitude: Math.round(altitude),
            speed: Math.round(speed),
            lastContact,
            isRecent: lastContact
                ? Date.now() - lastContact.getTime() < 300000
                : false,
        };
    }, []);

    // Callback para toggle do flight expandido
    const handleFlightClick = useCallback((icao24) => {
        setExpandedFlight((prev) => (prev === icao24 ? null : icao24));
    }, []);

    return (
        <div className="relative">
            {/* Loading indicator aprimorado com glassmorphism */}
            {refreshing && (
                <div
                    className="absolute top-4 right-4 z-[1000]
                    bg-white/20 backdrop-blur-md border border-white/30
                    rounded-2xl shadow-2xl px-6 py-4 flex items-center space-x-4
                    animate-pulse"
                >
                    <div className="flex-shrink-0">
                        <div className="w-6 h-6 relative">
                            <div className="absolute inset-0 rounded-full border-2 border-blue-400/30"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white drop-shadow-lg">
                            {realtime ? "Dados ao vivo" : "Carregando..."}
                        </div>
                        <div className="text-xs text-white/80">
                            {realtime ? "OpenSky Network" : "Cache local"}
                        </div>
                    </div>
                </div>
            )}

            {/* Estatísticas do mapa com design moderno */}
            <div
                className="absolute top-4 left-4 z-[1000]
                bg-gradient-to-br from-blue-500/20 to-purple-600/20
                backdrop-blur-lg border border-white/20
                rounded-2xl shadow-xl px-6 py-4 space-y-3"
            >
                <div className="flex items-center space-x-3">
                    <div
                        className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600
                        rounded-full flex items-center justify-center"
                    >
                        <span className="text-white font-bold text-lg">✈</span>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-white drop-shadow-md">
                            {mapStats.total}
                        </div>
                        <div className="text-xs text-white/80">voos ativos</div>
                    </div>
                </div>

                <div className="flex space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-white/90">
                            {mapStats.airborne}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-white/90">
                            {mapStats.grounded}
                        </span>
                    </div>
                </div>

                <div className="text-xs text-white/70 border-t border-white/20 pt-2">
                    {mapStats.countries} países • {mapStats.highAltitude} alta
                    altitude
                </div>
            </div>

            {/* Legenda moderna com animações */}
            {realtime && (
                <div
                    className="absolute bottom-4 left-4 z-[1000]
                    bg-gradient-to-br from-gray-800/30 to-gray-900/30
                    backdrop-blur-md border border-white/20
                    rounded-2xl shadow-lg px-5 py-4"
                >
                    <div className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                        <span>Altitude</span>
                    </div>
                    <div className="space-y-2 text-xs">
                        <div className="flex items-center space-x-3 group hover:bg-white/10 px-2 py-1 rounded-lg transition-all">
                            <span className="text-red-400 text-base">✈️</span>
                            <span className="text-white/90">&gt; 12km</span>
                            <span className="text-red-300">(alta)</span>
                        </div>
                        <div className="flex items-center space-x-3 group hover:bg-white/10 px-2 py-1 rounded-lg transition-all">
                            <span className="text-yellow-400 text-base">
                                ✈️
                            </span>
                            <span className="text-white/90">6-12km</span>
                            <span className="text-yellow-300">(média)</span>
                        </div>
                        <div className="flex items-center space-x-3 group hover:bg-white/10 px-2 py-1 rounded-lg transition-all">
                            <span className="text-green-400 text-base">✈️</span>
                            <span className="text-white/90">&lt; 6km</span>
                            <span className="text-green-300">(baixa)</span>
                        </div>
                        <div className="flex items-center space-x-3 group hover:bg-white/10 px-2 py-1 rounded-lg transition-all">
                            <span className="text-gray-400 text-base">🛬</span>
                            <span className="text-white/90">solo</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Map com bordas arredondadas e sombra moderna */}
            <div className="h-[600px] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                <MapContainer
                    center={defaultCenter}
                    zoom={defaultZoom}
                    style={{ height: "100%", width: "100%" }}
                    className="z-10"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MemoizedMapUpdater
                        flights={validFlights}
                        realtime={realtime}
                    />

                    {validFlights.map((flight, index) => {
                        const formattedFlight = formatFlightData(flight);
                        const position = [
                            formattedFlight.latitude,
                            formattedFlight.longitude,
                        ];
                        const heading = formattedFlight.true_track || 0;
                        const altitude = formattedFlight.baro_altitude || 0;

                        return (
                            <Marker
                                key={`${flight.icao24}-${index}`}
                                position={position}
                                icon={createAirplaneIcon(
                                    heading,
                                    altitude,
                                    flight.on_ground,
                                )}
                                eventHandlers={{
                                    click: () =>
                                        handleFlightClick(flight.icao24),
                                }}
                            >
                                <Popup className="modern-popup">
                                    <div className="min-w-[280px] max-w-[320px] bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xl">
                                                    {formattedFlight.on_ground
                                                        ? "🛬"
                                                        : "✈️"}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg">
                                                        {formattedFlight.callsign?.trim() ||
                                                            "Voo anônimo"}
                                                    </div>
                                                    <div className="text-sm text-gray-300">
                                                        {
                                                            formattedFlight.origin_country
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                            {formattedFlight.isRecent && (
                                                <div className="bg-green-500/20 border border-green-500 text-green-300 text-xs px-3 py-1 rounded-full flex items-center space-x-1">
                                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                    <span>AO VIVO</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {!formattedFlight.on_ground && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white/10 rounded-xl p-3">
                                                        <label className="text-xs text-gray-400 uppercase tracking-wider">
                                                            Altitude
                                                        </label>
                                                        <div className="text-lg font-bold">
                                                            {formattedFlight.altitude
                                                                ? `${formattedFlight.altitude.toLocaleString()}m`
                                                                : "N/A"}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/10 rounded-xl p-3">
                                                        <label className="text-xs text-gray-400 uppercase tracking-wider">
                                                            Velocidade
                                                        </label>
                                                        <div className="text-lg font-bold">
                                                            {formattedFlight.speed
                                                                ? `${formattedFlight.speed}km/h`
                                                                : "N/A"}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="bg-white/5 rounded-xl p-3">
                                                <label className="text-xs text-gray-400 uppercase tracking-wider">
                                                    ICAO24
                                                </label>
                                                <div className="font-mono text-sm text-blue-300">
                                                    {formattedFlight.icao24}
                                                </div>
                                            </div>

                                            <div className="bg-white/5 rounded-xl p-3">
                                                <label className="text-xs text-gray-400 uppercase tracking-wider">
                                                    Coordenadas
                                                </label>
                                                <div className="text-sm font-mono text-gray-300">
                                                    {formattedFlight.latitude.toFixed(
                                                        4,
                                                    )}
                                                    °,{" "}
                                                    {formattedFlight.longitude.toFixed(
                                                        4,
                                                    )}
                                                    °
                                                </div>
                                            </div>

                                            {formattedFlight.lastContact && (
                                                <div className="text-xs text-gray-400 pt-3 border-t border-white/20">
                                                    <div className="flex items-center justify-between">
                                                        <span>
                                                            Último contato:
                                                        </span>
                                                        <span>
                                                            {formattedFlight.lastContact.toLocaleTimeString(
                                                                "pt-BR",
                                                            )}
                                                        </span>
                                                    </div>
                                                    {realtime && (
                                                        <div className="text-green-400 mt-1 flex items-center space-x-1">
                                                            <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                                                            <span>
                                                                Dados em tempo
                                                                real
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
});

export default FlightMap;
