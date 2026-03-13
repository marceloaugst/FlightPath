import { Head } from "@inertiajs/react";

export default function Layout({ children, title }) {
    return (
        <>
            <Head>
                <title>{title || "OpenSky Flight Tracker"}</title>
                <meta
                    name="description"
                    content="Rastreador de voos em tempo real com dados da OpenSky Network"
                />
            </Head>

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex">
                                <div className="flex-shrink-0 flex items-center">
                                    <h1 className="text-xl font-bold text-gray-900">
                                        ✈️ OpenSky Flight Tracker
                                    </h1>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-500">
                                    Dados em tempo real da OpenSky Network
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="py-6">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </>
    );
}
