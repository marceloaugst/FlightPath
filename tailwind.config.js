/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./resources/**/*.blade.php",
        "./resources/**/*.js",
        "./resources/**/*.jsx",
        "./app/**/*.php",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    "Instrument Sans",
                    "ui-sans-serif",
                    "system-ui",
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "Segoe UI",
                    "Roboto",
                    "Helvetica Neue",
                    "Arial",
                    "sans-serif",
                ],
            },
            animation: {
                gradient: "gradient 8s ease infinite",
                "pulse-smooth":
                    "pulse-smooth 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                float: "float 6s ease-in-out infinite",
                glow: "glow 2s ease-in-out infinite alternate",
            },
            keyframes: {
                gradient: {
                    "0%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                    "100%": { backgroundPosition: "0% 50%" },
                },
                "pulse-smooth": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.7" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                glow: {
                    "0%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" },
                    "100%": { boxShadow: "0 0 30px rgba(59, 130, 246, 0.6)" },
                },
            },
            backdropBlur: {
                xs: "2px",
            },
            boxShadow: {
                "glow-blue": "0 0 20px rgba(59, 130, 246, 0.3)",
                "glow-purple": "0 0 20px rgba(147, 51, 234, 0.3)",
                "glow-green": "0 0 20px rgba(34, 197, 94, 0.3)",
            },
            colors: {
                glass: {
                    50: "rgba(255, 255, 255, 0.05)",
                    100: "rgba(255, 255, 255, 0.1)",
                    200: "rgba(255, 255, 255, 0.2)",
                    300: "rgba(255, 255, 255, 0.3)",
                },
            },
        },
    },
    plugins: [],
};
