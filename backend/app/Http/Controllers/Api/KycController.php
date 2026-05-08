<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitKycRequest;
use App\Models\KycVerification;
use App\Services\Kyc\CinOcrService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class KycController extends Controller
{
    public function submit(SubmitKycRequest $request)
    {
        $user = $request->user();
        $existing = $user->kycVerification;

        if (in_array($existing?->status, [KycVerification::STATUS_PENDING, KycVerification::STATUS_NEEDS_REVIEW, KycVerification::STATUS_APPROVED], true)) {
            return ApiResponse::error('You already have a KYC verification in progress or approved.', [], 409);
        }

        $paths = [
            'cin_front_path' => $request->file('cin_front')->store("kyc/{$user->id}", 'public'),
            'cin_back_path' => $request->file('cin_back')->store("kyc/{$user->id}", 'public'),
            'selfie_path' => $request->hasFile('selfie')
                ? $request->file('selfie')->store("kyc/{$user->id}", 'public')
                : null,
        ];

        $kyc = $existing ?: new KycVerification(['user_id' => $user->id]);
        $oldPaths = $existing ? array_filter([
            $existing->cin_front_path,
            $existing->cin_back_path,
            $existing->selfie_path,
        ]) : [];

        // Handle OCR Validation
        $frontFile = $request->file('cin_front');
        $mimeType = $frontFile->getMimeType();
        $isImage = str_starts_with($mimeType, 'image/');

        $ocrResult = [
            'extracted_text' => null,
            'detected_cin_number' => null,
            'ocr_verified' => false,
            'error' => null,
        ];

        if ($isImage) {
            $frontPath = Storage::disk('public')->path($paths['cin_front_path']);
            try {
                $ocrResult = (new CinOcrService())->extractAndValidate($frontPath);
            } catch (Throwable $e) {
                Log::error('KYC OCR processing crashed before save.', [
                    'user_id' => $user->id,
                    'exception' => $e,
                ]);

                $ocrResult['error'] = 'OCR processing failed: ' . $e->getMessage();
            }
        }

        // If PDF or Tesseract is missing, we don't block but mark for review
        $status = KycVerification::STATUS_PENDING;
        $message = 'KYC submitted successfully.';

        if (!$isImage) {
            $status = KycVerification::STATUS_NEEDS_REVIEW;
            $message = 'Votre KYC a été soumis et nécessite une vérification manuelle.';
        } elseif ($ocrResult['error']) {
            $status = KycVerification::STATUS_NEEDS_REVIEW;
            $message = 'Votre KYC a été soumis et nécessite une vérification manuelle.';
        } elseif (!$ocrResult['ocr_verified'] && !$ocrResult['error']) {
            // Success OCR but no CIN found -> Reject
            return ApiResponse::error("Veuillez télécharger une vraie CIN marocaine.", [
                'cin_front' => ["OCR could not detect Moroccan CIN keywords or CIN number."],
                'ocr_text' => config('app.debug') ? $ocrResult['extracted_text'] : null,
            ], 422);
        }

        try {
            $kyc->fill([
                'national_id_number' => $request->validated('national_id_number'),
                'full_name' => $request->validated('full_name'),
                'birth_date' => $request->validated('birth_date'),
                ...$paths,
                'status' => $status,
                'extracted_text' => $ocrResult['extracted_text'] ?? null,
                'detected_cin_number' => $ocrResult['detected_cin_number'] ?? null,
                'ocr_verified' => (bool)($ocrResult['ocr_verified'] ?? false),
                'reviewed_by' => null,
                'reviewed_at' => null,
                'rejection_reason' => null,
            ])->save();
        } catch (Throwable $e) {
            Log::error('KYC processing failed while saving verification.', [
                'user_id' => $user->id,
                'status' => $status,
                'ocr_result' => $ocrResult,
                'paths' => $paths,
                'exception' => $e,
            ]);

            Storage::disk('public')->delete(array_filter($paths));

            return ApiResponse::error('KYC processing failed.', [], 500);
        }

        if ($oldPaths !== []) {
            Storage::disk('public')->delete($oldPaths);
            Storage::disk('local')->delete($oldPaths);
        }

        return ApiResponse::success($message, [
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
