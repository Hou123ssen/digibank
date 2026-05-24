<?php

namespace Tests\Feature;

use App\Models\Daret;
use App\Models\DaretCycle;
use App\Models\DaretMember;
use App\Models\DaretPayment;
use App\Models\KycVerification;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DaretAutomaticDebitTest extends TestCase
{
    use RefreshDatabase;

    public function test_due_cycle_debits_members_pays_beneficiary_and_starts_next_cycle(): void
    {
        [$creator, $member, $daret] = $this->startedDueDaret();
        $creator->account->update(['balance' => 300]);
        $member->account->update(['balance' => 300]);

        $this->artisan('daret:process-due-payments')->assertSuccessful();

        $firstCycle = $daret->cycles()->where('cycle_number', 1)->first();

        $this->assertSame(DaretCycle::STATUS_COMPLETED, $firstCycle->fresh()->status);
        $this->assertSame(2, DaretPayment::where('daret_cycle_id', $firstCycle->id)->where('status', DaretPayment::STATUS_PAID)->count());
        $this->assertDatabaseHas('daret_cycles', [
            'daret_id' => $daret->id,
            'cycle_number' => 2,
            'status' => DaretCycle::STATUS_PENDING,
        ]);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $creator->id,
            'type' => Transaction::TYPE_DARET_CONTRIBUTION,
            'amount' => '-100.00',
            'status' => Transaction::STATUS_SUCCESS,
        ]);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $member->id,
            'type' => Transaction::TYPE_DARET_CONTRIBUTION,
            'amount' => '-100.00',
            'status' => Transaction::STATUS_SUCCESS,
        ]);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $creator->id,
            'type' => Transaction::TYPE_DARET_PAYOUT,
            'amount' => '200.00',
            'status' => Transaction::STATUS_SUCCESS,
        ]);
        $this->assertEquals('400.00', $creator->account->fresh()->balance);
        $this->assertEquals('200.00', $member->account->fresh()->balance);
    }

    public function test_due_cycle_marks_failed_when_member_balance_is_insufficient(): void
    {
        [$creator, $member, $daret] = $this->startedDueDaret();
        $creator->account->update(['balance' => 50]);
        $member->account->update(['balance' => 300]);
        $trustBefore = (int) $creator->trust_score;

        $this->artisan('daret:process-due-payments')->assertSuccessful();

        $firstCycle = $daret->cycles()->where('cycle_number', 1)->first();

        $this->assertSame(DaretCycle::STATUS_PENDING, $firstCycle->fresh()->status);
        $this->assertDatabaseHas('daret_payments', [
            'daret_cycle_id' => $firstCycle->id,
            'user_id' => $creator->id,
            'status' => DaretPayment::STATUS_FAILED,
        ]);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $creator->id,
            'type' => Transaction::TYPE_DARET_CONTRIBUTION,
            'amount' => '-100.00',
            'status' => Transaction::STATUS_FAILED,
        ]);
        $this->assertSame($trustBefore - 5, (int) $creator->fresh()->trust_score);
        $this->assertEquals('50.00', $creator->account->fresh()->balance);
        $this->assertEquals('200.00', $member->account->fresh()->balance);
        $this->assertSame(1, $daret->cycles()->count());
    }

    private function startedDueDaret(): array
    {
        $creator = $this->eligibleUser('creator@example.com');
        $member = $this->eligibleUser('member@example.com');

        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Auto Debit Daret',
            'contribution_amount' => 100,
            'total_members' => 2,
            'frequency' => Daret::FREQUENCY_MONTHLY,
            'payout_order_type' => Daret::PAYOUT_ORDER_SEQUENTIAL,
            'status' => Daret::STATUS_OPEN,
        ]);

        foreach ([$creator, $member] as $user) {
            DaretMember::create([
                'daret_id' => $daret->id,
                'user_id' => $user->id,
                'joined_at' => now(),
                'is_creator' => $user->is($creator),
                'status' => DaretMember::STATUS_ACTIVE,
                'auto_debit_authorized' => true,
                'auto_debit_authorized_at' => now(),
            ]);
        }

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/start")->assertOk();
        $daret->cycles()->where('cycle_number', 1)->update(['due_date' => now()->toDateString()]);

        return [$creator->fresh(['account']), $member->fresh(['account']), $daret->fresh()];
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
