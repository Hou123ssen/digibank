<?php

namespace Tests\Feature;

use App\Models\KycVerification;
use App\Models\User;
use App\Services\Kyc\AiCinVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class KycVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_submit_kyc_verification(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $this->mockHighConfidenceAiCin();

        $response = $this->post('/api/kyc/submit', $this->validPayload(), [
            'Accept' => 'application/json',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertContains(
            $response->json('data.kyc_verification.status'),
            KycVerification::REVIEWABLE_STATUSES
        );

        $kyc = $user->kycVerification()->first();

        $this->assertNotNull($kyc);
        Storage::disk('public')->assertExists($kyc->cin_front_path);
        Storage::disk('public')->assertExists($kyc->cin_back_path);
        $this->assertNotNull($kyc->cin_front_url);
        $this->assertNotNull($kyc->cin_back_url);
    }

    public function test_user_cannot_submit_again_when_pending_or_approved(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        KycVerification::create($this->kycAttributes($user, [
            'status' => KycVerification::STATUS_PENDING,
        ]));

        $this->post('/api/kyc/submit', $this->validPayload(), ['Accept' => 'application/json'])
            ->assertStatus(409);

        $user->kycVerification->update(['status' => KycVerification::STATUS_APPROVED]);

        $this->post('/api/kyc/submit', $this->validPayload(), ['Accept' => 'application/json'])
            ->assertStatus(409);
    }

    public function test_rejected_user_can_resubmit_kyc(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $this->mockHighConfidenceAiCin();

        KycVerification::create($this->kycAttributes($user, [
            'status' => KycVerification::STATUS_REJECTED,
            'rejection_reason' => 'Blurry CIN front.',
        ]));

        $response = $this->post('/api/kyc/submit', $this->validPayload(), [
            'Accept' => 'application/json',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.kyc_verification.rejection_reason', null);

        $this->assertContains(
            $response->json('data.kyc_verification.status'),
            KycVerification::REVIEWABLE_STATUSES
        );

        $this->assertDatabaseCount('kyc_verifications', 1);
    }

    public function test_suspicious_non_cin_image_is_rejected_before_submission_is_saved(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->mock(AiCinVerificationService::class, function ($mock): void {
            $mock->shouldReceive('verify')
                ->twice()
                ->andReturn([
                    'extracted_text' => 'blue pool bathroom tiles summer photo',
                    'extracted_cin_number' => null,
                    'extracted_full_name' => null,
                    'extracted_birth_date' => null,
                    'confidence_score' => 0,
                    'keyword_score' => 0,
                    'text_density_score' => 0,
                    'document_shape_score' => 0,
                    'blur_score' => 80,
                    'document_detected' => false,
                    'suspicious' => true,
                    'matched_keywords' => [],
                    'error' => null,
                ]);
            $mock->shouldReceive('decide')
                ->once()
                ->andReturn([
                    'decision' => 'reject',
                    'rejected' => true,
                    'reason' => 'suspicious_or_low_confidence_document',
                ]);
        });

        $this->post('/api/kyc/submit', $this->validPayload(), [
            'Accept' => 'application/json',
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'La CIN fournie semble invalide ou illisible. Veuillez importer une photo claire de votre carte nationale marocaine.');

        $this->assertDatabaseCount('kyc_verifications', 0);
        $this->assertCount(0, Storage::disk('public')->allFiles());
    }

    public function test_unavailable_ai_validation_rejects_image_before_submission_is_saved(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->mock(AiCinVerificationService::class, function ($mock): void {
            $mock->shouldReceive('verify')
                ->twice()
                ->andReturn([
                    'document_detected' => false,
                    'extracted_cin_number' => null,
                    'keyword_score' => 0,
                    'text_density_score' => 0,
                    'document_shape_score' => 0,
                    'blur_score' => 0,
                    'confidence_score' => 0,
                    'suspicious' => true,
                    'extracted_text' => null,
                    'error' => 'AI CIN verification service unavailable.',
                ]);
        });

        $this->post('/api/kyc/submit', $this->validPayload(), [
            'Accept' => 'application/json',
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'La CIN fournie semble invalide ou illisible. Veuillez importer une photo claire de votre carte nationale marocaine.');

        $this->assertDatabaseCount('kyc_verifications', 0);
        $this->assertCount(0, Storage::disk('public')->allFiles());
    }

    public function test_medium_confidence_ai_cin_submission_is_saved_as_needs_review(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->mock(AiCinVerificationService::class, function ($mock): void {
            $mock->shouldReceive('verify')
                ->twice()
                ->andReturn([
                    'extracted_text' => 'ROYAUME DU MAROC CARTE NATIONALE D IDENTITE BK123456',
                    'extracted_cin_number' => 'BK123456',
                    'extracted_full_name' => 'JOHN DOE',
                    'extracted_birth_date' => '1995-04-12',
                    'confidence_score' => 45,
                    'keyword_score' => 60,
                    'text_density_score' => 60,
                    'document_shape_score' => 70,
                    'blur_score' => 70,
                    'document_detected' => true,
                    'suspicious' => false,
                    'matched_keywords' => ['ROYAUME DU MAROC', 'CARTE NATIONALE'],
                    'error' => null,
                ]);
            $mock->shouldReceive('decide')
                ->once()
                ->andReturn([
                    'decision' => 'needs_review',
                    'rejected' => false,
                    'reason' => 'medium_confidence_document',
                ]);
        });

        $this->post('/api/kyc/submit', $this->validPayload(), [
            'Accept' => 'application/json',
        ])
            ->assertCreated()
            ->assertJsonPath('data.kyc_verification.status', KycVerification::STATUS_NEEDS_REVIEW)
            ->assertJsonPath('data.kyc_verification.ocr_confidence_score', 45);
    }

    public function test_high_confidence_ai_cin_submission_is_saved_as_pending_review(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $this->mockHighConfidenceAiCin();

        $this->post('/api/kyc/submit', $this->validPayload(), [
            'Accept' => 'application/json',
        ])
            ->assertCreated()
            ->assertJsonPath('data.kyc_verification.status', KycVerification::STATUS_PENDING_REVIEW)
            ->assertJsonPath('data.kyc_verification.detected_cin_number', 'BK123456')
            ->assertJsonPath('data.kyc_verification.ocr_confidence_score', 88)
            ->assertJsonPath('data.kyc_verification.ocr_suspicious', false);
    }

    public function test_back_side_can_save_submission_when_front_ocr_fails(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->mock(AiCinVerificationService::class, function ($mock): void {
            $mock->shouldReceive('verify')
                ->once()
                ->andReturn([
                    'document_detected' => false,
                    'extracted_cin_number' => null,
                    'keyword_score' => 0,
                    'text_density_score' => 0,
                    'document_shape_score' => 0,
                    'blur_score' => 0,
                    'confidence_score' => 0,
                    'suspicious' => true,
                    'extracted_text' => null,
                    'error' => 'OCR failed for front image.',
                ]);
            $mock->shouldReceive('verify')
                ->once()
                ->andReturn([
                    'extracted_text' => 'ROYAUME DU MAROC CARTE NATIONALE D IDENTITE BK123456',
                    'extracted_cin_number' => 'BK123456',
                    'extracted_full_name' => 'JOHN DOE',
                    'extracted_birth_date' => '1995-04-12',
                    'confidence_score' => 82,
                    'keyword_score' => 80,
                    'text_density_score' => 75,
                    'document_shape_score' => 80,
                    'blur_score' => 85,
                    'document_detected' => true,
                    'suspicious' => false,
                    'matched_keywords' => ['ROYAUME DU MAROC', 'CARTE NATIONALE'],
                    'error' => null,
                ]);
            $mock->shouldReceive('decide')
                ->once()
                ->andReturn([
                    'decision' => 'pending_review',
                    'rejected' => false,
                    'reason' => 'high_confidence_document',
                ]);
        });

        $this->post('/api/kyc/submit', $this->validPayload(), [
            'Accept' => 'application/json',
        ])
            ->assertCreated()
            ->assertJsonPath('data.kyc_verification.status', KycVerification::STATUS_PENDING_REVIEW)
            ->assertJsonPath('data.kyc_verification.detected_cin_number', 'BK123456');
    }

    public function test_regular_user_cannot_review_kyc(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        Sanctum::actingAs($user);

        $this->getJson('/api/admin/kyc/pending')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_employee_can_see_pending_and_needs_review_kyc(): void
    {
        $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE, 'department' => 'kyc', 'status' => 'active']);
        KycVerification::create($this->kycAttributes(User::factory()->create()));
        KycVerification::create($this->kycAttributes(User::factory()->create(), [
            'status' => KycVerification::STATUS_PENDING_REVIEW,
        ]));
        KycVerification::create($this->kycAttributes(User::factory()->create(), [
            'status' => KycVerification::STATUS_NEEDS_REVIEW,
        ]));
        KycVerification::create($this->kycAttributes(User::factory()->create(), [
            'status' => KycVerification::STATUS_APPROVED,
        ]));
        Sanctum::actingAs($employee);

        $this->getJson('/api/admin/kyc/pending')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'cin_front_url',
                        'cin_back_url',
                    ],
                ],
            ]);
    }

    public function test_kyc_employee_can_download_kyc_pdf_report(): void
    {
        Storage::fake('public');
        $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE, 'department' => 'kyc', 'status' => 'active']);
        $customer = User::factory()->create();
        $kyc = KycVerification::create($this->kycAttributes($customer, [
            'extracted_text' => 'ROYAUME DU MAROC CARTE NATIONALE D IDENTITE BK123456',
            'detected_cin_number' => 'BK123456',
            'ocr_confidence_score' => 88,
        ]));
        Storage::disk('public')->put($kyc->cin_front_path, $this->tinyPng());
        Storage::disk('public')->put($kyc->cin_back_path, $this->tinyPng());
        Sanctum::actingAs($employee);

        $this->get("/api/employee/kyc/{$kyc->id}/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_non_kyc_employee_cannot_download_kyc_pdf_report(): void
    {
        $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE, 'department' => 'tickets', 'status' => 'active']);
        $kyc = KycVerification::create($this->kycAttributes(User::factory()->create()));
        Sanctum::actingAs($employee);

        $this->getJson("/api/employee/kyc/{$kyc->id}/pdf")
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_kyc_pdf_parser_extracts_moroccan_cin_name_and_birth_date(): void
    {
        $controller = app(\App\Http\Controllers\Api\Admin\KycReviewController::class);
        $method = new \ReflectionMethod($controller, 'structuredMoroccanCinOcrFields');
        $method->setAccessible(true);
        $kyc = new KycVerification($this->kycAttributes(User::factory()->make(), [
            'full_name' => 'EL HOUCINE DOUDLI',
            'extracted_text' => "ROYAUME DU MAROC\nCARTE NATIONALE D'IDENTITE\nEL-HOUCINE\nDOUDLI\nNe le 17.04.2000\nValable jusqu'au 25.05.2029\nBJ475251",
            'detected_cin_number' => 'BJ475251',
            'ocr_confidence_score' => 100,
        ]));

        $fields = collect($method->invoke($controller, $kyc))->pluck('value', 'label');

        $this->assertSame('DOUDLI', $fields['Nom détecté']);
        $this->assertSame('EL HOUCINE', $fields['Prénom détecté']);
        $this->assertSame('17/04/2000', $fields['Date naissance détectée']);
        $this->assertSame('25/05/2029', $fields['Date expiration détectée']);
        $this->assertSame('BJ475251', $fields['CIN détectée']);
    }

    public function test_employee_can_approve_pending_kyc(): void
    {
        $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE, 'department' => 'kyc', 'status' => 'active']);
        $customer = User::factory()->create();
        $kyc = KycVerification::create($this->kycAttributes($customer));
        Sanctum::actingAs($employee);

        $response = $this->postJson("/api/admin/kyc/{$kyc->id}/approve");

        $response->assertOk()
            ->assertJsonPath('data.kyc_verification.status', KycVerification::STATUS_APPROVED)
            ->assertJsonPath('data.kyc_verification.reviewed_by', $employee->id);

        $this->assertTrue($customer->fresh()->isKycApproved());
    }

    public function test_admin_can_reject_pending_kyc(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $customer = User::factory()->create();
        $kyc = KycVerification::create($this->kycAttributes($customer));
        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/kyc/{$kyc->id}/reject", [
            'rejection_reason' => 'Document is unreadable.',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.kyc_verification.status', KycVerification::STATUS_REJECTED)
            ->assertJsonPath('data.kyc_verification.rejection_reason', 'Document is unreadable.');
    }

    public function test_pending_endpoint_returns_reviewable_kyc_only(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        KycVerification::create($this->kycAttributes(User::factory()->create()));
        KycVerification::create($this->kycAttributes(User::factory()->create(), [
            'status' => KycVerification::STATUS_PENDING_REVIEW,
        ]));
        KycVerification::create($this->kycAttributes(User::factory()->create(), [
            'status' => KycVerification::STATUS_NEEDS_REVIEW,
        ]));
        KycVerification::create($this->kycAttributes(User::factory()->create(), [
            'status' => KycVerification::STATUS_APPROVED,
        ]));
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/kyc/pending')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    private function validPayload(): array
    {
        return [
            'national_id_number' => 'AB123456',
            'full_name' => 'John Doe',
            'birth_date' => '1995-04-12',
            'cin_front' => UploadedFile::fake()->create('cin-front.jpg', 256, 'image/jpeg'),
            'cin_back' => UploadedFile::fake()->create('cin-back.png', 256, 'image/png'),
            'selfie' => UploadedFile::fake()->create('selfie.jpg', 256, 'image/jpeg'),
        ];
    }

    private function kycAttributes(User $user, array $overrides = []): array
    {
        return array_merge([
            'user_id' => $user->id,
            'national_id_number' => 'AB123456',
            'full_name' => $user->name,
            'birth_date' => '1995-04-12',
            'cin_front_path' => "kyc/{$user->id}/front.jpg",
            'cin_back_path' => "kyc/{$user->id}/back.jpg",
            'selfie_path' => null,
            'status' => KycVerification::STATUS_PENDING,
        ], $overrides);
    }

    private function mockHighConfidenceAiCin(): void
    {
        $this->mock(AiCinVerificationService::class, function ($mock): void {
            $mock->shouldReceive('verify')
                ->twice()
                ->andReturn([
                    'extracted_text' => 'ROYAUME DU MAROC CARTE NATIONALE D IDENTITE BK123456',
                    'extracted_cin_number' => 'BK123456',
                    'extracted_full_name' => 'JOHN DOE',
                    'extracted_birth_date' => '1995-04-12',
                    'confidence_score' => 88,
                    'keyword_score' => 80,
                    'text_density_score' => 75,
                    'document_shape_score' => 90,
                    'blur_score' => 85,
                    'document_detected' => true,
                    'suspicious' => false,
                    'matched_keywords' => ['ROYAUME DU MAROC', 'CARTE NATIONALE'],
                    'error' => null,
                ]);
            $mock->shouldReceive('decide')
                ->once()
                ->andReturn([
                    'decision' => 'pending_review',
                    'rejected' => false,
                    'reason' => 'high_confidence_document',
            ]);
        });
    }

    private function tinyPng(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=');
    }
}
