<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Cagnotte;
use App\Models\Daret;
use App\Models\KycVerification;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_fetch_real_dashboard_stats(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        User::factory()->create(['role' => User::ROLE_EMPLOYEE]);
        $excellent = User::factory()->create(['role' => User::ROLE_USER, 'trust_score' => 85]);
        $trusted = User::factory()->create(['role' => User::ROLE_USER, 'trust_score' => 70]);
        $normal = User::factory()->create(['role' => User::ROLE_USER, 'trust_score' => 50]);
        $risky = User::factory()->create(['role' => User::ROLE_USER, 'trust_score' => 25]);
        $notSubmitted = User::factory()->create(['role' => User::ROLE_USER, 'trust_score' => 50]);

        KycVerification::create($this->kycAttributes($excellent, KycVerification::STATUS_APPROVED));
        KycVerification::create($this->kycAttributes($trusted, KycVerification::STATUS_PENDING));
        KycVerification::create($this->kycAttributes($normal, KycVerification::STATUS_NEEDS_REVIEW));
        KycVerification::create($this->kycAttributes($risky, KycVerification::STATUS_REJECTED));

        Daret::create([
            'creator_id' => $excellent->id,
            'name' => 'Active Daret',
            'contribution_amount' => 100,
            'total_members' => 3,
            'status' => Daret::STATUS_ACTIVE,
        ]);

        Cagnotte::create([
            'title' => 'Active Cagnotte',
            'description' => 'Community fund',
            'target_amount' => 1000,
            'current_amount' => 100,
            'creator_id' => $trusted->id,
            'verification_code' => 'CAG-REAL01',
            'status' => Cagnotte::STATUS_ACTIVE,
        ]);

        $account = Account::create([
            'user_id' => $excellent->id,
            'account_number' => 'ACC-REAL01',
            'balance' => 1000,
        ]);

        Transaction::create([
            'account_id' => $account->id,
            'user_id' => $excellent->id,
            'type' => Transaction::TYPE_DEPOSIT,
            'amount' => 100,
            'balance_before' => 900,
            'balance_after' => 1000,
            'reference' => 'TRX-REAL01',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard/stats')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_users', 5)
            ->assertJsonPath('data.employees_count', 1)
            ->assertJsonPath('data.active_darets', 1)
            ->assertJsonPath('data.active_cagnottes', 1)
            ->assertJsonPath('data.transactions_today', 1)
            ->assertJsonPath('data.transaction_volume.deposits', 1)
            ->assertJsonPath('data.kyc_distribution.approved', 1)
            ->assertJsonPath('data.kyc_distribution.pending', 1)
            ->assertJsonPath('data.kyc_distribution.needs_review', 1)
            ->assertJsonPath('data.kyc_distribution.rejected', 1)
            ->assertJsonPath('data.kyc_distribution.not_submitted', 1)
            ->assertJsonPath('data.trust_level_distribution.excellent', 1)
            ->assertJsonPath('data.trust_level_distribution.trusted', 1)
            ->assertJsonPath('data.trust_level_distribution.normal', 2)
            ->assertJsonPath('data.trust_level_distribution.risky', 1)
            ->assertJsonPath('data.system_events', []);
    }

    public function test_non_admin_cannot_fetch_dashboard_stats(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_EMPLOYEE]));

        $this->getJson('/api/admin/dashboard/stats')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    private function kycAttributes(User $user, string $status): array
    {
        return [
            'user_id' => $user->id,
            'national_id_number' => 'AB' . $user->id,
            'full_name' => $user->name,
            'birth_date' => '1995-04-12',
            'cin_front_path' => "kyc/{$user->id}/front.jpg",
            'cin_back_path' => "kyc/{$user->id}/back.jpg",
            'status' => $status,
        ];
    }
}
