<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployeeAccountManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_employee_account(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/create-employee', [
            'name' => 'Employee User',
            'email' => 'employee@example.com',
            'password' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Employee account created')
            ->assertJsonPath('data.employee.role', User::ROLE_EMPLOYEE);

        $employee = User::where('email', 'employee@example.com')->first();

        $this->assertNotNull($employee);
        $this->assertSame(User::ROLE_EMPLOYEE, $employee->role);
        $this->assertTrue(Hash::check('password123', $employee->password));
    }

    public function test_normal_user_cannot_create_employee_account(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        Sanctum::actingAs($user);

        $this->postJson('/api/admin/create-employee', [
            'name' => 'Employee User',
            'email' => 'employee@example.com',
            'password' => 'password123',
        ])
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('users', [
            'email' => 'employee@example.com',
        ]);
    }
}
