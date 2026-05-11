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
                'description' => $data['description'] ?? null,
                'contribution_amount' => $data['contribution_amount'],
                'total_members' => $data['total_members'],
                'frequency' => $data['frequency'] ?? Daret::FREQUENCY_MONTHLY,
                'payout_order_type' => $data['payout_order_type'] ?? Daret::PAYOUT_ORDER_RANDOM,
                'status' => Daret::STATUS_OPEN,
            ]);

            $this->addMember($daret, $creator, true);

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
            $daret->update(['current_members' => $daret->members()->count()]);
            $this->generatePayoutOrderIfFull($daret);

            return $daret->fresh(['creator:id,name,email', 'members.user:id,name,email']);
        });
    }

    public function joinByCode(string $inviteCode, User $user): Daret
    {
        return DB::transaction(function () use ($inviteCode, $user): Daret {
            $daret = Daret::where('invite_code', $inviteCode)->lockForUpdate()->first();

            if (! $daret) {
                throw ValidationException::withMessages(['invite_code' => ['Daret not found.']]);
            }

            if ($daret->status !== Daret::STATUS_OPEN) {
                throw ValidationException::withMessages(['daret' => ['Only open darets can be joined.']]);
            }

            $this->ensureKycApproved($user);

            if ($daret->members()->where('user_id', $user->id)->exists()) {
                throw ValidationException::withMessages(['daret' => ['Already joined this daret']]);
            }

            if ((int) $daret->current_members >= (int) $daret->total_members || $daret->members()->count() >= $daret->total_members) {
                throw ValidationException::withMessages(['daret' => ['Daret is full']]);
            }

            $this->addMember($daret, $user);
            $daret->update(['current_members' => $daret->members()->count()]);
            $this->generatePayoutOrderIfFull($daret);

            return $daret->fresh(['creator:id,name,email', 'members.user:id,name,email,trust_score']);
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

            $this->assignPayoutOrder($daret, $members);
            $firstPayoutMember = $daret->members()->where('payout_order', 1)->firstOrFail();

            $daret->update([
                'status' => Daret::STATUS_ACTIVE,
                'started_at' => now(),
            ]);

            DaretCycle::create([
                'daret_id' => $daret->id,
                'cycle_number' => 1,
                'beneficiary_user_id' => $firstPayoutMember->user_id,
                'due_date' => $this->nextDueDate($daret),
                'status' => DaretCycle::STATUS_PENDING,
                'started_at' => now(),
            ]);

            $this->notifyDaretStarted($daret);
            $this->notifyPaymentRequired($daret);

            return $daret->fresh(['members.user:id,name,email', 'cycles.beneficiary:id,name,email']);
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
                ->whereIn('status', [DaretCycle::STATUS_PENDING, DaretCycle::STATUS_LATE])
                ->lockForUpdate()
                ->oldest('cycle_number')
                ->firstOrFail();

            if ($cycle->status === DaretCycle::STATUS_COMPLETED) {
                throw ValidationException::withMessages(['cycle' => ['Payout already completed']]);
            }

            if ($cycle->payments()
                ->where('user_id', $user->id)
                ->where('status', DaretPayment::STATUS_PAID)
                ->exists()) {
                throw ValidationException::withMessages(['payment' => ['Payment already completed']]);
            }

            $this->deductContribution($user, $daret, $cycle);

            $payment = DaretPayment::create([
                'daret_id' => $daret->id,
                'daret_cycle_id' => $cycle->id,
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
                'daret' => $daret->fresh(['members.user:id,name,email', 'cycles.beneficiary:id,name,email']),
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

    private function ensureKycApproved(User $user): void
    {
        if (! $user->isKycApproved()) {
            throw ValidationException::withMessages([
                'daret' => ['KYC approval is required to join Daret.'],
            ]);
        }
    }

    private function addMember(Daret $daret, User $user, bool $isCreator = false): DaretMember
    {
        return DaretMember::create([
            'daret_id' => $daret->id,
            'user_id' => $user->id,
            'joined_at' => now(),
            'is_creator' => $isCreator,
            'status' => DaretMember::STATUS_ACTIVE,
        ]);
    }

    /**
     * @param Collection<int, DaretMember> $members
     */
    private function assignPayoutOrder(Daret $daret, Collection $members): void
    {
        if ($members->isNotEmpty() && $members->every(fn (DaretMember $member): bool => $member->payout_order !== null)) {
            return;
        }

        $members = $members->loadMissing('user');

        $orderedMembers = match ($daret->payout_order_type) {
            Daret::PAYOUT_ORDER_SEQUENTIAL => $members->sort(
                fn (DaretMember $a, DaretMember $b): int => $this->compareJoinOrder($a, $b)
            ),
            Daret::PAYOUT_ORDER_AUTO_ROTATION => $members->sort(function (DaretMember $a, DaretMember $b): int {
                $trustComparison = (int) ($b->user?->trust_score ?? 0) <=> (int) ($a->user?->trust_score ?? 0);

                return $trustComparison !== 0 ? $trustComparison : $this->compareJoinOrder($a, $b);
            }),
            default => $members->shuffle(),
        };

        DaretMember::whereIn('id', $members->pluck('id'))->update(['payout_order' => null]);

        $orderedMembers->values()->each(function (DaretMember $member, int $index): void {
            $member->update(['payout_order' => $index + 1]);
        });
    }

    private function generatePayoutOrderIfFull(Daret $daret): void
    {
        $members = $daret->members()
            ->where('status', DaretMember::STATUS_ACTIVE)
            ->lockForUpdate()
            ->get();

        if ($members->count() !== (int) $daret->total_members) {
            return;
        }

        $this->assignPayoutOrder($daret, $members);
    }

    private function compareJoinOrder(DaretMember $a, DaretMember $b): int
    {
        $joinedComparison = $a->joined_at?->getTimestamp() <=> $b->joined_at?->getTimestamp();

        return $joinedComparison !== 0 ? $joinedComparison : $a->id <=> $b->id;
    }

    private function deductContribution(User $user, Daret $daret, DaretCycle $cycle): void
    {
        $account = Account::where('user_id', $user->id)->lockForUpdate()->firstOrFail();
        $amount = (float) $daret->contribution_amount;

        if ($amount > (float) $account->balance) {
            throw ValidationException::withMessages([
                'amount' => ['Insufficient account balance.'],
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
    }

    private function completeCycleAndPayout(Daret $daret, DaretCycle $cycle): void
    {
        if ($cycle->status === DaretCycle::STATUS_COMPLETED) {
            throw ValidationException::withMessages(['cycle' => ['Payout already completed']]);
        }

        $amount = (float) $daret->contribution_amount * $daret->members()->count();
        $payoutUser = User::findOrFail($cycle->beneficiary_user_id);
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

        DaretCycle::create([
            'daret_id' => $daret->id,
            'cycle_number' => $nextCycleNumber,
            'beneficiary_user_id' => $nextPayoutMember->user_id,
            'due_date' => $this->nextDueDate($daret, $nextCycleNumber),
            'status' => DaretCycle::STATUS_PENDING,
            'started_at' => now(),
        ]);

        $this->notifyPaymentRequired($daret);
    }

    private function nextDueDate(Daret $daret, int $cycleNumber = 1): \Illuminate\Support\Carbon
    {
        $startedAt = $daret->started_at ?: now();

        return $daret->frequency === Daret::FREQUENCY_WEEKLY
            ? $startedAt->copy()->addWeeks($cycleNumber)
            : $startedAt->copy()->addMonthsNoOverflow($cycleNumber);
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
