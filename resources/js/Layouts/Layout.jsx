import { Head } from "@inertiajs/react";

export default function Layout({ children, title }) {
    return (
        <>
            <Head>
                <title>{title || "Flight Tracker"}</title>
                <meta
                    name="description"
                    content="Real-time flight tracking application"
                />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
            </Head>

            <div className="min-h-screen w-full">{children}</div>
        </>
    );
}
