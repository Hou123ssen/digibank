<?php

namespace App\Events\Concerns;

use App\Models\Account;
use App\Models\Notification;
use App\Models\PaymentIntent;
use App\Models\Transaction;

trait FormatsRealtimePayloads
{
    protected function accountPayload(Account $account): array
    {
        return [
            'id' => $account->id,
            'account_number' => $account->account_number,
            'balance' => $account->balance,
            'overdraft_limit' => $account->overdraft_limit,
            'available_balance' => number_format((float) $account->balance + (float) $account->overdraft_limit, 2, '.', ''),
            'status' => $account->status,
            'updated_at' => $account->updated_at,
        ];
    }

    protected function transactionPayload(Transaction $transaction): array
    {
        $transaction->loadMissing(['account:id,account_number,balance', 'relatedAccount:id,account_number']);
        $signedAmount = $this->signedAmount($transaction);

        return [
            'id' => $transaction->id,
            'account_id' => $transaction->account_id,
            'account_number' => $transaction->account?->account_number,
            'related_account_number' => $transaction->relatedAccount?->account_number,
            'type' => $transaction->type,
            'amount' => $transaction->amount,
            'signed_amount' => round($signedAmount, 2),
            'balance_before' => $transaction->balance_before,
            'balance_after' => $transaction->balance_after,
            'running_balance' => $transaction->balance_after,
            'status' => $transaction->status,
            'reference' => $transaction->reference,
            'description' => $transaction->description,
            'is_overdraft' => $transaction->is_overdraft,
            'overdraft_amount' => $transaction->overdraft_amount,
            'created_at' => $transaction->created_at,
        ];
    }

    protected function notificationPayload(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'user_id' => $notification->user_id,
            'title' => $notification->title,
            'message' => $notification->message,
            'type' => $notification->type,
            'is_read' => $notification->is_read,
            'created_at' => $notification->created_at,
        ];
    }

    protected function paymentIntentPayload(PaymentIntent $paymentIntent): array
    {
        return [
            'id' => $paymentIntent->id,
            'amount' => $paymentIntent->amount,
            'currency' => $paymentIntent->currency,
            'gateway' => $paymentIntent->gateway,
            'gateway_reference' => $paymentIntent->gateway_reference,
            'status' => $paymentIntent->status,
            'stripe_payment_intent_id' => $paymentIntent->stripe_payment_intent_id,
            'stripe_charge_id' => $paymentIntent->stripe_charge_id,
            'stripe_event_id' => $paymentIntent->stripe_event_id,
            'paid_at' => $paymentIntent->paid_at,
            'updated_at' => $paymentIntent->updated_at,
        ];
    }

    private function signedAmount(Transaction $transaction): float
    {
        $amount = abs((float) $transaction->amount);

        return in_array($transaction->type, [
            Transaction::TYPE_DEPOSIT,
            Transaction::TYPE_TRANSFER_IN,
            Transaction::TYPE_DARET_PAYOUT,
        ], true) ? $amount : -$amount;
    }
}
