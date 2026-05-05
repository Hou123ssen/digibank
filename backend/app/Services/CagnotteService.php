<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Cagnotte;
use App\Models\CagnotteDonation;
use App\Models\Notification;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CagnotteService
{
    public function __construct(
        private readonly TransactionService $transactionService,
        private readonly NotificationService $notificationService
    ) {
    }

    public function create(User $creator, array $data): Cagnotte
    {
        $cagnotte = Cagnotte::create([
            'title' => $data['title'],
            'description' => $data['description'],
            'target_amount' => $data['target_amount'],
            'current_amount' => 0,
            'creator_id' => $creator->id,
            'verification_code' => $this->generateVerificationCode(),
            'status' => Cagnotte::STATUS_PENDING,
        ])->fresh(['creator:id,name,email']);

        $this->notificationService->createNotification(
            $creator->id,
            'Cagnotte Request Created',
            "Your cagnotte verification code is {$cagnotte->verification_code}",
            Notification::TYPE_INFO
        );

        return $cagnotte;
    }

    public function approve(Cagnotte $cagnotte, User $reviewer): Cagnotte
    {
        return DB::transaction(function () use ($cagnotte, $reviewer): Cagnotte {
            $cagnotte = Cagnotte::whereKey($cagnotte->id)->lockForUpdate()->firstOrFail();

            if ($cagnotte->status !== Cagnotte::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'cagnotte' => ['Only pending cagnottes can be approved.'],
                ]);
            }

            $cagnotte->update([
                'status' => Cagnotte::STATUS_ACTIVE,
                'approved_by' => $reviewer->id,
                'approved_at' => now(),
                'rejection_reason' => null,
            ]);

            $this->notificationService->createNotification(
                $cagnotte->creator_id,
                'Cagnotte Approved',
                'Your cagnotte request has been approved',
                Notification::TYPE_SUCCESS
            );

            return $cagnotte->fresh(['creator:id,name,email', 'approver:id,name,email']);
        });
    }

    public function reject(Cagnotte $cagnotte, User $reviewer, string $reason): Cagnotte
    {
        return DB::transaction(function () use ($cagnotte, $reviewer, $reason): Cagnotte {
            $cagnotte = Cagnotte::whereKey($cagnotte->id)->lockForUpdate()->firstOrFail();

            if ($cagnotte->status !== Cagnotte::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'cagnotte' => ['Only pending cagnottes can be rejected.'],
                ]);
            }

            $cagnotte->update([
                'status' => Cagnotte::STATUS_REJECTED,
                'approved_by' => $reviewer->id,
                'approved_at' => now(),
                'rejection_reason' => $reason,
            ]);

            $this->notificationService->createNotification(
                $cagnotte->creator_id,
                'Cagnotte Rejected',
                'Your cagnotte request has been rejected',
                Notification::TYPE_WARNING
            );

            return $cagnotte->fresh(['creator:id,name,email', 'approver:id,name,email']);
        });
    }

    public function donate(Cagnotte $cagnotte, User $user, float $amount): array
    {
        return DB::transaction(function () use ($cagnotte, $user, $amount): array {
            $cagnotte = Cagnotte::whereKey($cagnotte->id)->lockForUpdate()->firstOrFail();

            if ($cagnotte->status !== Cagnotte::STATUS_ACTIVE) {
                throw ValidationException::withMessages([
                    'cagnotte' => ['Only active cagnottes can receive donations.'],
                ]);
            }

            $account = Account::where('user_id', $user->id)->lockForUpdate()->firstOrFail();
            $available = (float) $account->balance + (float) $account->overdraft_limit;

            if ($amount > $available) {
                throw ValidationException::withMessages([
                    'amount' => ['Insufficient funds. Overdraft limit exceeded.'],
                ]);
            }

            $balanceBefore = (float) $account->balance;
            $balanceAfter = $balanceBefore - $amount;
            $account->update(['balance' => $balanceAfter]);

            $this->transactionService->record(
                $account,
                $user,
                Transaction::TYPE_WITHDRAW,
                $amount,
                $balanceBefore,
                $balanceAfter,
                description: "Donation to cagnotte #{$cagnotte->id}"
            );

            $donation = CagnotteDonation::create([
                'cagnotte_id' => $cagnotte->id,
                'user_id' => $user->id,
                'amount' => $amount,
            ]);

            $currentAmount = (float) $cagnotte->current_amount + $amount;
            $status = $currentAmount >= (float) $cagnotte->target_amount
                ? Cagnotte::STATUS_COMPLETED
                : Cagnotte::STATUS_ACTIVE;

            $cagnotte->update([
                'current_amount' => $currentAmount,
                'status' => $status,
            ]);

            $this->notificationService->createNotification(
                $user->id,
                'Thank you for your donation',
                'Thank you for your donation',
                Notification::TYPE_SUCCESS
            );

            if ($status === Cagnotte::STATUS_COMPLETED) {
                $this->notificationService->createNotification(
                    $cagnotte->creator_id,
                    'Campaign Completed',
                    'Your campaign reached its goal',
                    Notification::TYPE_SUCCESS
                );
            }

            return [
                'cagnotte' => $cagnotte->fresh(['creator:id,name,email', 'donations.user:id,name,email']),
                'donation' => $donation,
            ];
        });
    }

    private function generateVerificationCode(): string
    {
        do {
            $code = 'CAG-'.random_int(100000, 999999);
        } while (Cagnotte::where('verification_code', $code)->exists());

        return $code;
    }
}
