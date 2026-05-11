<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\KycVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUsersTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_fetch_real_users(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $user = User::factory()->create([
            'name' => 'Real Customer',
            'email' => 'real@example.com',
            'role' => User::ROLE_USER,
            'trust_score' => 72,
        ]);

        Account::create([
            'user_id' => $user->id,
            'account_number' => 'ACC-USERS01',
            'balance' => 1250,
            'status' => Account::STATUS_ACTIVE,
        ]);

        KycVerification::create([
            'user_id' => $user->id,
            'national_id_number' => 'AB123456',
            'full_name' => $user->name,
            'birth_date' => '1995-04-12',
            'cin_front_path' => "kyc/{$user->id}/front.jpg",
            'cin_back_path' => "kyc/{$user->id}/back.jpg",
            'status' => KycVerification::STATUS_APPROVED,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonFragment([
                'name' => 'Real Customer',
                'email' => 'real@example.com',
                'phone' => null,
                'role' => User::ROLE_USER,
                'status' => Account::STATUS_ACTIVE,
            ])
            ->assertJsonFragment([
                'balance' => 1250,
                'account_number' => 'ACC-USERS01',
            ])
            ->assertJsonFragment([
                'status' => KycVerification::STATUS_APPROVED,
            ])
            ->assertJsonFragment([
                'score' => 72,
                'level' => 'trusted',
            ]);
    }

    public function test_non_admin_cannot_fetch_users(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_EMPLOYEE]));

        $this->getJson('/api/admin/users')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }
}
