<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'daret_cycle_id',
    'daret_id',
    'user_id',
    'amount',
    'status',
    'paid_at',
])]
class DaretPayment extends Model
{
    use HasFactory;

    public const STATUS_PAID = 'paid';
    public const STATUS_PENDING = 'pending';
    public const STATUS_LATE = 'late';

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
