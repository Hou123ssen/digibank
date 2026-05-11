<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AccountService
{
    public function __construct(
        private readonly TransactionService $transactionService,
        private readonly TrustScoreService $trustScoreService
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

        return [
            'account_number' => $account->account_number,
            'balance' => $account->balance,
            'overdraft_limit' => $account->overdraft_limit,
            'available_balance' => number_format((float) $account->balance + (float) $account->overdraft_limit, 2, '.', ''),
            'status' => $account->status,
        ];
    }

    public function deposit(User $user, float $amount): array
    {
        $this->ensurePositiveAmount($amount, 'deposit');

        return DB::transaction(function () use ($user, $amount): array {
            $account = $this->lockUserAccount($user);
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
                description: 'Account deposit'
            );

            return [
                'account' => $account->fresh(),
                'transaction' => $transaction,
                'new_balance' => number_format($after, 2, '.', ''),
            ];
        });
    }

    public function withdraw(User $user, float $amount): Account
    {
        $this->ensurePositiveAmount($amount, 'withdraw');

        return DB::transaction(function () use ($user, $amount): Account {
            $account = $this->lockUserAccount($user);
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
                description: 'Account withdrawal'
            );

            if ($this->enteredOverdraft($before, $after)) {
                $this->trustScoreService->decrease($user, 5, 'Overdraft used', $transaction);
            }

            return $account->fresh();
        });
    }

    public function transfer(User $fromUser, string $toAccountNumber, float $amount): array
    {
        $this->ensurePositiveAmount($amount, 'transfer');

        return DB::transaction(function () use ($fromUser, $toAccountNumber, $amount): array {
            $fromAccount = $this->lockUserAccount($fromUser);
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
                description: 'Outgoing transfer'
            );

            $in = $this->transactionService->record(
                $toAccount,
                $toAccount->user,
                Transaction::TYPE_TRANSFER_IN,
                $amount,
                $toBefore,
                $toAfter,
                $fromAccount,
                description: 'Incoming transfer'
            );

            if ($this->enteredOverdraft($fromBefore, $fromAfter)) {
                $this->trustScoreService->decrease($fromUser, 5, 'Overdraft used', $out);
            }

            return [
                'from_account' => $fromAccount->fresh(),
                'to_account' => $toAccount->fresh(),
                'transfer_out_transaction' => $out,
                'transfer_in_transaction' => $in,
            ];
        });
    }

    private function getUserAccount(User $user): Account
    {
        return $user->account()->firstOrFail();
    }

    private function lockUserAccount(User $user): Account
    {
        return Account::where('user_id', $user->id)->lockForUpdate()->firstOrFail();
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

    private function generateAccountNumber(): string
    {
        do {
            $accountNumber = (string) random_int(1000000000, 9999999999);
        } while (Account::where('account_number', $accountNumber)->exists());

        return $accountNumber;
    }
}
