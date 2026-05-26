<?php

namespace App\Services;

use App\Events\BalanceUpdated;
use App\Events\DepositCompleted;
use App\Events\DepositConfirmed;
use App\Events\TransactionCreated;
use App\Events\TransferCompleted;
use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AccountService
{
    public function __construct(
        private readonly TransactionService $transactionService,
        private readonly TrustScoreService $trustScoreService,
        private readonly RealtimeBroadcastService $realtimeBroadcastService
    ) {}

    public function createAccountForUser(User $user): Account
    {
        return Account::firstOrCreate(
            ['user_id' => $user->id],
            [
                'account_number' => $this->generateAccountNumber(),
                'balance' => 0,
                'overdraft_limit' => 0,
                'status' => Account::STATUS_ACTIVE,
            ]
        );
    }

    public function getBalance(User $user): array
    {
        $account = $this->getUserAccount($user);
        $ledger = $this->ledgerConsistency($account);

        return [
            'account_number' => $account->account_number,
            'balance' => $account->balance,
            'overdraft_limit' => $account->overdraft_limit,
            'available_balance' => number_format((float) $account->balance + (float) $account->overdraft_limit, 2, '.', ''),
            'status' => $account->status,
            'ledger' => $ledger,
        ];
    }

    public function deposit(User $user, float $amount, ?string $idempotencyKey = null): array
    {
        $this->ensurePositiveAmount($amount, 'deposit');

        return DB::transaction(function () use ($user, $amount, $idempotencyKey): array {
            $account = $this->lockUserAccount($user);
            $this->ensureActiveAccount($account);

            if ($existing = $this->existingIdempotentTransaction($account, $idempotencyKey, Transaction::TYPE_DEPOSIT)) {
                return $this->idempotentAccountResult($account, $existing);
            }

            $before = (float) $account->balance;
            $after = $before + $amount;

            $account->update(['balance' => $after]);

            $transaction = $this->transactionService->record(
                $account,
                $user,
                Transaction::TYPE_DEPOSIT,
                $amount,
                $before,
                $after,
                description: 'Account deposit',
                idempotencyKey: $idempotencyKey
            );

            $this->broadcastDepositEvents($user->id, $account, $transaction);

            return [
                'account' => $account->fresh(),
                'transaction' => $transaction,
                'new_balance' => number_format($after, 2, '.', ''),
            ];
        });
    }

    public function withdraw(User $user, float $amount, ?string $idempotencyKey = null): array
    {
        $this->ensurePositiveAmount($amount, 'withdraw');

        return DB::transaction(function () use ($user, $amount, $idempotencyKey): array {
            $account = $this->lockUserAccount($user);
            $this->ensureActiveAccount($account);

            if ($existing = $this->existingIdempotentTransaction($account, $idempotencyKey, Transaction::TYPE_WITHDRAW)) {
                return $this->idempotentAccountResult($account, $existing);
            }

            $this->ensureSufficientFunds($account, $amount);

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
                description: 'Account withdrawal',
                idempotencyKey: $idempotencyKey
            );

            if ($this->enteredOverdraft($before, $after)) {
                $this->trustScoreService->decrease($user, 5, 'Overdraft used', $transaction);
            }

            return [
                'account' => $account->fresh(),
                'transaction' => $transaction,
                'new_balance' => number_format($after, 2, '.', ''),
            ];
        });
    }

    public function transfer(User $fromUser, string $toAccountNumber, float $amount, ?string $idempotencyKey = null): array
    {
        $this->ensurePositiveAmount($amount, 'transfer');

        return DB::transaction(function () use ($fromUser, $toAccountNumber, $amount, $idempotencyKey): array {
            $fromAccount = $this->lockUserAccount($fromUser);
            $this->ensureActiveAccount($fromAccount);

            if ($existingOut = $this->existingIdempotentTransaction($fromAccount, $idempotencyKey, Transaction::TYPE_TRANSFER_OUT)) {
                $existingIn = Transaction::query()
                    ->where('idempotency_key', $idempotencyKey)
                    ->where('type', Transaction::TYPE_TRANSFER_IN)
                    ->where('related_account_id', $fromAccount->id)
                    ->first();

                return [
                    'from_account' => $fromAccount->fresh(),
                    'to_account' => $existingOut->relatedAccount?->fresh(),
                    'transfer_out_transaction' => $existingOut,
                    'transfer_in_transaction' => $existingIn,
                    'new_balance' => number_format((float) $existingOut->balance_after, 2, '.', ''),
                    'idempotent' => true,
                ];
            }

            $toAccount = Account::query()
                ->where('account_number', $toAccountNumber)
                ->lockForUpdate()
                ->first();

            if (! $toAccount) {
                throw ValidationException::withMessages([
                    'account_number' => ['Destination account was not found.'],
                ]);
            }

            if ($fromAccount->id === $toAccount->id) {
                throw ValidationException::withMessages([
                    'account_number' => ['You cannot transfer to your own account.'],
                ]);
            }

            $this->ensureActiveAccount($toAccount, 'Destination account is not active.');
            $this->ensureSufficientFunds($fromAccount, $amount);

            $fromBefore = (float) $fromAccount->balance;
            $fromAfter = $fromBefore - $amount;
            $toBefore = (float) $toAccount->balance;
            $toAfter = $toBefore + $amount;

            $fromAccount->update(['balance' => $fromAfter]);
            $toAccount->update(['balance' => $toAfter]);

            $out = $this->transactionService->record(
                $fromAccount,
                $fromUser,
                Transaction::TYPE_TRANSFER_OUT,
                $amount,
                $fromBefore,
                $fromAfter,
                $toAccount,
                description: 'Outgoing transfer',
                idempotencyKey: $idempotencyKey
            );

            $in = $this->transactionService->record(
                $toAccount,
                $toAccount->user,
                Transaction::TYPE_TRANSFER_IN,
                $amount,
                $toBefore,
                $toAfter,
                $fromAccount,
                description: 'Incoming transfer',
                idempotencyKey: $idempotencyKey
            );

            if ($this->enteredOverdraft($fromBefore, $fromAfter)) {
                $this->trustScoreService->decrease($fromUser, 5, 'Overdraft used', $out);
            }

            $this->broadcastTransferEvents($fromUser->id, $fromAccount, $out, 'outgoing');
            $this->broadcastTransferEvents($toAccount->user_id, $toAccount, $in, 'incoming');

            return [
                'from_account' => $fromAccount->fresh(),
                'to_account' => $toAccount->fresh(),
                'transfer_out_transaction' => $out,
                'transfer_in_transaction' => $in,
                'new_balance' => number_format($fromAfter, 2, '.', ''),
            ];
        });
    }

    public function ledgerConsistency(Account $account): array
    {
        $delta = $account->transactions()
            ->where('status', Transaction::STATUS_SUCCESS)
            ->get()
            ->sum(fn (Transaction $transaction): float => $this->signedLedgerAmount($transaction));

        $expected = round((float) $delta, 2);
        $actual = round((float) $account->balance, 2);

        return [
            'expected_balance' => number_format($expected, 2, '.', ''),
            'actual_balance' => number_format($actual, 2, '.', ''),
            'difference' => number_format(round($actual - $expected, 2), 2, '.', ''),
            'is_consistent' => abs($actual - $expected) < 0.01,
        ];
    }

    private function getUserAccount(User $user): Account
    {
        return $user->account()->firstOrFail();
    }

    private function lockUserAccount(User $user): Account
    {
        return Account::where('user_id', $user->id)->lockForUpdate()->firstOrFail();
    }

    private function ensureActiveAccount(Account $account, string $message = 'Account is not active.'): void
    {
        if ($account->status !== Account::STATUS_ACTIVE) {
            throw ValidationException::withMessages([
                'account' => [$message],
            ]);
        }
    }

    private function ensurePositiveAmount(float $amount, string $operation): void
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => ["The {$operation} amount must be greater than 0."],
            ]);
        }
    }

    private function ensureSufficientFunds(Account $account, float $amount): void
    {
        $available = (float) $account->balance + (float) $account->overdraft_limit;

        if ($amount > $available) {
            throw ValidationException::withMessages([
                'amount' => ['Insufficient funds. Overdraft limit exceeded.'],
            ]);
        }
    }

    private function enteredOverdraft(float $balanceBefore, float $balanceAfter): bool
    {
        return $balanceBefore >= 0 && $balanceAfter < 0;
    }

    private function existingIdempotentTransaction(Account $account, ?string $idempotencyKey, string $type): ?Transaction
    {
        if (! $idempotencyKey) {
            return null;
        }

        return Transaction::query()
            ->where('account_id', $account->id)
            ->where('idempotency_key', $idempotencyKey)
            ->where('type', $type)
            ->first();
    }

    private function idempotentAccountResult(Account $account, Transaction $transaction): array
    {
        return [
            'account' => $account->fresh(),
            'transaction' => $transaction,
            'new_balance' => number_format((float) $transaction->balance_after, 2, '.', ''),
            'idempotent' => true,
        ];
    }

    private function signedLedgerAmount(Transaction $transaction): float
    {
        $amount = abs((float) $transaction->amount);

        return match ($transaction->type) {
            Transaction::TYPE_DEPOSIT,
            Transaction::TYPE_TRANSFER_IN,
            Transaction::TYPE_DARET_PAYOUT => $amount,
            Transaction::TYPE_WITHDRAW,
            Transaction::TYPE_TRANSFER_OUT,
            Transaction::TYPE_DARET_CONTRIBUTION,
            Transaction::TYPE_REFUND => -$amount,
            default => (float) $transaction->amount,
        };
    }

    private function broadcastDepositEvents(int $userId, Account $account, Transaction $transaction): void
    {
        $this->realtimeBroadcastService->afterCommit(
            fn () => new DepositCompleted($userId, $account->fresh(), $transaction->fresh(['account', 'relatedAccount'])),
            'deposit.completed',
            ['user_id' => $userId, 'transaction_id' => $transaction->id]
        );

        $this->realtimeBroadcastService->afterCommit(
            fn () => new DepositConfirmed($userId, $account->fresh(), $transaction->fresh(['account', 'relatedAccount'])),
            'deposit.confirmed',
            ['user_id' => $userId, 'transaction_id' => $transaction->id]
        );

        $this->realtimeBroadcastService->afterCommit(
            fn () => new TransactionCreated($userId, $transaction->fresh(['account', 'relatedAccount'])),
            'transaction.created',
            ['user_id' => $userId, 'transaction_id' => $transaction->id]
        );

        $this->realtimeBroadcastService->afterCommit(
            fn () => new BalanceUpdated($userId, $account->fresh()),
            'balance.updated',
            ['user_id' => $userId, 'account_id' => $account->id]
        );
    }

    private function broadcastTransferEvents(int $userId, Account $account, Transaction $transaction, string $direction): void
    {
        $context = [
            'user_id' => $userId,
            'account_id' => $account->id,
            'transaction_id' => $transaction->id,
            'direction' => $direction,
        ];

        $this->realtimeBroadcastService->afterCommit(
            fn () => new TransferCompleted($userId, $account->fresh(), $transaction->fresh(['account', 'relatedAccount']), $direction),
            'transfer.completed',
            $context
        );

        $this->realtimeBroadcastService->afterCommit(
            fn () => new TransactionCreated($userId, $transaction->fresh(['account', 'relatedAccount'])),
            'transaction.created',
            $context
        );

        $this->realtimeBroadcastService->afterCommit(
            fn () => new BalanceUpdated($userId, $account->fresh()),
            'balance.updated',
            $context
        );
    }

    private function generateAccountNumber(): string
    {
        do {
            $accountNumber = (string) random_int(1000000000, 9999999999);
        } while (Account::where('account_number', $accountNumber)->exists());

        return $accountNumber;
    }
}
