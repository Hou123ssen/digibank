<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RejectKycRequest;
use App\Models\KycVerification;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\TrustScoreService;
use App\Support\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

    public function pdf(Request $request, KycVerification $kyc)
    {
        if (!$this->canAccessPdf($request->user(), $kyc)) {
            return ApiResponse::error('You are not allowed to access this KYC report.', [], 403);
        }

        $kyc->load(['user:id,name,email,phone,role,trust_score', 'reviewer:id,name,email,role']);

        $pdf = Pdf::loadView('pdf.kyc-report', [
            'kyc' => $kyc,
            'user' => $kyc->user,
            'ocrFields' => $this->structuredMoroccanCinOcrFields($kyc),
            'frontImage' => $this->storageImageDataUri($kyc->cin_front_path),
            'backImage' => $this->storageImageDataUri($kyc->cin_back_path),
            'logoImage' => $this->logoDataUri(),
            'generatedAt' => now(),
        ])
            ->setPaper('a4')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isFontSubsettingEnabled' => true,
            ]);

        $name = Str::slug($kyc->user?->name ?: 'user-' . $kyc->user_id);

        return $pdf->download("kyc-report-{$name}.pdf");
    }

    private function canAccessPdf(User $user, KycVerification $kyc): bool
    {
        if ($user->role === User::ROLE_ADMIN) {
            return true;
        }

        return in_array($kyc->status, KycVerification::REVIEWABLE_STATUSES, true)
            || (int) $kyc->reviewed_by === (int) $user->id;
    }

    /**
     * Build focused Moroccan CIN OCR fields for the PDF without changing KYC validation.
     *
     * @return array<int, array{label: string, value: string, rtl: bool}>
     */
    private function structuredMoroccanCinOcrFields(KycVerification $kyc): array
    {
        $text = $this->cleanOcrText($kyc->extracted_text);
        $normalized = $this->normalizeOcrText($text);
        $dates = $this->extractDates($text);
        $nameCandidates = $this->candidateNameLines($text);
        $nameParts = $this->extractMoroccanNameParts($text, $nameCandidates, $kyc->full_name, $kyc->ocr_extracted_full_name);
        $birthDate = $kyc->ocr_extracted_birth_date?->format('d/m/Y') ?: $this->extractBirthDateForPdf($text, $dates);
        $expirationDate = $this->extractExpirationDateForPdf($text, $dates);

        $fields = [
            "CIN d\u{00E9}tect\u{00E9}e" => $kyc->detected_cin_number ?: $this->extractCinNumber($normalized),
            "Nom d\u{00E9}tect\u{00E9}" => $nameParts['last_name'],
            "Pr\u{00E9}nom d\u{00E9}tect\u{00E9}" => $nameParts['first_name'],
            "Date naissance d\u{00E9}tect\u{00E9}e" => $birthDate,
            "Adresse d\u{00E9}tect\u{00E9}e" => $this->extractAddress($text),
            "Date expiration d\u{00E9}tect\u{00E9}e" => $expirationDate,
            "Genre d\u{00E9}tect\u{00E9}" => $this->extractGenderForPdf($normalized),
            'Score OCR' => $kyc->ocr_confidence_score !== null ? $kyc->ocr_confidence_score . '%' : null,
        ];

        Log::debug('KYC PDF OCR structured extraction.', [
            'kyc_id' => $kyc->id,
            'raw_ocr_text' => $kyc->extracted_text,
            'clean_ocr_text' => $text,
            'candidate_name_lines' => $nameCandidates,
            'detected_dates' => $dates,
            'final_extracted_fields' => $fields,
        ]);

        return collect($fields)
            ->map(fn (?string $value, string $label): array => [
                'label' => $label,
                'value' => filled($value) ? $this->formatPdfValue(trim($value)) : "Non d\u{00E9}tect\u{00E9}",
                'rtl' => filled($value) && $this->containsArabic($value),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function candidateNameLines(string $text): array
    {
        $candidates = [];

        foreach (preg_split('/\n/u', $text) ?: [] as $line) {
            $line = $this->cleanLatinNameLine($line);

            if (!$this->looksLikeMoroccanCinNameLine($line)) {
                continue;
            }

            $candidates[] = $line;
        }

        return array_values(array_unique($candidates));
    }

    /**
     * @param array<int, string> $candidates
     * @return array{first_name: ?string, last_name: ?string}
     */
    private function extractMoroccanNameParts(string $text, array $candidates, ?string $submittedFullName, ?string $storedFullName): array
    {
        $fallbackName = $storedFullName ?: $submittedFullName;

        if ($fallbackName) {
            $submittedParts = $this->matchSubmittedNameInOcr($fallbackName, $candidates, $text);

            if ($submittedParts['first_name'] || $submittedParts['last_name']) {
                return $submittedParts;
            }
        }

        if (count($candidates) >= 2) {
            return [
                'first_name' => $candidates[0],
                'last_name' => $candidates[1],
            ];
        }

        if (count($candidates) === 1) {
            return [
                'first_name' => $candidates[0],
                'last_name' => null,
            ];
        }

        return $this->extractNamePartsForPdf($text, $fallbackName);
    }

    /**
     * @param array<int, string> $candidates
     * @return array{first_name: ?string, last_name: ?string}
     */
    private function matchSubmittedNameInOcr(string $submittedFullName, array $candidates, string $text): array
    {
        $tokens = array_values(array_filter(preg_split('/\s+/u', $this->cleanLatinNameLine($submittedFullName)) ?: []));
        $candidateLookup = array_flip($candidates);
        $textLookup = ' ' . $this->normalizeOcrText($text) . ' ';
        $matched = [];

        foreach ($tokens as $token) {
            if (isset($candidateLookup[$token]) || Str::contains($textLookup, ' ' . $token . ' ')) {
                $matched[] = $token;
            }
        }

        if (count($matched) >= 2) {
            return [
                'first_name' => implode(' ', array_slice($matched, 0, -1)),
                'last_name' => $matched[count($matched) - 1],
            ];
        }

        return [
            'first_name' => null,
            'last_name' => null,
        ];
    }

    private function cleanLatinNameLine(string $line): string
    {
        $line = preg_replace_callback('/[\p{Latin}\s\-]+/u', fn (array $match): string => $match[0], $line) ?? $line;
        $line = preg_replace('/[^\p{Latin}\s\-]/u', ' ', $line) ?? $line;
        $line = Str::ascii($line);
        $line = strtoupper($line);
        $line = str_replace('-', ' ', $line);
        $line = preg_replace('/\b(A|F|M|MC|MR|MME|MLLE)\b/u', ' ', $line) ?? $line;
        $line = preg_replace('/\s+/u', ' ', trim($line)) ?? $line;

        return trim($line, ' -');
    }

    private function looksLikeMoroccanCinNameLine(string $line): bool
    {
        if (mb_strlen($line) < 3 || mb_strlen($line) > 35 || preg_match('/\d/u', $line)) {
            return false;
        }

        if (!preg_match('/^[A-Z][A-Z \-]+$/u', $line)) {
            return false;
        }

        return !Str::contains($line, [
            'ROYAUME',
            'MAROC',
            'CARTE',
            'NATIONALE',
            'IDENTITE',
            'VALIDABLE',
            'VALABLE',
            'ADRESSE',
            'ADDRESS',
            'HAY',
            'RUE',
            'CASABLANCA',
            'SEXE',
            'ETAT',
            'CIVIL',
        ]);
    }

    /**
     * @param array<int, string> $dates
     */
    private function extractBirthDateForPdf(string $text, array $dates): ?string
    {
        $contextDate = $this->extractContextDate($text, ['NAISSANCE', 'NE LE', 'NEE LE', 'BIRTH'], $dates);

        if ($contextDate) {
            return $contextDate;
        }

        foreach (preg_split('/\n/u', $text) ?: [] as $line) {
            $normalizedLine = $this->normalizeOcrText($line);

            if (!Str::contains($normalizedLine, ['NE', 'NAISS', 'BIRTH', 'ETAT CIVIL'])) {
                continue;
            }

            $recovered = $this->recoverDateFromNoisyLine($line);

            if ($recovered) {
                return $recovered;
            }
        }

        foreach ($dates as $date) {
            $year = (int) substr($date, -4);

            if ($year >= 1900 && $year <= ((int) now()->format('Y') - 10)) {
                return $date;
            }
        }

        return null;
    }

    /**
     * @param array<int, string> $dates
     */
    private function extractExpirationDateForPdf(string $text, array $dates): ?string
    {
        $contextDate = $this->extractContextDate($text, ['EXPIR', 'VALIDITE', 'VALABLE', 'JUSQU'], $dates);

        if ($contextDate) {
            return $contextDate;
        }

        foreach ($dates as $date) {
            $year = (int) substr($date, -4);

            if ($year >= (int) now()->format('Y')) {
                return $date;
            }
        }

        return null;
    }

    private function recoverDateFromNoisyLine(string $line): ?string
    {
        if (preg_match('/\b([0-3]?\d)\s+([01]?\d)(\d{4})\b/u', $line, $matches)) {
            return sprintf('%02d/%02d/%04d', (int) $matches[1], (int) $matches[2], (int) $matches[3]);
        }

        if (preg_match('/\b([0-3]?\d)([01]\d)(\d{4})\b/u', preg_replace('/\D/u', '', $line) ?? '', $matches)) {
            return sprintf('%02d/%02d/%04d', (int) $matches[1], (int) $matches[2], (int) $matches[3]);
        }

        return null;
    }

    /**
     * Build focused CIN OCR fields for the PDF without changing KYC validation.
     *
     * @return array<int, array{label: string, value: string, rtl: bool}>
     */
    private function structuredCinOcrFields(KycVerification $kyc): array
    {
        $text = $this->cleanOcrText($kyc->extracted_text);
        $normalized = $this->normalizeOcrText($text);
        $dates = $this->extractDates($text);
        $nameParts = $this->extractNamePartsForPdf($text, $kyc->ocr_extracted_full_name);

        $fields = [
            'CIN détectée' => $kyc->detected_cin_number ?: $this->extractCinNumber($normalized),
            'Nom détecté' => $nameParts['last_name'],
            'Prénom détecté' => $nameParts['first_name'],
            'Date naissance détectée' => $kyc->ocr_extracted_birth_date?->format('d/m/Y') ?: $this->extractContextDate($text, ['NAISSANCE', 'NE LE', 'NEE LE', 'BIRTH'], $dates),
            'Adresse détectée' => $this->extractAddress($text),
            'Date expiration détectée' => $this->extractContextDate($text, ['EXPIR', 'VALIDITE', 'VALABLE', 'JUSQU'], $dates),
            'Genre détecté' => $this->extractGenderForPdf($normalized),
            'Score OCR' => $kyc->ocr_confidence_score !== null ? $kyc->ocr_confidence_score . '%' : null,
        ];

        return collect($fields)
            ->map(fn (?string $value, string $label): array => [
                'label' => $label,
                'value' => filled($value) ? $this->formatPdfValue(trim($value)) : 'Non détecté',
                'rtl' => filled($value) && $this->containsArabic($value),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{first_name: ?string, last_name: ?string}
     */
    private function extractNamePartsForPdf(string $text, ?string $storedFullName): array
    {
        $firstName = null;
        $lastName = null;
        $lines = array_values(array_filter(array_map('trim', preg_split('/\n/u', $text) ?: [])));

        foreach ($lines as $index => $line) {
            $normalizedLine = $this->normalizeOcrText($line);

            if (preg_match('/\b(PRENOM|FIRST NAME|GIVEN NAME)\b[:\s-]*(.+)$/u', $normalizedLine, $matches) && mb_strlen(trim($matches[2])) > 2) {
                $firstName = $this->humanizeOcrValue($matches[2]);
            } elseif (preg_match('/\b(PRENOM|FIRST NAME|GIVEN NAME)\b/u', $normalizedLine) && isset($lines[$index + 1])) {
                $candidate = $this->humanizeOcrValue($lines[$index + 1]);
                $firstName = $this->looksLikeName($candidate) ? $candidate : $firstName;
            }

            if (preg_match('/\b(NOM|LAST NAME|SURNAME)\b[:\s-]*(.+)$/u', $normalizedLine, $matches) && mb_strlen(trim($matches[2])) > 2) {
                $lastName = $this->humanizeOcrValue($matches[2]);
            } elseif (preg_match('/\b(NOM|LAST NAME|SURNAME)\b/u', $normalizedLine) && !preg_match('/\b(PRENOM)\b/u', $normalizedLine) && isset($lines[$index + 1])) {
                $candidate = $this->humanizeOcrValue($lines[$index + 1]);
                $lastName = $this->looksLikeName($candidate) ? $candidate : $lastName;
            }
        }

        $fallbackName = $storedFullName ?: $this->extractFullName($text);

        if ((!$firstName || !$lastName) && $fallbackName) {
            $parts = preg_split('/\s+/u', $this->humanizeOcrValue($fallbackName)) ?: [];
            $lastName = $lastName ?: ($parts[0] ?? null);
            $firstName = $firstName ?: (count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : null);
        }

        return [
            'first_name' => $firstName,
            'last_name' => $lastName,
        ];
    }

    private function extractGenderForPdf(string $normalizedText): ?string
    {
        if (preg_match('/\b(SEXE|SEX|GENDER)\b[:\s-]*([MF])\b/u', $normalizedText, $matches)) {
            return $matches[2] === 'F' ? 'Féminin' : 'Masculin';
        }

        if (preg_match('/\b(MASCULIN|MALE)\b/u', $normalizedText)) {
            return 'Masculin';
        }

        if (preg_match('/\b(FEMININ|FEMALE)\b/u', $normalizedText)) {
            return 'Féminin';
        }

        return null;
    }

    /**
     * Build report-only OCR fields without changing the validation workflow.
     *
     * @return array<int, array{label: string, value: string}>
     */
    private function structuredOcrFields(KycVerification $kyc): array
    {
        $text = $this->cleanOcrText($kyc->extracted_text);
        $normalized = $this->normalizeOcrText($text);
        $dates = $this->extractDates($text);

        $fields = [
            'CIN détectée' => $kyc->detected_cin_number ?: $this->extractCinNumber($normalized),
            'Score OCR' => $kyc->ocr_confidence_score !== null ? $kyc->ocr_confidence_score . '%' : null,
            'Nom détecté' => $kyc->ocr_extracted_full_name ?: $this->extractFullName($text),
            'Date naissance détectée' => $kyc->ocr_extracted_birth_date?->format('d/m/Y') ?: $this->extractContextDate($text, ['NAISSANCE', 'NE LE', 'NEE LE', 'BIRTH'], $dates),
            'Adresse détectée' => $this->extractAddress($text),
            'Date expiration détectée' => $this->extractContextDate($text, ['EXPIR', 'VALIDITE', 'VALABLE', 'JUSQU'], $dates),
            'Genre détecté' => $this->extractGender($normalized),
            'Statut vérification' => $kyc->status,
        ];

        return collect($fields)
            ->map(fn (?string $value, string $label): array => [
                'label' => $label,
                'value' => filled($value) ? $this->formatPdfValue(trim($value)) : 'Non détecté',
                'rtl' => filled($value) && $this->containsArabic($value),
            ])
            ->values()
            ->all();
    }

    private function cleanOcrText(?string $text): string
    {
        $text = (string) $text;
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/[^\p{L}\p{N}\s\/\-\.\',:]/u', ' ', $text) ?? $text;
        $text = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;
        $text = preg_replace('/\n{3,}/u', "\n\n", $text) ?? $text;

        return trim($text);
    }

    private function normalizeOcrText(string $text): string
    {
        $text = preg_replace_callback('/[\p{Latin}]+/u', fn (array $match): string => Str::ascii($match[0]), $text) ?? $text;
        $text = strtoupper($text);
        $text = preg_replace('/[^\p{L}\p{N}\s\/\-\.\',:]/u', ' ', $text) ?? $text;

        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }

    private function extractCinNumber(string $normalizedText): ?string
    {
        if (preg_match('/\b[A-Z]{1,2}\s?[0-9]{4,8}\b/u', $normalizedText, $matches)) {
            return strtoupper(str_replace(' ', '', $matches[0]));
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    private function extractDates(string $text): array
    {
        preg_match_all('/\b(?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/u', $text, $matches);

        return array_values(array_unique(array_map(
            fn (string $date): string => str_replace(['.', '-'], '/', $date),
            $matches[0] ?? []
        )));
    }

    /**
     * @param array<int, string> $keywords
     * @param array<int, string> $dates
     */
    private function extractContextDate(string $text, array $keywords, array $dates): ?string
    {
        foreach (preg_split('/\n/u', $text) ?: [] as $line) {
            $normalizedLine = $this->normalizeOcrText($line);

            if (!Str::contains($normalizedLine, $keywords)) {
                continue;
            }

            foreach ($dates as $date) {
                if (Str::contains($line, $date) || Str::contains(str_replace(['.', '-'], '/', $line), $date)) {
                    return $date;
                }
            }

            if (preg_match('/\b(?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/u', $line, $match)) {
                return str_replace(['.', '-'], '/', $match[0]);
            }
        }

        return null;
    }

    private function extractFullName(string $text): ?string
    {
        $lines = array_values(array_filter(array_map('trim', preg_split('/\n/u', $text) ?: [])));

        foreach ($lines as $index => $line) {
            $normalizedLine = $this->normalizeOcrText($line);

            if (preg_match('/\b(NOM|PRENOM|FULL NAME|NAME)\b[:\s-]*(.+)$/u', $normalizedLine, $matches) && mb_strlen(trim($matches[2])) > 2) {
                return $this->humanizeOcrValue($matches[2]);
            }

            if (preg_match('/\b(NOM|PRENOM|FULL NAME|NAME)\b/u', $normalizedLine) && isset($lines[$index + 1])) {
                $candidate = $this->humanizeOcrValue($lines[$index + 1]);

                if ($this->looksLikeName($candidate)) {
                    return $candidate;
                }
            }
        }

        return null;
    }

    private function extractAddress(string $text): ?string
    {
        $lines = array_values(array_filter(array_map('trim', preg_split('/\n/u', $text) ?: [])));

        foreach ($lines as $index => $line) {
            $normalizedLine = $this->normalizeOcrText($line);

            if (preg_match('/\b(ADRESSE|ADDRESS|ADDR)\b[:\s-]*(.+)$/u', $normalizedLine, $matches) && mb_strlen(trim($matches[2])) > 4) {
                return $this->humanizeOcrValue($matches[2]);
            }

            if ((Str::contains($normalizedLine, ['ADRESSE', 'ADDRESS']) || preg_match('/(حي|زنقة|شارع|اقامة)/u', $line)) && isset($lines[$index + 1])) {
                return $this->humanizeOcrValue(trim($line . ' ' . $lines[$index + 1]));
            }
        }

        return null;
    }

    private function extractGender(string $normalizedText): ?string
    {
        if (preg_match('/\b(SEXE|SEX|GENDER)\b[:\s-]*([MF])\b/u', $normalizedText, $matches)) {
            return $matches[2] === 'F' ? 'Féminin' : 'Masculin';
        }

        if (preg_match('/\b(MASCULIN|MALE)\b/u', $normalizedText)) {
            return 'Masculin';
        }

        if (preg_match('/\b(FEMININ|FEMALE)\b/u', $normalizedText)) {
            return 'Féminin';
        }

        return null;
    }

    private function extractNationality(string $normalizedText): ?string
    {
        if (preg_match('/\b(NATIONALITE|NATIONALITY)\b[:\s-]*([A-Z ]{4,})/u', $normalizedText, $matches)) {
            return $this->humanizeOcrValue($matches[2]);
        }

        if (Str::contains($normalizedText, ['ROYAUME DU MAROC', 'MAROC', 'MOROCCO', 'MAROCAINE', 'MAROCAIN', 'المملكة', 'المغربية'])) {
            return 'Marocaine';
        }

        return null;
    }

    private function humanizeOcrValue(string $value): string
    {
        $value = preg_replace('/\s+/u', ' ', trim($value)) ?? $value;
        $value = preg_replace('/^[\s:,\-]+|[\s:,\-]+$/u', '', $value) ?? $value;

        return mb_substr($value, 0, 180);
    }

    private function looksLikeName(string $value): bool
    {
        return mb_strlen($value) >= 4
            && !preg_match('/\d/u', $value)
            && !Str::contains($this->normalizeOcrText($value), ['ROYAUME', 'CARTE', 'IDENTITE', 'ADRESSE']);
    }

    private function formatPdfValue(string $value): string
    {
        $value = $this->humanizeOcrValue($value);

        if (!$this->containsArabic($value)) {
            return $value;
        }

        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return "\u{202B}" . $value . "\u{202C}";
    }

    private function containsArabic(string $value): bool
    {
        return preg_match('/\p{Arabic}/u', $value) === 1;
    }

    private function storageImageDataUri(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $normalizedPath = preg_replace('#^(public/|storage/)#', '', ltrim($path, '/'));

        foreach (['public', 'local'] as $disk) {
            if (!Storage::disk($disk)->exists($normalizedPath)) {
                continue;
            }

            $mime = Storage::disk($disk)->mimeType($normalizedPath) ?: 'image/jpeg';

            if (!extension_loaded('gd') && !in_array($mime, ['image/jpeg', 'image/jpg'], true)) {
                return null;
            }

            return 'data:' . $mime . ';base64,' . base64_encode(Storage::disk($disk)->get($normalizedPath));
        }

        return null;
    }

    private function logoDataUri(): ?string
    {
        $path = base_path('../frontend/src/images/logo digi.png');

        if (!is_file($path) || !extension_loaded('gd')) {
            return null;
        }

        return 'data:image/png;base64,' . base64_encode((string) file_get_contents($path));
    }
}
