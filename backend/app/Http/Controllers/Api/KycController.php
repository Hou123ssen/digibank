<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitKycRequest;
use App\Models\KycVerification;
use App\Services\Kyc\AiCinVerificationService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class KycController extends Controller
{
    private const STRICT_INVALID_CIN_MESSAGE = 'La CIN fournie semble invalide ou illisible. Veuillez importer une photo claire de votre carte nationale marocaine.';

    public function submit(
        SubmitKycRequest $request,
        AiCinVerificationService $aiCinVerificationService
    ) {
        $user = $request->user();
        $existing = $user->kycVerification;

        if (in_array($existing?->status, [
            KycVerification::STATUS_PENDING,
            KycVerification::STATUS_PENDING_REVIEW,
            KycVerification::STATUS_NEEDS_REVIEW,
            KycVerification::STATUS_APPROVED,
        ], true)) {
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

        $frontFile = $request->file('cin_front');
        $isImage = str_starts_with((string) $frontFile->getMimeType(), 'image/');
        $ocrResult = $this->defaultOcrResult();

        if ($isImage) {
            $absolutePaths = [
                'front' => Storage::disk('public')->path($paths['cin_front_path']),
                'back' => Storage::disk('public')->path($paths['cin_back_path']),
            ];

            $ocrResult = $this->validateImagesBeforeSave($absolutePaths, $aiCinVerificationService, $user->id);
        }

        $status = KycVerification::STATUS_PENDING_REVIEW;
        $message = 'KYC submitted successfully.';

        if (!$isImage) {
            $status = KycVerification::STATUS_NEEDS_REVIEW;
            $message = 'Votre KYC a été soumis et nécessite une vérification manuelle.';
        } elseif (($ocrResult['decision'] ?? null) === 'reject') {
            $this->logRejectedOcr($user->id, $ocrResult);
            Storage::disk('public')->delete(array_filter($paths));

            $debug = [
                'cin_front' => ['OCR could not confirm that this image is a readable Moroccan CIN.'],
            ];

            if (config('app.debug') || app()->environment('local')) {
                $debug += $this->ocrDebugPayload($ocrResult);
            }

            return ApiResponse::error(self::STRICT_INVALID_CIN_MESSAGE, $debug, 422);
        } elseif (($ocrResult['decision'] ?? null) === 'needs_review') {
            $status = KycVerification::STATUS_NEEDS_REVIEW;
            $message = 'Votre KYC a été soumis et nécessite une vérification manuelle.';
        }

        $this->logAcceptedOcr($user->id, $ocrResult);

        try {
            $kyc->fill([
                'national_id_number' => $request->validated('national_id_number'),
                'full_name' => $request->validated('full_name'),
                'birth_date' => $request->validated('birth_date'),
                ...$paths,
                'status' => $status,
                'extracted_text' => $ocrResult['extracted_text'] ?? null,
                'detected_cin_number' => $ocrResult['detected_cin_number'] ?? null,
                'ocr_verified' => (bool) ($ocrResult['ocr_verified'] ?? false),
                'ocr_confidence_score' => (int) ($ocrResult['confidence_score'] ?? $ocrResult['score'] ?? 0),
                'ocr_keyword_score' => (int) ($ocrResult['keyword_score'] ?? 0),
                'ocr_text_density_score' => (int) ($ocrResult['text_density_score'] ?? 0),
                'ocr_document_shape_score' => (int) ($ocrResult['document_shape_score'] ?? 0),
                'ocr_blur_score' => (int) ($ocrResult['blur_score'] ?? 0),
                'ocr_document_detected' => (bool) ($ocrResult['document_detected'] ?? false),
                'ocr_suspicious' => (bool) ($ocrResult['suspicious'] ?? $ocrResult['suspicious_document'] ?? false),
                'ocr_extracted_full_name' => $ocrResult['extracted_full_name'] ?? null,
                'ocr_extracted_birth_date' => $ocrResult['extracted_birth_date'] ?? null,
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

    private function validateImagesBeforeSave(
        array $paths,
        AiCinVerificationService $aiCinVerificationService,
        int $userId
    ): array {
        $results = [];

        foreach ($paths as $side => $path) {
            $results[] = $this->validateSingleImageBeforeSave($side, $path, $aiCinVerificationService, $userId);
        }

        $successfulResults = array_values(array_filter(
            $results,
            fn (array $result): bool => ($result['error'] ?? null) === null
        ));

        if ($successfulResults === []) {
            return [
                ...$this->bestOcrResult($results),
                'decision' => 'reject',
                'ocr_verified' => false,
                'suspicious' => true,
                'reasons' => ['ocr_unavailable_or_not_configured'],
                'side_results' => $results,
            ];
        }

        $best = $this->combineOcrResults($successfulResults, $results, $aiCinVerificationService);

        if (in_array($best['decision'] ?? null, ['pending_review', 'needs_review'], true)) {
            return $best;
        }

        return [
            ...$best,
            'decision' => 'reject',
        ];
    }

    private function validateSingleImageBeforeSave(
        string $side,
        string $path,
        AiCinVerificationService $aiCinVerificationService,
        int $userId
    ): array {
        Log::info('KYC OCR image path resolved.', [
            'user_id' => $userId,
            'side' => $side,
            'ocr_path' => $path,
            'file_exists' => file_exists($path),
        ]);

        try {
            $aiResult = $aiCinVerificationService->verify($path);
        } catch (Throwable $e) {
            Log::error('KYC OCR processing crashed before save.', [
                'user_id' => $userId,
                'side' => $side,
                'ocr_path' => $path,
                'file_exists' => file_exists($path),
                'exception' => $e,
            ]);

            return [
                ...$this->defaultOcrResult(),
                'side' => $side,
                'error' => 'OCR processing failed: ' . $e->getMessage(),
                'ocr_path' => $path,
                'file_exists' => file_exists($path),
                'ocr_exception' => $e->getMessage(),
            ];
        }

        $result = [
            'side' => $side,
            'extracted_text' => $aiResult['extracted_text'] ?? null,
            'detected_cin_number' => $aiResult['extracted_cin_number'] ?? null,
            'ocr_verified' => false,
            'decision' => null,
            'confidence_score' => $aiResult['confidence_score'] ?? 0,
            'keyword_score' => $aiResult['keyword_score'] ?? 0,
            'text_density_score' => $aiResult['text_density_score'] ?? 0,
            'document_shape_score' => $aiResult['document_shape_score'] ?? 0,
            'blur_score' => $aiResult['blur_score'] ?? 0,
            'face_photo_score' => $aiResult['face_photo_score'] ?? 0,
            'face_photo_detected' => $aiResult['face_photo_detected'] ?? false,
            'barcode_score' => $aiResult['barcode_score'] ?? 0,
            'barcode_detected' => $aiResult['barcode_detected'] ?? false,
            'detected_signals' => $aiResult['detected_signals'] ?? [],
            'cin_matches' => $aiResult['cin_matches'] ?? array_values(array_filter([$aiResult['extracted_cin_number'] ?? null])),
            'score_calculation' => $aiResult['score_calculation'] ?? [],
            'preprocessed_image_paths' => $aiResult['preprocessed_image_paths'] ?? [],
            'ocr_engine' => $aiResult['ocr_engine'] ?? null,
            'document_detected' => $aiResult['document_detected'] ?? false,
            'suspicious' => $aiResult['suspicious'] ?? false,
            'extracted_full_name' => $aiResult['extracted_full_name'] ?? null,
            'extracted_birth_date' => $aiResult['extracted_birth_date'] ?? null,
            'matched_keywords' => $aiResult['matched_keywords'] ?? [],
            'reasons' => [],
            'ocr_path' => $aiResult['ocr_path'] ?? $path,
            'file_exists' => $aiResult['file_exists'] ?? file_exists($path),
            'ocr_exception' => $aiResult['ocr_exception'] ?? null,
            'error' => $aiResult['error'] ?? null,
        ];

        Log::debug('KYC OCR side result.', $this->ocrLogContext($userId, [
            ...$result,
            'decision' => 'side_result',
        ], null));

        return $result;
    }

    private function defaultOcrResult(): array
    {
        return [
            'extracted_text' => null,
            'detected_cin_number' => null,
            'ocr_verified' => false,
            'decision' => 'reject',
            'confidence_score' => 0,
            'keyword_score' => 0,
            'text_density_score' => 0,
            'document_shape_score' => 0,
            'blur_score' => 0,
            'face_photo_score' => 0,
            'face_photo_detected' => false,
            'barcode_score' => 0,
            'barcode_detected' => false,
            'detected_signals' => [],
            'cin_matches' => [],
            'score_calculation' => [],
            'preprocessed_image_paths' => [],
            'ocr_engine' => null,
            'document_detected' => false,
            'suspicious' => true,
            'extracted_full_name' => null,
            'extracted_birth_date' => null,
            'reasons' => [],
            'ocr_path' => null,
            'file_exists' => false,
            'ocr_exception' => null,
            'error' => null,
        ];
    }

    private function bestOcrResult(array $results): array
    {
        if ($results === []) {
            return $this->defaultOcrResult();
        }

        usort(
            $results,
            fn (array $a, array $b): int => (int) ($b['confidence_score'] ?? 0) <=> (int) ($a['confidence_score'] ?? 0)
        );

        return $results[0];
    }

    private function combineOcrResults(
        array $results,
        array $allResults,
        AiCinVerificationService $aiCinVerificationService
    ): array {
        usort(
            $results,
            fn (array $a, array $b): int => (int) ($b['confidence_score'] ?? 0) <=> (int) ($a['confidence_score'] ?? 0)
        );

        $best = $results[0];
        $combined = [
            ...$best,
            'side' => 'combined',
            'extracted_text' => trim(implode(' ', array_filter(array_map(
                fn (array $result): ?string => $result['extracted_text'] ?? null,
                $results
            )))) ?: null,
            'detected_cin_number' => $this->firstFilled($results, 'detected_cin_number'),
            'extracted_full_name' => $this->firstFilled($results, 'extracted_full_name'),
            'extracted_birth_date' => $this->firstFilled($results, 'extracted_birth_date'),
            'confidence_score' => $this->maxInt($results, 'confidence_score'),
            'keyword_score' => $this->maxInt($results, 'keyword_score'),
            'text_density_score' => $this->maxInt($results, 'text_density_score'),
            'document_shape_score' => $this->maxInt($results, 'document_shape_score'),
            'blur_score' => $this->maxInt($results, 'blur_score'),
            'face_photo_score' => $this->maxInt($results, 'face_photo_score'),
            'face_photo_detected' => $this->anyTrue($results, 'face_photo_detected'),
            'barcode_score' => $this->maxInt($results, 'barcode_score'),
            'barcode_detected' => $this->anyTrue($results, 'barcode_detected'),
            'document_detected' => $this->anyTrue($results, 'document_detected'),
            'suspicious' => $this->allTrue($results, 'suspicious'),
            'matched_keywords' => array_values(array_unique(array_merge(...array_map(
                fn (array $result): array => $result['matched_keywords'] ?? [],
                $results
            )))),
            'detected_signals' => [
                'cin' => $this->firstFilled($results, 'detected_cin_number') !== null,
                'keywords' => $this->maxInt($results, 'keyword_score') > 0,
                'face_photo' => $this->anyTrue($results, 'face_photo_detected'),
                'barcode' => $this->anyTrue($results, 'barcode_detected'),
                'document_shape' => $this->maxInt($results, 'document_shape_score') >= 45,
            ],
            'cin_matches' => array_values(array_unique(array_filter(array_merge(...array_map(
                fn (array $result): array => $result['cin_matches'] ?? array_values(array_filter([$result['detected_cin_number'] ?? null])),
                $results
            ))))),
            'score_calculation' => [
                'confidence_score' => $this->maxInt($results, 'confidence_score'),
                'keyword_score' => $this->maxInt($results, 'keyword_score'),
                'text_density_score' => $this->maxInt($results, 'text_density_score'),
                'document_shape_score' => $this->maxInt($results, 'document_shape_score'),
                'blur_score' => $this->maxInt($results, 'blur_score'),
                'face_photo_score' => $this->maxInt($results, 'face_photo_score'),
                'barcode_score' => $this->maxInt($results, 'barcode_score'),
                'front' => $this->sideDebugMap($allResults, 'front'),
                'back' => $this->sideDebugMap($allResults, 'back'),
            ],
            'preprocessed_image_paths' => array_values(array_unique(array_merge(...array_map(
                fn (array $result): array => $result['preprocessed_image_paths'] ?? [],
                $results
            )))),
            'side_results' => $allResults,
            'error' => null,
        ];

        $decision = $aiCinVerificationService->decide([
            ...$combined,
            'extracted_cin_number' => $combined['detected_cin_number'],
        ]);

        return [
            ...$combined,
            'decision' => $decision['decision'],
            'ocr_verified' => $decision['decision'] === 'pending_review',
            'reasons' => [$decision['reason'] ?? null],
        ];
    }

    private function firstFilled(array $results, string $key): mixed
    {
        foreach ($results as $result) {
            if (filled($result[$key] ?? null)) {
                return $result[$key];
            }
        }

        return null;
    }

    private function maxInt(array $results, string $key): int
    {
        return max(array_map(fn (array $result): int => (int) ($result[$key] ?? 0), $results));
    }

    private function anyTrue(array $results, string $key): bool
    {
        foreach ($results as $result) {
            if ((bool) ($result[$key] ?? false)) {
                return true;
            }
        }

        return false;
    }

    private function allTrue(array $results, string $key): bool
    {
        foreach ($results as $result) {
            if (! (bool) ($result[$key] ?? false)) {
                return false;
            }
        }

        return true;
    }

    private function ocrDebugPayload(array $ocrResult): array
    {
        return [
            'front_text' => $this->sideDebugValue($ocrResult, 'front', 'extracted_text'),
            'back_text' => $this->sideDebugValue($ocrResult, 'back', 'extracted_text'),
            'keywords_detected' => $ocrResult['matched_keywords'] ?? [],
            'cin_matches' => $ocrResult['cin_matches'] ?? array_values(array_filter([$ocrResult['detected_cin_number'] ?? null])),
            'score' => $ocrResult['confidence_score'] ?? $ocrResult['score'] ?? null,
            'score_calculation' => $ocrResult['score_calculation'] ?? [],
            'rejection_reason' => $ocrResult['reasons'][0] ?? $ocrResult['error'] ?? ($ocrResult['decision'] ?? null),
            'tesseract_error' => $ocrResult['ocr_exception'] ?? $ocrResult['error'] ?? null,
            'image_path' => [
                'front' => $this->sideDebugValue($ocrResult, 'front', 'ocr_path'),
                'back' => $this->sideDebugValue($ocrResult, 'back', 'ocr_path'),
                'selected' => $ocrResult['ocr_path'] ?? null,
            ],
            'file_exists' => [
                'front' => $this->sideDebugValue($ocrResult, 'front', 'file_exists'),
                'back' => $this->sideDebugValue($ocrResult, 'back', 'file_exists'),
                'selected' => $ocrResult['file_exists'] ?? null,
            ],
            'ocr_path' => $ocrResult['ocr_path'] ?? null,
            'selected_file_exists' => $ocrResult['file_exists'] ?? null,
            'ocr_exception' => $ocrResult['ocr_exception'] ?? $ocrResult['error'] ?? null,
            'ocr_text' => $ocrResult['extracted_text'] ?? null,
            'ocr_score' => $ocrResult['confidence_score'] ?? $ocrResult['score'] ?? null,
            'ocr_text_front' => $this->sideDebugValue($ocrResult, 'front', 'extracted_text'),
            'ocr_text_back' => $this->sideDebugValue($ocrResult, 'back', 'extracted_text'),
            'detected_keywords' => $ocrResult['matched_keywords'] ?? [],
            'detected_cin' => $ocrResult['detected_cin_number'] ?? null,
            'detected_signals' => $ocrResult['detected_signals'] ?? [],
            'preprocessed_image_paths' => $ocrResult['preprocessed_image_paths'] ?? [],
            'preprocessed_image_paths_front' => $this->sideDebugValue($ocrResult, 'front', 'preprocessed_image_paths') ?? [],
            'preprocessed_image_paths_back' => $this->sideDebugValue($ocrResult, 'back', 'preprocessed_image_paths') ?? [],
        ];
    }

    private function sideDebugValue(array $ocrResult, string $side, string $key): mixed
    {
        foreach ($ocrResult['side_results'] ?? [] as $result) {
            if (($result['side'] ?? null) === $side) {
                return $result[$key] ?? null;
            }
        }

        return null;
    }

    private function sideDebugMap(array $results, string $side): ?array
    {
        foreach ($results as $result) {
            if (($result['side'] ?? null) === $side) {
                return [
                    'score' => $result['confidence_score'] ?? $result['score'] ?? 0,
                    'keywords_detected' => $result['matched_keywords'] ?? [],
                    'cin_matches' => $result['cin_matches'] ?? array_values(array_filter([$result['detected_cin_number'] ?? null])),
                    'detected_signals' => $result['detected_signals'] ?? [],
                    'score_calculation' => $result['score_calculation'] ?? [],
                ];
            }
        }

        return null;
    }

    private function logAcceptedOcr(int $userId, array $ocrResult): void
    {
        Log::info('KYC OCR accepted before save.', $this->ocrLogContext($userId, $ocrResult, null));
    }

    private function logRejectedOcr(int $userId, array $ocrResult): void
    {
        Log::warning('KYC OCR rejected before save.', $this->ocrLogContext(
            $userId,
            $ocrResult,
            $ocrResult['error'] ?? ($ocrResult['decision'] ?? 'rejected_by_strict_validation')
        ));
    }

    private function ocrLogContext(int $userId, array $ocrResult, ?string $rejectionReason): array
    {
        return [
            'user_id' => $userId,
            'decision' => $ocrResult['decision'] ?? null,
            'extracted_text' => $ocrResult['extracted_text'] ?? null,
            'keyword_score' => $ocrResult['keyword_score'] ?? 0,
            'score_calculation' => $ocrResult['score_calculation'] ?? [],
            'cin_regex_detected' => filled($ocrResult['detected_cin_number'] ?? null),
            'detected_cin' => $ocrResult['detected_cin_number'] ?? null,
            'cin_matches' => $ocrResult['cin_matches'] ?? [],
            'confidence_score' => $ocrResult['confidence_score'] ?? $ocrResult['score'] ?? 0,
            'document_detected' => $ocrResult['document_detected'] ?? false,
            'text_density_score' => $ocrResult['text_density_score'] ?? 0,
            'document_shape_score' => $ocrResult['document_shape_score'] ?? 0,
            'blur_score' => $ocrResult['blur_score'] ?? 0,
            'face_photo_score' => $ocrResult['face_photo_score'] ?? 0,
            'face_photo_detected' => $ocrResult['face_photo_detected'] ?? false,
            'barcode_score' => $ocrResult['barcode_score'] ?? 0,
            'barcode_detected' => $ocrResult['barcode_detected'] ?? false,
            'detected_signals' => $ocrResult['detected_signals'] ?? [],
            'preprocessed_image_paths' => $ocrResult['preprocessed_image_paths'] ?? [],
            'ocr_engine' => $ocrResult['ocr_engine'] ?? null,
            'side_results' => array_map(
                fn (array $result): array => [
                    'side' => $result['side'] ?? null,
                    'extracted_text' => $result['extracted_text'] ?? null,
                    'score' => $result['confidence_score'] ?? $result['score'] ?? 0,
                    'keywords' => $result['matched_keywords'] ?? [],
                    'detected_cin' => $result['detected_cin_number'] ?? null,
                    'cin_matches' => $result['cin_matches'] ?? [],
                    'score_calculation' => $result['score_calculation'] ?? [],
                    'detected_signals' => $result['detected_signals'] ?? [],
                    'preprocessed_image_paths' => $result['preprocessed_image_paths'] ?? [],
                    'error' => $result['error'] ?? null,
                ],
                $ocrResult['side_results'] ?? []
            ),
            'keyword_matches' => $ocrResult['matched_keywords'] ?? [],
            'suspicious' => $ocrResult['suspicious'] ?? $ocrResult['suspicious_document'] ?? false,
            'rejection_reason' => $rejectionReason,
        ];
    }
}
