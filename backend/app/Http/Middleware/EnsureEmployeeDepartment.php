<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmployeeDepartment
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$departments): Response
    {
        $user = $request->user();

        if ($user?->role === User::ROLE_ADMIN) {
            return $next($request);
        }

        if ($user?->role !== User::ROLE_EMPLOYEE || $user->status !== 'active') {
            return ApiResponse::error('Forbidden. Active employee access required.', [], 403);
        }

        $department = strtolower(trim((string) $user->department));
        $allowedDepartments = array_map(
            static fn (string $department): string => strtolower(trim($department)),
            $departments
        );

        if ($allowedDepartments !== [] && !in_array($department, $allowedDepartments, true)) {
            return ApiResponse::error('Forbidden. Employee department access required.', [], 403);
        }

        return $next($request);
    }
}
