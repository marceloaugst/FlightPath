import { Head } from "@inertiajs/react";
import { memo } from "react";

const Layout = memo(function Layout({ children, title }) {
    return (
        <>
            <Head>
                <title>{title || "SkyTracker - Flight Radar"}</title>
                <meta
                    name="description"
                    content="Rastreador de voos em tempo real com dados da OpenSky Network"
                />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <meta name="theme-color" content="#1e1b4b" />
            </Head>

            {/* Layout minimalista sem header */}
            <div className="min-h-screen w-full overflow-x-hidden">
                {children}
            </div>
        </>
    );
});

export default Layout;
