<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'daret_id',
    'cycle_number',
    'beneficiary_user_id',
    'due_date',
    'status',
    'started_at',
    'completed_at',
])]
class DaretCycle extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_LATE = 'late';

    protected function casts(): array
    {
        return [
            'cycle_number' => 'integer',
            'due_date' => 'date',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function daret(): BelongsTo
    {
        return $this->belongsTo(Daret::class);
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(User::class, 'beneficiary_user_id');
    }

    public function payoutUser(): BelongsTo
    {
        return $this->beneficiary();
    }

    public function getPayoutUserIdAttribute(): ?int
    {
        return $this->beneficiary_user_id;
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DaretPayment::class);
    }
}
