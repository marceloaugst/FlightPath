import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import Layout from "../Layouts/Layout";
import FlightMap from "../Components/FlightMap";
import { useWebSocket } from "../hooks/useWebSocket";

// ─── Pure helpers (outside component → never re-created) ─────────────────────
const metersToFeet = (m) => (m ? Math.round(m * 3.28084) : null);
const msToKnots = (ms) => (ms ? Math.round(ms * 1.94384) : null);

// ─── Virtualization ───────────────────────────────────────────────────────────
const ROW_HEIGHT = 28; // px — must match the row's rendered height

function useVirtualList(items, containerRef, overscan = 8) {
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        setContainerHeight(el.clientHeight);

        const onScroll = () => setScrollTop(el.scrollTop);
        el.addEventListener("scroll", onScroll, { passive: true });

        const ro = new ResizeObserver(() =>
            setContainerHeight(el.clientHeight),
        );
        ro.observe(el);

        return () => {
            el.removeEventListener("scroll", onScroll);
            ro.disconnect();
        };
    }, [containerRef]);

    return useMemo(() => {
        const startIdx = Math.max(
            0,
            Math.floor(scrollTop / ROW_HEIGHT) - overscan,
        );
        const endIdx = Math.min(
            items.length - 1,
            Math.floor((scrollTop + containerHeight) / ROW_HEIGHT) + overscan,
        );
        return {
            virtualItems: items.slice(startIdx, endIdx + 1).map((item, i) => ({
                item,
                index: startIdx + i,
                offsetTop: (startIdx + i) * ROW_HEIGHT,
            })),
            totalHeight: items.length * ROW_HEIGHT,
        };
    }, [items, scrollTop, containerHeight, overscan]);
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

// ─── Memoised flight row ──────────────────────────────────────────────────────
const FlightRow = memo(
    function FlightRow({ flight, isSelected, onSelect, altFt, spdKt }) {
        return (
            <div
                onClick={() => onSelect(flight)}
                style={{ height: ROW_HEIGHT }}
                className={`grid grid-cols-5 px-2 items-center cursor-pointer border-b border-slate-800 transition-colors text-xs ${
                    isSelected
                        ? "bg-sky-900/60 border-l-2 border-l-sky-400"
                        : "hover:bg-slate-800/60"
                }`}
            >
                <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-slate-100 truncate">
                        {flight.callsign?.trim() || flight.icao24}
                    </span>
                </div>
                <span className="text-right text-slate-300 tabular-nums">
                    {altFt != null ? altFt.toLocaleString() : "—"}
                </span>
                <span className="text-right text-slate-300 tabular-nums">
                    {spdKt != null
                        ? spdKt
                        : flight.speed_kmh
                          ? Math.round(flight.speed_kmh / 1.852)
                          : "—"}
                </span>
                <span
                    className={`text-right tabular-nums ${flight.on_ground ? "text-slate-500" : "text-green-400"}`}
                >
                    {flight.on_ground ? "GND" : "—"}
                </span>
            </div>
        );
    },
    (prev, next) =>
        prev.isSelected === next.isSelected &&
        prev.altFt === next.altFt &&
        prev.spdKt === next.spdKt &&
        prev.flight.callsign === next.flight.callsign,
);

// Columns visible in the flight table
const COLUMNS = [
    { key: "callsign", label: "Callsign" },
    { key: "origin_country", label: "Country" },
    { key: "baro_altitude", label: "Alt (ft)" },
    { key: "speed_kmh", label: "Spd (kt)" },
    { key: "on_ground", label: "Status" },
];

export default function Dashboard({
    flights: initialFlights = [],
    stats: initialStats = {},
    realtime = false,
    cache_duration = 30,
    error = null,
}) {
    const {
        flights,
        stats,
        connectionStatus,
        lastUpdate,
        error: wsError,
        triggerUpdate,
    } = useWebSocket(initialFlights, initialStats);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(realtime);
    const [errorMessage, setErrorMessage] = useState(error || wsError);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [activeTab, setActiveTab] = useState("search");
    const [showSidebar, setShowSidebar] = useState(true);

    // Ref for virtualised list container
    const listContainerRef = useRef(null);

    // Debounce search so filteredFlights only recomputes 200ms after user stops typing
    const debouncedSearch = useDebounce(searchQuery, 200);

    useEffect(() => {
        setErrorMessage(error || wsError);
    }, [error, wsError]);

    const refreshFlights = useCallback(
        async (silent = false) => {
            if (!silent) setIsRefreshing(true);
            try {
                await triggerUpdate();
                setErrorMessage(null);
            } catch (err) {
                setErrorMessage(err.message);
            } finally {
                if (!silent) setIsRefreshing(false);
            }
        },
        [triggerUpdate],
    );

    useEffect(() => {
        if (!autoRefresh || !realtime) return;
        const interval = setInterval(
            () => refreshFlights(true),
            Math.max(cache_duration * 1000, 30000),
        );
        return () => clearInterval(interval);
    }, [autoRefresh, realtime, cache_duration, refreshFlights]);

    const formatLastUpdate = useMemo(() => {
        const diffMs = Date.now() - lastUpdate.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
        return lastUpdate.toLocaleTimeString();
    }, [lastUpdate]);

    // Filtered list uses DEBOUNCED query — avoids recomputing on every keystroke
    const filteredFlights = useMemo(() => {
        if (!debouncedSearch.trim()) return flights;
        const q = debouncedSearch.trim().toLowerCase();
        return flights.filter(
            (f) =>
                f.callsign?.toLowerCase().includes(q) ||
                f.origin_country?.toLowerCase().includes(q) ||
                f.icao24?.toLowerCase().includes(q),
        );
    }, [flights, debouncedSearch]);

    // Virtualised window over filteredFlights
    const { virtualItems, totalHeight } = useVirtualList(
        filteredFlights,
        listContainerRef,
    );

    const handleSelectFlight = useCallback(
        (flight) =>
            setSelectedFlight((prev) =>
                prev?.icao24 === flight.icao24 ? null : flight,
            ),
        [],
    );

    return (
        <Layout title="FlightPath — Live Flight Map">
            {/* Full-screen dark layout */}
            <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
                {/* ── Top bar ── */}
                <header className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-700 shrink-0 z-10">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <svg
                                className="w-5 h-5 text-sky-400"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
                            </svg>
                            <span className="font-bold text-sky-400 tracking-widest text-sm uppercase">
                                FlightPath
                            </span>
                        </div>
                        <span className="hidden sm:block text-slate-500 text-xs">
                            Live Flight Map
                        </span>
                    </div>

                    {/* Center — counters */}
                    <div className="flex items-center gap-6 text-xs text-slate-400">
                        <div className="text-center">
                            <span className="block text-slate-100 font-semibold text-base leading-none">
                                {stats.total || 0}
                            </span>
                            <span>Total Aircraft</span>
                        </div>
                        <div className="text-center hidden sm:block">
                            <span className="block text-green-400 font-semibold text-base leading-none">
                                {stats.airborne || 0}
                            </span>
                            <span>Airborne</span>
                        </div>
                        <div className="text-center hidden md:block">
                            <span className="block text-sky-400 font-semibold text-base leading-none">
                                {stats.with_position || 0}
                            </span>
                            <span>On Screen</span>
                        </div>
                        <div className="text-center hidden md:block">
                            <span className="block text-purple-400 font-semibold text-base leading-none">
                                {stats.countries || 0}
                            </span>
                            <span>Countries</span>
                        </div>
                    </div>

                    {/* Right — status & controls */}
                    <div className="flex items-center gap-3">
                        {errorMessage && (
                            <span className="text-red-400 text-xs hidden sm:block">
                                {errorMessage}
                            </span>
                        )}

                        {/* Live indicator */}
                        <div className="flex items-center gap-1.5 text-xs">
                            <div
                                className={`w-2 h-2 rounded-full ${
                                    connectionStatus === "connected"
                                        ? "bg-green-400 animate-pulse"
                                        : connectionStatus === "connecting"
                                          ? "bg-yellow-400 animate-pulse"
                                          : "bg-red-500"
                                }`}
                            />
                            <span className="hidden sm:block text-slate-400">
                                {connectionStatus === "connected"
                                    ? `Live · ${formatLastUpdate}`
                                    : connectionStatus}
                            </span>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) =>
                                    setAutoRefresh(e.target.checked)
                                }
                                className="accent-sky-500 w-3 h-3"
                            />
                            Auto
                        </label>

                        <button
                            onClick={() => refreshFlights()}
                            disabled={isRefreshing}
                            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded transition-colors font-medium"
                        >
                            {isRefreshing ? "..." : "Refresh"}
                        </button>

                        <button
                            onClick={() => setShowSidebar((v) => !v)}
                            className="text-slate-400 hover:text-slate-200 transition-colors text-xs px-1.5 py-1.5 rounded border border-slate-700"
                            title="Toggle panel"
                        >
                            {showSidebar ? "▶" : "◀"}
                        </button>
                    </div>
                </header>

                {/* ── Body: map + right panel ── */}
                <div className="flex flex-1 min-h-0">
                    {/* Map — fills remaining space */}
                    <div className="flex-1 relative min-w-0">
                        <FlightMap
                            flights={flights}
                            refreshing={isRefreshing}
                            realtime={realtime}
                            selectedFlight={selectedFlight}
                            onSelectFlight={handleSelectFlight}
                        />
                    </div>

                    {/* ── Right panel ── */}
                    {showSidebar && (
                        <aside className="w-72 bg-slate-950 border-l border-slate-700 flex flex-col shrink-0 overflow-hidden">
                            {/* Tab bar */}
                            <div className="flex border-b border-slate-700 shrink-0">
                                {["search", "filters", "columns"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-2 text-xs font-medium capitalize tracking-wide transition-colors ${
                                            activeTab === tab
                                                ? "text-sky-400 border-b-2 border-sky-400 bg-slate-900"
                                                : "text-slate-400 hover:text-slate-200"
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Search tab */}
                            {activeTab === "search" && (
                                <div className="px-3 py-2 border-b border-slate-700 shrink-0">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Callsign, country, ICAO…"
                                            value={searchQuery}
                                            onChange={(e) =>
                                                setSearchQuery(e.target.value)
                                            }
                                            className="flex-1 bg-slate-800 border border-slate-600 text-slate-100 text-xs px-2 py-1.5 rounded placeholder-slate-500 focus:outline-none focus:border-sky-500"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() =>
                                                    setSearchQuery("")
                                                }
                                                className="text-slate-500 hover:text-slate-200 px-1 text-xs"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Filters tab */}
                            {activeTab === "filters" && (
                                <div className="px-3 py-3 border-b border-slate-700 shrink-0 space-y-2">
                                    <p className="text-xs text-slate-500">
                                        Filter by status
                                    </p>
                                    <div className="flex gap-2">
                                        <span className="text-xs bg-slate-800 border border-slate-600 px-2 py-1 rounded text-slate-300">
                                            All
                                        </span>
                                        <span className="text-xs bg-slate-800 border border-slate-600 px-2 py-1 rounded text-green-400">
                                            Airborne
                                        </span>
                                        <span className="text-xs bg-slate-800 border border-slate-600 px-2 py-1 rounded text-slate-400">
                                            Ground
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Columns tab */}
                            {activeTab === "columns" && (
                                <div className="px-3 py-3 border-b border-slate-700 shrink-0 space-y-1.5">
                                    <p className="text-xs text-slate-500 mb-2">
                                        Visible columns
                                    </p>
                                    {COLUMNS.map((col) => (
                                        <label
                                            key={col.key}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                defaultChecked
                                                className="accent-sky-500 w-3 h-3"
                                            />
                                            <span className="text-xs text-slate-300">
                                                {col.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Table header */}
                            <div className="grid grid-cols-5 px-2 py-1.5 bg-slate-800 border-b border-slate-700 shrink-0">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide col-span-2">
                                    Callsign
                                </span>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">
                                    Alt
                                </span>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">
                                    Spd
                                </span>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">
                                    RSSI
                                </span>
                            </div>

                            {/* Flight rows — virtualised */}
                            <div
                                ref={listContainerRef}
                                className="flex-1 overflow-y-auto"
                            >
                                {filteredFlights.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm">
                                        <svg
                                            className="w-8 h-8 mb-2 opacity-40"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            />
                                        </svg>
                                        {searchQuery
                                            ? "No results"
                                            : "No flights loaded"}
                                    </div>
                                ) : (
                                    /* Outer div holds the full scrollable height */
                                    <div
                                        style={{
                                            height: totalHeight,
                                            position: "relative",
                                        }}
                                    >
                                        {virtualItems.map(
                                            ({
                                                item: flight,
                                                index,
                                                offsetTop,
                                            }) => {
                                                const isSelected =
                                                    selectedFlight?.icao24 ===
                                                    flight.icao24;
                                                const altFt = metersToFeet(
                                                    flight.baro_altitude,
                                                );
                                                const spdKt = msToKnots(
                                                    flight.velocity,
                                                );
                                                return (
                                                    <div
                                                        key={`${flight.icao24}-${index}`}
                                                        style={{
                                                            position:
                                                                "absolute",
                                                            top: offsetTop,
                                                            width: "100%",
                                                        }}
                                                    >
                                                        <FlightRow
                                                            flight={flight}
                                                            isSelected={
                                                                isSelected
                                                            }
                                                            onSelect={
                                                                handleSelectFlight
                                                            }
                                                            altFt={altFt}
                                                            spdKt={spdKt}
                                                        />
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Panel footer */}
                            <div className="px-3 py-2 border-t border-slate-700 shrink-0 flex items-center justify-between text-xs text-slate-500">
                                <span>{filteredFlights.length} aircraft</span>
                                <span>{formatLastUpdate}</span>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </Layout>
    );
}
