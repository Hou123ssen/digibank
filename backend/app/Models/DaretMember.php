<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['daret_id', 'user_id', 'payout_order', 'joined_at', 'is_creator', 'status'])]
class DaretMember extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_LEFT = 'left';
    public const STATUS_BANNED = 'banned';

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'is_creator' => 'boolean',
        ];
    }

    public function daret(): BelongsTo
    {
        return $this->belongsTo(Daret::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DaretPayment::class, 'user_id', 'user_id');
    }
}
