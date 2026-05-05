<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TrustScoreService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class TrustScoreController extends Controller
{
    public function __construct(private readonly TrustScoreService $trustScoreService)
    {
    }

    public function me(Request $request)
    {
        $user = $request->user()->load([
            'trustScoreLogs' => fn ($query) => $query->latest(),
        ]);

        return ApiResponse::success('Trust score retrieved successfully.', [
            'trust_score' => $user->trust_score,
            'level' => $this->trustScoreService->level($user),
            'logs' => $user->trustScoreLogs,
        ]);
    }
}
