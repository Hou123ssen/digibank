<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['cagnotte_id', 'user_id', 'amount'])]
class CagnotteDonation extends Model
{
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function cagnotte(): BelongsTo
    {
        return $this->belongsTo(Cagnotte::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
