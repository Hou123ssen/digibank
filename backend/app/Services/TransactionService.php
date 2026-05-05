<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Str;

class TransactionService
{
    public function record(
        Account $account,
        User $user,
        string $type,
        float $amount,
        float $balanceBefore,
        float $balanceAfter,
        ?Account $relatedAccount = null,
        string $status = Transaction::STATUS_SUCCESS,
        ?string $description = null
    ): Transaction {
        $overdraftAmount = $balanceAfter < 0 ? abs($balanceAfter) : null;

        return Transaction::create([
            'account_id' => $account->id,
            'related_account_id' => $relatedAccount?->id,
            'user_id' => $user->id,
            'type' => $type,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'status' => $status,
            'reference' => $this->makeReference(),
            'description' => $description,
            'is_overdraft' => $overdraftAmount !== null,
            'overdraft_amount' => $overdraftAmount,
        ]);
    }

    private function makeReference(): string
    {
        do {
            $reference = 'TXN-'.now()->format('YmdHis').'-'.Str::upper(Str::random(8));
        } while (Transaction::where('reference', $reference)->exists());

        return $reference;
    }
}
