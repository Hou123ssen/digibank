<?php

namespace Tests\Feature;

use App\Models\Daret;
use App\Models\DaretCycle;
use App\Models\DaretMember;
use App\Models\KycVerification;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\TrustScoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_notifications_and_mark_one_as_read(): void
    {
        $user = User::factory()->create();
        $notification = app(NotificationService::class)->createNotification(
            $user->id,
            'Test Notice',
            'A useful notification',
            Notification::TYPE_INFO
        );
        Sanctum::actingAs($user);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.notifications.0.title', 'Test Notice')
            ->assertJsonPath('data.notifications.0.is_read', false);

        $this->postJson("/api/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('data.notification.is_read', true);
    }

    public function test_user_cannot_mark_another_users_notification_as_read(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $notification = app(NotificationService::class)->createNotification(
            $owner->id,
            'Private Notice',
            'Only the owner may read this',
            Notification::TYPE_INFO
        );
        Sanctum::actingAs($other);

        $this->postJson("/api/notifications/{$notification->id}/read")
            ->assertNotFound()
            ->assertJsonPath('success', false);

        $this->assertFalse($notification->fresh()->is_read);
    }

    public function test_kyc_approval_creates_kyc_and_trust_score_notifications(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $customer = $this->eligibleUser('customer@example.com', false);
        $kyc = KycVerification::create($this->kycAttributes($customer, [
            'status' => KycVerification::STATUS_PENDING,
        ]));
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/kyc/{$kyc->id}/approve")
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'title' => 'KYC Approved',
            'message' => 'Your identity verification has been approved',
            'type' => Notification::TYPE_SUCCESS,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'title' => 'Trust Score Updated',
            'message' => 'Your trust score is now 70',
        ]);
    }

    public function test_trust_score_change_creates_notification(): void
    {
        $user = User::factory()->create(['trust_score' => 70]);

        app(TrustScoreService::class)->decrease($user, 5, 'Overdraft used');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'title' => 'Trust Score Updated',
            'message' => 'Your trust score is now 65',
            'type' => Notification::TYPE_WARNING,
        ]);
    }

    public function test_daret_start_and_payout_create_notifications(): void
    {
        [$creator, $member, $daret] = $this->startedDaret();
        $creator->account->update(['balance' => 300]);
        $member->account->update(['balance' => 300]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $creator->id,
            'title' => 'Daret Started',
            'message' => 'Your Daret has started',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'title' => 'Payment Required',
            'message' => 'Please pay your Daret contribution',
        ]);

        $cycle = $daret->cycles()->first();
        $payoutUserId = $cycle->payout_user_id;

        Sanctum::actingAs($creator);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();
        Sanctum::actingAs($member);
        $this->postJson("/api/darets/{$daret->id}/pay")->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $payoutUserId,
            'title' => 'Payout Received',
            'message' => 'You received your Daret payout',
        ]);
    }

    private function eligibleUser(string $email, bool $approved = true): User
    {
        $user = User::factory()->create([
            'email' => $email,
            'trust_score' => $approved ? 70 : 50,
        ]);

        $user->account()->create([
            'account_number' => (string) random_int(1000000000, 9999999999),
            'balance' => 0,
            'overdraft_limit' => $approved ? 500 : 0,
            'status' => 'active',
        ]);

        if ($approved) {
            KycVerification::create($this->kycAttributes($user));
        }

        return $user->fresh(['account', 'kycVerification']);
    }

    private function kycAttributes(User $user, array $overrides = []): array
    {
        return array_merge([
            'user_id' => $user->id,
            'national_id_number' => 'AB'.$user->id,
            'full_name' => $user->name,
            'birth_date' => '1995-04-12',
            'cin_front_path' => "kyc/{$user->id}/front.jpg",
            'cin_back_path' => "kyc/{$user->id}/back.jpg",
            'status' => KycVerification::STATUS_APPROVED,
        ], $overrides);
    }

    private function startedDaret(): array
    {
        $creator = $this->eligibleUser('creator@example.com');
        $member = $this->eligibleUser('member@example.com');
        $daret = Daret::create([
            'creator_id' => $creator->id,
            'name' => 'Family Daret',
            'contribution_amount' => 100,
            'total_members' => 2,
            'status' => Daret::STATUS_ACTIVE,
            'current_cycle_number' => 1,
            'started_at' => now(),
        ]);

        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $creator->id, 'payout_order' => 1, 'joined_at' => now()]);
        DaretMember::create(['daret_id' => $daret->id, 'user_id' => $member->id, 'payout_order' => 2, 'joined_at' => now()]);
        DaretCycle::create([
            'daret_id' => $daret->id,
            'cycle_number' => 1,
            'payout_user_id' => $creator->id,
            'status' => DaretCycle::STATUS_PENDING,
            'started_at' => now(),
        ]);

        app(NotificationService::class)->createNotification($creator->id, 'Daret Started', 'Your Daret has started', Notification::TYPE_SUCCESS);
        app(NotificationService::class)->createNotification($member->id, 'Payment Required', 'Please pay your Daret contribution', Notification::TYPE_WARNING);

        return [$creator->fresh(['account']), $member->fresh(['account']), $daret->fresh()];
    }
}
