<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'daret_id',
    'cycle_number',
    'payout_user_id',
    'status',
    'started_at',
    'completed_at',
])]
class DaretCycle extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_COMPLETED = 'completed';

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function daret(): BelongsTo
    {
        return $this->belongsTo(Daret::class);
    }

    public function payoutUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payout_user_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DaretPayment::class);
    }
}
