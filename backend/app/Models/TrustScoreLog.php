<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'user_id',
    'change_type',
    'points',
    'old_score',
    'new_score',
    'reason',
    'related_type',
    'related_id',
])]
class TrustScoreLog extends Model
{
    public const TYPE_INCREASE = 'increase';
    public const TYPE_DECREASE = 'decrease';

    protected function casts(): array
    {
        return [
            'points' => 'integer',
            'old_score' => 'integer',
            'new_score' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function related(): MorphTo
    {
        return $this->morphTo();
    }
}
