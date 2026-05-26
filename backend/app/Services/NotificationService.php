<?php

namespace App\Services;

use App\Events\NotificationCreated;
use App\Models\Notification;

class NotificationService
{
    public function __construct(private readonly RealtimeBroadcastService $realtimeBroadcastService) {}

    public function createNotification(int $userId, string $title, string $message, string $type = Notification::TYPE_INFO): Notification
    {
        $notification = Notification::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
        ]);

        $this->realtimeBroadcastService->afterCommit(
            fn () => new NotificationCreated($notification->fresh()),
            'notification.created',
            ['user_id' => $userId, 'notification_id' => $notification->id]
        );

        return $notification;
    }
}
