<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    // OpenSky Network API Configuration
    'opensky' => [
        'api_url' => env('OPENSKY_API_URL', 'https://opensky-network.org/api'),
        'client_id' => env('OPENSKY_CLIENT_ID'),
        'client_secret' => env('OPENSKY_CLIENT_SECRET'),
        'cache_duration' => env('OPENSKY_CACHE_DURATION', 30), // segundos
        'timeout' => env('OPENSKY_TIMEOUT', 30), // segundos
        'max_flights' => env('OPENSKY_MAX_FLIGHTS', 1000),
        'ssl_verify' => filter_var(env('OPENSKY_SSL_VERIFY', true), FILTER_VALIDATE_BOOLEAN), // verificação SSL
    ],
];
