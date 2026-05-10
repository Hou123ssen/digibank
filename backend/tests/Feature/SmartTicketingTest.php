<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SmartTicketingTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_ticket_with_rule_based_ai_fields_and_employee_notification(): void
    {
        $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE, 'department' => 'tickets', 'status' => 'active']);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/tickets', [
            'title' => 'Transfer issue',
            'description' => 'My transfer failed and the money is missing. This is a bad problem.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.ticket.category', Ticket::CATEGORY_TRANSFER)
            ->assertJsonPath('data.ticket.priority', Ticket::PRIORITY_HIGH)
            ->assertJsonPath('data.ticket.sentiment', Ticket::SENTIMENT_NEGATIVE);

        $this->assertDatabaseHas('ticket_messages', [
            'sender_id' => $user->id,
            'message' => 'My transfer failed and the money is missing. This is a bad problem.',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $employee->id,
            'title' => 'New Ticket Created',
            'type' => Notification::TYPE_WARNING,
        ]);
    }

    public function test_user_can_only_message_own_ticket(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $ticket = $this->ticketFor($owner);
        Sanctum::actingAs($other);

        $this->postJson("/api/tickets/{$ticket->id}/message", [
            'message' => 'I should not access this ticket.',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.ticket.0', 'Ticket not found.');

        $this->assertDatabaseMissing('ticket_messages', [
            'sender_id' => $other->id,
        ]);
    }

    public function test_user_can_view_only_my_tickets(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $this->ticketFor($user, ['title' => 'Mine']);
        $this->ticketFor($other, ['title' => 'Not mine']);
        Sanctum::actingAs($user);

        $this->getJson('/api/tickets/my')
            ->assertOk()
            ->assertJsonCount(1, 'data.tickets')
            ->assertJsonPath('data.tickets.0.title', 'Mine')
            ->assertJsonPath('data.pagination.current_page', 1)
            ->assertJsonPath('data.pagination.per_page', 10)
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.pagination.last_page', 1);
    }

    public function test_employee_can_view_assign_reply_resolve_and_close_ticket(): void
    {
        $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE, 'department' => 'tickets', 'status' => 'active']);
        $user = User::factory()->create();
        $ticket = $this->ticketFor($user);
        Sanctum::actingAs($employee);

        $this->getJson('/api/employee/tickets')
            ->assertOk()
            ->assertJsonCount(1, 'data.tickets')
            ->assertJsonPath('data.pagination.current_page', 1)
            ->assertJsonPath('data.pagination.per_page', 10)
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.pagination.last_page', 1);

        $this->postJson("/api/employee/tickets/{$ticket->id}/assign")
            ->assertOk()
            ->assertJsonPath('data.ticket.assigned_to', $employee->id)
            ->assertJsonPath('data.ticket.status', Ticket::STATUS_IN_PROGRESS);

        $this->postJson("/api/employee/tickets/{$ticket->id}/reply", [
            'message' => 'We are checking this issue.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.message.sender_id', $employee->id);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'title' => 'Ticket Reply',
        ]);

        $this->postJson("/api/employee/tickets/{$ticket->id}/resolve")
            ->assertOk()
            ->assertJsonPath('data.ticket.status', Ticket::STATUS_RESOLVED);

        $this->postJson("/api/employee/tickets/{$ticket->id}/close")
            ->assertOk()
            ->assertJsonPath('data.ticket.status', Ticket::STATUS_CLOSED);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'title' => 'Ticket Resolved',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'title' => 'Ticket Closed',
        ]);
    }

    public function test_normal_user_cannot_access_employee_ticket_routes(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        Sanctum::actingAs($user);

        $this->getJson('/api/employee/tickets')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    private function ticketFor(User $user, array $overrides = []): Ticket
    {
        return Ticket::create(array_merge([
            'user_id' => $user->id,
            'title' => 'Account help',
            'description' => 'I need help with my account.',
            'category' => Ticket::CATEGORY_ACCOUNT,
            'priority' => Ticket::PRIORITY_LOW,
            'sentiment' => Ticket::SENTIMENT_NEUTRAL,
            'ai_suggested_reply' => 'We received your ticket.',
            'ai_confidence' => 90,
            'status' => Ticket::STATUS_OPEN,
        ], $overrides));
    }
}
