<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DonateCagnotteRequest;
use App\Http\Requests\RejectCagnotteRequest;
use App\Http\Requests\StoreCagnotteRequest;
use App\Models\Cagnotte;
use App\Services\CagnotteService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class CagnotteController extends Controller
{
    public function __construct(private readonly CagnotteService $cagnotteService)
    {
    }

    public function index()
    {
        $cagnottes = Cagnotte::query()
            ->with('creator:id,name,email')
            ->where('status', Cagnotte::STATUS_ACTIVE)
            ->latest()
            ->get();

        return ApiResponse::success('Cagnottes retrieved successfully.', [
            'cagnottes' => $cagnottes,
        ]);
    }

    public function store(StoreCagnotteRequest $request)
    {
        $cagnotte = $this->cagnotteService->create($request->user(), $request->validated());

        return ApiResponse::success('Cagnotte request created successfully.', [
            'cagnotte' => $cagnotte,
        ], 201);
    }

    public function myRequests(Request $request)
    {
        $cagnottes = $request->user()
            ->cagnottes()
            ->latest()
            ->get();

        return ApiResponse::success('Cagnotte requests retrieved successfully.', [
            'cagnottes' => $cagnottes,
        ]);
    }

    public function donate(DonateCagnotteRequest $request, Cagnotte $cagnotte)
    {
        $result = $this->cagnotteService->donate(
            $cagnotte,
            $request->user(),
            (float) $request->validated('amount')
        );

        return ApiResponse::success('Donation completed successfully.', $result);
    }

    public function pending()
    {
        $cagnottes = Cagnotte::query()
            ->with('creator:id,name,email')
            ->where('status', Cagnotte::STATUS_PENDING)
            ->latest()
            ->get();

        return ApiResponse::success('Pending cagnottes retrieved successfully.', [
            'cagnottes' => $cagnottes,
        ]);
    }

    public function showByCode(string $verificationCode)
    {
        $cagnotte = Cagnotte::query()
            ->with(['creator:id,name,email', 'approver:id,name,email'])
            ->where('verification_code', $verificationCode)
            ->first();

        if (! $cagnotte) {
            return ApiResponse::error('Cagnotte not found.', [], 404);
        }

        return ApiResponse::success('Cagnotte retrieved successfully.', [
            'cagnotte' => $cagnotte,
        ]);
    }

    public function approve(Request $request, Cagnotte $cagnotte)
    {
        $cagnotte = $this->cagnotteService->approve($cagnotte, $request->user());

        return ApiResponse::success('Cagnotte approved successfully.', [
            'cagnotte' => $cagnotte,
        ]);
    }

    public function reject(RejectCagnotteRequest $request, Cagnotte $cagnotte)
    {
        $cagnotte = $this->cagnotteService->reject(
            $cagnotte,
            $request->user(),
            $request->validated('rejection_reason')
        );

        return ApiResponse::success('Cagnotte rejected successfully.', [
            'cagnotte' => $cagnotte,
        ]);
    }
}
