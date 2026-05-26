<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'account_id',
    'amount',
    'currency',
    'gateway',
    'gateway_reference',
    'stripe_payment_intent_id',
    'stripe_charge_id',
    'stripe_event_id',
    'idempotency_key',
    'status',
    'failure_reason',
    'metadata',
    'paid_at',
    'cancelled_at',
    'failed_at',
])]
class PaymentIntent extends Model
{
    public const GATEWAY_STRIPE = 'stripe';
    public const GATEWAY_CMI = 'cmi';
    public const GATEWAY_BANK = 'bank_gateway';

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'metadata' => 'array',
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
