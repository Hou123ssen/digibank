<?php

namespace Tests\Feature;

use App\Models\Daret;
use App\Models\DaretCycle;
use App\Models\DaretMember;
use App\Models\DaretPayment;
use App\Models\KycVerification;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

    public function test_user_can_join_open_daret_by_invite_code(): void
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
        DaretMember::create([
            'daret_id' => $daret->id,
            'user_id' => $creator->id,
            'joined_at' => now(),
            'is_creator' => true,
        ]);

        Sanctum::actingAs($member);

        $this->postJson('/api/darets/join-by-code', [
            'invite_code' => strtolower($daret->invite_code),
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.daret.id', $daret->id)
            ->assertJsonPath('data.daret.current_members', 2);

        $this->assertDatabaseHas('daret_members', [
            'daret_id' => $daret->id,
            'user_id' => $member->id,
            'status' => DaretMember::STATUS_ACTIVE,
        ]);
    }

    public function test_join_by_code_requires_existing_open_available_daret_and_membership_rules(): void
    {
        [$creator, $member, $daret] = $this->fullOpenDaret();
        $third = $this->eligibleUser('third@example.com');

        Sanctum::actingAs($third);
        $this->postJson('/api/darets/join-by-code', ['invite_code' => 'DRT-NOPE01'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.invite_code.0', 'Daret not found.');

        $this->postJson('/api/darets/join-by-code', ['invite_code' => $daret->invite_code])
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'Daret is full');

        Sanctum::actingAs($member);
        $this->postJson('/api/darets/join-by-code', ['invite_code' => $daret->invite_code])
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'Already joined this daret');

        $daret->update(['status' => Daret::STATUS_ACTIVE]);
        Sanctum::actingAs($third);
        $this->postJson('/api/darets/join-by-code', ['invite_code' => $daret->invite_code])
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'Only open darets can be joined.');
    }

    public function test_join_by_code_requires_approved_kyc(): void
    {
        $creator = $this->eligibleUser('creator@example.com');
        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Family Daret',
            'contribution_amount' => 100,
            'total_members' => 2,
            'status' => Daret::STATUS_OPEN,
        ]);
        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $creator->id, 'joined_at' => now()]);
        $user = User::factory()->create(['trust_score' => 70]);

        Sanctum::actingAs($user);

        $this->postJson('/api/darets/join-by-code', ['invite_code' => $daret->invite_code])
            ->assertUnprocessable()
            ->assertJsonPath('errors.daret.0', 'KYC approval is required to join Daret.');
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

    public function test_sequential_payout_order_uses_join_order_on_start(): void
    {
        [$creator, $firstMember, $secondMember, $daret] = $this->fullOpenDaretWithThreeMembers(Daret::PAYOUT_ORDER_SEQUENTIAL);

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/start")->assertOk();

        $this->assertSame(1, $creator->daretMemberships()->where('daret_id', $daret->id)->first()->fresh()->payout_order);
        $this->assertSame(2, $firstMember->daretMemberships()->where('daret_id', $daret->id)->first()->fresh()->payout_order);
        $this->assertSame(3, $secondMember->daretMemberships()->where('daret_id', $daret->id)->first()->fresh()->payout_order);
    }

    public function test_auto_rotation_payout_order_uses_trust_score_then_join_order(): void
    {
        [$creator, $firstMember, $secondMember, $daret] = $this->fullOpenDaretWithThreeMembers(Daret::PAYOUT_ORDER_AUTO_ROTATION);
        $creator->update(['trust_score' => 70]);
        $firstMember->update(['trust_score' => 90]);
        $secondMember->update(['trust_score' => 90]);

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/start")->assertOk();

        $this->assertSame(1, $firstMember->daretMemberships()->where('daret_id', $daret->id)->first()->fresh()->payout_order);
        $this->assertSame(2, $secondMember->daretMemberships()->where('daret_id', $daret->id)->first()->fresh()->payout_order);
        $this->assertSame(3, $creator->daretMemberships()->where('daret_id', $daret->id)->first()->fresh()->payout_order);
    }

    public function test_random_payout_order_is_generated_when_daret_becomes_full_and_not_changed_on_start(): void
    {
        $creator = $this->eligibleUser('creator@example.com');
        $member = $this->eligibleUser('member@example.com');
        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Random Daret',
            'contribution_amount' => 100,
            'total_members' => 2,
            'payout_order_type' => Daret::PAYOUT_ORDER_RANDOM,
            'status' => Daret::STATUS_OPEN,
        ]);
        DaretMember::create([
            'daret_id' => $daret->id,
            'user_id' => $creator->id,
            'joined_at' => now()->subMinute(),
            'is_creator' => true,
        ]);

        Sanctum::actingAs($member);
        $this->postJson('/api/darets/join-by-code', ['invite_code' => $daret->invite_code])->assertOk();

        $ordersBeforeStart = DaretMember::where('daret_id', $daret->id)
            ->orderBy('user_id')
            ->pluck('payout_order', 'user_id')
            ->all();

        $this->assertEqualsCanonicalizing([1, 2], array_values($ordersBeforeStart));

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/start")->assertOk();

        $ordersAfterStart = DaretMember::where('daret_id', $daret->id)
            ->orderBy('user_id')
            ->pluck('payout_order', 'user_id')
            ->all();

        $this->assertSame($ordersBeforeStart, $ordersAfterStart);
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
        $this->assertDatabaseHas('transactions', [
            'account_id' => $creator->account->id,
            'user_id' => $creator->id,
            'type' => Transaction::TYPE_WITHDRAW,
            'amount' => '100.00',
            'balance_before' => '300.00',
            'balance_after' => '200.00',
            'status' => Transaction::STATUS_SUCCESS,
        ]);
    }

    public function test_payment_requires_real_account_balance_without_overdraft(): void
    {
        [$creator, , $daret] = $this->startedDaret();
        $creator->account->update([
            'balance' => 50,
            'overdraft_limit' => 500,
        ]);
        Sanctum::actingAs($creator);

        $this->postJson("/api/darets/{$daret->id}/pay")
            ->assertUnprocessable()
            ->assertJsonPath('errors.amount.0', 'Insufficient account balance.');

        $this->assertEquals('50.00', $creator->account->fresh()->balance);
        $this->assertDatabaseCount('daret_payments', 0);
        $this->assertDatabaseCount('transactions', 0);
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
        $payoutTransaction = Transaction::where('account_id', $payoutUser->account->id)
            ->where('user_id', $payoutUser->id)
            ->where('type', Transaction::TYPE_DEPOSIT)
            ->where('amount', '200.00')
            ->first();

        $this->assertNotNull($payoutTransaction);
        $this->assertSame(Transaction::STATUS_SUCCESS, $payoutTransaction->status);
        $this->assertSame(
            number_format((float) $payoutTransaction->balance_before + 200, 2, '.', ''),
            $payoutTransaction->balance_after
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

    public function test_monthly_daret_creates_first_cycle_with_monthly_due_date(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-05-10 10:00:00'));
        [$creator, , $daret] = $this->fullOpenDaret(frequency: Daret::FREQUENCY_MONTHLY);

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/start")->assertOk();

        $cycle = $daret->cycles()->first();

        $this->assertSame(1, $cycle->cycle_number);
        $this->assertSame(DaretCycle::STATUS_PENDING, $cycle->status);
        $this->assertSame('2026-06-10', $cycle->due_date->toDateString());
        $this->assertNotNull($cycle->beneficiary_user_id);

        Carbon::setTestNow();
    }

    public function test_weekly_daret_creates_first_cycle_with_weekly_due_date(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-05-10 10:00:00'));
        [$creator, , $daret] = $this->fullOpenDaret(frequency: Daret::FREQUENCY_WEEKLY);

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/start")->assertOk();

        $this->assertSame('2026-05-17', $daret->cycles()->first()->due_date->toDateString());

        Carbon::setTestNow();
    }

    public function test_cycle_completion_creates_next_cycle_with_next_beneficiary_and_due_date(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-05-10 10:00:00'));
        [$creator, $member, $daret] = $this->startedDaret(frequency: Daret::FREQUENCY_WEEKLY);
        $creator->account->update(['balance' => 300]);
        $member->account->update(['balance' => 300]);
        $secondBeneficiaryId = $daret->members()->where('payout_order', 2)->value('user_id');

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();
        Sanctum::actingAs($member);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        $nextCycle = $daret->cycles()->where('cycle_number', 2)->first();

        $this->assertSame($secondBeneficiaryId, $nextCycle->beneficiary_user_id);
        $this->assertSame(DaretCycle::STATUS_PENDING, $nextCycle->status);
        $this->assertSame('2026-05-24', $nextCycle->due_date->toDateString());

        Carbon::setTestNow();
    }

    public function test_daret_is_completed_after_all_members_received_payout(): void
    {
        [$creator, $member, $daret] = $this->startedDaret();
        $creator->account->update(['balance' => 500]);
        $member->account->update(['balance' => 500]);

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();
        Sanctum::actingAs($member);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();
        Sanctum::actingAs($member);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        $this->assertSame(Daret::STATUS_COMPLETED, $daret->fresh()->status);
        $this->assertNotNull($daret->fresh()->completed_at);
        $this->assertSame(2, $daret->cycles()->count());
        $this->assertSame(2, $daret->cycles()->where('status', DaretCycle::STATUS_COMPLETED)->count());
    }

    public function test_completed_cycle_is_not_paid_out_twice_when_next_cycle_receives_payment(): void
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

        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        $this->assertEquals($balanceAfterPayout, $payoutUser->account->fresh()->balance);
        $this->assertDatabaseCount('daret_payments', 3);
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

    private function fullOpenDaret(string $frequency = Daret::FREQUENCY_MONTHLY): array
    {
        $creator = $this->eligibleUser('creator@example.com');
        $member = $this->eligibleUser('member@example.com');
        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Family Daret',
            'contribution_amount' => 100,
            'total_members' => 2,
            'frequency' => $frequency,
            'payout_order_type' => Daret::PAYOUT_ORDER_SEQUENTIAL,
            'status' => Daret::STATUS_OPEN,
        ]);

        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $creator->id, 'joined_at' => now()]);
        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $member->id, 'joined_at' => now()]);

        return [$creator, $member, $daret];
    }

    private function fullOpenDaretWithThreeMembers(string $payoutOrderType): array
    {
        $creator = $this->eligibleUser('creator@example.com');
        $firstMember = $this->eligibleUser('first@example.com');
        $secondMember = $this->eligibleUser('second@example.com');
        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Three Member Daret',
            'contribution_amount' => 100,
            'total_members' => 3,
            'current_members' => 3,
            'payout_order_type' => $payoutOrderType,
            'status' => Daret::STATUS_OPEN,
        ]);

        DaretMember::create([
            'daret_id' => $daret->id,
            'user_id' => $creator->id,
            'joined_at' => now()->subMinutes(3),
            'is_creator' => true,
        ]);
        DaretMember::create([
            'daret_id' => $daret->id,
            'user_id' => $firstMember->id,
            'joined_at' => now()->subMinutes(2),
        ]);
        DaretMember::create([
            'daret_id' => $daret->id,
            'user_id' => $secondMember->id,
            'joined_at' => now()->subMinute(),
        ]);

        return [$creator, $firstMember, $secondMember, $daret];
    }

    private function startedDaret(string $frequency = Daret::FREQUENCY_MONTHLY): array
    {
        [$creator, $member, $daret] = $this->fullOpenDaret($frequency);
        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/start")->assertOk();

        return [$creator->fresh(['account']), $member->fresh(['account']), $daret->fresh()];
    }
}
