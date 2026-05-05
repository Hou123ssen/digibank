<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['daret_id', 'user_id', 'payout_order', 'joined_at'])]
class DaretMember extends Model
{
    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
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
        return $this->hasMany(DaretPayment::class);
    }
}
