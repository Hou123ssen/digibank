<?php

namespace Tests\Feature;

use App\Models\KycVerification;
use App\Models\TrustScoreLog;
use App\Models\User;
use App\Services\TrustScoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TrustScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_user_starts_with_trust_score_50(): void
    {
        $user = User::factory()->create();

        $this->assertSame(50, $user->trust_score);
    }

    public function test_kyc_approval_increases_score_and_creates_log(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $customer = User::factory()->create();
        $kyc = KycVerification::create($this->kycAttributes($customer));
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/kyc/{$kyc->id}/approve")
            ->assertOk();

        $this->assertSame(70, $customer->fresh()->trust_score);
        $this->assertDatabaseHas('trust_score_logs', [
            'user_id' => $customer->id,
            'change_type' => TrustScoreLog::TYPE_INCREASE,
            'points' => 20,
            'old_score' => 50,
            'new_score' => 70,
            'reason' => 'KYC approved',
        ]);
    }

    public function test_kyc_approval_unlocks_overdraft_for_trusted_user(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $customer = User::factory()->create();
        $customer->account()->create([
            'account_number' => '1234567890',
            'balance' => 0,
            'overdraft_limit' => 0,
            'status' => 'active',
        ]);
        $kyc = KycVerification::create($this->kycAttributes($customer));
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/kyc/{$kyc->id}/approve")
            ->assertOk();

        $this->assertSame(70, $customer->fresh()->trust_score);
        $this->assertEquals('500.00', $customer->account->fresh()->overdraft_limit);
    }

    public function test_user_without_overdraft_limit_cannot_go_negative(): void
    {
        $user = User::factory()->create();
        $user->account()->create([
            'account_number' => '1234567890',
            'balance' => 100,
            'overdraft_limit' => 0,
            'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/accounts/withdraw', ['amount' => 101])
            ->assertUnprocessable()
            ->assertJsonPath('errors.amount.0', 'Insufficient funds. Overdraft limit exceeded.');

        $this->assertEquals('100.00', $user->account->fresh()->balance);
    }

    public function test_overdraft_decreases_score_and_creates_log(): void
    {
        $user = User::factory()->create();
        $user->account()->create([
            'account_number' => '1234567890',
            'balance' => 100,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/accounts/withdraw', ['amount' => 300])
            ->assertOk()
            ->assertJsonPath('data.account.balance', '-200.00');

        $this->assertSame(45, $user->fresh()->trust_score);
        $this->assertDatabaseHas('trust_score_logs', [
            'user_id' => $user->id,
            'change_type' => TrustScoreLog::TYPE_DECREASE,
            'points' => 5,
            'old_score' => 50,
            'new_score' => 45,
            'reason' => 'Overdraft used',
        ]);
    }

    public function test_deposit_does_not_increase_trust_score(): void
    {
        $user = User::factory()->create();
        $user->account()->create([
            'account_number' => '1234567890',
            'balance' => 0,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/accounts/deposit', ['amount' => 100])
            ->assertOk();

        $this->assertSame(50, $user->fresh()->trust_score);
        $this->assertDatabaseCount('trust_score_logs', 0);
    }

    public function test_normal_withdraw_does_not_increase_trust_score(): void
    {
        $user = User::factory()->create();
        $user->account()->create([
            'account_number' => '1234567890',
            'balance' => 200,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/accounts/withdraw', ['amount' => 100])
            ->assertOk();

        $this->assertSame(50, $user->fresh()->trust_score);
        $this->assertDatabaseCount('trust_score_logs', 0);
    }

    public function test_normal_transfer_does_not_increase_trust_score(): void
    {
        $sender = User::factory()->create();
        $sender->account()->create([
            'account_number' => '1234567890',
            'balance' => 200,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);
        $receiver = User::factory()->create();
        $receiver->account()->create([
            'account_number' => '9876543210',
            'balance' => 0,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);
        Sanctum::actingAs($sender);

        $this->postJson('/api/accounts/transfer', [
            'account_number' => '9876543210',
            'amount' => 100,
        ])->assertOk();

        $this->assertSame(50, $sender->fresh()->trust_score);
        $this->assertDatabaseCount('trust_score_logs', 0);
    }

    public function test_withdraw_that_enters_overdraft_decreases_score_once(): void
    {
        $user = User::factory()->create();
        $user->account()->create([
            'account_number' => '1234567890',
            'balance' => 50,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/accounts/withdraw', ['amount' => 100])
            ->assertOk()
            ->assertJsonPath('data.account.balance', '-50.00');

        $this->assertSame(45, $user->fresh()->trust_score);
        $this->assertDatabaseHas('trust_score_logs', [
            'user_id' => $user->id,
            'change_type' => TrustScoreLog::TYPE_DECREASE,
            'points' => 5,
            'reason' => 'Overdraft used',
        ]);
        $this->assertDatabaseCount('trust_score_logs', 1);
    }

    public function test_withdraw_while_already_negative_does_not_decrease_again(): void
    {
        $user = User::factory()->create(['trust_score' => 45]);
        $user->account()->create([
            'account_number' => '1234567890',
            'balance' => -100,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/accounts/withdraw', ['amount' => 100])
            ->assertOk()
            ->assertJsonPath('data.account.balance', '-200.00');

        $this->assertSame(45, $user->fresh()->trust_score);
        $this->assertDatabaseMissing('trust_score_logs', [
            'user_id' => $user->id,
            'change_type' => TrustScoreLog::TYPE_DECREASE,
            'reason' => 'Overdraft used',
        ]);
        $this->assertDatabaseCount('trust_score_logs', 0);
    }

    public function test_transfer_that_enters_overdraft_decreases_score(): void
    {
        $sender = User::factory()->create();
        $sender->account()->create([
            'account_number' => '1234567890',
            'balance' => 50,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);
        $receiver = User::factory()->create();
        $receiver->account()->create([
            'account_number' => '9876543210',
            'balance' => 0,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);
        Sanctum::actingAs($sender);

        $this->postJson('/api/accounts/transfer', [
            'account_number' => '9876543210',
            'amount' => 100,
        ])
            ->assertOk()
            ->assertJsonPath('data.from_account.balance', '-50.00');

        $this->assertSame(45, $sender->fresh()->trust_score);
        $this->assertDatabaseHas('trust_score_logs', [
            'user_id' => $sender->id,
            'change_type' => TrustScoreLog::TYPE_DECREASE,
            'points' => 5,
            'reason' => 'Overdraft used',
        ]);
    }

    public function test_score_never_goes_below_0_or_above_100(): void
    {
        $user = User::factory()->create(['trust_score' => 95]);
        $service = app(TrustScoreService::class);

        $service->increase($user, 20, 'Boundary increase');

        $this->assertSame(100, $user->fresh()->trust_score);
        $this->assertDatabaseHas('trust_score_logs', [
            'user_id' => $user->id,
            'old_score' => 95,
            'new_score' => 100,
            'reason' => 'Boundary increase',
        ]);

        $service->decrease($user->fresh(), 150, 'Boundary decrease');

        $this->assertSame(0, $user->fresh()->trust_score);
        $this->assertDatabaseHas('trust_score_logs', [
            'user_id' => $user->id,
            'old_score' => 100,
            'new_score' => 0,
            'reason' => 'Boundary decrease',
        ]);
    }

    public function test_trust_score_endpoint_returns_score_level_and_logs(): void
    {
        $user = User::factory()->create(['trust_score' => 70]);
        app(TrustScoreService::class)->increase($user, 5, 'Test increase');
        Sanctum::actingAs($user->fresh());

        $this->getJson('/api/trust-score/me')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.trust_score', 75)
            ->assertJsonPath('data.level', 'trusted')
            ->assertJsonPath('data.logs.0.reason', 'Test increase');
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
