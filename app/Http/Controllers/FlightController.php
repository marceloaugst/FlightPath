<?php

namespace App\Http\Controllers;

use App\Models\Flight;
use App\Services\OpenSkyService;
use Inertia\Inertia;

class FlightController extends Controller
{
    public function __construct(private OpenSkyService $openSkyService) {}

    /**
     * Lista todos os voos (JSON para API)
     */
    public function index()
    {
        $flights = Flight::withPosition()
            ->active()
            ->latest()
            ->get();

        return response()->json($flights);
    }

    /**
     * Lista voos ativos (processados pelo service)
     */
    public function active()
    {
        $flights = $this->openSkyService->getActiveFlights();

        return response()->json([
            'success' => true,
            'data' => $flights,
            'total' => count($flights)
        ]);
    }
}
