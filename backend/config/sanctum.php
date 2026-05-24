<?php

use Laravel\Sanctum\Sanctum;

return [

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,localhost:5173,127.0.0.1,127.0.0.1:5173')),

    'guard' => env('SANCTUM_GUARD', 'web'),

    // If you rely on cookie-based SPA auth, enable CSRF/cookie support.
    // Note: For this app, your login/register appear to be JSON endpoints,
    // so you may still not need cookies. Keeping it enabled for safety.
    'csrf_token' => env('SANCTUM_CSRF_TOKEN', 'XSRF-TOKEN'),

];

