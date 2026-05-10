<?php

namespace Tests\Unit;

use App\Services\Kyc\AiCinVerificationService;
use PHPUnit\Framework\TestCase;

class AiCinVerificationServiceTest extends TestCase
{
    public function test_high_confidence_moroccan_cin_is_pending_review(): void
    {
        $decision = (new AiCinVerificationService())->decide([
            'document_detected' => true,
            'extracted_cin_number' => 'BK123456',
            'keyword_score' => 80,
            'text_density_score' => 75,
            'document_shape_score' => 90,
            'blur_score' => 85,
            'confidence_score' => 88,
            'suspicious' => false,
            'extracted_text' => 'ROYAUME DU MAROC CARTE NATIONALE D IDENTITE BK123456',
            'error' => null,
        ]);

        $this->assertSame('pending_review', $decision['decision']);
        $this->assertFalse($decision['rejected']);
    }

    public function test_score_above_fifty_moroccan_cin_is_pending_review(): void
    {
        $decision = (new AiCinVerificationService())->decide([
            'document_detected' => true,
            'extracted_cin_number' => 'BK123456',
            'keyword_score' => 50,
            'text_density_score' => 60,
            'document_shape_score' => 70,
            'blur_score' => 60,
            'confidence_score' => 72,
            'suspicious' => false,
            'extracted_text' => 'ROYAUME DU MAROC CARTE NATIONALE D IDENTITE BK123456',
            'error' => null,
        ]);

        $this->assertSame('pending_review', $decision['decision']);
        $this->assertFalse($decision['rejected']);
    }

    public function test_image_without_any_cin_signal_is_rejected(): void
    {
        $decision = (new AiCinVerificationService())->decide([
            'document_detected' => false,
            'extracted_cin_number' => null,
            'keyword_score' => 0,
            'text_density_score' => 0,
            'document_shape_score' => 10,
            'blur_score' => 85,
            'confidence_score' => 82,
            'suspicious' => false,
            'extracted_text' => 'POOL BUILDING GARDEN SKY WATER',
            'error' => null,
        ]);

        $this->assertSame('reject', $decision['decision']);
        $this->assertTrue($decision['rejected']);
    }

    public function test_low_but_plausible_real_cin_evidence_goes_to_manual_review(): void
    {
        $decision = (new AiCinVerificationService())->decide([
            'document_detected' => true,
            'extracted_cin_number' => 'B475251',
            'keyword_score' => 12,
            'text_density_score' => 42,
            'document_shape_score' => 55,
            'blur_score' => 30,
            'confidence_score' => 45,
            'suspicious' => false,
            'extracted_text' => 'MAROC CARTE B475251 SOME EXTRA OCR TEXT',
            'error' => null,
        ]);

        $this->assertSame('needs_review', $decision['decision']);
        $this->assertFalse($decision['rejected']);
    }

    public function test_visual_document_signal_with_low_score_goes_to_manual_review(): void
    {
        $decision = (new AiCinVerificationService())->decide([
            'document_detected' => true,
            'extracted_cin_number' => null,
            'keyword_score' => 0,
            'text_density_score' => 8,
            'document_shape_score' => 55,
            'blur_score' => 20,
            'confidence_score' => 25,
            'face_photo_detected' => false,
            'barcode_detected' => false,
            'suspicious' => false,
            'extracted_text' => '',
            'error' => null,
        ]);

        $this->assertSame('needs_review', $decision['decision']);
        $this->assertFalse($decision['rejected']);
    }

    public function test_scenery_without_cin_and_keywords_still_rejected(): void
    {
        $decision = (new AiCinVerificationService())->decide([
            'document_detected' => false,
            'extracted_cin_number' => null,
            'keyword_score' => 0,
            'text_density_score' => 5,
            'document_shape_score' => 0,
            'blur_score' => 80,
            'confidence_score' => 38,
            'suspicious' => true,
            'extracted_text' => 'POOL BUILDING GARDEN SKY WATER',
            'error' => null,
        ]);

        $this->assertSame('reject', $decision['decision']);
        $this->assertTrue($decision['rejected']);
    }
}
