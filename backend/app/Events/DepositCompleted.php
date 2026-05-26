<?php

namespace App\Events;

use App\Events\Concerns\FormatsRealtimePayloads;
use App\Models\Account;
use App\Models\PaymentIntent;
use App\Models\Transaction;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DepositCompleted implements ShouldBroadcast
{
    use Dispatchable;
    use FormatsRealtimePayloads;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly int $userId,
        public readonly Account $account,
        public readonly Transaction $transaction,
        public readonly ?PaymentIntent $paymentIntent = null
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('user.'.$this->userId);
    }

    public function broadcastAs(): string
    {
        return 'deposit.completed';
    }

    public function broadcastQueue(): string
    {
        return 'broadcasts';
    }

    public function broadcastWith(): array
    {
        return [
            'account' => $this->accountPayload($this->account),
            'transaction' => $this->transactionPayload($this->transaction),
            'payment_intent' => $this->paymentIntent ? $this->paymentIntentPayload($this->paymentIntent) : null,
        ];
    }
}
