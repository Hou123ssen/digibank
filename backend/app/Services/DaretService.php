<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Daret;
use App\Models\DaretCycle;
use App\Models\DaretMember;
use App\Models\DaretPayment;
use App\Models\Notification;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DaretService
{
    public function __construct(
        private readonly TransactionService $transactionService,
        private readonly TrustScoreService $trustScoreService,
        private readonly NotificationService $notificationService
    ) {
    }

    public function create(User $creator, array $data): Daret
    {
        return DB::transaction(function () use ($creator, $data): Daret {
            $this->ensureEligibleToJoin($creator);

            $daret = Daret::create([
                'creator_id' => $creator->id,
                'name' => $data['name'],
                'contribution_amount' => $data['contribution_amount'],
                'total_members' => $data['total_members'],
                'status' => Daret::STATUS_OPEN,
            ]);

            $this->addMember($daret, $creator);

            return $daret->fresh(['creator:id,name,email', 'members.user:id,name,email']);
        });
    }

    public function join(Daret $daret, User $user): Daret
    {
        return DB::transaction(function () use ($daret, $user): Daret {
            $daret = Daret::whereKey($daret->id)->lockForUpdate()->firstOrFail();

            if ($daret->status !== Daret::STATUS_OPEN) {
                throw ValidationException::withMessages(['daret' => ['Only open darets can be joined.']]);
            }

            $this->ensureEligibleToJoin($user);

            if ($daret->members()->where('user_id', $user->id)->exists()) {
                throw ValidationException::withMessages(['daret' => ['Already joined this daret']]);
            }

            if ($daret->members()->count() >= $daret->total_members) {
                throw ValidationException::withMessages(['daret' => ['Daret is full']]);
            }

            $this->addMember($daret, $user);

            return $daret->fresh(['creator:id,name,email', 'members.user:id,name,email']);
        });
    }

    public function start(Daret $daret, User $user): Daret
    {
        return DB::transaction(function () use ($daret, $user): Daret {
            $daret = Daret::whereKey($daret->id)->lockForUpdate()->firstOrFail();

            if ($daret->creator_id !== $user->id) {
                throw ValidationException::withMessages(['daret' => ['Only creator can start']]);
            }

            if ($daret->status !== Daret::STATUS_OPEN) {
                throw ValidationException::withMessages(['daret' => ['Only open darets can be started.']]);
            }

            $members = $daret->members()->lockForUpdate()->get();

            if ($members->count() !== $daret->total_members) {
                throw ValidationException::withMessages(['daret' => ['Daret can only start when all member slots are full.']]);
            }

            $this->assignPayoutOrder($members);
            $firstPayoutMember = $daret->members()->where('payout_order', 1)->firstOrFail();

            $daret->update([
                'status' => Daret::STATUS_ACTIVE,
                'current_cycle_number' => 1,
                'started_at' => now(),
            ]);

            DaretCycle::create([
                'daret_id' => $daret->id,
                'cycle_number' => 1,
                'payout_user_id' => $firstPayoutMember->user_id,
                'status' => DaretCycle::STATUS_PENDING,
                'started_at' => now(),
            ]);

            $this->notifyDaretStarted($daret);
            $this->notifyPaymentRequired($daret);

            return $daret->fresh(['members.user:id,name,email', 'cycles.payoutUser:id,name,email']);
        });
    }

    public function pay(Daret $daret, User $user): array
    {
        return DB::transaction(function () use ($daret, $user): array {
            $daret = Daret::whereKey($daret->id)->lockForUpdate()->firstOrFail();

            if ($daret->status !== Daret::STATUS_ACTIVE) {
                throw ValidationException::withMessages(['daret' => ['Only active darets can receive payments.']]);
            }

            $member = $daret->members()->where('user_id', $user->id)->first();

            if (! $member) {
                throw ValidationException::withMessages(['daret' => ['Not a daret member']]);
            }

            $cycle = $daret->cycles()
                ->where('cycle_number', $daret->current_cycle_number)
                ->lockForUpdate()
                ->firstOrFail();

            if ($cycle->status === DaretCycle::STATUS_COMPLETED) {
                throw ValidationException::withMessages(['cycle' => ['Payout already completed']]);
            }

            if ($cycle->payments()
                ->where('daret_member_id', $member->id)
                ->where('status', DaretPayment::STATUS_PAID)
                ->exists()) {
                throw ValidationException::withMessages(['payment' => ['Payment already completed']]);
            }

            $this->deductContribution($user, $daret, $cycle);

            $payment = DaretPayment::create([
                'daret_id' => $daret->id,
                'daret_cycle_id' => $cycle->id,
                'daret_member_id' => $member->id,
                'user_id' => $user->id,
                'amount' => $daret->contribution_amount,
                'status' => DaretPayment::STATUS_PAID,
                'paid_at' => now(),
            ]);

            $cycleCompleted = $cycle->payments()->count() === $daret->members()->count();

            if ($cycleCompleted) {
                $this->completeCycleAndPayout($daret, $cycle);
            }

            return [
                'daret' => $daret->fresh(['members.user:id,name,email', 'cycles.payoutUser:id,name,email']),
                'payment' => $payment,
            ];
        });
    }

    private function ensureEligibleToJoin(User $user): void
    {
        if (! $user->isKycApproved() || (int) $user->trust_score < 60) {
            throw ValidationException::withMessages([
                'daret' => ['KYC approval and trust score of at least 60 are required to join Daret.'],
            ]);
        }
    }

    private function addMember(Daret $daret, User $user): DaretMember
    {
        return DaretMember::create([
            'daret_id' => $daret->id,
            'user_id' => $user->id,
            'joined_at' => now(),
        ]);
    }

    /**
     * @param Collection<int, DaretMember> $members
     */
    private function assignPayoutOrder(Collection $members): void
    {
        $members->shuffle()->values()->each(function (DaretMember $member, int $index): void {
            $member->update(['payout_order' => $index + 1]);
        });
    }

    private function deductContribution(User $user, Daret $daret, DaretCycle $cycle): void
    {
        $account = Account::where('user_id', $user->id)->lockForUpdate()->firstOrFail();
        $amount = (float) $daret->contribution_amount;
        $available = (float) $account->balance + (float) $account->overdraft_limit;

        if ($amount > $available) {
            throw ValidationException::withMessages([
                'amount' => ['Insufficient funds. Overdraft limit exceeded.'],
            ]);
        }

        $before = (float) $account->balance;
        $after = $before - $amount;
        $account->update(['balance' => $after]);

        $transaction = $this->transactionService->record(
            $account,
            $user,
            Transaction::TYPE_WITHDRAW,
            $amount,
            $before,
            $after,
            description: "Daret #{$daret->id} cycle {$cycle->cycle_number} contribution"
        );

        if ($before >= 0 && $after < 0) {
            $this->trustScoreService->decrease($user, 5, 'Overdraft used', $transaction);
        }
    }

    private function completeCycleAndPayout(Daret $daret, DaretCycle $cycle): void
    {
        if ($cycle->status === DaretCycle::STATUS_COMPLETED) {
            throw ValidationException::withMessages(['cycle' => ['Payout already completed']]);
        }

        $amount = (float) $daret->contribution_amount * $daret->members()->count();
        $payoutUser = User::findOrFail($cycle->payout_user_id);
        $account = Account::where('user_id', $payoutUser->id)->lockForUpdate()->firstOrFail();
        $before = (float) $account->balance;
        $after = $before + $amount;

        $account->update(['balance' => $after]);

        $this->transactionService->record(
            $account,
            $payoutUser,
            Transaction::TYPE_DEPOSIT,
            $amount,
            $before,
            $after,
            description: "Daret #{$daret->id} cycle {$cycle->cycle_number} payout"
        );

        $this->notificationService->createNotification(
            $payoutUser->id,
            'Payout Received',
            'You received your Daret payout',
            Notification::TYPE_SUCCESS
        );

        $cycle->update([
            'status' => DaretCycle::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);

        if ($cycle->cycle_number >= $daret->total_members) {
            $daret->update([
                'status' => Daret::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            return;
        }

        $nextCycleNumber = $cycle->cycle_number + 1;
        $nextPayoutMember = $daret->members()->where('payout_order', $nextCycleNumber)->firstOrFail();

        $daret->update(['current_cycle_number' => $nextCycleNumber]);

        DaretCycle::create([
            'daret_id' => $daret->id,
            'cycle_number' => $nextCycleNumber,
            'payout_user_id' => $nextPayoutMember->user_id,
            'status' => DaretCycle::STATUS_PENDING,
            'started_at' => now(),
        ]);

        $this->notifyPaymentRequired($daret);
    }

    private function notifyDaretStarted(Daret $daret): void
    {
        $daret->members()->pluck('user_id')->each(function (int $userId): void {
            $this->notificationService->createNotification(
                $userId,
                'Daret Started',
                'Your Daret has started',
                Notification::TYPE_SUCCESS
            );
        });
    }

    private function notifyPaymentRequired(Daret $daret): void
    {
        $daret->members()->pluck('user_id')->each(function (int $userId): void {
            $this->notificationService->createNotification(
                $userId,
                'Payment Required',
                'Please pay your Daret contribution',
                Notification::TYPE_WARNING
            );
        });
    }
}
