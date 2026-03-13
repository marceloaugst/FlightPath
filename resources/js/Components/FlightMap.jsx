import { useEffect, useState } from "react";
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

// Ícone customizado para aviões com diferentes cores por altitude
const createAirplaneIcon = (rotation = 0, altitude = 0, onGround = false) => {
    let color = "#2563eb"; // azul padrão

    if (onGround) {
        color = "#6b7280"; // cinza para no solo
    } else if (altitude > 12000) {
        color = "#dc2626"; // vermelho para alta altitude
    } else if (altitude > 6000) {
        color = "#f59e0b"; // amarelo para média altitude
    } else if (altitude > 0) {
        color = "#10b981"; // verde para baixa altitude
    }

    return L.divIcon({
        className: "custom-airplane-icon",
        html: `
      <div style="transform: rotate(${rotation}deg); font-size: 18px; color: ${color};">
        ${onGround ? "🛬" : "✈️"}
      </div>
    `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
};

// Componente para atualizar o mapa quando os voos mudam
function MapUpdater({ flights, realtime }) {
    const map = useMap();

    useEffect(() => {
        if (flights.length > 0) {
            const validFlights = flights.filter(
                (flight) =>
                    flight.latitude &&
                    flight.longitude &&
                    !isNaN(flight.latitude) &&
                    !isNaN(flight.longitude),
            );

            if (validFlights.length > 0) {
                const group = new L.featureGroup(
                    validFlights.map((flight) =>
                        L.marker([flight.latitude, flight.longitude]),
                    ),
                );

                map.fitBounds(group.getBounds(), {
                    padding: [50, 50],
                    maxZoom: realtime ? 6 : 4, // Zoom ligeiramente maior para tempo real
                });
            }
        }
    }, [flights, map, realtime]);

    return null;
}

export default function FlightMap({
    flights = [],
    refreshing = false,
    realtime = false,
}) {
    const [expandedFlight, setExpandedFlight] = useState(null);
    const [mapStats, setMapStats] = useState({});

    // Centro padrão (mais focado na Europa/Atlântico para melhor visualização)
    const defaultCenter = [45, 0];
    const defaultZoom = realtime ? 3 : 2;

    const validFlights = flights.filter(
        (flight) =>
            flight.latitude &&
            flight.longitude &&
            typeof flight.latitude === "number" &&
            typeof flight.longitude === "number" &&
            !isNaN(flight.latitude) &&
            !isNaN(flight.longitude),
    );

    // Calcular estatísticas do mapa
    useEffect(() => {
        const airborne = validFlights.filter((f) => !f.on_ground);
        const grounded = validFlights.filter((f) => f.on_ground);

        setMapStats({
            total: validFlights.length,
            airborne: airborne.length,
            grounded: grounded.length,
            highAltitude: airborne.filter((f) => (f.baro_altitude || 0) > 12000)
                .length,
            countries: [...new Set(validFlights.map((f) => f.origin_country))]
                .length,
        });
    }, [validFlights]);

    // Formatação de dados de voo melhorada
    const formatFlightData = (flight) => {
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
                : false, // 5 min
        };
    };

    return (
        <div className="relative">
            {/* Loading indicator aprimorado */}
            {refreshing && (
                <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg px-4 py-3 flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    <div>
                        <div className="text-sm font-medium text-gray-900">
                            {realtime
                                ? "Atualizando dados..."
                                : "Carregando..."}
                        </div>
                        <div className="text-xs text-gray-500">
                            {realtime ? "API OpenSky" : "Base de dados"}
                        </div>
                    </div>
                </div>
            )}

            {/* Estatísticas do mapa */}
            <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg px-4 py-3 space-y-1">
                <div className="text-sm font-medium text-gray-900">
                    {mapStats.total} voos no mapa
                </div>
                <div className="flex space-x-4 text-xs text-gray-600">
                    <span>🛫 {mapStats.airborne} voando</span>
                    <span>🛬 {mapStats.grounded} em solo</span>
                </div>
                <div className="text-xs text-gray-500">
                    {mapStats.countries} países • {mapStats.highAltitude} alta
                    altitude
                </div>
            </div>

            {/* Legenda de cores */}
            {realtime && (
                <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                        Legenda
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center space-x-2">
                            <span style={{ color: "#dc2626" }}>✈️</span>
                            <span>&gt; 12km (alta)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span style={{ color: "#f59e0b" }}>✈️</span>
                            <span>6-12km (média)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span style={{ color: "#10b981" }}>✈️</span>
                            <span>&lt; 6km (baixa)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span style={{ color: "#6b7280" }}>🛬</span>
                            <span>Em solo</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Map */}
            <div className="h-[600px] rounded-lg overflow-hidden shadow-lg">
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

                    <MapUpdater flights={validFlights} realtime={realtime} />

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
                                    click: () => {
                                        setExpandedFlight(
                                            expandedFlight === flight.icao24
                                                ? null
                                                : flight.icao24,
                                        );
                                    },
                                }}
                            >
                                <Popup>
                                    <div className="min-w-[250px] max-w-[300px]">
                                        <div className="font-medium text-lg mb-3 flex items-center justify-between">
                                            <span>
                                                {formattedFlight.on_ground
                                                    ? "🛬"
                                                    : "✈️"}{" "}
                                                {formattedFlight.callsign?.trim() ||
                                                    "Voo desconhecido"}
                                            </span>
                                            {formattedFlight.isRecent && (
                                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                                    Ativo
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <strong>ICAO24:</strong>
                                                    <br />
                                                    <span className="text-xs font-mono">
                                                        {formattedFlight.icao24}
                                                    </span>
                                                </div>
                                                <div>
                                                    <strong>País:</strong>
                                                    <br />
                                                    <span>
                                                        {
                                                            formattedFlight.origin_country
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {!formattedFlight.on_ground && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <strong>
                                                            Altitude:
                                                        </strong>
                                                        <br />
                                                        <span>
                                                            {formattedFlight.altitude
                                                                ? `${formattedFlight.altitude.toLocaleString()} m`
                                                                : "N/A"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <strong>
                                                            Velocidade:
                                                        </strong>
                                                        <br />
                                                        <span>
                                                            {formattedFlight.speed
                                                                ? `${formattedFlight.speed} km/h`
                                                                : "N/A"}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <strong>Coordenadas:</strong>
                                                <br />
                                                <span className="text-xs text-gray-600">
                                                    {formattedFlight.latitude.toFixed(
                                                        4,
                                                    )}
                                                    °,{" "}
                                                    {formattedFlight.longitude.toFixed(
                                                        4,
                                                    )}
                                                    °
                                                </span>
                                            </div>

                                            {formattedFlight.true_track !==
                                                null && (
                                                <div>
                                                    <strong>Direção:</strong>{" "}
                                                    {Math.round(
                                                        formattedFlight.true_track,
                                                    )}
                                                    °
                                                </div>
                                            )}

                                            {formattedFlight.lastContact && (
                                                <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
                                                    Último contato:{" "}
                                                    {formattedFlight.lastContact.toLocaleTimeString(
                                                        "pt-BR",
                                                    )}
                                                    {realtime && (
                                                        <div className="text-green-600">
                                                            • Dados em tempo
                                                            real
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
}
