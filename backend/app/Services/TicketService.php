<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TicketService
{
    public function __construct(
        private readonly TicketAiClassifierService $classifier,
        private readonly NotificationService $notificationService
    ) {
    }

    public function create(User $user, array $data): Ticket
    {
        return DB::transaction(function () use ($user, $data): Ticket {
            $ai = $this->classifier->analyze($data['description']);

            $ticket = Ticket::create([
                'user_id' => $user->id,
                'title' => $data['title'],
                'description' => $data['description'],
                ...$ai,
                'status' => Ticket::STATUS_OPEN,
            ]);

            TicketMessage::create([
                'ticket_id' => $ticket->id,
                'sender_id' => $user->id,
                'message' => $data['description'],
            ]);

            $this->notifyEmployeesAndAdmins(
                'New Ticket Created',
                "A new {$ticket->category} ticket was created",
                Notification::TYPE_WARNING
            );

            return $ticket->fresh(['user:id,name,email', 'messages.sender:id,name,email']);
        });
    }

    public function userMessage(Ticket $ticket, User $user, string $message): TicketMessage
    {
        if ($ticket->user_id !== $user->id) {
            throw ValidationException::withMessages(['ticket' => ['Ticket not found.']]);
        }

        return TicketMessage::create([
            'ticket_id' => $ticket->id,
            'sender_id' => $user->id,
            'message' => $message,
        ]);
    }

    public function assign(Ticket $ticket, User $employee): Ticket
    {
        $ticket->update([
            'assigned_to' => $employee->id,
            'status' => Ticket::STATUS_IN_PROGRESS,
        ]);

        return $ticket->fresh(['user:id,name,email', 'assignee:id,name,email']);
    }

    public function employeeReply(Ticket $ticket, User $employee, string $message): TicketMessage
    {
        $ticket->update([
            'assigned_to' => $ticket->assigned_to ?: $employee->id,
            'status' => Ticket::STATUS_IN_PROGRESS,
        ]);

        $ticketMessage = TicketMessage::create([
            'ticket_id' => $ticket->id,
            'sender_id' => $employee->id,
            'message' => $message,
        ]);

        $this->notificationService->createNotification(
            $ticket->user_id,
            'Ticket Reply',
            'An employee replied to your ticket',
            Notification::TYPE_INFO
        );

        return $ticketMessage;
    }

    public function resolve(Ticket $ticket): Ticket
    {
        $ticket->update(['status' => Ticket::STATUS_RESOLVED]);

        $this->notificationService->createNotification(
            $ticket->user_id,
            'Ticket Resolved',
            'Your ticket has been resolved',
            Notification::TYPE_SUCCESS
        );

        return $ticket->fresh(['user:id,name,email', 'assignee:id,name,email']);
    }

    public function close(Ticket $ticket): Ticket
    {
        $ticket->update(['status' => Ticket::STATUS_CLOSED]);

        $this->notificationService->createNotification(
            $ticket->user_id,
            'Ticket Closed',
            'Your ticket has been closed',
            Notification::TYPE_INFO
        );

        return $ticket->fresh(['user:id,name,email', 'assignee:id,name,email']);
    }

    private function notifyEmployeesAndAdmins(string $title, string $message, string $type): void
    {
        User::query()
            ->whereIn('role', [User::ROLE_ADMIN, User::ROLE_EMPLOYEE])
            ->pluck('id')
            ->each(fn (int $userId) => $this->notificationService->createNotification($userId, $title, $message, $type));
    }
}
