<?php

namespace App\Events;

use App\Events\Concerns\FormatsRealtimePayloads;
use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreated implements ShouldBroadcast
{
    use Dispatchable;
    use FormatsRealtimePayloads;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public readonly Notification $notification) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('user.'.$this->notification->user_id);
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastQueue(): string
    {
        return 'broadcasts';
    }

    public function broadcastWith(): array
    {
        return [
            'notification' => $this->notificationPayload($this->notification),
        ];
    }
}
