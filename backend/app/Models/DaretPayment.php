<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'daret_id',
    'daret_cycle_id',
    'daret_member_id',
    'user_id',
    'amount',
    'status',
    'paid_at',
])]
class DaretPayment extends Model
{
    public const STATUS_PAID = 'paid';

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function daret(): BelongsTo
    {
        return $this->belongsTo(Daret::class);
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(DaretCycle::class, 'daret_cycle_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(DaretMember::class, 'daret_member_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
