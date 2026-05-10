<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'creator_id',
    'name',
    'description',
    'contribution_amount',
    'total_members',
    'current_members',
    'frequency',
    'payout_order_type',
    'invite_code',
    'status',
    'started_at',
    'completed_at',
])]
class Daret extends Model
{
    use HasFactory;

    public const FREQUENCY_MONTHLY = 'monthly';
    public const FREQUENCY_WEEKLY = 'weekly';

    public const PAYOUT_ORDER_SEQUENTIAL = 'sequential';
    public const PAYOUT_ORDER_RANDOM = 'random';
    public const PAYOUT_ORDER_AUTO_ROTATION = 'auto_rotation';

    public const STATUS_OPEN = 'open';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    protected static function booted(): void
    {
        static::creating(function (Daret $daret): void {
            $daret->invite_code ??= static::generateInviteCode();
            $daret->current_members ??= 1;
            $daret->frequency ??= static::FREQUENCY_MONTHLY;
            $daret->payout_order_type ??= static::PAYOUT_ORDER_RANDOM;
        });
    }

    protected function casts(): array
    {
        return [
            'contribution_amount' => 'decimal:2',
            'total_members' => 'integer',
            'current_members' => 'integer',
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

    private static function generateInviteCode(): string
    {
        do {
            $code = 'DRT-' . Str::upper(Str::random(6));
        } while (static::where('invite_code', $code)->exists());

        return $code;
    }
}
