<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'user_id',
    'event',
    'auditable_type',
    'auditable_id',
    'metadata',
    'ip_address',
    'user_agent',
])]
class AuditLog extends Model
{
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }
}
