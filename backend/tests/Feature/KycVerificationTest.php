<?php

namespace Tests\Feature;

use App\Models\KycVerification;
use App\Models\User;
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
        $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE]);
        KycVerification::create($this->kycAttributes(User::factory()->create()));
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
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'cin_front_url',
                        'cin_back_url',
                    ],
                ],
            ]);
    }

    public function test_employee_can_approve_pending_kyc(): void
    {
        $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE]);
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

    public function test_pending_endpoint_returns_pending_and_needs_review_kyc_only(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        KycVerification::create($this->kycAttributes(User::factory()->create()));
        KycVerification::create($this->kycAttributes(User::factory()->create(), [
            'status' => KycVerification::STATUS_NEEDS_REVIEW,
        ]));
        KycVerification::create($this->kycAttributes(User::factory()->create(), [
            'status' => KycVerification::STATUS_APPROVED,
        ]));
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/kyc/pending')
            ->assertOk()
            ->assertJsonCount(2, 'data');
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
}
