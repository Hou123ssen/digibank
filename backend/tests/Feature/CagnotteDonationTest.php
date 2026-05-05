<?php

namespace Tests\Feature;

use App\Models\Cagnotte;
use App\Models\CagnotteDonation;
use App\Models\Notification;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CagnotteDonationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_request_cagnotte(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/cagnottes/request', [
            'title' => 'Medical Support',
            'description' => 'Help cover medical costs.',
            'target_amount' => 1000,
        ])
            ->assertCreated()
            ->assertJsonPath('data.cagnotte.title', 'Medical Support')
            ->assertJsonPath('data.cagnotte.current_amount', '0.00')
            ->assertJsonPath('data.cagnotte.status', Cagnotte::STATUS_PENDING);

        $this->assertDatabaseHas('cagnottes', [
            'creator_id' => $user->id,
            'title' => 'Medical Support',
            'target_amount' => '1000.00',
            'current_amount' => '0.00',
            'status' => Cagnotte::STATUS_PENDING,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'title' => 'Cagnotte Request Created',
        ]);
        $this->assertStringStartsWith('CAG-', Cagnotte::first()->verification_code);
    }

    public function test_user_can_view_my_cagnotte_requests(): void
    {
        [$creator] = $this->campaignFixture(targetAmount: 500, status: Cagnotte::STATUS_PENDING);
        Sanctum::actingAs($creator);

        $this->getJson('/api/cagnottes/my-requests')
            ->assertOk()
            ->assertJsonPath('data.cagnottes.0.title', 'Community Help');
    }

    public function test_user_can_list_cagnottes(): void
    {
        Cagnotte::create([
            'title' => 'School Supplies',
            'description' => 'Support students.',
            'target_amount' => 500,
            'current_amount' => 0,
            'creator_id' => User::factory()->create()->id,
            'verification_code' => 'CAG-111111',
            'status' => Cagnotte::STATUS_ACTIVE,
        ]);
        Cagnotte::create([
            'title' => 'Pending Campaign',
            'description' => 'Not visible yet.',
            'target_amount' => 500,
            'current_amount' => 0,
            'creator_id' => User::factory()->create()->id,
            'verification_code' => 'CAG-222222',
            'status' => Cagnotte::STATUS_PENDING,
        ]);
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/cagnottes')
            ->assertOk()
            ->assertJsonPath('data.cagnottes.0.title', 'School Supplies')
            ->assertJsonCount(1, 'data.cagnottes');
    }

    public function test_employee_can_find_approve_and_reject_cagnotte_requests(): void
    {
        [$creator, , $cagnotte] = $this->campaignFixture(targetAmount: 500, status: Cagnotte::STATUS_PENDING);
        $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE]);
        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/cagnottes/pending')
            ->assertOk()
            ->assertJsonPath('data.cagnottes.0.status', Cagnotte::STATUS_PENDING);

        $this->getJson("/api/employee/cagnottes/code/{$cagnotte->verification_code}")
            ->assertOk()
            ->assertJsonPath('data.cagnotte.id', $cagnotte->id);

        $this->postJson("/api/employee/cagnottes/{$cagnotte->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.cagnotte.status', Cagnotte::STATUS_ACTIVE);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $creator->id,
            'title' => 'Cagnotte Approved',
        ]);

        [$creator2, , $rejected] = $this->campaignFixture(targetAmount: 600, status: Cagnotte::STATUS_PENDING, code: 'CAG-333333');

        $this->postJson("/api/employee/cagnottes/{$rejected->id}/reject", [
            'rejection_reason' => 'Missing documents.',
        ])
            ->assertOk()
            ->assertJsonPath('data.cagnotte.status', Cagnotte::STATUS_REJECTED)
            ->assertJsonPath('data.cagnotte.rejection_reason', 'Missing documents.');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $creator2->id,
            'title' => 'Cagnotte Rejected',
        ]);
    }

    public function test_normal_user_cannot_approve_cagnotte(): void
    {
        [, , $cagnotte] = $this->campaignFixture(targetAmount: 500, status: Cagnotte::STATUS_PENDING);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_USER]));

        $this->postJson("/api/employee/cagnottes/{$cagnotte->id}/approve")
            ->assertForbidden();
    }

    public function test_donation_deducts_balance_creates_transaction_and_donation(): void
    {
        [$creator, $donor, $cagnotte] = $this->campaignFixture(targetAmount: 500);
        $donor->account()->create([
            'account_number' => '1234567890',
            'balance' => 300,
            'overdraft_limit' => 0,
            'status' => 'active',
        ]);
        Sanctum::actingAs($donor);

        $this->postJson("/api/cagnottes/{$cagnotte->id}/donate", [
            'amount' => 100,
        ])
            ->assertOk()
            ->assertJsonPath('data.cagnotte.current_amount', '100.00')
            ->assertJsonPath('data.donation.amount', '100.00');

        $this->assertEquals('200.00', $donor->account->fresh()->balance);
        $this->assertDatabaseHas('cagnotte_donations', [
            'cagnotte_id' => $cagnotte->id,
            'user_id' => $donor->id,
            'amount' => '100.00',
        ]);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $donor->id,
            'type' => Transaction::TYPE_WITHDRAW,
            'amount' => '100.00',
            'description' => "Donation to cagnotte #{$cagnotte->id}",
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $donor->id,
            'title' => 'Thank you for your donation',
            'message' => 'Thank you for your donation',
            'type' => Notification::TYPE_SUCCESS,
        ]);
    }

    public function test_cagnotte_is_completed_and_creator_notified_when_target_reached(): void
    {
        [$creator, $donor, $cagnotte] = $this->campaignFixture(targetAmount: 150);
        $donor->account()->create([
            'account_number' => '1234567890',
            'balance' => 200,
            'overdraft_limit' => 0,
            'status' => 'active',
        ]);
        Sanctum::actingAs($donor);

        $this->postJson("/api/cagnottes/{$cagnotte->id}/donate", [
            'amount' => 150,
        ])
            ->assertOk()
            ->assertJsonPath('data.cagnotte.status', Cagnotte::STATUS_COMPLETED)
            ->assertJsonPath('data.cagnotte.current_amount', '150.00');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $creator->id,
            'title' => 'Campaign Completed',
            'message' => 'Your campaign reached its goal',
            'type' => Notification::TYPE_SUCCESS,
        ]);
    }

    public function test_cannot_donate_without_sufficient_funds(): void
    {
        [, $donor, $cagnotte] = $this->campaignFixture(targetAmount: 500);
        $donor->account()->create([
            'account_number' => '1234567890',
            'balance' => 50,
            'overdraft_limit' => 0,
            'status' => 'active',
        ]);
        Sanctum::actingAs($donor);

        $this->postJson("/api/cagnottes/{$cagnotte->id}/donate", [
            'amount' => 100,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.amount.0', 'Insufficient funds. Overdraft limit exceeded.');

        $this->assertEquals('50.00', $donor->account->fresh()->balance);
        $this->assertDatabaseCount('cagnotte_donations', 0);
    }

    public function test_cannot_donate_to_completed_cagnotte(): void
    {
        [, $donor, $cagnotte] = $this->campaignFixture(targetAmount: 500, status: Cagnotte::STATUS_COMPLETED);
        $donor->account()->create([
            'account_number' => '1234567890',
            'balance' => 500,
            'overdraft_limit' => 0,
            'status' => 'active',
        ]);
        Sanctum::actingAs($donor);

        $this->postJson("/api/cagnottes/{$cagnotte->id}/donate", [
            'amount' => 100,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.cagnotte.0', 'Only active cagnottes can receive donations.');
    }

    public function test_cannot_donate_to_pending_cagnotte(): void
    {
        [, $donor, $cagnotte] = $this->campaignFixture(targetAmount: 500, status: Cagnotte::STATUS_PENDING);
        $donor->account()->create([
            'account_number' => '1234567890',
            'balance' => 500,
            'overdraft_limit' => 0,
            'status' => 'active',
        ]);
        Sanctum::actingAs($donor);

        $this->postJson("/api/cagnottes/{$cagnotte->id}/donate", [
            'amount' => 100,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.cagnotte.0', 'Only active cagnottes can receive donations.');
    }

    private function campaignFixture(float $targetAmount, string $status = Cagnotte::STATUS_ACTIVE, string $code = 'CAG-123456'): array
    {
        $creator = User::factory()->create();
        $donor = User::factory()->create();
        $cagnotte = Cagnotte::create([
            'title' => 'Community Help',
            'description' => 'A simple donation campaign.',
            'target_amount' => $targetAmount,
            'current_amount' => 0,
            'creator_id' => $creator->id,
            'verification_code' => $code,
            'status' => $status,
        ]);

        return [$creator, $donor, $cagnotte];
    }
}
