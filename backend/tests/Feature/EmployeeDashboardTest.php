<?php

namespace Tests\Feature;

use App\Models\Cagnotte;
use App\Models\CagnotteDonation;
use App\Models\KycVerification;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployeeDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_kyc_employee_dashboard_returns_kyc_stats_only(): void
    {
        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'department' => 'kyc',
            'status' => 'active',
        ]);

        $this->createKyc(['status' => KycVerification::STATUS_PENDING]);
        $this->createKyc(['status' => KycVerification::STATUS_NEEDS_REVIEW]);
        $this->createKyc([
            'status' => KycVerification::STATUS_APPROVED,
            'reviewed_by' => $employee->id,
            'reviewed_at' => now(),
        ]);
        $this->createKyc([
            'status' => KycVerification::STATUS_REJECTED,
            'reviewed_by' => $employee->id,
            'reviewed_at' => now(),
        ]);

        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/stats')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.department', 'kyc')
            ->assertJsonPath('data.pending_kyc', 1)
            ->assertJsonPath('data.needs_review', 1)
            ->assertJsonPath('data.approved_today', 1)
            ->assertJsonPath('data.rejected_today', 1)
            ->assertJsonMissingPath('data.assigned_tickets');
    }

    public function test_kyc_employee_analytics_returns_real_weekly_review_data(): void
    {
        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'department' => 'kyc',
            'status' => 'active',
        ]);
        $monday = now()->startOfWeek();

        $approved = $this->createKyc([
            'status' => KycVerification::STATUS_APPROVED,
            'reviewed_by' => $employee->id,
            'reviewed_at' => $monday->copy()->addHours(3),
        ]);
        $approved->forceFill(['created_at' => $monday->copy()->addHour()])->save();

        $rejected = $this->createKyc([
            'status' => KycVerification::STATUS_REJECTED,
            'reviewed_by' => $employee->id,
            'reviewed_at' => $monday->copy()->addDay()->addHours(4),
        ]);
        $rejected->forceFill(['created_at' => $monday->copy()->addDay()->addHours(2)])->save();

        $this->createKyc([
            'status' => KycVerification::STATUS_APPROVED,
            'reviewed_by' => User::factory()->create(['role' => User::ROLE_EMPLOYEE])->id,
            'reviewed_at' => $monday,
        ]);

        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/analytics')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.department', 'kyc')
            ->assertJsonPath('data.reviewed', 2)
            ->assertJsonPath('data.approved', 1)
            ->assertJsonPath('data.rejected', 1)
            ->assertJsonPath('data.approval_rate', 50)
            ->assertJsonPath('data.avg_processing_minutes', 120)
            ->assertJsonCount(7, 'data.weekly_activity')
            ->assertJsonPath('data.weekly_activity.0.reviewed', 1)
            ->assertJsonPath('data.weekly_activity.1.reviewed', 1)
            ->assertJsonPath('data.approval_breakdown.0.count', 1)
            ->assertJsonPath('data.approval_breakdown.1.count', 1);
    }

    public function test_non_kyc_employee_analytics_returns_empty_series(): void
    {
        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'department' => 'tickets',
            'status' => 'active',
        ]);
        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/analytics')
            ->assertOk()
            ->assertJsonPath('data.department', 'tickets')
            ->assertJsonPath('data.reviewed', 0)
            ->assertJsonPath('data.weekly_activity', []);
    }

    public function test_ticket_employee_dashboard_returns_ticket_stats_only(): void
    {
        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'department' => 'tickets',
            'status' => 'active',
        ]);
        $user = User::factory()->create();

        Ticket::create([
            'user_id' => $user->id,
            'title' => 'Card blocked',
            'description' => 'Please help',
            'category' => 'card',
            'priority' => 'urgent',
            'sentiment' => 'negative',
            'status' => Ticket::STATUS_OPEN,
            'assigned_to' => $employee->id,
        ]);
        Ticket::create([
            'user_id' => $user->id,
            'title' => 'Transfer done',
            'description' => 'Resolved ticket',
            'category' => 'transfer',
            'priority' => 'low',
            'sentiment' => 'positive',
            'status' => Ticket::STATUS_RESOLVED,
            'assigned_to' => $employee->id,
        ]);

        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/stats')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.department', 'tickets')
            ->assertJsonPath('data.open_tickets', 1)
            ->assertJsonPath('data.assigned_tickets', 2)
            ->assertJsonPath('data.urgent_tickets', 1)
            ->assertJsonPath('data.resolved_tickets', 1)
            ->assertJsonCount(2, 'data.recent_tickets')
            ->assertJsonMissingPath('data.pending_kyc');
    }

    public function test_department_permissions_are_case_insensitive(): void
    {
        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'department' => ' Tickets ',
            'status' => 'active',
        ]);

        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/tickets')
            ->assertOk();

        $this->getJson('/api/admin/kyc/pending')
            ->assertForbidden();

        $this->getJson('/api/employee/cagnottes/pending')
            ->assertForbidden();
    }

    public function test_cagnotte_employee_dashboard_returns_cagnotte_stats_only(): void
    {
        $employee = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'department' => 'cagnotte',
            'status' => 'active',
        ]);
        $creator = User::factory()->create();
        $donor = User::factory()->create();

        $pending = Cagnotte::create([
            'title' => 'Medical help',
            'description' => 'Pending request',
            'target_amount' => 1000,
            'creator_id' => $creator->id,
            'verification_code' => 'CG-PENDING',
            'status' => Cagnotte::STATUS_PENDING,
        ]);
        Cagnotte::create([
            'title' => 'Approved help',
            'description' => 'Approved request',
            'target_amount' => 1000,
            'creator_id' => $creator->id,
            'verification_code' => 'CG-ACTIVE',
            'status' => Cagnotte::STATUS_ACTIVE,
            'approved_by' => $employee->id,
            'approved_at' => now(),
        ]);
        Cagnotte::create([
            'title' => 'Rejected help',
            'description' => 'Rejected request',
            'target_amount' => 1000,
            'creator_id' => $creator->id,
            'verification_code' => 'CG-REJECTED',
            'status' => Cagnotte::STATUS_REJECTED,
            'approved_by' => $employee->id,
        ]);
        CagnotteDonation::create([
            'cagnotte_id' => $pending->id,
            'user_id' => $donor->id,
            'amount' => 50,
        ]);

        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/stats')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.department', 'cagnotte')
            ->assertJsonPath('data.pending_cagnotte', 1)
            ->assertJsonPath('data.approved_requests', 1)
            ->assertJsonPath('data.rejected_requests', 1)
            ->assertJsonPath('data.donation_activity', 1)
            ->assertJsonMissingPath('data.assigned_tickets');
    }

    private function createKyc(array $overrides = []): KycVerification
    {
        $user = User::factory()->create();

        return KycVerification::create(array_merge([
            'user_id' => $user->id,
            'national_id_number' => fake()->unique()->numerify('AA######'),
            'full_name' => $user->name,
            'birth_date' => '1990-01-01',
            'cin_front_path' => 'kyc/front.jpg',
            'cin_back_path' => 'kyc/back.jpg',
            'status' => KycVerification::STATUS_PENDING,
        ], $overrides));
    }
}
