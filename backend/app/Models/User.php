<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'phone', 'password', 'role', 'department', 'status', 'trust_score'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_ADMIN = 'admin';
    public const ROLE_EMPLOYEE = 'employee';
    public const ROLE_USER = 'user';

    public function account(): HasOne
    {
        return $this->hasOne(Account::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function trustScoreLogs(): HasMany
    {
        return $this->hasMany(TrustScoreLog::class);
    }

    public function daretMemberships(): HasMany
    {
        return $this->hasMany(DaretMember::class);
    }

    public function createdDarets(): HasMany
    {
        return $this->hasMany(Daret::class, 'creator_id');
    }

    public function beneficiaryDaretCycles(): HasMany
    {
        return $this->hasMany(DaretCycle::class, 'beneficiary_user_id');
    }

    public function daretPayments(): HasMany
    {
        return $this->hasMany(DaretPayment::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function cagnottes(): HasMany
    {
        return $this->hasMany(Cagnotte::class, 'creator_id');
    }

    public function cagnotteDonations(): HasMany
    {
        return $this->hasMany(CagnotteDonation::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function assignedTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'assigned_to');
    }

    public function kycVerification(): HasOne
    {
        return $this->hasOne(KycVerification::class);
    }

    public function isKycApproved(): bool
    {
        return $this->kycVerification?->status === KycVerification::STATUS_APPROVED;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'trust_score' => 'integer',
        ];
    }
}
