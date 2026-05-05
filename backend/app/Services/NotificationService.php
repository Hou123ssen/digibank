<?php

namespace App\Services;

use App\Models\Notification;

class NotificationService
{
    public function createNotification(int $userId, string $title, string $message, string $type = Notification::TYPE_INFO): Notification
    {
        return Notification::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
        ]);
    }
}
