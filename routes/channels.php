<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to verify that the user requesting access to the channel is valid.
|
*/

// Public channel for flight data - anyone can listen
Broadcast::channel('flights', function () {
   return true;  // Public access - no authentication needed
});

// Optional: Private channels for admin functionality
Broadcast::channel('flights-admin', function ($user) {
   // Uncomment if you have user authentication
   // return $user->isAdmin();
   return true; // For now, allow all
});
