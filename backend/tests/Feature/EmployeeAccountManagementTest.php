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

        $response = $this->postJson('/api/admin/employees', [
            'name' => 'Employee User',
            'email' => 'employee@example.com',
            'phone' => '+212 600000000',
            'password' => 'password123',
            'department' => 'kyc',
            'status' => 'active',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Employee account created')
            ->assertJsonPath('data.role', User::ROLE_EMPLOYEE)
            ->assertJsonPath('data.department', 'kyc')
            ->assertJsonPath('data.status', 'active');

        $employee = User::where('email', 'employee@example.com')->first();

        $this->assertNotNull($employee);
        $this->assertSame(User::ROLE_EMPLOYEE, $employee->role);
        $this->assertSame('kyc', $employee->department);
        $this->assertSame('active', $employee->status);
        $this->assertTrue(Hash::check('password123', $employee->password));
    }

    public function test_admin_can_list_update_and_deactivate_employee_account(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'department' => 'tickets',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/employees')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonFragment([
                'id' => $employee->id,
                'department' => 'tickets',
                'status' => 'active',
            ]);

        $this->patchJson("/api/admin/employees/{$employee->id}", [
            'department' => 'cagnotte',
            'status' => 'inactive',
        ])
            ->assertOk()
            ->assertJsonPath('data.department', 'cagnotte')
            ->assertJsonPath('data.status', 'inactive');

        $this->deleteJson("/api/admin/employees/{$employee->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive');
    }

    public function test_normal_user_cannot_create_employee_account(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        Sanctum::actingAs($user);

        $this->postJson('/api/admin/employees', [
            'name' => 'Employee User',
            'email' => 'employee@example.com',
            'password' => 'password123',
            'department' => 'kyc',
        ])
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('users', [
            'email' => 'employee@example.com',
        ]);
    }

    public function test_employee_department_limits_feature_access(): void
    {
        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'department' => 'tickets',
            'status' => 'active',
        ]);
        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/tickets')
            ->assertOk();

        $this->getJson('/api/admin/kyc/pending')
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->getJson('/api/employee/cagnottes/pending')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }
}
