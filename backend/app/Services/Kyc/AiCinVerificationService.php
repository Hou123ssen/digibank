<?php

namespace App\Services\Kyc;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiCinVerificationService
{
    private CinOcrService $cinOcrService;

    public function __construct(?CinOcrService $cinOcrService = null)
    {
        $this->cinOcrService = $cinOcrService ?? new CinOcrService();
    }

    public function verify(string $imagePath): array
    {
        $url = rtrim((string) config('services.cin_ai.url'), '/');
        $exists = file_exists($imagePath);

        Log::info('KYC AI OCR request prepared.', [
            'ocr_path' => $imagePath,
            'file_exists' => $exists,
            'service_url_configured' => $url !== '',
        ]);

        if (!$exists) {
            return $this->unavailable('OCR image file not found.', $imagePath, false);
        }

        if ($url === '') {
            Log::warning('KYC AI OCR service is not configured; using local Tesseract OCR fallback.', [
                'ocr_path' => $imagePath,
                'file_exists' => $exists,
            ]);

            return $this->verifyWithTesseract($imagePath, null);
        }

        try {
            $response = Http::timeout((int) config('services.cin_ai.timeout', 30))
                ->attach('file', file_get_contents($imagePath), basename($imagePath))
                ->post($url . '/verify-cin');

            if (!$response->successful()) {
                Log::warning('AI CIN verification service returned an error.', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return $this->verifyWithTesseract($imagePath, 'AI CIN verification service returned an error.');
            }

            return $this->normalize($response->json() ?? [], $imagePath, $exists);
        } catch (Throwable $e) {
            Log::warning('AI CIN verification service unavailable.', [
                'ocr_path' => $imagePath,
                'file_exists' => $exists,
                'exception' => $e->getMessage(),
            ]);

            return $this->verifyWithTesseract($imagePath, 'AI CIN verification service unavailable: ' . $e->getMessage());
        }
    }

    public function decide(array $result): array
    {
        if (($result['error'] ?? null) !== null) {
            $decision = ['decision' => 'reject', 'rejected' => true, 'reason' => $result['error']];
            $this->logDecision($result, $decision);

            return $decision;
        }

        $confidence = (int) ($result['confidence_score'] ?? 0);
        $hasCin = filled($result['extracted_cin_number'] ?? null);
        $keywordScore = (int) ($result['keyword_score'] ?? 0);
        $hasKeywords = $keywordScore > 0;
        $documentDetected = (bool) ($result['document_detected'] ?? false);
        $faceDetected = (bool) ($result['face_photo_detected'] ?? false);
        $barcodeDetected = (bool) ($result['barcode_detected'] ?? $result['qr_detected'] ?? false);
        $documentShapeScore = (int) ($result['document_shape_score'] ?? 0);
        $hasDocumentShape = $documentDetected || $documentShapeScore >= 45;

        $hasAnyCinSignal = $hasCin
            || $hasKeywords
            || $faceDetected
            || $barcodeDetected
            || $hasDocumentShape;

        $hardReject = ($confidence < 20) && !$hasCin;

        if ($hardReject) {
            $decision = ['decision' => 'reject', 'rejected' => true, 'reason' => !$hasAnyCinSignal ? 'no_cin_document_signal' : 'score_below_20'];
            $this->logDecision($result, $decision);

            return $decision;
        }

        if ($confidence < 50) {
            $decision = ['decision' => 'needs_review', 'rejected' => false, 'reason' => 'score_20_to_49'];
            $this->logDecision($result, $decision);

            return $decision;
        }

        $decision = ['decision' => 'pending_review', 'rejected' => false, 'reason' => 'score_50_or_above'];
        $this->logDecision($result, $decision);

        return $decision;
    }

    private function normalize(array $payload, string $imagePath, bool $exists): array
    {
        $cin = $payload['extracted_cin_number'] ?? $payload['detected_cin_number'] ?? null;

        return [
            'document_detected' => (bool) ($payload['document_detected'] ?? false),
            'extracted_cin_number' => $cin ? strtoupper(str_replace(' ', '', (string) $cin)) : null,
            'extracted_full_name' => $payload['extracted_full_name'] ?? null,
            'extracted_birth_date' => $payload['extracted_birth_date'] ?? null,
            'keyword_score' => (int) ($payload['keyword_score'] ?? 0),
            'text_density_score' => (int) ($payload['text_density_score'] ?? 0),
            'document_shape_score' => (int) ($payload['document_shape_score'] ?? 0),
            'blur_score' => (int) ($payload['blur_score'] ?? 0),
            'face_photo_score' => (int) ($payload['face_photo_score'] ?? 0),
            'face_photo_detected' => (bool) ($payload['face_photo_detected'] ?? false),
            'barcode_score' => (int) ($payload['barcode_score'] ?? $payload['qr_score'] ?? 0),
            'barcode_detected' => (bool) ($payload['barcode_detected'] ?? $payload['qr_detected'] ?? false),
            'confidence_score' => (int) ($payload['confidence_score'] ?? 0),
            'suspicious' => (bool) ($payload['suspicious'] ?? true),
            'extracted_text' => $payload['extracted_text'] ?? null,
            'matched_keywords' => $payload['matched_keywords'] ?? [],
            'detected_signals' => $payload['detected_signals'] ?? [],
            'cin_matches' => $payload['cin_matches'] ?? array_values(array_filter([$cin])),
            'score_calculation' => $payload['score_calculation'] ?? [],
            'preprocessed_image_paths' => $payload['preprocessed_image_paths'] ?? [],
            'ocr_engine' => $payload['ocr_engine'] ?? null,
            'ocr_path' => $imagePath,
            'file_exists' => $exists,
            'ocr_exception' => null,
            'error' => null,
        ];
    }

    private function verifyWithTesseract(string $imagePath, ?string $aiError): array
    {
        $result = $this->cinOcrService->extractAndValidate($imagePath);
        $normalized = $this->normalizeTesseractResult($result, $imagePath, file_exists($imagePath));

        if ($aiError !== null) {
            $normalized['ai_error'] = $aiError;
        }

        return $normalized;
    }

    private function normalizeTesseractResult(array $payload, string $imagePath, bool $exists): array
    {
        $score = (int) ($payload['score'] ?? 0);
        $cin = $payload['detected_cin_number'] ?? null;
        $keywords = $payload['matched_keywords'] ?? [];
        $error = $payload['error'] ?? null;

        return [
            'document_detected' => $error === null && ($cin !== null || $keywords !== [] || $score > 0),
            'extracted_cin_number' => $cin ? strtoupper(str_replace(' ', '', (string) $cin)) : null,
            'extracted_full_name' => null,
            'extracted_birth_date' => null,
            'keyword_score' => $keywords !== [] ? min(100, count($keywords) * 15) : 0,
            'text_density_score' => mb_strlen(preg_replace('/\s+/u', '', (string) ($payload['extracted_text'] ?? '')) ?? '') > 0 ? 50 : 0,
            'document_shape_score' => 0,
            'blur_score' => 0,
            'face_photo_score' => 0,
            'face_photo_detected' => false,
            'barcode_score' => 0,
            'barcode_detected' => false,
            'confidence_score' => max(0, min(100, $score)),
            'suspicious' => (bool) ($payload['suspicious_document'] ?? $error !== null),
            'extracted_text' => $payload['extracted_text'] ?? null,
            'matched_keywords' => $keywords,
            'detected_signals' => [
                'cin' => $cin !== null,
                'keywords' => $keywords !== [],
                'face_photo' => false,
                'barcode' => false,
                'document_shape' => false,
            ],
            'cin_matches' => array_values(array_filter([$cin])),
            'score_calculation' => [
                'engine' => 'tesseract',
                'score' => $score,
                'reasons' => $payload['reasons'] ?? [],
                'matched_keywords' => $keywords,
                'detected_cin' => $cin,
            ],
            'preprocessed_image_paths' => [],
            'ocr_engine' => 'tesseract',
            'ocr_path' => $imagePath,
            'file_exists' => $exists,
            'ocr_exception' => $payload['error'] ?? null,
            'error' => $error,
        ];
    }

    private function unavailable(string $message, ?string $imagePath = null, bool $exists = false, ?string $exception = null): array
    {
        return [
            'document_detected' => false,
            'extracted_cin_number' => null,
            'extracted_full_name' => null,
            'extracted_birth_date' => null,
            'keyword_score' => 0,
            'text_density_score' => 0,
            'document_shape_score' => 0,
            'blur_score' => 0,
            'face_photo_score' => 0,
            'face_photo_detected' => false,
            'barcode_score' => 0,
            'barcode_detected' => false,
            'confidence_score' => 0,
            'suspicious' => true,
            'extracted_text' => null,
            'matched_keywords' => [],
            'detected_signals' => [],
            'cin_matches' => [],
            'score_calculation' => [],
            'preprocessed_image_paths' => [],
            'ocr_engine' => null,
            'ocr_path' => $imagePath,
            'file_exists' => $exists,
            'ocr_exception' => $exception,
            'error' => $message,
        ];
    }

    private function logDecision(array $result, array $decision): void
    {
        try {
            Log::debug('KYC AI CIN decision computed.', [
                'decision' => $decision['decision'],
                'reason' => $decision['reason'] ?? null,
                'confidence_score' => $result['confidence_score'] ?? 0,
                'extracted_text' => $result['extracted_text'] ?? null,
                'matched_keywords' => $result['matched_keywords'] ?? [],
                'detected_cin' => $result['extracted_cin_number'] ?? $result['detected_cin_number'] ?? null,
                'cin_matches' => $result['cin_matches'] ?? [],
                'score_calculation' => $result['score_calculation'] ?? [],
                'detected_signals' => $result['detected_signals'] ?? [],
                'document_detected' => $result['document_detected'] ?? false,
                'document_shape_score' => $result['document_shape_score'] ?? 0,
                'face_photo_detected' => $result['face_photo_detected'] ?? false,
                'barcode_detected' => $result['barcode_detected'] ?? false,
                'text_density_score' => $result['text_density_score'] ?? 0,
                'preprocessed_image_paths' => $result['preprocessed_image_paths'] ?? [],
            ]);
        } catch (Throwable) {
            // Logging must not affect OCR decisions.
        }
    }
}
