<?php

namespace Tests\Feature;

use App\Models\Daret;
use App\Models\DaretMember;
use App\Models\KycVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DaretAccessSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_member_cannot_view_private_daret_details_or_join_by_id(): void
    {
        [$creator, $daret] = $this->privateDaret();
        $outsider = $this->eligibleUser('outsider@example.com');
        Sanctum::actingAs($outsider);

        $this->getJson("/api/darets/{$daret->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'Vous devez rejoindre ce Daret avec le code d\'invitation.');

        $this->postJson("/api/darets/{$daret->id}/join")
            ->assertForbidden()
            ->assertJsonPath('message', 'Vous devez rejoindre ce Daret avec le code d\'invitation.');

        $this->assertDatabaseMissing('daret_members', [
            'daret_id' => $daret->id,
            'user_id' => $outsider->id,
        ]);
    }

    public function test_public_daret_list_only_exposes_safe_summary_for_non_members(): void
    {
        [$creator, $daret] = $this->privateDaret();
        $outsider = $this->eligibleUser('outsider@example.com');
        Sanctum::actingAs($outsider);

        $this->getJson('/api/darets')
            ->assertOk()
            ->assertJsonPath('data.darets.0.id', $daret->id)
            ->assertJsonPath('data.darets.0.name', $daret->name)
            ->assertJsonMissingPath('data.darets.0.invite_code')
            ->assertJsonMissingPath('data.darets.0.members')
            ->assertJsonMissingPath('data.darets.0.cycles')
            ->assertJsonMissingPath('data.darets.0.payments')
            ->assertJsonMissingPath('data.darets.0.creator');
    }

    public function test_join_by_code_adds_member_returns_daret_id_and_then_allows_details(): void
    {
        [$creator, $daret] = $this->privateDaret();
        $outsider = $this->eligibleUser('outsider@example.com');
        Sanctum::actingAs($outsider);

        $this->postJson('/api/darets/join-by-code', [
            'invite_code' => $daret->invite_code,
        ])
            ->assertOk()
            ->assertJsonPath('data.daret_id', $daret->id)
            ->assertJsonPath('data.daret.id', $daret->id);

        $this->assertDatabaseHas('daret_members', [
            'daret_id' => $daret->id,
            'user_id' => $outsider->id,
        ]);

        $this->getJson("/api/darets/{$daret->id}")
            ->assertOk()
            ->assertJsonPath('data.daret.id', $daret->id)
            ->assertJsonPath('data.daret.invite_code', $daret->invite_code);
    }

    private function privateDaret(): array
    {
        $creator = $this->eligibleUser('creator@example.com');

        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Private Daret',
            'contribution_amount' => 100,
            'total_members' => 3,
            'frequency' => Daret::FREQUENCY_MONTHLY,
            'payout_order_type' => Daret::PAYOUT_ORDER_SEQUENTIAL,
            'status' => Daret::STATUS_OPEN,
        ]);

        DaretMember::create([
            'daret_id' => $daret->id,
            'user_id' => $creator->id,
            'joined_at' => now(),
            'is_creator' => true,
            'status' => DaretMember::STATUS_ACTIVE,
            'auto_debit_authorized' => true,
            'auto_debit_authorized_at' => now(),
        ]);

        return [$creator, $daret];
    }

    private function eligibleUser(string $email): User
    {
        $user = User::factory()->create([
            'email' => $email,
            'trust_score' => 70,
        ]);

        $user->account()->create([
            'account_number' => (string) random_int(1000000000, 9999999999),
            'balance' => 0,
            'overdraft_limit' => 500,
            'status' => 'active',
        ]);

        KycVerification::create([
            'user_id' => $user->id,
            'national_id_number' => 'AB'.$user->id,
            'full_name' => $user->name,
            'birth_date' => '1995-04-12',
            'cin_front_path' => "kyc/{$user->id}/front.jpg",
            'cin_back_path' => "kyc/{$user->id}/back.jpg",
            'status' => KycVerification::STATUS_APPROVED,
        ]);

        return $user->fresh(['account', 'kycVerification']);
    }
}
