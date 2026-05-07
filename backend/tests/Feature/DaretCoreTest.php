<?php

namespace Tests\Feature;

use App\Models\Daret;
use App\Models\DaretCycle;
use App\Models\DaretMember;
use App\Models\DaretPayment;
use App\Models\KycVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DaretCoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_daret_and_becomes_first_member(): void
    {
        $creator = $this->eligibleUser('creator@example.com');
        Sanctum::actingAs($creator);

        $response = $this->postJson('/api/darets', [
            'name' => 'Family Daret',
            'contribution_amount' => 100,
            'total_members' => 2,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.daret.name', 'Family Daret');

        $this->assertDatabaseHas('darets', [
            'creator_id' => $creator->id,
            'status' => Daret::STATUS_OPEN,
        ]);
        $this->assertDatabaseHas('daret_members', [
            'user_id' => $creator->id,
        ]);
    }

    public function test_user_can_read_daret_lists_and_details(): void
    {
        $creator = $this->eligibleUser('creator@example.com');
        $member = $this->eligibleUser('member@example.com');
        $outsider = $this->eligibleUser('outsider@example.com');

        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Family Daret',
            'contribution_amount' => 100,
            'total_members' => 3,
            'status' => Daret::STATUS_OPEN,
        ]);
        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $creator->id, 'joined_at' => now()]);
        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $member->id, 'joined_at' => now()]);

        Daret::create([
            'creator_id' => $outsider->id,
            'name' => 'Other Daret',
            'contribution_amount' => 250,
            'total_members' => 4,
            'status' => Daret::STATUS_OPEN,
        ]);

        Sanctum::actingAs($member);

        $this->getJson('/api/darets')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data.darets');

        $this->getJson('/api/darets/my')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.darets')
            ->assertJsonPath('data.darets.0.id', $daret->id)
            ->assertJsonPath('data.darets.0.members_count', 2)
            ->assertJsonPath('data.darets.0.creator.name', $creator->name)
            ->assertJsonPath('data.darets.0.is_member', true);

        $this->getJson("/api/darets/{$daret->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.daret.id', $daret->id)
            ->assertJsonPath('data.daret.creator.name', $creator->name)
            ->assertJsonCount(2, 'data.daret.members')
            ->assertJsonPath('data.daret.cycles', [])
            ->assertJsonPath('data.daret.payments', []);
    }

    public function test_user_must_be_kyc_approved_and_trusted_to_join(): void
    {
        $creator = $this->eligibleUser('creator@example.com');
        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Family Daret',
            'contribution_amount' => 100,
            'total_members' => 2,
            'status' => Daret::STATUS_OPEN,
        ]);
        DaretMember::create([
            'daret_id' => $daret->id,
            'user_id' => $creator->id,
            'joined_at' => now(),
        ]);

        $user = User::factory()->create(['trust_score' => 50]);
        Sanctum::actingAs($user);

        $this->postJson("/api/darets/{$daret->id}/join")
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'KYC approval and trust score of at least 60 are required to join Daret.');
    }

    public function test_user_cannot_join_same_daret_twice(): void
    {
        $creator = $this->eligibleUser('creator@example.com');
        $member = $this->eligibleUser('member@example.com');
        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Family Daret',
            'contribution_amount' => 100,
            'total_members' => 3,
            'status' => Daret::STATUS_OPEN,
        ]);
        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $creator->id, 'joined_at' => now()]);
        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $member->id, 'joined_at' => now()]);
        Sanctum::actingAs($member);

        $this->postJson("/api/darets/{$daret->id}/join")
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'Already joined this daret');
    }

    public function test_user_cannot_join_full_daret(): void
    {
        [$creator, $member, $daret] = $this->fullOpenDaret();
        $third = $this->eligibleUser('third@example.com');
        Sanctum::actingAs($third);

        $this->postJson("/api/darets/{$daret->id}/join")
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'Daret is full');

        $this->assertEquals(2, $daret->members()->count());
    }

    public function test_creator_can_start_when_daret_is_full(): void
    {
        [$creator, $member, $daret] = $this->fullOpenDaret();
        Sanctum::actingAs($creator);

        $response = $this->postJson("/api/darets/{$daret->id}/start");

        $response->assertOk()
            ->assertJsonPath('data.daret.status', Daret::STATUS_ACTIVE);

        $this->assertDatabaseHas('daret_cycles', [
            'daret_id' => $daret->id,
            'cycle_number' => 1,
            'status' => DaretCycle::STATUS_PENDING,
        ]);
        $this->assertNotNull($creator->daretMemberships()->where('daret_id', $daret->id)->first()->fresh()->payout_order);
        $this->assertNotNull($member->daretMemberships()->where('daret_id', $daret->id)->first()->fresh()->payout_order);
    }

    public function test_non_creator_cannot_start_daret(): void
    {
        [, $member, $daret] = $this->fullOpenDaret();
        Sanctum::actingAs($member);

        $this->postJson("/api/darets/{$daret->id}/start")
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'Only creator can start');
    }

    public function test_creator_cannot_start_without_full_members(): void
    {
        $creator = $this->eligibleUser('creator@example.com');
        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Family Daret',
            'contribution_amount' => 100,
            'total_members' => 3,
            'status' => Daret::STATUS_OPEN,
        ]);
        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $creator->id, 'joined_at' => now()]);
        Sanctum::actingAs($creator);

        $this->postJson("/api/darets/{$daret->id}/start")
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'Daret can only start when all member slots are full.');
    }

    public function test_payment_deducts_contribution_and_records_payment(): void
    {
        [$creator, , $daret] = $this->startedDaret();
        $creator->account->update(['balance' => 300]);
        Sanctum::actingAs($creator);

        $this->postJson("/api/darets/{$daret->id}/pay")
            ->assertOk()
            ->assertJsonPath('data.payment.status', DaretPayment::STATUS_PAID);

        $this->assertEquals('200.00', $creator->account->fresh()->balance);
        $this->assertDatabaseHas('daret_payments', [
            'daret_id' => $daret->id,
            'user_id' => $creator->id,
            'amount' => '100.00',
        ]);
    }

    public function test_non_member_cannot_pay(): void
    {
        [, , $daret] = $this->startedDaret();
        $outsider = $this->eligibleUser('outsider@example.com');
        Sanctum::actingAs($outsider);

        $this->postJson("/api/darets/{$daret->id}/pay")
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'Not a daret member');
    }

    public function test_member_cannot_pay_twice_in_same_cycle(): void
    {
        [$creator, , $daret] = $this->startedDaret();
        $creator->account->update(['balance' => 300]);
        Sanctum::actingAs($creator);

        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        $this->postJson("/api/darets/{$daret->id}/pay")
            ->assertUnprocessable()
            ->assertJsonPath('errors.payment.0', 'Payment already completed');

        $this->assertDatabaseCount('daret_payments', 1);
    }

    public function test_when_all_members_pay_payout_is_transferred_and_next_cycle_starts(): void
    {
        [$creator, $member, $daret] = $this->startedDaret();
        $creator->account->update(['balance' => 300]);
        $member->account->update(['balance' => 300]);

        $firstCycle = $daret->cycles()->first();
        $payoutUser = User::find($firstCycle->payout_user_id);
        $payoutBefore = (float) $payoutUser->account->balance;

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        Sanctum::actingAs($member);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        $this->assertEquals(
            number_format($payoutBefore + 100, 2, '.', ''),
            $payoutUser->account->fresh()->balance
        );
        $this->assertDatabaseHas('daret_cycles', [
            'id' => $firstCycle->id,
            'status' => DaretCycle::STATUS_COMPLETED,
        ]);
        $this->assertDatabaseHas('daret_cycles', [
            'daret_id' => $daret->id,
            'cycle_number' => 2,
            'status' => DaretCycle::STATUS_PENDING,
        ]);
    }

    public function test_completed_cycle_cannot_pay_out_twice(): void
    {
        [$creator, $member, $daret] = $this->startedDaret();
        $creator->account->update(['balance' => 300]);
        $member->account->update(['balance' => 300]);

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        Sanctum::actingAs($member);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        $completedCycle = $daret->cycles()->where('cycle_number', 1)->first();
        $payoutUser = User::find($completedCycle->payout_user_id);
        $balanceAfterPayout = $payoutUser->account->fresh()->balance;
        $this->assertSame(DaretCycle::STATUS_COMPLETED, $completedCycle->status);
        DB::table('darets')->where('id', $daret->id)->update(['current_cycle_number' => 1]);
        $this->assertSame(1, $daret->fresh()->current_cycle_number);

        $this->postJson("/api/darets/{$daret->id}/pay")
            ->assertUnprocessable()
            ->assertJsonPath('errors.cycle.0', 'Payout already completed');

        $this->assertEquals($balanceAfterPayout, $payoutUser->account->fresh()->balance);
        $this->assertDatabaseCount('daret_payments', 2);
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

    private function fullOpenDaret(): array
    {
        $creator = $this->eligibleUser('creator@example.com');
        $member = $this->eligibleUser('member@example.com');
        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Family Daret',
            'contribution_amount' => 100,
            'total_members' => 2,
            'status' => Daret::STATUS_OPEN,
        ]);

        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $creator->id, 'joined_at' => now()]);
        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $member->id, 'joined_at' => now()]);

        return [$creator, $member, $daret];
    }

    private function startedDaret(): array
    {
        [$creator, $member, $daret] = $this->fullOpenDaret();
        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/start")->assertOk();

        return [$creator->fresh(['account']), $member->fresh(['account']), $daret->fresh()];
    }
}
