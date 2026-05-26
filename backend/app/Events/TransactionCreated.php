<?php

namespace App\Events;

use App\Events\Concerns\FormatsRealtimePayloads;
use App\Models\Transaction;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TransactionCreated implements ShouldBroadcast
{
    use Dispatchable;
    use FormatsRealtimePayloads;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly int $userId,
        public readonly Transaction $transaction
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('user.'.$this->userId);
    }

    public function broadcastAs(): string
    {
        return 'transaction.created';
    }

    public function broadcastQueue(): string
    {
        return 'broadcasts';
    }

    public function broadcastWith(): array
    {
        return [
            'transaction' => $this->transactionPayload($this->transaction),
        ];
    }
}
