<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'title',
    'description',
    'category',
    'priority',
    'sentiment',
    'ai_suggested_reply',
    'ai_confidence',
    'status',
    'assigned_to',
])]
class Ticket extends Model
{
    public const CATEGORY_DARET = 'daret';
    public const CATEGORY_TRANSFER = 'transfer';
    public const CATEGORY_KYC = 'kyc';
    public const CATEGORY_CARD = 'card';
    public const CATEGORY_ACCOUNT = 'account';

    public const PRIORITY_LOW = 'low';
    public const PRIORITY_MEDIUM = 'medium';
    public const PRIORITY_HIGH = 'high';
    public const PRIORITY_URGENT = 'urgent';

    public const SENTIMENT_POSITIVE = 'positive';
    public const SENTIMENT_NEUTRAL = 'neutral';
    public const SENTIMENT_NEGATIVE = 'negative';

    public const STATUS_OPEN = 'open';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_CLOSED = 'closed';

    protected function casts(): array
    {
        return [
            'ai_confidence' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class);
    }
}
