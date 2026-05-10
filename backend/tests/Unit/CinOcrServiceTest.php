<?php

namespace Tests\Unit;

use App\Services\Kyc\CinOcrService;
use PHPUnit\Framework\TestCase;

class CinOcrServiceTest extends TestCase
{
    public function test_random_photo_text_is_rejected_as_suspicious(): void
    {
        $result = (new CinOcrService())->analyzeText('blue pool bathroom tiles summer photo');

        $this->assertSame('reject', $result['decision']);
        $this->assertFalse($result['ocr_verified']);
        $this->assertTrue($result['suspicious_document']);
        $this->assertContains('no_identity_keywords', $result['reasons']);
        $this->assertContains('no_cin_pattern', $result['reasons']);
    }

    public function test_short_or_empty_ocr_text_is_rejected(): void
    {
        $result = (new CinOcrService())->analyzeText('');

        $this->assertSame('reject', $result['decision']);
        $this->assertContains('no_text_detected', $result['reasons']);
    }

    public function test_moroccan_cin_text_with_keywords_and_number_is_verified_for_pending_review(): void
    {
        $result = (new CinOcrService())->analyzeText(
            'ROYAUME DU MAROC CARTE NATIONALE D IDENTITE NATIONALE AB123456'
        );

        $this->assertSame('pending', $result['decision']);
        $this->assertTrue($result['ocr_verified']);
        $this->assertSame('AB123456', $result['detected_cin_number']);
        $this->assertGreaterThanOrEqual(70, $result['score']);
    }

    public function test_identity_keywords_without_cin_number_go_to_manual_review(): void
    {
        $result = (new CinOcrService())->analyzeText('ROYAUME DU MAROC CARTE NATIONALE IDENTITE');

        $this->assertSame('needs_review', $result['decision']);
        $this->assertFalse($result['ocr_verified']);
        $this->assertContains('no_cin_pattern', $result['reasons']);
    }

    public function test_arabic_moroccan_identity_keywords_are_supported(): void
    {
        $result = (new CinOcrService())->analyzeText('المملكة المغربية البطاقة الوطنية AB123456');

        $this->assertSame('pending', $result['decision']);
        $this->assertTrue($result['ocr_verified']);
        $this->assertSame('AB123456', $result['detected_cin_number']);
    }
}
