import { useEffect, useMemo, useCallback, useRef, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const iconCache = new Map();
const MAX_MARKERS = 150;

// Color by altitude range (matches a rainbow gradient like the reference)
function altitudeColor(altitude, onGround) {
    if (onGround) return "#64748b"; // slate for grounded
    if (!altitude || altitude <= 0) return "#64748b";
    if (altitude < 3000) return "#f97316"; // orange — low
    if (altitude < 6000) return "#eab308"; // yellow
    if (altitude < 9000) return "#22c55e"; // green
    if (altitude < 12000) return "#06b6d4"; // cyan
    return "#a855f7"; // purple — very high
}

const createAirplaneIcon = (
    rotation = 0,
    altitude = 0,
    onGround = false,
    selected = false,
) => {
    const colorKey = onGround
        ? "g"
        : altitude > 12000
          ? "p"
          : altitude > 9000
            ? "c"
            : altitude > 6000
              ? "gr"
              : altitude > 3000
                ? "y"
                : "o";
    const cacheKey = `${Math.round(rotation / 15) * 15}-${colorKey}-${selected ? "s" : "n"}`;

    if (iconCache.has(cacheKey)) return iconCache.get(cacheKey);

    const color = altitudeColor(altitude, onGround);
    const size = selected ? 16 : 11;
    const glow = selected ? `filter: drop-shadow(0 0 4px ${color});` : "";

    const icon = L.divIcon({
        className: "aircraft-icon",
        html: `<svg width="${size}" height="${size}" viewBox="0 0 16 16" style="transform: rotate(${rotation}deg); ${glow}">
            <path fill="${color}" d="M8 1L7 5H3L4 7H7L8 15L9 7H12L13 5H9L8 1Z"/>
        </svg>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });

    iconCache.set(cacheKey, icon);
    return icon;
};

// MapUpdater: fitBounds only once on first load; pan on selected flight
const MapUpdater = memo(({ flights, selectedFlight }) => {
    const map = useMap();
    const initializedRef = useRef(false);

    useEffect(() => {
        if (selectedFlight?.latitude && selectedFlight?.longitude) {
            map.setView(
                [selectedFlight.latitude, selectedFlight.longitude],
                7,
                { animate: true },
            );
            return;
        }
        // Only auto-fit on the very first batch of data
        if (!initializedRef.current && flights.length > 0) {
            initializedRef.current = true;
            const sample = flights.slice(0, 5);
            const group = new L.featureGroup(
                sample.map((f) => L.marker([f.latitude, f.longitude])),
            );
            map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 4 });
        }
    }, [flights, map, selectedFlight]);

    return null;
});

// ─── Memoised marker — only re-renders when position / altitude / selection changes
const FlightMarker = memo(
    function FlightMarker({ flight, isSelected, onSelectFlight }) {
        const handleClick = useCallback(
            () => onSelectFlight(flight),
            [flight, onSelectFlight],
        );

        return (
            <Marker
                position={[flight.latitude, flight.longitude]}
                icon={createAirplaneIcon(
                    flight.true_track || 0,
                    flight.baro_altitude || 0,
                    flight.on_ground,
                    isSelected,
                )}
                eventHandlers={
                    onSelectFlight ? { click: handleClick } : undefined
                }
            >
                <Popup className="sky-popup">
                    <div className="bg-slate-900 border border-slate-600 rounded p-2 min-w-[180px] text-xs text-slate-200">
                        <div className="font-semibold text-sky-400 mb-1.5 text-sm">
                            {flight.callsign?.trim() || flight.icao24}
                        </div>
                        <div className="space-y-0.5 text-slate-300">
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Country</span>
                                <span>{flight.origin_country || "—"}</span>
                            </div>
                            {!flight.on_ground && flight.baro_altitude && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-500">
                                        Altitude
                                    </span>
                                    <span>
                                        {Math.round(
                                            flight.baro_altitude * 3.28084,
                                        ).toLocaleString()}{" "}
                                        ft
                                    </span>
                                </div>
                            )}
                            {flight.speed_kmh && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-500">
                                        Speed
                                    </span>
                                    <span>
                                        {Math.round(flight.speed_kmh / 1.852)}{" "}
                                        kt
                                    </span>
                                </div>
                            )}
                            {flight.true_track != null && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-500">
                                        Track
                                    </span>
                                    <span>
                                        {Math.round(flight.true_track)}°
                                    </span>
                                </div>
                            )}
                            <div className="text-slate-600 pt-1 border-t border-slate-700 mt-1">
                                {flight.icao24} ·{" "}
                                {flight.on_ground ? "On ground" : "Airborne"}
                            </div>
                        </div>
                    </div>
                </Popup>
            </Marker>
        );
    },
    (prev, next) =>
        prev.isSelected === next.isSelected &&
        prev.flight.latitude === next.flight.latitude &&
        prev.flight.longitude === next.flight.longitude &&
        prev.flight.true_track === next.flight.true_track &&
        prev.flight.baro_altitude === next.flight.baro_altitude,
);

const FlightMap = memo(function FlightMap({
    flights = [],
    refreshing = false,
    selectedFlight = null,
    onSelectFlight = null,
}) {
    const validFlights = useMemo(() => {
        return flights
            .filter(
                (f) =>
                    f.latitude &&
                    f.longitude &&
                    !isNaN(f.latitude) &&
                    !isNaN(f.longitude),
            )
            .slice(0, MAX_MARKERS);
    }, [flights]);

    return (
        <div className="relative w-full h-full">
            {/* Live badge */}
            {refreshing && (
                <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 border border-slate-600 rounded px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-slate-300">
                    <div className="w-2 h-2 border border-slate-400 border-t-sky-400 rounded-full animate-spin"></div>
                    Updating…
                </div>
            )}

            {/* Altitude legend */}
            <div className="absolute bottom-8 left-3 z-[1000] bg-slate-900/85 border border-slate-700 rounded px-3 py-2 text-xs text-slate-300">
                <div className="flex items-center gap-1 mb-1">
                    <span className="text-slate-400 text-[10px] uppercase tracking-wide">
                        Altitude (ft)
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {[
                        { color: "#f97316", label: "0" },
                        { color: "#eab308", label: "10k" },
                        { color: "#22c55e", label: "20k" },
                        { color: "#06b6d4", label: "30k" },
                        { color: "#a855f7", label: "40k+" },
                    ].map(({ color, label }) => (
                        <span key={label} className="flex items-center gap-0.5">
                            <span style={{ color }} className="text-[10px]">
                                ■
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {label}
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Map — dark tile */}
            <MapContainer
                center={[30, 10]}
                zoom={3}
                style={{ height: "100%", width: "100%", background: "#0f172a" }}
                zoomControl={true}
                attributionControl={false}
            >
                {/* Dark map tile — CartoDB Dark Matter */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    maxZoom={19}
                />

                <MapUpdater
                    flights={validFlights}
                    selectedFlight={selectedFlight}
                />

                {validFlights.map((flight, index) => (
                    <FlightMarker
                        key={`${flight.icao24}-${index}`}
                        flight={flight}
                        isSelected={selectedFlight?.icao24 === flight.icao24}
                        onSelectFlight={onSelectFlight}
                    />
                ))}
            </MapContainer>
        </div>
    );
});

export default FlightMap;
