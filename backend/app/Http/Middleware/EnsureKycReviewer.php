<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureKycReviewer
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->user()?->role, [User::ROLE_ADMIN, User::ROLE_EMPLOYEE], true)) {
            return ApiResponse::error('Forbidden. Admin or employee access required.', [], 403);
        }

        return $next($request);
    }
}
