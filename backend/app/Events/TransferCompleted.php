<?php

namespace App\Events;

use App\Events\Concerns\FormatsRealtimePayloads;
use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TransferCompleted implements ShouldBroadcast
{
    use Dispatchable;
    use FormatsRealtimePayloads;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly int $userId,
        public readonly Account $account,
        public readonly Transaction $transaction,
        public readonly string $direction
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('user.'.$this->userId);
    }

    public function broadcastAs(): string
    {
        return 'transfer.completed';
    }

    public function broadcastQueue(): string
    {
        return 'broadcasts';
    }

    public function broadcastWith(): array
    {
        return [
            'direction' => $this->direction,
            'account' => $this->accountPayload($this->account),
            'transaction' => $this->transactionPayload($this->transaction),
        ];
    }
}
