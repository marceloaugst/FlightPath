import Echo from "laravel-echo";
import Pusher from "pusher-js";

// Configure Pusher
window.Pusher = Pusher;

// Get config from Laravel meta tags
const getWebSocketConfig = () => {
    const config = {
        key:
            document
                .querySelector('meta[name="reverb-app-key"]')
                ?.getAttribute("content") || "my-app-key",
        host:
            document
                .querySelector('meta[name="reverb-host"]')
                ?.getAttribute("content") || "localhost",
        port:
            parseInt(
                document
                    .querySelector('meta[name="reverb-port"]')
                    ?.getAttribute("content"),
            ) || 8080,
        scheme:
            document
                .querySelector('meta[name="reverb-scheme"]')
                ?.getAttribute("content") || "http",
    };

    console.log("🔧 WebSocket Config:", config);
    return config;
};

// Create Echo instance for WebSocket communication
const createEcho = () => {
    const config = getWebSocketConfig();

    return new Echo({
        broadcaster: "reverb",
        key: config.key,
        wsHost: config.host,
        wsPort: config.port,
        wssPort: config.port,
        forceTLS: config.scheme === "https",
        encrypted: config.scheme === "https",
        disableStats: true,
        enabledTransports: ["ws", "wss"],
        cluster: "mt1",
    });
};

// Single instance
let echoInstance = null;

export const getEcho = () => {
    if (!echoInstance) {
        echoInstance = createEcho();
    }
    return echoInstance;
};

// Clean disconnect
export const disconnectEcho = () => {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
};

export default { getEcho, disconnectEcho };
