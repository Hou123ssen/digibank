<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'creator_id',
    'name',
    'contribution_amount',
    'total_members',
    'status',
    'current_cycle_number',
    'started_at',
    'completed_at',
])]
class Daret extends Model
{
    public const STATUS_OPEN = 'open';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_COMPLETED = 'completed';

    protected function casts(): array
    {
        return [
            'contribution_amount' => 'decimal:2',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(DaretMember::class);
    }

    public function cycles(): HasMany
    {
        return $this->hasMany(DaretCycle::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DaretPayment::class);
    }
}
