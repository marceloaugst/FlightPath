import { useState, useEffect, useCallback, useRef } from "react";
import { getEcho, disconnectEcho } from "../services/websocket";

export const useWebSocket = (initialFlights = [], initialStats = {}) => {
    const [flights, setFlights] = useState(initialFlights);
    const [stats, setStats] = useState(initialStats);
    const [connectionStatus, setConnectionStatus] = useState("connecting");
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [error, setError] = useState(null);

    const channelRef = useRef(null);
    const echoRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // Connection management
    const connect = useCallback(() => {
        try {
            setConnectionStatus("connecting");
            setError(null);

            // Get Echo instance
            echoRef.current = getEcho();

            // Listen to flights channel
            channelRef.current = echoRef.current.channel("flights");

            channelRef.current.subscribed(() => {
                console.log("✅ Connected to flights channel");
                setConnectionStatus("connected");
            });

            // Listen for flight updates
            channelRef.current.listen(".flights.updated", (data) => {
                console.log("📡 Received flight update:", data);

                setFlights(data.flights || []);
                setStats(data.stats || {});
                setLastUpdate(new Date());
                setConnectionStatus("connected");
                setError(null);
            });

            // Connection events
            echoRef.current.connector.pusher.connection.bind(
                "connected",
                () => {
                    console.log("🔗 WebSocket connected");
                    setConnectionStatus("connected");
                    setError(null);
                },
            );

            echoRef.current.connector.pusher.connection.bind(
                "disconnected",
                () => {
                    console.log("❌ WebSocket disconnected");
                    setConnectionStatus("disconnected");
                },
            );

            echoRef.current.connector.pusher.connection.bind("error", (err) => {
                console.error("WebSocket error:", err);
                setError("WebSocket connection error");
                setConnectionStatus("error");

                // Auto-reconnect after 5 seconds
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (echoRef.current) {
                        console.log("🔄 Attempting to reconnect...");
                        connect();
                    }
                }, 5000);
            });
        } catch (err) {
            console.error("Failed to connect to WebSocket:", err);
            setError(err.message);
            setConnectionStatus("error");
        }
    }, []);

    // Disconnect
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        if (channelRef.current) {
            channelRef.current.stopListening();
            echoRef.current?.leave("flights");
        }

        disconnectEcho();
        echoRef.current = null;
        channelRef.current = null;
        setConnectionStatus("disconnected");
    }, []);

    // Manual refresh trigger
    const triggerUpdate = useCallback(async () => {
        try {
            const response = await fetch("/api/websocket/update-flights", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN":
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute("content") || "",
                },
            });

            if (response.ok) {
                console.log("✅ Manual update triggered");
                return await response.json();
            }
        } catch (err) {
            console.error("Failed to trigger manual update:", err);
            setError("Failed to trigger update");
        }
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        flights,
        stats,
        connectionStatus,
        lastUpdate,
        error,
        connect,
        disconnect,
        triggerUpdate,
    };
};
