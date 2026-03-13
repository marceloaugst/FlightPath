import {
    useState,
    useEffect,
    useMemo,
    useCallback,
    lazy,
    Suspense,
} from "react";
import { router } from "@inertiajs/react";
import Layout from "../Layouts/Layout";

// Lazy load do FlightMap para melhor performance inicial
const FlightMap = lazy(() => import("../Components/FlightMap"));

// Loading component para o map
const MapLoading = () => (
    <div className="h-[600px] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl">
        <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto relative">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-600 font-medium">Carregando mapa...</p>
        </div>
    </div>
);

export default function Dashboard({
    flights: initialFlights = [],
    stats: initialStats = {},
    realtime = false,
    cache_duration = 30,
    error = null,
}) {
    const [flights, setFlights] = useState(initialFlights);
    const [stats, setStats] = useState(initialStats);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [errorMessage, setErrorMessage] = useState(error);
    const [connectionStatus, setConnectionStatus] = useState("connected");

    // Otimização: debounce para refresh
    const [refreshTimeout, setRefreshTimeout] = useState(null);

    // Função para buscar novos dados em tempo real (memoizada)
    const refreshFlights = useCallback(async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        setErrorMessage(null);

        try {
            const response = await fetch("/api/dashboard/refresh", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN":
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute("content") || "",
                },
            });

            const data = await response.json();

            if (data.success) {
                setFlights(data.flights || []);
                setStats(data.stats || {});
                setLastUpdate(new Date());
                setConnectionStatus("connected");
            } else {
                throw new Error(data.message || "Erro desconhecido");
            }
        } catch (error) {
            console.error("Erro ao atualizar voos:", error);
            setErrorMessage(error.message);
            setConnectionStatus("error");
        } finally {
            if (!silent) setIsRefreshing(false);
        }
    }, []);

    // Otimização: função de test connection memoizada
    const testConnection = useCallback(async () => {
        try {
            const response = await fetch("/api/realtime/test");
            const data = await response.json();
            setConnectionStatus(data.success ? "connected" : "error");
        } catch {
            setConnectionStatus("error");
        }
    }, []);

    // Auto refresh otimizado com debounce
    useEffect(() => {
        let interval;

        if (autoRefresh && realtime) {
            interval = setInterval(() => {
                refreshFlights(true); // Silent refresh
            }, cache_duration * 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [autoRefresh, realtime, cache_duration, refreshFlights]);

    // Test connection on mount (otimizado)
    useEffect(() => {
        if (realtime) {
            testConnection();
        }
    }, [realtime, testConnection]);

    // Formatação memoizada do último update
    const formatLastUpdate = useMemo(() => {
        const diffMs = Date.now() - lastUpdate.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);

        if (diffSeconds < 60) return `${diffSeconds}s atrás`;
        if (diffSeconds < 3600)
            return `${Math.floor(diffSeconds / 60)}min atrás`;
        return lastUpdate.toLocaleTimeString("pt-BR");
    }, [lastUpdate]);

    // Status styles memoizados
    const statusConfig = useMemo(
        () => ({
            connected: {
                color: "bg-green-500",
                text: "Conectado",
                glow: "shadow-green-500/20",
            },
            error: {
                color: "bg-red-500",
                text: "Erro de conexão",
                glow: "shadow-red-500/20",
            },
            refreshing: {
                color: "bg-yellow-500",
                text: "Atualizando...",
                glow: "shadow-yellow-500/20",
            },
        }),
        [],
    );

    // Toggle auto-refresh otimizado
    const handleAutoRefreshToggle = useCallback((checked) => {
        setAutoRefresh(checked);
    }, []);

    // Manual refresh otimizado
    const handleManualRefresh = useCallback(() => {
        if (!isRefreshing) {
            refreshFlights();
        }
    }, [isRefreshing, refreshFlights]);

    return (
        <Layout title="Flight Tracker - Tempo Real">
            {/* Background moderno com gradiente */}
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
                {/* Elementos decorativos de fundo */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
                    <div className="absolute top-1/3 -left-8 w-96 h-96 bg-purple-500 rounded-full opacity-15 blur-3xl"></div>
                    <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-pink-500 rounded-full opacity-10 blur-3xl"></div>
                </div>

                <div className="relative z-10 space-y-8 p-6">
                    {/* Header Hero Section */}
                    <div className="text-center space-y-6 py-12">
                        <div className="space-y-4">
                            <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-purple-200">
                                SkyTracker
                            </h1>
                            <div className="flex items-center justify-center space-x-3">
                                <div
                                    className={`w-4 h-4 rounded-full ${statusConfig[connectionStatus]?.color} animate-pulse shadow-lg ${statusConfig[connectionStatus]?.glow}`}
                                ></div>
                                <span className="text-white/80 font-medium">
                                    {statusConfig[connectionStatus]?.text}
                                </span>
                                {realtime && (
                                    <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm border border-red-500/30">
                                        🔴 AO VIVO
                                    </span>
                                )}
                            </div>
                            <p className="text-white/70 text-lg max-w-2xl mx-auto">
                                Acompanhe voos em tempo real ao redor do mundo
                                com dados da OpenSky Network
                            </p>
                        </div>

                        {/* Controls modernos */}
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                            {errorMessage && (
                                <div className="bg-red-500/20 border border-red-500/30 backdrop-blur-md text-red-200 px-4 py-2 rounded-xl text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            <label className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 cursor-pointer hover:bg-white/20 transition-all">
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) =>
                                        handleAutoRefreshToggle(
                                            e.target.checked,
                                        )
                                    }
                                    className="w-4 h-4 rounded border-white/30 bg-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                                />
                                <span className="text-white font-medium">
                                    Auto-refresh
                                </span>
                            </label>

                            <button
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                                    disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold
                                    transition-all duration-300 flex items-center space-x-3 shadow-lg hover:shadow-xl
                                    hover:scale-105 disabled:hover:scale-100"
                            >
                                <svg
                                    className={`w-5 h-5 transition-transform duration-300 ${isRefreshing ? "animate-spin" : "group-hover:rotate-180"}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                <span>
                                    {isRefreshing
                                        ? "Atualizando..."
                                        : "Atualizar"}
                                </span>
                            </button>
                        </div>

                        <div className="text-white/60 text-sm">
                            Última atualização: {formatLastUpdate}
                            {realtime && (
                                <span className="ml-2">
                                    • Cache: {cache_duration}s
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Estatísticas modernas em layout assimétrico */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* Total Flights - Card principal maior */}
                        <div className="md:col-span-2 xl:col-span-1">
                            <div
                                className="group relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20
                                backdrop-blur-xl border border-white/20 rounded-2xl p-6
                                hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-500
                                hover:scale-105 cursor-pointer"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-blue-500/30 rounded-xl backdrop-blur-sm">
                                            <svg
                                                className="w-8 h-8 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                                />
                                            </svg>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-4xl font-black text-white tracking-tight">
                                                {stats.total?.toLocaleString() ||
                                                    0}
                                            </div>
                                            <div className="text-white/70 text-sm font-medium">
                                                Total de Voos
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-blue-400 to-cyan-400 h-2 rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${Math.min(100, (stats.total || 0) / 50)}%`,
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Com Posição */}
                        <div
                            className="group relative bg-gradient-to-br from-emerald-500/20 to-teal-500/20
                            backdrop-blur-xl border border-white/20 rounded-2xl p-6
                            hover:from-emerald-500/30 hover:to-teal-500/30 transition-all duration-500 hover:scale-105"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-emerald-500/30 rounded-xl">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white">
                                        {stats.with_position?.toLocaleString() ||
                                            0}
                                    </div>
                                    <div className="text-white/70 text-sm">
                                        Geolocalizados
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Países */}
                        <div
                            className="group relative bg-gradient-to-br from-violet-500/20 to-purple-500/20
                            backdrop-blur-xl border border-white/20 rounded-2xl p-6
                            hover:from-violet-500/30 hover:to-purple-500/30 transition-all duration-500 hover:scale-105"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-violet-500/30 rounded-xl">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white">
                                        {stats.countries?.toLocaleString() || 0}
                                    </div>
                                    <div className="text-white/70 text-sm">
                                        Países
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Voando */}
                        <div
                            className="group relative bg-gradient-to-br from-orange-500/20 to-red-500/20
                            backdrop-blur-xl border border-white/20 rounded-2xl p-6
                            hover:from-orange-500/30 hover:to-red-500/30 transition-all duration-500 hover:scale-105"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-orange-500/30 rounded-xl relative">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                        />
                                    </svg>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white">
                                        {stats.airborne?.toLocaleString() || 0}
                                    </div>
                                    <div className="text-white/70 text-sm">
                                        Em Voo
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mapa principal */}
                    <div
                        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6
                        shadow-2xl hover:bg-white/15 transition-all duration-500"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    Mapa Global {realtime ? "• Tempo Real" : ""}
                                </h3>
                                <p className="text-white/70">
                                    {realtime
                                        ? "Dados da OpenSky Network com autenticação"
                                        : "Visualização de dados locais"}
                                </p>
                            </div>
                            {realtime && (
                                <div className="flex items-center space-x-2 bg-green-500/20 px-4 py-2 rounded-xl border border-green-500/30">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-green-300 text-sm font-medium">
                                        API Ativa
                                    </span>
                                </div>
                            )}
                        </div>

                        <Suspense fallback={<MapLoading />}>
                            <FlightMap
                                flights={flights}
                                refreshing={isRefreshing}
                                realtime={realtime}
                            />
                        </Suspense>
                    </div>

                    {/* Lista de voos moderna e otimizada */}
                    {flights.length > 0 && (
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-lg">
                            <div className="px-8 py-6 border-b border-white/20 bg-gradient-to-r from-white/5 to-transparent">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-white flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                            <svg
                                                className="w-5 h-5 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                />
                                            </svg>
                                        </div>
                                        <span>
                                            Voos Ativos ({flights.length})
                                        </span>
                                    </h3>
                                    <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-lg">
                                        Primeiros 20 resultados
                                    </span>
                                </div>
                            </div>

                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-white/5 sticky top-0 backdrop-blur-sm">
                                            <tr>
                                                {[
                                                    "Callsign",
                                                    "País",
                                                    "Altitude",
                                                    "Velocidade",
                                                    "Status",
                                                    "Último Contato",
                                                ].map((header) => (
                                                    <th
                                                        key={header}
                                                        className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider"
                                                    >
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {flights
                                                .slice(0, 20)
                                                .map((flight, index) => (
                                                    <tr
                                                        key={`${flight.icao24}-${index}`}
                                                        className="hover:bg-white/10 transition-colors duration-200 group"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="text-lg">
                                                                    {flight.on_ground
                                                                        ? "🛬"
                                                                        : "✈️"}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-semibold text-white">
                                                                        {flight.callsign?.trim() ||
                                                                            "Anônimo"}
                                                                    </div>
                                                                    <div className="text-xs text-white/60 font-mono">
                                                                        {
                                                                            flight.icao24
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                                            {flight.origin_country ||
                                                                "N/A"}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                                            {flight.baro_altitude
                                                                ? `${Math.round(flight.baro_altitude).toLocaleString()}m`
                                                                : "N/A"}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                                            {flight.speed_kmh
                                                                ? `${flight.speed_kmh}km/h`
                                                                : "N/A"}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span
                                                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                                                    flight.on_ground
                                                                        ? "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                                                                        : "bg-green-500/20 text-green-300 border border-green-500/30"
                                                                }`}
                                                            >
                                                                {flight.on_ground
                                                                    ? "Solo"
                                                                    : "Voando"}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                                            {flight.last_contact
                                                                ? new Date(
                                                                      flight.last_contact,
                                                                  ).toLocaleTimeString(
                                                                      "pt-BR",
                                                                  )
                                                                : "N/A"}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
