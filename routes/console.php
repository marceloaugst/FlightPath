<?php

use App\Jobs\UpdateFlightsJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule flight updates every 30 seconds for real-time data
Schedule::job(new UpdateFlightsJob())->everyThirtySeconds()
    ->description('Update flight data from OpenSky API')
    ->withoutOverlapping();

// Alternative: every minute if 30 seconds is too aggressive
// Schedule::job(new UpdateFlightsJob())->everyMinute()
//     ->description('Update flight data from OpenSky API')
//     ->withoutOverlapping();
