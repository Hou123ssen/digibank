<?php

namespace App\Services\Kyc;

use thiagoalessio\TesseractOCR\TesseractOCR;
use Illuminate\Support\Facades\Log;
use Throwable;

class CinOcrService
{
    /**
     * Keywords for Moroccan identity cards.
     */
    protected array $keywords = [
        'ROYAUME DU MAROC',
        'CARTE NATIONALE',
        'CARTE NATIONALE D\'IDENTITE',
        'IDENTITE',
        'المملكة المغربية',
        'البطاقة الوطنية',
    ];

    /**
     * regex for Moroccan CIN number pattern.
     */
    protected string $cinRegex = '/\b[A-Z]{1,2}\s?[0-9]{4,8}\b/i';

    /**
     * Perform OCR on an image and validate it.
     */
    public function extractAndValidate(string $imagePath): array
    {
        $result = [
            'extracted_text' => null,
            'detected_cin_number' => null,
            'ocr_verified' => false,
            'error' => null,
        ];

        try {
            if (!file_exists($imagePath)) {
                $result['error'] = 'Image file not found.';
                return $result;
            }

            // Perform OCR
            $ocr = new TesseractOCR($imagePath);

            // On Windows, if Tesseract is not in PATH, we might need to set executable
            // If the user hasn't provided a path, we assume it's in the PATH
            // But let's check if it's executable by running a version check
            if ($this->isTesseractAvailable()) {
                $text = $ocr->run();
            } else {
                $result['error'] = "Tesseract OCR is not installed or not configured.";
                return $result;
            }

            $normalizedText = $this->normalizeText($text);
            $result['extracted_text'] = $text;

            // Check for keywords
            $hasKeyword = false;
            foreach ($this->keywords as $keyword) {
                if (str_contains(mb_strtoupper($normalizedText), $this->normalizeString($keyword))) {
                    $hasKeyword = true;
                    break;
                }
            }

            // Check for CIN number
            if (preg_match($this->cinRegex, $text, $matches)) {
                $result['detected_cin_number'] = strtoupper(str_replace(' ', '', $matches[0]));
                $result['ocr_verified'] = true;
            } elseif ($hasKeyword) {
                $result['ocr_verified'] = true;
            }

            Log::info('KYC OCR extracted text', [
                'text' => $result['extracted_text'],
                'detected_cin' => $result['detected_cin_number'],
                'ocr_verified' => $result['ocr_verified'],
            ]);
        } catch (Throwable $e) {
            Log::error('OCR Error: ' . $e->getMessage());
            $result['error'] = 'OCR processing failed: ' . $e->getMessage();
        }

        return $result;
    }

    protected function isTesseractAvailable(): bool
    {
        try {
            // Simple check if tesseract is in the path
            exec('tesseract --version', $output, $returnCode);
            return $returnCode === 0;
        } catch (Throwable $e) {
            return false;
        }
    }

    protected function normalizeText(string $text): string
    {
        // Uppercase, remove extra spaces
        return preg_replace('/\s+/', ' ', mb_strtoupper($text));
    }

    protected function normalizeString(string $str): string
    {
        return mb_strtoupper($str);
    }
}
