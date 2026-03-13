import { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import Layout from "../Layouts/Layout";
import FlightMap from "../Components/FlightMap";

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

    // Função para buscar novos dados em tempo real
    const refreshFlights = async (silent = false) => {
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
    };

    // Auto refresh com dados em tempo real
    useEffect(() => {
        let interval;

        if (autoRefresh && realtime) {
            interval = setInterval(() => {
                refreshFlights(true); // Silent refresh
            }, cache_duration * 1000); // Use cache duration from config
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [autoRefresh, realtime, cache_duration]);

    // Test connection on mount
    useEffect(() => {
        const testConnection = async () => {
            try {
                const response = await fetch("/api/realtime/test");
                const data = await response.json();
                setConnectionStatus(data.success ? "connected" : "error");
            } catch {
                setConnectionStatus("error");
            }
        };

        if (realtime) {
            testConnection();
        }
    }, [realtime]);

    const formatLastUpdate = () => {
        const diffMs = Date.now() - lastUpdate.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);

        if (diffSeconds < 60) return `${diffSeconds}s atrás`;
        if (diffSeconds < 3600)
            return `${Math.floor(diffSeconds / 60)}min atrás`;
        return lastUpdate.toLocaleTimeString("pt-BR");
    };

    const statusColors = {
        connected: "bg-green-500",
        error: "bg-red-500",
        refreshing: "bg-yellow-500",
    };

    const statusTexts = {
        connected: "Conectado",
        error: "Erro de conexão",
        refreshing: "Atualizando...",
    };

    return (
        <Layout title="Dashboard - Tempo Real">
            <div className="space-y-6">
                {/* Header com controles aprimorados */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Dashboard de Voos{" "}
                                    {realtime && "🔴 TEMPO REAL"}
                                </h2>

                                {/* Status indicator */}
                                <div className="flex items-center space-x-2">
                                    <div
                                        className={`w-3 h-3 rounded-full ${statusColors[connectionStatus]}`}
                                    ></div>
                                    <span className="text-sm text-gray-600">
                                        {statusTexts[connectionStatus]}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-2 space-y-1">
                                <p className="text-gray-600">
                                    Última atualização: {formatLastUpdate()}
                                </p>
                                {realtime && (
                                    <p className="text-sm text-blue-600">
                                        Cache: {cache_duration}s | Auto-refresh:{" "}
                                        {autoRefresh ? "Ativo" : "Inativo"}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                            {/* Error message */}
                            {errorMessage && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            {/* Toggle auto-refresh */}
                            <label className="flex items-center space-x-2 whitespace-nowrap">
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) =>
                                        setAutoRefresh(e.target.checked)
                                    }
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                    Auto-atualizar
                                </span>
                            </label>

                            {/* Manual refresh button */}
                            <button
                                onClick={() => refreshFlights()}
                                disabled={isRefreshing}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                            >
                                <svg
                                    className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
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
                                <span>Atualizar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Estatísticas aprimoradas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                    <span className="text-white text-lg">
                                        ✈️
                                    </span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">
                                    {stats.total || 0}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Total
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                    <span className="text-white text-lg">
                                        📍
                                    </span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">
                                    {stats.with_position || 0}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Com posição
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                    <span className="text-white text-lg">
                                        🌍
                                    </span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">
                                    {stats.countries || 0}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Países
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                                    <span className="text-white text-lg">
                                        🛫
                                    </span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">
                                    {stats.airborne || 0}
                                </div>
                                <div className="text-sm text-gray-500">
                                    No ar
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mapa */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Mapa Global {realtime ? "(Tempo Real)" : ""}
                        </h3>
                        {realtime && (
                            <div className="text-sm text-gray-500">
                                Dados da OpenSky Network com autenticação
                            </div>
                        )}
                    </div>
                    <FlightMap
                        flights={flights}
                        refreshing={isRefreshing}
                        realtime={realtime}
                    />
                </div>

                {/* Lista de voos expandida */}
                {flights.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">
                                Voos Ativos ({flights.length})
                            </h3>
                            <div className="text-sm text-gray-500">
                                Mostrando primeiros 20 resultados
                            </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Callsign
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            País
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Altitude
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Velocidade
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Último Contato
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {flights
                                        .slice(0, 20)
                                        .map((flight, index) => (
                                            <tr
                                                key={`${flight.icao24}-${index}`}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    <div>
                                                        {flight.callsign?.trim() ||
                                                            "N/A"}
                                                        <div className="text-xs text-gray-500">
                                                            {flight.icao24}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {flight.origin_country ||
                                                        "N/A"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {flight.baro_altitude
                                                        ? `${Math.round(flight.baro_altitude)} m`
                                                        : "N/A"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {flight.speed_kmh
                                                        ? `${flight.speed_kmh} km/h`
                                                        : "N/A"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span
                                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            flight.on_ground
                                                                ? "bg-gray-100 text-gray-800"
                                                                : "bg-green-100 text-green-800"
                                                        }`}
                                                    >
                                                        {flight.on_ground
                                                            ? "Solo"
                                                            : "Voando"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                )}
            </div>
        </Layout>
    );
}
