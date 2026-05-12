<?php

namespace App\Services\Kyc;

use Illuminate\Support\Facades\Log;
use thiagoalessio\TesseractOCR\TesseractOCR;
use Throwable;

class CinOcrService
{
    private const MIN_TEXT_LENGTH = 8;
    private const REVIEW_THRESHOLD = 40;
    private const VERIFIED_THRESHOLD = 70;

    /**
     * Keywords for Moroccan identity cards. Arabic terms are kept because CINs
     * commonly contain both Arabic and French labels.
     */
    protected array $keywords = [
        'ROYAUME DU MAROC',
        'CARTE NATIONALE',
        'CARTE NATIONALE DIDENTITE',
        'CARTE NATIONALE D IDENTITE',
        'IDENTITE',
        'NATIONALE',
        'CIN',
        'IDMAROC',
        'المملكة المغربية',
        'البطاقة الوطنية',
    ];

    protected array $identityLanguageKeywords = [
        'ROYAUME',
        'MAROC',
        'CARTE',
        'NATIONALE',
        'IDENTITE',
        'المملكة',
        'المغربية',
        'البطاقة',
        'الوطنية',
    ];

    /**
     * Regex for Moroccan CIN number pattern.
     */
    protected string $cinRegex = '/\b[A-Z]{1,2}\s?[0-9]{4,8}\b/u';

    /**
     * Tolerant regex that allows OCR substitution errors (e.g. 8→B, O→0).
     */
    protected string $cinRegexExtended = '/\b[A-Z0-9]{1,2}\s?[A-Z0-9]{4,8}\b/u';

    /**
     * Perform OCR on an image and validate it.
     */
    public function extractAndValidate(string $imagePath): array
    {
        $result = $this->defaultResult();

        try {
            if (!file_exists($imagePath)) {
                $result['error'] = 'Image file not found.';
                return $result;
            }

            if (!$this->isTesseractAvailable()) {
                $result['error'] = 'Tesseract OCR is not installed or not configured.';
                return $result;
            }

            $ocr = (new TesseractOCR($imagePath))
                ->lang(...$this->configuredLanguages());

            if ($this->configuredExecutable() !== null) {
                $ocr->executable($this->configuredExecutable());
            }

            if ($this->configuredTessdataDir() !== null) {
                $ocr->tessdataDir($this->configuredTessdataDir());
            }

            $text = $ocr->run();
            $result = $this->analyzeText($text);

            Log::info('KYC OCR analyzed CIN image', [
                'image_path' => $imagePath,
                'tesseract_executable' => $this->configuredExecutable(),
                'tessdata_dir' => $this->configuredTessdataDir(),
                'tesseract_languages' => $this->configuredLanguages(),
                'tesseract_language_status' => $this->languagePackStatus(),
                'extracted_text' => $result['extracted_text'],
                'score' => $result['score'],
                'decision' => $result['decision'],
                'detected_cin' => $result['detected_cin_number'],
                'matched_keywords' => $result['matched_keywords'],
                'reasons' => $result['reasons'],
                'ocr_verified' => $result['ocr_verified'],
            ]);
        } catch (Throwable $e) {
            Log::error('OCR Error: ' . $e->getMessage());
            $result['error'] = 'OCR processing failed: ' . $e->getMessage();
        }

        return $result;
    }

    public function analyzeText(?string $text): array
    {
        $text = (string) $text;
        $normalizedText = $this->normalizeText($text);
        $plainText = preg_replace('/\s+/u', '', $normalizedText) ?? '';
        $length = mb_strlen($plainText);
        $score = 0;
        $reasons = [];
        $matchedKeywords = [];

        if ($length === 0) {
            $score -= 40;
            $reasons[] = 'no_text_detected';
        } elseif ($length < self::MIN_TEXT_LENGTH) {
            $score -= 10;
            $reasons[] = 'text_too_short';
        }

        foreach ($this->keywords as $keyword) {
            $normalizedKeyword = $this->normalizeText($keyword);

            if ($normalizedKeyword !== '' && str_contains($normalizedText, $normalizedKeyword)) {
                $score += 15;
                $matchedKeywords[] = $keyword;
            }
        }

        $hasIdentityLanguage = false;
        foreach ($this->identityLanguageKeywords as $keyword) {
            if (str_contains($normalizedText, $this->normalizeText($keyword))) {
                $hasIdentityLanguage = true;
                break;
            }
        }

        if ($hasIdentityLanguage) {
            $score += 20;
            $reasons[] = 'identity_language_detected';
        }

        $detectedCin = null;
        if (preg_match($this->cinRegex, $normalizedText, $matches)) {
            $detectedCin = strtoupper(str_replace(' ', '', $matches[0]));
            $score += 30;
            $reasons[] = 'cin_pattern_detected';
        } elseif (preg_match($this->cinRegexExtended, $normalizedText, $matches)) {
            $raw = strtoupper(str_replace(' ', '', $matches[0]));
            $detectedCin = self::normalizeCinValue($raw);
            $score += 25;
            $reasons[] = 'cin_pattern_detected_with_ocr_correction';
        }

        if ($matchedKeywords === []) {
            $reasons[] = 'no_identity_keywords';
        }

        if ($detectedCin === null) {
            $reasons[] = 'no_cin_pattern';
            $score = min($score, self::VERIFIED_THRESHOLD - 1);
        }

        $decision = match (true) {
            $score < self::REVIEW_THRESHOLD => 'reject',
            $score < self::VERIFIED_THRESHOLD => 'needs_review',
            default => 'pending',
        };

        return [
            'extracted_text' => $text,
            'normalized_text' => $normalizedText,
            'detected_cin_number' => $detectedCin,
            'ocr_verified' => $decision === 'pending',
            'score' => $score,
            'decision' => $decision,
            'matched_keywords' => array_values(array_unique($matchedKeywords)),
            'reasons' => array_values(array_unique($reasons)),
            'suspicious_document' => $decision === 'reject',
            'error' => null,
        ];
    }

    protected function isTesseractAvailable(): bool
    {
        try {
            $command = $this->configuredExecutable() ?? 'tesseract';
            exec('"' . $command . '" --version', $output, $returnCode);
            return $returnCode === 0;
        } catch (Throwable) {
            return false;
        }
    }

    protected function configuredExecutable(): ?string
    {
        $executable = (string) config('services.tesseract.executable', '');

        return $executable !== '' ? $executable : null;
    }

    protected function configuredLanguages(): array
    {
        $languages = (string) config('services.tesseract.languages', 'fra+ara');

        return array_values(array_filter(preg_split('/[+,]/', $languages) ?: []));
    }

    protected function configuredTessdataDir(): ?string
    {
        $dir = (string) config('services.tesseract.tessdata', '');

        return $dir !== '' ? $dir : null;
    }

    protected function languagePackStatus(): array
    {
        $command = $this->configuredExecutable() ?? 'tesseract';

        try {
            exec('"' . $command . '" --list-langs', $output, $returnCode);
        } catch (Throwable $e) {
            return [
                'available' => [],
                'missing' => $this->configuredLanguages(),
                'error' => $e->getMessage(),
            ];
        }

        $available = array_values(array_filter(array_map('trim', $output ?? [])));
        $available = array_values(array_filter(
            $available,
            fn (string $line): bool => !str_starts_with(strtolower($line), 'list of available languages')
        ));

        return [
            'available' => $available,
            'missing' => array_values(array_diff($this->configuredLanguages(), $available)),
            'expected_files' => array_map(
                fn (string $language): array => [
                    'language' => $language,
                    'path' => $this->configuredTessdataDir()
                        ? $this->configuredTessdataDir() . DIRECTORY_SEPARATOR . $language . '.traineddata'
                        : null,
                    'exists' => $this->configuredTessdataDir()
                        ? file_exists($this->configuredTessdataDir() . DIRECTORY_SEPARATOR . $language . '.traineddata')
                        : null,
                ],
                $this->configuredLanguages()
            ),
            'return_code' => $returnCode,
        ];
    }

    /**
     * Correct common OCR substitution errors in a raw CIN match.
     * Prefix (1-2 chars) should be letters; suffix should be digits.
     */
    public static function normalizeCinValue(string $cin): string
    {
        $cin = strtoupper(str_replace(' ', '', $cin));

        if (strlen($cin) < 5) {
            return $cin;
        }

        // Prefix is 2 chars when char[1] is a letter, otherwise 1 char
        $prefixLen = ctype_alpha($cin[1] ?? '') ? 2 : 1;
        $prefix    = substr($cin, 0, $prefixLen);
        $suffix    = substr($cin, $prefixLen);

        // Fix digit→letter OCR errors in the prefix
        $prefix = strtr($prefix, ['0' => 'O', '1' => 'I', '8' => 'B', '5' => 'S', '6' => 'G']);

        // Fix letter→digit OCR errors in the suffix
        $suffix = strtr($suffix, ['O' => '0', 'I' => '1', 'L' => '1', 'S' => '5', 'Z' => '2', 'B' => '8']);

        return $prefix . $suffix;
    }

    protected function normalizeText(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = str_replace(["\r", "\n", "\t"], ' ', $text);
        $text = str_replace(["'", '’', '`', '´', '-'], ' ', $text);
        $text = $this->removeAccents($text);
        $text = mb_strtoupper($text);

        return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
    }

    protected function removeAccents(string $text): string
    {
        $mapped = strtr($text, [
            'À' => 'A', 'Á' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A', 'Å' => 'A',
            'à' => 'A', 'á' => 'A', 'â' => 'A', 'ã' => 'A', 'ä' => 'A', 'å' => 'A',
            'Ç' => 'C', 'ç' => 'C',
            'È' => 'E', 'É' => 'E', 'Ê' => 'E', 'Ë' => 'E',
            'è' => 'E', 'é' => 'E', 'ê' => 'E', 'ë' => 'E',
            'Ì' => 'I', 'Í' => 'I', 'Î' => 'I', 'Ï' => 'I',
            'ì' => 'I', 'í' => 'I', 'î' => 'I', 'ï' => 'I',
            'Ñ' => 'N', 'ñ' => 'N',
            'Ò' => 'O', 'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
            'ò' => 'O', 'ó' => 'O', 'ô' => 'O', 'õ' => 'O', 'ö' => 'O',
            'Ù' => 'U', 'Ú' => 'U', 'Û' => 'U', 'Ü' => 'U',
            'ù' => 'U', 'ú' => 'U', 'û' => 'U', 'ü' => 'U',
            'Ý' => 'Y', 'Ÿ' => 'Y', 'ý' => 'Y', 'ÿ' => 'Y',
        ]);

        return $mapped;
    }

    private function defaultResult(): array
    {
        return [
            'extracted_text' => null,
            'normalized_text' => null,
            'detected_cin_number' => null,
            'ocr_verified' => false,
            'score' => 0,
            'decision' => 'needs_review',
            'matched_keywords' => [],
            'reasons' => [],
            'suspicious_document' => false,
            'error' => null,
        ];
    }
}
