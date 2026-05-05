<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitKycRequest;
use App\Models\KycVerification;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class KycController extends Controller
{
    public function submit(SubmitKycRequest $request)
    {
        $user = $request->user();
        $existing = $user->kycVerification;

        if (in_array($existing?->status, [KycVerification::STATUS_PENDING, KycVerification::STATUS_APPROVED], true)) {
            return ApiResponse::error('You already have a KYC verification in progress or approved.', [], 409);
        }

        $paths = [
            'cin_front_path' => $request->file('cin_front')->store("kyc/{$user->id}", 'local'),
            'cin_back_path' => $request->file('cin_back')->store("kyc/{$user->id}", 'local'),
            'selfie_path' => $request->hasFile('selfie')
                ? $request->file('selfie')->store("kyc/{$user->id}", 'local')
                : null,
        ];

        $kyc = $existing ?: new KycVerification(['user_id' => $user->id]);
        $oldPaths = $existing ? array_filter([
            $existing->cin_front_path,
            $existing->cin_back_path,
            $existing->selfie_path,
        ]) : [];

        $kyc->fill([
            'national_id_number' => $request->validated('national_id_number'),
            'full_name' => $request->validated('full_name'),
            'birth_date' => $request->validated('birth_date'),
            ...$paths,
            'status' => KycVerification::STATUS_PENDING,
            'reviewed_by' => null,
            'reviewed_at' => null,
            'rejection_reason' => null,
        ])->save();

        if ($oldPaths !== []) {
            Storage::disk('local')->delete($oldPaths);
        }

        return ApiResponse::success('KYC submitted successfully.', [
            'kyc_verification' => $kyc->fresh(),
        ], 201);
    }

    public function me(Request $request)
    {
        return ApiResponse::success('KYC verification retrieved successfully.', [
            'kyc_verification' => $request->user()->kycVerification,
            'is_kyc_approved' => $request->user()->isKycApproved(),
        ]);
    }
}
