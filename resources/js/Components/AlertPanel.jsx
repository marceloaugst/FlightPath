import { useState, memo } from "react";
import { useFlightAlerts } from "../hooks/useFlightAlerts";

// ── Configuração visual por tipo de alerta ─────────────────────────────────────
const ALERT_CONFIG = {
    area_entry: {
        label: "Entrada em Área",
        rowClass: "border-l-2 border-l-sky-500 bg-sky-950/40",
        titleClass: "text-sky-300",
        badgeClass: "bg-sky-600",
        Icon: () => (
            <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
                <circle cx="20" cy="5" r="3" className="fill-sky-400" />
            </svg>
        ),
    },
    low_altitude: {
        label: "Altitude Baixa",
        rowClass: "border-l-2 border-l-amber-500 bg-amber-950/40",
        titleClass: "text-amber-300",
        badgeClass: "bg-amber-600",
        Icon: () => (
            <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
        ),
    },
    disappeared: {
        label: "Desapareceu do Radar",
        rowClass: "border-l-2 border-l-red-500 bg-red-950/40",
        titleClass: "text-red-300",
        badgeClass: "bg-red-600",
        Icon: () => (
            <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
        ),
    },
};

function fmt(date) {
    return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

// ── Item de alerta individual ──────────────────────────────────────────────────
const AlertItem = memo(function AlertItem({ alert, onDismiss }) {
    const cfg = ALERT_CONFIG[alert.type];
    const callsign = alert.flight.callsign?.trim() || alert.flight.icao24;

    return (
        <div
            className={`flex items-start gap-2 px-3 py-2 border-b border-slate-800/60 ${cfg.rowClass}`}
        >
            <span className={`mt-0.5 ${cfg.titleClass}`}>
                <cfg.Icon />
            </span>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`text-xs font-semibold ${cfg.titleClass}`}>
                        {cfg.label}
                    </span>
                    <span className="text-slate-500 text-xs tabular-nums">
                        {fmt(alert.timestamp)}
                    </span>
                </div>

                <div className="text-slate-100 text-xs font-medium truncate">
                    {callsign}
                </div>

                {alert.type === "low_altitude" && alert.details && (
                    <div className="text-amber-400 text-xs tabular-nums">
                        Alt: <strong>{alert.details.altitude_m} m</strong> (
                        {Math.round(
                            alert.details.altitude_m * 3.28084,
                        ).toLocaleString()}{" "}
                        ft)
                    </div>
                )}

                {alert.flight.origin_country && (
                    <div className="text-slate-400 text-xs truncate">
                        {alert.flight.origin_country}
                    </div>
                )}
            </div>

            <button
                onClick={() => onDismiss(alert.id)}
                className="text-slate-600 hover:text-slate-300 shrink-0 text-xs mt-0.5 transition-colors"
                title="Dispensar"
                aria-label="Dispensar alerta"
            >
                ✕
            </button>
        </div>
    );
});

// ── Painel principal ───────────────────────────────────────────────────────────
/**
 * AlertPanel — botão com badge + dropdown de alertas Prometheus em tempo real.
 *
 * Props:
 *   flights  — array de voos atual (do WebSocket / Dashboard)
 */
export default function AlertPanel({ flights }) {
    const { alerts, unreadCount, dismissAlert, dismissAll } =
        useFlightAlerts(flights);
    const [open, setOpen] = useState(false);

    const hasAlerts = unreadCount > 0;

    return (
        <div className="relative">
            {/* ── Botão sino ───────────────────────────────────────────────── */}
            <button
                onClick={() => setOpen((v) => !v)}
                className={`relative flex items-center gap-1.5 px-2 py-1.5 rounded border transition-colors text-xs ${
                    hasAlerts
                        ? "border-amber-600 text-amber-300 hover:bg-amber-900/20"
                        : "border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
                title="Alertas Prometheus"
                aria-label={`Alertas Prometheus${hasAlerts ? ` — ${unreadCount} ativos` : ""}`}
            >
                {/* Ícone sino */}
                <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>

                <span className="hidden sm:inline">Alertas</span>

                {/* Badge de contagem */}
                {hasAlerts && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center font-bold px-0.5 leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* ── Dropdown ─────────────────────────────────────────────────── */}
            {open && (
                <>
                    {/* Overlay para fechar ao clicar fora */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />

                    <div className="absolute right-0 top-full mt-1 w-80 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl z-50 flex flex-col max-h-[26rem] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-200">
                                    Alertas Prometheus
                                </span>
                                {hasAlerts && (
                                    <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold leading-none">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>

                            {hasAlerts && (
                                <button
                                    onClick={dismissAll}
                                    className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
                                >
                                    Limpar todos
                                </button>
                            )}
                        </div>

                        {/* Lista de alertas */}
                        <div className="overflow-y-auto flex-1">
                            {alerts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-600 gap-2">
                                    <svg
                                        className="w-8 h-8 opacity-40"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                                    </svg>
                                    <span className="text-xs">
                                        Nenhum alerta ativo
                                    </span>
                                </div>
                            ) : (
                                alerts.map((alert) => (
                                    <AlertItem
                                        key={alert.id}
                                        alert={alert}
                                        onDismiss={dismissAlert}
                                    />
                                ))
                            )}
                        </div>

                        {/* Legenda de tipos */}
                        <div className="border-t border-slate-800 px-3 py-2 shrink-0 bg-slate-900/60">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {Object.entries(ALERT_CONFIG).map(
                                    ([type, cfg]) => (
                                        <span
                                            key={type}
                                            className={`text-xs flex items-center gap-1 ${cfg.titleClass}`}
                                        >
                                            <cfg.Icon />
                                            {cfg.label}
                                        </span>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
