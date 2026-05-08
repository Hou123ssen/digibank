<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'user_id',
    'national_id_number',
    'full_name',
    'birth_date',
    'cin_front_path',
    'cin_back_path',
    'selfie_path',
    'status',
    'reviewed_by',
    'reviewed_at',
    'rejection_reason',
    'extracted_text',
    'detected_cin_number',
    'ocr_verified',
])]
class KycVerification extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_NEEDS_REVIEW = 'needs_review';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const REVIEWABLE_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_NEEDS_REVIEW,
    ];

    protected $appends = [
        'cin_front_url',
        'cin_back_url',
        'selfie_url',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'reviewed_at' => 'datetime',
            'ocr_verified' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function getCinFrontUrlAttribute(): ?string
    {
        return $this->publicUrlFor($this->cin_front_path);
    }

    public function getCinBackUrlAttribute(): ?string
    {
        return $this->publicUrlFor($this->cin_back_path);
    }

    public function getSelfieUrlAttribute(): ?string
    {
        return $this->publicUrlFor($this->selfie_path);
    }

    private function publicUrlFor(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $path = preg_replace('#^(public/|storage/)#', '', ltrim($path, '/'));

        if (!Storage::disk('public')->exists($path) && Storage::disk('local')->exists($path)) {
            Storage::disk('public')->put($path, Storage::disk('local')->get($path));
        }

        return asset('storage/' . $path);
    }
}
