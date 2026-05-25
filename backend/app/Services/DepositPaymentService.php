<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Notification;
use App\Models\PaymentIntent;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DepositPaymentService
{
    public function __construct(
        private readonly TransactionService $transactionService,
        private readonly NotificationService $notificationService,
        private readonly AuditLogService $auditLogService,
        private readonly PaymentGatewayService $paymentGatewayService
    ) {
    }

    public function createIntent(User $user, float $amount, string $gateway, ?string $idempotencyKey = null, array $requestMeta = []): array
    {
        $this->validateAmount($amount);
        $this->validateGateway($gateway);

        return DB::transaction(function () use ($user, $amount, $gateway, $idempotencyKey, $requestMeta): array {
            $account = Account::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($account->status !== Account::STATUS_ACTIVE) {
                throw ValidationException::withMessages(['account' => ['Account is not active.']]);
            }

            if ($idempotencyKey) {
                $existing = PaymentIntent::query()
                    ->where('user_id', $user->id)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existing) {
                    return [
                        'payment_intent' => $existing,
                        'checkout_url' => $existing->metadata['checkout_url'] ?? $this->paymentGatewayService->createCheckoutUrl($existing),
                        'idempotent' => true,
                    ];
                }
            }

            $intent = PaymentIntent::create([
                'user_id' => $user->id,
                'account_id' => $account->id,
                'amount' => $amount,
                'currency' => 'MAD',
                'gateway' => $gateway,
                'gateway_reference' => $this->paymentGatewayService->makeReference($gateway),
                'idempotency_key' => $idempotencyKey,
                'status' => PaymentIntent::STATUS_PENDING,
                'metadata' => [
                    'mode' => 'sandbox',
                    'request' => $requestMeta,
                ],
            ]);

            $checkoutUrl = $this->paymentGatewayService->createCheckoutUrl($intent);
            $intent->update([
                'metadata' => array_merge($intent->metadata ?? [], ['checkout_url' => $checkoutUrl]),
            ]);

            $this->auditLogService->record('deposit.payment_intent.created', $intent, $user->id, [
                'amount' => $intent->amount,
                'currency' => $intent->currency,
                'gateway' => $intent->gateway,
                'gateway_reference' => $intent->gateway_reference,
            ], $requestMeta['ip_address'] ?? null, $requestMeta['user_agent'] ?? null);

            return [
                'payment_intent' => $intent->fresh(),
                'checkout_url' => $checkoutUrl,
                'idempotent' => false,
            ];
        });
    }

    public function handleWebhook(array $event, string $rawPayload): PaymentIntent
    {
        $reference = (string) ($event['gateway_reference'] ?? $event['data']['gateway_reference'] ?? '');
        $gatewayStatus = (string) ($event['status'] ?? $event['type'] ?? '');

        if ($reference === '') {
            throw ValidationException::withMessages(['gateway_reference' => ['Gateway reference is required.']]);
        }

        return DB::transaction(function () use ($event, $rawPayload, $reference, $gatewayStatus): PaymentIntent {
            $intent = PaymentIntent::query()
                ->where('gateway_reference', $reference)
                ->lockForUpdate()
                ->firstOrFail();

            $targetStatus = $this->statusFromGateway($gatewayStatus);

            if ($intent->status !== PaymentIntent::STATUS_PENDING) {
                $this->auditLogService->record('deposit.webhook.replayed', $intent, $intent->user_id, [
                    'gateway_status' => $gatewayStatus,
                    'current_status' => $intent->status,
                    'payload_hash' => hash('sha256', $rawPayload),
                ]);

                return $intent->fresh();
            }

            if ($targetStatus !== PaymentIntent::STATUS_PAID) {
                $intent->update(['status' => $targetStatus]);
                $this->auditLogService->record('deposit.payment_intent.'.$targetStatus, $intent, $intent->user_id, [
                    'gateway_status' => $gatewayStatus,
                    'payload_hash' => hash('sha256', $rawPayload),
                ]);

                return $intent->fresh();
            }

            $account = Account::query()
                ->whereKey($intent->account_id)
                ->lockForUpdate()
                ->firstOrFail();

            $before = (float) $account->balance;
            $amount = (float) $intent->amount;
            $after = $before + $amount;

            $account->update(['balance' => $after]);
            $intent->update([
                'status' => PaymentIntent::STATUS_PAID,
                'paid_at' => now(),
            ]);

            $transaction = $this->transactionService->record(
                $account,
                $intent->user,
                Transaction::TYPE_DEPOSIT,
                $amount,
                $before,
                $after,
                status: Transaction::STATUS_SUCCESS,
                description: 'Secure gateway deposit',
                idempotencyKey: 'payment-intent-'.$intent->id
            );

            $this->notificationService->createNotification(
                $intent->user_id,
                'Deposit credited',
                'Your secure payment deposit has been credited to your account.',
                Notification::TYPE_SUCCESS
            );

            $this->auditLogService->record('deposit.payment_intent.paid', $intent, $intent->user_id, [
                'transaction_id' => $transaction->id,
                'balance_before' => $before,
                'balance_after' => $after,
                'payload_hash' => hash('sha256', $rawPayload),
            ]);

            return $intent->fresh();
        });
    }

    private function validateAmount(float $amount): void
    {
        $min = (float) config('services.payment_gateway.min_amount', 10);
        $max = (float) config('services.payment_gateway.max_amount', 50000);

        if ($amount < $min || $amount > $max) {
            throw ValidationException::withMessages([
                'amount' => ["The deposit amount must be between {$min} and {$max} MAD."],
            ]);
        }
    }

    private function validateGateway(string $gateway): void
    {
        if (! in_array($gateway, [PaymentIntent::GATEWAY_STRIPE, PaymentIntent::GATEWAY_CMI, PaymentIntent::GATEWAY_BANK], true)) {
            throw ValidationException::withMessages([
                'gateway' => ['Unsupported payment gateway.'],
            ]);
        }
    }

    private function statusFromGateway(string $status): string
    {
        return match ($status) {
            'paid', 'payment_intent.succeeded', 'checkout.session.completed', 'success' => PaymentIntent::STATUS_PAID,
            'cancelled', 'canceled', 'payment_intent.canceled' => PaymentIntent::STATUS_CANCELLED,
            default => PaymentIntent::STATUS_FAILED,
        };
    }
}
