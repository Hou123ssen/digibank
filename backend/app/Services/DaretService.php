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
use Illuminate\Support\Facades\Log;
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

            $this->notificationService->createNotification(
                $creator->id,
                'Daret Created',
                "Your Daret {$daret->name} has been created.",
                Notification::TYPE_SUCCESS
            );

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
            $this->notifyMemberJoined($daret, $user);

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
            $this->notifyMemberJoined($daret, $user);

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

            $cycle = DaretCycle::create([
                'daret_id' => $daret->id,
                'cycle_number' => 1,
                'beneficiary_user_id' => $firstPayoutMember->user_id,
                'due_date' => $this->nextDueDate($daret),
                'status' => DaretCycle::STATUS_PENDING,
                'started_at' => now(),
            ]);

            $this->createPendingPayments($daret, $cycle);
            $this->notifyDaretStarted($daret);
            $this->notifyCycleStarted($daret, $cycle);

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

            $payment = DaretPayment::updateOrCreate(
                [
                    'daret_cycle_id' => $cycle->id,
                    'user_id' => $user->id,
                ],
                [
                    'daret_id' => $daret->id,
                    'amount' => $daret->contribution_amount,
                    'status' => DaretPayment::STATUS_PAID,
                    'paid_at' => now(),
                ]
            );

            $this->notifyContributionPaid($daret, $cycle, $user);

            $cycleCompleted = $cycle->payments()
                ->where('status', DaretPayment::STATUS_PAID)
                ->count() === $daret->members()->count();

            if ($cycleCompleted) {
                $this->completeCycleAndPayout($daret, $cycle);
            }

            return [
                'daret' => $daret->fresh(['members.user:id,name,email', 'cycles.beneficiary:id,name,email']),
                'payment' => $payment,
            ];
        });
    }

    public function processDuePayments(): array
    {
        $summary = [
            'cycles_checked' => 0,
            'payments_paid' => 0,
            'payments_late' => 0,
            'cycles_completed' => 0,
            'darets_completed' => 0,
        ];

        DaretCycle::query()
            ->with(['daret.members.user', 'beneficiary'])
            ->where('status', DaretCycle::STATUS_PENDING)
            ->whereDate('due_date', '<=', now()->toDateString())
            ->whereHas('daret', fn ($query) => $query
                ->where('status', Daret::STATUS_ACTIVE)
                ->where('frequency', Daret::FREQUENCY_MONTHLY))
            ->oldest('due_date')
            ->get()
            ->each(function (DaretCycle $cycle) use (&$summary): void {
                DB::transaction(function () use ($cycle, &$summary): void {
                    $cycle = DaretCycle::whereKey($cycle->id)
                        ->lockForUpdate()
                        ->with(['daret.members.user', 'beneficiary'])
                        ->firstOrFail();

                    if ($cycle->status !== DaretCycle::STATUS_PENDING || $cycle->due_date->isFuture()) {
                        return;
                    }

                    $daret = Daret::whereKey($cycle->daret_id)
                        ->lockForUpdate()
                        ->with(['members.user'])
                        ->firstOrFail();

                    if ($daret->status !== Daret::STATUS_ACTIVE || $daret->frequency !== Daret::FREQUENCY_MONTHLY) {
                        return;
                    }

                    $summary['cycles_checked']++;
                    Log::info('Processing due Daret cycle payments.', [
                        'daret_id' => $daret->id,
                        'cycle_id' => $cycle->id,
                        'cycle_number' => $cycle->cycle_number,
                    ]);

                    $this->createPendingPayments($daret, $cycle);

                    foreach ($daret->members as $member) {
                        if ($member->status !== DaretMember::STATUS_ACTIVE) {
                            continue;
                        }

                        $payment = DaretPayment::query()
                            ->where('daret_cycle_id', $cycle->id)
                            ->where('user_id', $member->user_id)
                            ->lockForUpdate()
                            ->first();

                        if ($payment?->status === DaretPayment::STATUS_PAID) {
                            Log::info('Skipping already paid Daret contribution.', [
                                'daret_id' => $daret->id,
                                'cycle_id' => $cycle->id,
                                'user_id' => $member->user_id,
                            ]);
                            continue;
                        }

                        if ($payment?->status === DaretPayment::STATUS_LATE) {
                            $this->notifyStaffIfGraceExpired($daret, $cycle, $payment);
                            continue;
                        }

                        $account = Account::where('user_id', $member->user_id)->lockForUpdate()->first();

                        if (! $account) {
                            $this->markContributionLate($daret, $cycle, $member->user, $payment, 'No account found for automatic Daret debit.');
                            $summary['payments_late']++;
                            continue;
                        }

                        $amount = (float) $daret->contribution_amount;

                        if ((float) $account->balance >= $amount) {
                            if ($this->debitAutomaticContribution($account, $member->user, $daret, $cycle, $payment)) {
                                $summary['payments_paid']++;
                            } else {
                                $summary['payments_late']++;
                            }
                            continue;
                        }

                        $this->markContributionLate($daret, $cycle, $member->user, $payment, 'Insufficient balance for automatic Daret debit.');
                        $summary['payments_late']++;
                    }

                    $paidCount = $cycle->payments()
                        ->where('status', DaretPayment::STATUS_PAID)
                        ->count();
                    $membersCount = $daret->members()
                        ->where('status', DaretMember::STATUS_ACTIVE)
                        ->count();

                    if ($membersCount > 0 && $paidCount === $membersCount) {
                        $wasFinalCycle = (int) $cycle->cycle_number >= (int) $daret->total_members;
                        $this->completeCycleAndPayout($daret, $cycle);
                        $summary['cycles_completed']++;
                        if ($wasFinalCycle) {
                            $summary['darets_completed']++;
                        }
                    }
                });
            });

        Log::info('Daret due payment processing finished.', $summary);

        return $summary;
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
        $this->notifyDaretFull($daret);
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
            Transaction::TYPE_DARET_CONTRIBUTION,
            $amount,
            $before,
            $after,
            description: "Daret #{$daret->id} cycle {$cycle->cycle_number} contribution"
        );
    }

    private function debitAutomaticContribution(Account $account, User $user, Daret $daret, DaretCycle $cycle, ?DaretPayment $payment): bool
    {
        $amount = (float) $daret->contribution_amount;
        $before = (float) $account->balance;

        if ($before < $amount) {
            $this->markContributionLate($daret, $cycle, $user, $payment, 'Insufficient balance guard prevented automatic Daret debit.');
            return false;
        }

        $after = $before - $amount;

        $account->update(['balance' => $after]);

        $this->transactionService->record(
            $account,
            $user,
            Transaction::TYPE_DARET_CONTRIBUTION,
            $amount,
            $before,
            $after,
            description: "Automatic Daret #{$daret->id} cycle {$cycle->cycle_number} contribution"
        );

        DaretPayment::updateOrCreate(
            [
                'daret_cycle_id' => $cycle->id,
                'user_id' => $user->id,
            ],
            [
                'daret_id' => $daret->id,
                'amount' => $daret->contribution_amount,
                'status' => DaretPayment::STATUS_PAID,
                'paid_at' => now(),
            ]
        );

        $this->notificationService->createNotification(
            $user->id,
            'Daret Contribution Debited',
            "Your contribution for {$daret->name} cycle {$cycle->cycle_number} was debited automatically.",
            Notification::TYPE_SUCCESS
        );

        Log::info('Automatic Daret contribution debited.', [
            'daret_id' => $daret->id,
            'cycle_id' => $cycle->id,
            'payment_id' => $payment?->id,
            'user_id' => $user->id,
            'amount' => $amount,
        ]);

        return true;
    }

    private function markContributionLate(Daret $daret, DaretCycle $cycle, ?User $user, ?DaretPayment $payment, string $reason): void
    {
        if (! $user) {
            Log::warning('Unable to mark Daret contribution late because user is missing.', [
                'daret_id' => $daret->id,
                'cycle_id' => $cycle->id,
                'payment_id' => $payment?->id,
                'reason' => $reason,
            ]);

            return;
        }

        $latePayment = DaretPayment::updateOrCreate(
            [
                'daret_cycle_id' => $cycle->id,
                'user_id' => $user->id,
            ],
            [
                'daret_id' => $daret->id,
                'amount' => $daret->contribution_amount,
                'status' => DaretPayment::STATUS_LATE,
                'paid_at' => null,
            ]
        );

        $this->trustScoreService->decrease(
            $user,
            5,
            "Late Daret contribution for {$daret->name} cycle {$cycle->cycle_number}",
            $latePayment
        );

        $this->notificationService->createNotification(
            $user->id,
            'Solde insuffisant',
            'Solde insuffisant pour votre contribution Daret. Veuillez alimenter votre compte pour payer votre contribution.',
            Notification::TYPE_WARNING
        );

        Log::warning('Automatic Daret contribution marked late.', [
            'daret_id' => $daret->id,
            'cycle_id' => $cycle->id,
            'payment_id' => $latePayment->id,
            'user_id' => $user->id,
            'reason' => $reason,
        ]);
    }

    private function notifyStaffIfGraceExpired(Daret $daret, DaretCycle $cycle, DaretPayment $payment): void
    {
        if (! $payment->updated_at || $payment->updated_at->greaterThan(now()->subDays(3))) {
            return;
        }

        $message = "Daret {$daret->name} cycle {$cycle->cycle_number} has a late payment from user #{$payment->user_id} after the grace period.";

        User::query()
            ->whereIn('role', ['admin', 'employee'])
            ->pluck('id')
            ->each(function (int $userId) use ($message): void {
                $alreadyNotified = Notification::query()
                    ->where('user_id', $userId)
                    ->where('title', 'Daret Late Payment Alert')
                    ->where('message', $message)
                    ->exists();

                if ($alreadyNotified) {
                    return;
                }

                $this->notificationService->createNotification(
                    $userId,
                    'Daret Late Payment Alert',
                    $message,
                    Notification::TYPE_WARNING
                );
            });

        Log::warning('Daret late payment passed grace period.', [
            'daret_id' => $daret->id,
            'cycle_id' => $cycle->id,
            'payment_id' => $payment->id,
            'user_id' => $payment->user_id,
        ]);
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
            Transaction::TYPE_DARET_PAYOUT,
            $amount,
            $before,
            $after,
            description: "Daret #{$daret->id} cycle {$cycle->cycle_number} payout"
        );

        $this->notificationService->createNotification(
            $payoutUser->id,
            'Payout Received',
            "You received the pot for {$daret->name} cycle {$cycle->cycle_number}.",
            Notification::TYPE_SUCCESS
        );

        $cycle->update([
            'status' => DaretCycle::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);

        $this->notifyCycleCompleted($daret, $cycle);

        if ($cycle->cycle_number >= $daret->total_members) {
            $daret->update([
                'status' => Daret::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            return;
        }

        $nextCycleNumber = $cycle->cycle_number + 1;
        $nextPayoutMember = $daret->members()->where('payout_order', $nextCycleNumber)->firstOrFail();

        $nextCycle = DaretCycle::create([
            'daret_id' => $daret->id,
            'cycle_number' => $nextCycleNumber,
            'beneficiary_user_id' => $nextPayoutMember->user_id,
            'due_date' => $this->nextDueDate($daret, $nextCycleNumber),
            'status' => DaretCycle::STATUS_PENDING,
            'started_at' => now(),
        ]);

        $this->createPendingPayments($daret, $nextCycle);
        $this->notifyCycleStarted($daret, $nextCycle);
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
                "The Daret {$daret->name} has been started by the creator.",
                Notification::TYPE_SUCCESS
            );
        });
    }

    private function notifyMemberJoined(Daret $daret, User $user): void
    {
        $this->notificationService->createNotification(
            $user->id,
            'Daret Joined',
            "You joined {$daret->name}.",
            Notification::TYPE_SUCCESS
        );

        if ((int) $daret->creator_id !== (int) $user->id) {
            $this->notificationService->createNotification(
                $daret->creator_id,
                'New Daret Member',
                "{$user->name} joined {$daret->name}.",
                Notification::TYPE_INFO
            );
        }
    }

    private function notifyDaretFull(Daret $daret): void
    {
        $daret->members()->pluck('user_id')->each(function (int $userId) use ($daret): void {
            $this->notificationService->createNotification(
                $userId,
                'Daret Full',
                "{$daret->name} is now full and ready to start.",
                Notification::TYPE_SUCCESS
            );
        });
    }

    private function notifyCycleStarted(Daret $daret, DaretCycle $cycle): void
    {
        $beneficiaryName = $cycle->beneficiary?->name
            ?? User::whereKey($cycle->beneficiary_user_id)->value('name')
            ?? 'the beneficiary';

        $daret->members()->pluck('user_id')->each(function (int $userId) use ($daret, $cycle, $beneficiaryName): void {
            $this->notificationService->createNotification(
                $userId,
                'New Daret Cycle',
                "{$daret->name} cycle {$cycle->cycle_number} has started. Beneficiary: {$beneficiaryName}.",
                Notification::TYPE_WARNING
            );
        });
    }

    private function notifyContributionPaid(Daret $daret, DaretCycle $cycle, User $payer): void
    {
        $daret->members()->pluck('user_id')->each(function (int $userId) use ($daret, $cycle, $payer): void {
            $this->notificationService->createNotification(
                $userId,
                'Daret Contribution Paid',
                "{$payer->name} paid the contribution for {$daret->name} cycle {$cycle->cycle_number}.",
                Notification::TYPE_INFO
            );
        });
    }

    private function notifyCycleCompleted(Daret $daret, DaretCycle $cycle): void
    {
        $daret->members()->pluck('user_id')->each(function (int $userId) use ($daret, $cycle): void {
            $this->notificationService->createNotification(
                $userId,
                'Daret Cycle Completed',
                "All payments are completed for {$daret->name} cycle {$cycle->cycle_number}.",
                Notification::TYPE_SUCCESS
            );
        });
    }

    private function createPendingPayments(Daret $daret, DaretCycle $cycle): void
    {
        $daret->members()
            ->where('status', DaretMember::STATUS_ACTIVE)
            ->pluck('user_id')
            ->each(function (int $userId) use ($daret, $cycle): void {
                DaretPayment::firstOrCreate(
                    [
                        'daret_cycle_id' => $cycle->id,
                        'user_id' => $userId,
                    ],
                    [
                        'daret_id' => $daret->id,
                        'amount' => $daret->contribution_amount,
                        'status' => DaretPayment::STATUS_PENDING,
                    ]
                );
            });
    }

    public function markLatePayments(): int
    {
        $lateCount = 0;

        DaretCycle::query()
            ->with('daret.members')
            ->where('status', DaretCycle::STATUS_PENDING)
            ->whereDate('due_date', '<', now()->toDateString())
            ->get()
            ->each(function (DaretCycle $cycle) use (&$lateCount): void {
                DB::transaction(function () use ($cycle, &$lateCount): void {
                    $cycle = DaretCycle::whereKey($cycle->id)
                        ->with('daret')
                        ->lockForUpdate()
                        ->firstOrFail();

                    if ($cycle->status !== DaretCycle::STATUS_PENDING || $cycle->due_date->isToday() || $cycle->due_date->isFuture()) {
                        return;
                    }

                    $this->createPendingPayments($cycle->daret, $cycle);

                    $latePaymentIds = DaretPayment::query()
                        ->where('daret_cycle_id', $cycle->id)
                        ->where('status', DaretPayment::STATUS_PENDING)
                        ->pluck('id');

                    $updated = DaretPayment::query()
                        ->where('daret_cycle_id', $cycle->id)
                        ->where('status', DaretPayment::STATUS_PENDING)
                        ->update(['status' => DaretPayment::STATUS_LATE]);

                    $lateCount += $updated;

                    DaretPayment::query()
                        ->whereIn('id', $latePaymentIds)
                        ->with('user')
                        ->get()
                        ->each(function (DaretPayment $payment) use ($cycle): void {
                            $this->notificationService->createNotification(
                                $payment->user_id,
                                'Solde insuffisant',
                                'Solde insuffisant pour votre contribution Daret. Veuillez alimenter votre compte pour payer votre contribution.',
                                Notification::TYPE_WARNING
                            );
                        });
                });
            });

        return $lateCount;
    }
}
