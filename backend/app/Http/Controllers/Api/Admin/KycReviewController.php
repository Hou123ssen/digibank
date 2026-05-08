<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RejectKycRequest;
use App\Models\KycVerification;
use App\Models\Notification;
use App\Services\NotificationService;
use App\Services\TrustScoreService;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\DB;

class KycReviewController extends Controller
{
    public function __construct(
        private readonly TrustScoreService $trustScoreService,
        private readonly NotificationService $notificationService
    )
    {
    }

    public function pending()
    {
        $verifications = KycVerification::query()
            ->with('user:id,name,email,role')
            ->whereIn('status', KycVerification::REVIEWABLE_STATUSES)
            ->latest()
            ->get();

        return ApiResponse::success('Pending KYC verifications retrieved successfully.', $verifications);
    }

    public function approve(KycVerification $kyc)
    {
        if (!in_array($kyc->status, KycVerification::REVIEWABLE_STATUSES, true)) {
            return ApiResponse::error('Only pending KYC verifications can be approved.', [], 409);
        }

        $kyc = DB::transaction(function () use ($kyc): KycVerification {
            $kyc->update([
                'status' => KycVerification::STATUS_APPROVED,
                'reviewed_by' => request()->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
            ]);

            $this->trustScoreService->increase($kyc->user, 20, 'KYC approved', $kyc);
            $this->notificationService->createNotification(
                $kyc->user_id,
                'KYC Approved',
                'Your identity verification has been approved',
                Notification::TYPE_SUCCESS
            );

            return $kyc->fresh(['user:id,name,email,role,trust_score', 'reviewer:id,name,email,role']);
        });

        return ApiResponse::success('KYC approved successfully.', [
            'kyc_verification' => $kyc,
        ]);
    }

    public function reject(RejectKycRequest $request, KycVerification $kyc)
    {
        if (!in_array($kyc->status, KycVerification::REVIEWABLE_STATUSES, true)) {
            return ApiResponse::error('Only pending KYC verifications can be rejected.', [], 409);
        }

        $kyc->update([
            'status' => KycVerification::STATUS_REJECTED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'rejection_reason' => $request->validated('rejection_reason'),
        ]);

        return ApiResponse::success('KYC rejected successfully.', [
            'kyc_verification' => $kyc->fresh(['user:id,name,email,role', 'reviewer:id,name,email,role']),
        ]);
    }
}
