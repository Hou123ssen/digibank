<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Notification;
use App\Models\PaymentIntent;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
                'currency' => strtoupper((string) config('services.stripe.currency', 'mad')),
                'gateway' => $gateway,
                'gateway_reference' => $this->paymentGatewayService->makeReference($gateway),
                'idempotency_key' => $idempotencyKey,
                'status' => PaymentIntent::STATUS_PENDING,
                'metadata' => [
                    'mode' => 'sandbox',
                    'request' => $requestMeta,
                ],
            ]);

            $checkout = $gateway === PaymentIntent::GATEWAY_STRIPE
                ? $this->paymentGatewayService->createStripeCheckoutSession($intent)
                : [
                    'id' => $intent->gateway_reference,
                    'url' => $this->paymentGatewayService->createCheckoutUrl($intent),
                ];
            $checkoutUrl = $checkout['url'];
            $intent->update([
                'gateway_reference' => $checkout['id'],
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

    public function handleWebhook(array $event, string $rawPayload): ?PaymentIntent
    {
        $reference = (string) ($event['gateway_reference'] ?? $event['data']['gateway_reference'] ?? '');
        $gatewayStatus = (string) ($event['status'] ?? $event['type'] ?? '');

        if ($reference === '') {
            throw ValidationException::withMessages(['gateway_reference' => ['Gateway reference is required.']]);
        }

        return $this->processGatewayResult($reference, $this->statusFromGateway($gatewayStatus), $gatewayStatus, $rawPayload);
    }

    public function handleStripeEvent(array $event, string $rawPayload): ?PaymentIntent
    {
        $type = (string) ($event['type'] ?? '');
        $object = $event['data']['object'] ?? [];
        $refs = $this->stripeReferences($type, $object);

        Log::info('Stripe checkout session received', [
            'session_id' => $refs['session_id'],
            'stripe_payment_intent_id' => $refs['stripe_payment_intent_id'],
            'stripe_charge_id' => $refs['stripe_charge_id'],
            'event_type' => $type,
        ]);

        $status = match ($type) {
            'checkout.session.completed' => PaymentIntent::STATUS_PAID,
            'checkout.session.expired' => PaymentIntent::STATUS_CANCELLED,
            'checkout.session.async_payment_failed',
            'payment_intent.payment_failed',
            'charge.failed' => PaymentIntent::STATUS_FAILED,
            default => PaymentIntent::STATUS_FAILED,
        };

        return $this->processStripeGatewayResult(
            $refs,
            $status,
            $type,
            (string) ($event['id'] ?? ''),
            $this->failureReason($type, $object),
            $rawPayload
        );
    }

    private function processStripeGatewayResult(
        array $refs,
        string $targetStatus,
        string $gatewayStatus,
        ?string $stripeEventId,
        ?string $failureReason,
        string $rawPayload
    ): ?PaymentIntent {
        return DB::transaction(function () use ($refs, $targetStatus, $gatewayStatus, $stripeEventId, $failureReason, $rawPayload): ?PaymentIntent {
            $intent = $this->findStripePaymentIntent($refs);

            if (! $intent) {
                Log::warning('PaymentIntent not found for session id', [
                    'session_id' => $refs['session_id'],
                    'stripe_payment_intent_id' => $refs['stripe_payment_intent_id'],
                    'stripe_charge_id' => $refs['stripe_charge_id'],
                    'gateway_status' => $gatewayStatus,
                ]);

                $this->auditLogService->record('deposit.payment_intent.not_found', null, null, [
                    'session_id' => $refs['session_id'],
                    'stripe_payment_intent_id' => $refs['stripe_payment_intent_id'],
                    'stripe_charge_id' => $refs['stripe_charge_id'],
                    'stripe_event_id' => $stripeEventId,
                    'gateway_status' => $gatewayStatus,
                    'payload_hash' => hash('sha256', $rawPayload),
                ]);

                return null;
            }

            if ($intent->status !== PaymentIntent::STATUS_PENDING) {
                $this->fillStripeRefs($intent, $refs, $stripeEventId);
                $this->auditLogService->record('deposit.webhook.replayed', $intent, $intent->user_id, [
                    'gateway_status' => $gatewayStatus,
                    'current_status' => $intent->status,
                    'stripe_event_id' => $stripeEventId,
                    'payload_hash' => hash('sha256', $rawPayload),
                ]);

                return $intent->fresh();
            }

            if ($targetStatus !== PaymentIntent::STATUS_PAID) {
                $updates = $this->stripeRefUpdates($refs, $stripeEventId);
                $updates['status'] = $targetStatus;
                $updates['failure_reason'] = $failureReason;

                if ($targetStatus === PaymentIntent::STATUS_CANCELLED) {
                    $updates['cancelled_at'] = now();
                }

                if ($targetStatus === PaymentIntent::STATUS_FAILED) {
                    $updates['failed_at'] = now();
                }

                $intent->update($updates);

                $this->auditLogService->record('deposit.payment_intent.'.$targetStatus, $intent, $intent->user_id, [
                    'gateway_status' => $gatewayStatus,
                    'stripe_event_id' => $stripeEventId,
                    'failure_reason' => $failureReason,
                    'payload_hash' => hash('sha256', $rawPayload),
                ]);

                $this->notificationService->createNotification(
                    $intent->user_id,
                    $targetStatus === PaymentIntent::STATUS_CANCELLED ? 'Deposit cancelled' : 'Deposit failed',
                    $failureReason ?: 'Your Stripe deposit was not completed. No balance was credited.',
                    Notification::TYPE_WARNING
                );

                return $intent->fresh();
            }

            return $this->creditPaidStripeIntent($intent, $refs, $stripeEventId, $gatewayStatus, $rawPayload);
        });
    }

    private function processGatewayResult(string $reference, string $targetStatus, string $gatewayStatus, string $rawPayload): ?PaymentIntent
    {
        return DB::transaction(function () use ($rawPayload, $reference, $gatewayStatus, $targetStatus): ?PaymentIntent {
            $intent = PaymentIntent::query()
                ->where('gateway_reference', $reference)
                ->lockForUpdate()
                ->first();

            if (! $intent) {
                Log::warning('PaymentIntent not found for session id', [
                    'session_id' => $reference,
                    'gateway_status' => $gatewayStatus,
                ]);

                $this->auditLogService->record('deposit.payment_intent.not_found', null, null, [
                    'session_id' => $reference,
                    'gateway_status' => $gatewayStatus,
                    'payload_hash' => hash('sha256', $rawPayload),
                ]);

                return null;
            }

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

    private function creditPaidStripeIntent(
        PaymentIntent $intent,
        array $refs,
        ?string $stripeEventId,
        string $gatewayStatus,
        string $rawPayload
    ): PaymentIntent {
        $account = Account::query()
            ->whereKey($intent->account_id)
            ->lockForUpdate()
            ->firstOrFail();

        $before = (float) $account->balance;
        $amount = (float) $intent->amount;
        $after = $before + $amount;

        $account->update(['balance' => $after]);
        $intent->update(array_merge($this->stripeRefUpdates($refs, $stripeEventId), [
            'status' => PaymentIntent::STATUS_PAID,
            'paid_at' => now(),
            'failure_reason' => null,
        ]));

        $transaction = $this->transactionService->record(
            $account,
            $intent->user,
            Transaction::TYPE_DEPOSIT,
            $amount,
            $before,
            $after,
            status: Transaction::STATUS_SUCCESS,
            description: 'Stripe deposit',
            idempotencyKey: 'payment-intent-'.$intent->id,
            reference: $this->stripeTransactionReference($intent, $refs)
        );

        $this->notificationService->createNotification(
            $intent->user_id,
            'Deposit credited',
            'Your Stripe deposit has been credited to your account.',
            Notification::TYPE_SUCCESS
        );

        $this->auditLogService->record('deposit.payment_intent.paid', $intent, $intent->user_id, [
            'transaction_id' => $transaction->id,
            'balance_before' => $before,
            'balance_after' => $after,
            'gateway_status' => $gatewayStatus,
            'stripe_event_id' => $stripeEventId,
            'stripe_payment_intent_id' => $refs['stripe_payment_intent_id'],
            'stripe_charge_id' => $refs['stripe_charge_id'],
            'payload_hash' => hash('sha256', $rawPayload),
        ]);

        return $intent->fresh();
    }

    private function findStripePaymentIntent(array $refs): ?PaymentIntent
    {
        if (
            empty($refs['local_payment_intent_id'])
            && empty($refs['session_id'])
            && empty($refs['stripe_payment_intent_id'])
            && empty($refs['stripe_charge_id'])
        ) {
            return null;
        }

        return PaymentIntent::query()
            ->when($refs['local_payment_intent_id'], fn ($query, $id) => $query->orWhere('id', $id))
            ->when($refs['session_id'], fn ($query, $id) => $query->orWhere('gateway_reference', $id))
            ->when($refs['stripe_payment_intent_id'], fn ($query, $id) => $query->orWhere('stripe_payment_intent_id', $id))
            ->when($refs['stripe_charge_id'], fn ($query, $id) => $query->orWhere('stripe_charge_id', $id))
            ->lockForUpdate()
            ->first();
    }

    private function stripeReferences(string $type, array $object): array
    {
        $metadata = (array) ($object['metadata'] ?? []);
        $sessionId = str_starts_with($type, 'checkout.session.') ? (string) ($object['id'] ?? '') : null;
        $paymentIntent = $object['payment_intent'] ?? $object['id'] ?? null;
        $chargeId = $object['latest_charge'] ?? $object['charge'] ?? null;

        return [
            'session_id' => $sessionId,
            'stripe_payment_intent_id' => match (true) {
                $type === 'payment_intent.payment_failed' => (string) ($object['id'] ?? ''),
                is_string($paymentIntent) && $paymentIntent !== '' && str_starts_with($paymentIntent, 'pi_') => $paymentIntent,
                default => null,
            },
            'stripe_charge_id' => match (true) {
                str_starts_with($type, 'charge.') => (string) ($object['id'] ?? ''),
                is_string($chargeId) && $chargeId !== '' => $chargeId,
                default => null,
            },
            'local_payment_intent_id' => isset($metadata['payment_intent_id']) ? (int) $metadata['payment_intent_id'] : null,
        ];
    }

    private function stripeRefUpdates(array $refs, ?string $stripeEventId): array
    {
        return array_filter([
            'gateway_reference' => $refs['session_id'],
            'stripe_payment_intent_id' => $refs['stripe_payment_intent_id'],
            'stripe_charge_id' => $refs['stripe_charge_id'],
            'stripe_event_id' => $stripeEventId,
        ], fn ($value): bool => $value !== null && $value !== '');
    }

    private function fillStripeRefs(PaymentIntent $intent, array $refs, ?string $stripeEventId): void
    {
        $updates = $this->stripeRefUpdates($refs, $stripeEventId);

        if ($updates !== []) {
            $intent->update($updates);
        }
    }

    private function failureReason(string $type, array $object): ?string
    {
        if ($type === 'checkout.session.expired') {
            return 'Stripe Checkout session expired.';
        }

        $lastPaymentError = $object['last_payment_error'] ?? null;
        if (is_array($lastPaymentError) && ! empty($lastPaymentError['message'])) {
            return (string) $lastPaymentError['message'];
        }

        foreach (['failure_message', 'cancellation_reason'] as $key) {
            if (! empty($object[$key])) {
                return (string) $object[$key];
            }
        }

        $outcome = $object['outcome'] ?? null;
        if (is_array($outcome) && ! empty($outcome['seller_message'])) {
            return (string) $outcome['seller_message'];
        }

        return $type === 'charge.failed'
            ? 'Stripe charge failed.'
            : 'Stripe payment failed.';
    }

    private function stripeTransactionReference(PaymentIntent $intent, array $refs): string
    {
        $stripeRef = $refs['stripe_payment_intent_id'] ?: $refs['session_id'] ?: $intent->gateway_reference;

        return substr('STRIPE-'.$stripeRef, 0, 255);
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
        if ($gateway !== PaymentIntent::GATEWAY_STRIPE) {
            throw ValidationException::withMessages([
                'gateway' => ['Stripe is the only active payment gateway in test mode.'],
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
