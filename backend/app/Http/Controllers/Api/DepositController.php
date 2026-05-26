<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreatePaymentIntentRequest;
use App\Models\AuditLog;
use App\Models\PaymentIntent;
use App\Models\Refund;
use App\Models\Transaction;
use App\Services\DepositPaymentService;
use App\Services\PaymentGatewayService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepositController extends Controller
{
    public function __construct(
        private readonly DepositPaymentService $depositPaymentService,
        private readonly PaymentGatewayService $paymentGatewayService
    ) {
    }

    public function createPaymentIntent(CreatePaymentIntentRequest $request)
    {
        $result = $this->depositPaymentService->createIntent(
            $request->user(),
            (float) $request->validated('amount'),
            $request->validated('gateway'),
            $this->idempotencyKey($request),
            [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]
        );

        return ApiResponse::success('Payment intent created.', [
            'checkout_url' => $result['checkout_url'],
            'payment_intent_id' => $result['payment_intent']->id,
            'status' => $result['payment_intent']->status,
            'idempotent' => $result['idempotent'],
        ], 201);
    }

    public function status(Request $request, PaymentIntent $paymentIntent)
    {
        if ($paymentIntent->user_id !== $request->user()->id) {
            return ApiResponse::error('Payment intent not found.', [], 404);
        }

        return ApiResponse::success('Payment intent status retrieved.', [
            'payment_intent_id' => $paymentIntent->id,
            'status' => $paymentIntent->status,
            'amount' => $paymentIntent->amount,
            'currency' => $paymentIntent->currency,
            'gateway' => $paymentIntent->gateway,
            'gateway_reference' => $paymentIntent->gateway_reference,
            'stripe_payment_intent_id' => $paymentIntent->stripe_payment_intent_id,
            'stripe_charge_id' => $paymentIntent->stripe_charge_id,
            'stripe_event_id' => $paymentIntent->stripe_event_id,
            'failure_reason' => $paymentIntent->failure_reason,
            'paid_at' => $paymentIntent->paid_at,
            'cancelled_at' => $paymentIntent->cancelled_at,
            'failed_at' => $paymentIntent->failed_at,
        ]);
    }

    public function adminPayments(Request $request)
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in([
                PaymentIntent::STATUS_PENDING,
                PaymentIntent::STATUS_PAID,
                PaymentIntent::STATUS_FAILED,
                PaymentIntent::STATUS_CANCELLED,
            ])],
            'search' => ['nullable', 'string', 'max:120'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'amount_min' => ['nullable', 'numeric', 'min:0'],
            'amount_max' => ['nullable', 'numeric', 'gte:amount_min'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'account_id' => ['nullable', 'integer', 'exists:accounts,id'],
            'sort_by' => ['nullable', Rule::in(['created_at', 'paid_at', 'amount', 'status'])],
            'sort_dir' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';
        $perPage = (int) ($filters['per_page'] ?? 10);

        $payments = PaymentIntent::query()
            ->with(['user:id,name,email', 'account:id,user_id,account_number'])
            ->tap(fn (Builder $query) => $this->applyAdminPaymentFilters($query, $filters))
            ->when($filters['user_id'] ?? null, fn ($query, int $userId) => $query->where('user_id', $userId))
            ->when($filters['account_id'] ?? null, fn ($query, int $accountId) => $query->where('account_id', $accountId))
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (PaymentIntent $paymentIntent): array => [
                'id' => $paymentIntent->id,
                'user' => $paymentIntent->user ? [
                    'id' => $paymentIntent->user->id,
                    'name' => $paymentIntent->user->name,
                    'email' => $paymentIntent->user->email,
                ] : null,
                'account' => $paymentIntent->account ? [
                    'id' => $paymentIntent->account->id,
                    'account_number' => $paymentIntent->account->account_number,
                ] : null,
                'amount' => $paymentIntent->amount,
                'currency' => $paymentIntent->currency,
                'status' => $paymentIntent->status,
                'gateway' => $paymentIntent->gateway,
                'gateway_reference' => $paymentIntent->gateway_reference,
                'stripe_payment_intent_id' => $paymentIntent->stripe_payment_intent_id,
                'stripe_charge_id' => $paymentIntent->stripe_charge_id,
                'stripe_event_id' => $paymentIntent->stripe_event_id,
                'failure_reason' => $paymentIntent->failure_reason,
                'created_at' => $paymentIntent->created_at,
                'paid_at' => $paymentIntent->paid_at,
                'cancelled_at' => $paymentIntent->cancelled_at,
                'failed_at' => $paymentIntent->failed_at,
            ]);

        return ApiResponse::success('Payment intents retrieved.', [
            'payments' => $payments,
        ]);
    }

    public function adminPaymentsSummary(Request $request)
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in([
                PaymentIntent::STATUS_PENDING,
                PaymentIntent::STATUS_PAID,
                PaymentIntent::STATUS_FAILED,
                PaymentIntent::STATUS_CANCELLED,
            ])],
            'search' => ['nullable', 'string', 'max:120'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'amount_min' => ['nullable', 'numeric', 'min:0'],
            'amount_max' => ['nullable', 'numeric', 'gte:amount_min'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $perPage = (int) ($filters['per_page'] ?? 10);

        $summaries = PaymentIntent::query()
            ->select([
                'payment_intents.user_id',
                'payment_intents.account_id',
                DB::raw('COUNT(*) as total_payments_count'),
                DB::raw("SUM(CASE WHEN payment_intents.status = '".PaymentIntent::STATUS_PAID."' THEN payment_intents.amount ELSE 0 END) as total_paid_amount"),
                DB::raw("SUM(CASE WHEN payment_intents.status = '".PaymentIntent::STATUS_PENDING."' THEN 1 ELSE 0 END) as pending_count"),
                DB::raw("SUM(CASE WHEN payment_intents.status = '".PaymentIntent::STATUS_FAILED."' THEN 1 ELSE 0 END) as failed_count"),
                DB::raw('MAX(payment_intents.created_at) as last_payment_date'),
            ])
            ->with(['user:id,name,email', 'account:id,user_id,account_number'])
            ->tap(fn (Builder $query) => $this->applyAdminPaymentFilters($query, $filters))
            ->groupBy('payment_intents.user_id', 'payment_intents.account_id')
            ->orderByDesc(DB::raw('MAX(payment_intents.created_at)'))
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (PaymentIntent $summary): array => [
                'user' => $summary->user ? [
                    'id' => $summary->user->id,
                    'name' => $summary->user->name,
                    'email' => $summary->user->email,
                ] : null,
                'account' => $summary->account ? [
                    'id' => $summary->account->id,
                    'account_number' => $summary->account->account_number,
                ] : null,
                'total_payments_count' => (int) $summary->total_payments_count,
                'total_paid_amount' => number_format((float) $summary->total_paid_amount, 2, '.', ''),
                'pending_count' => (int) $summary->pending_count,
                'failed_count' => (int) $summary->failed_count,
                'last_payment_date' => $summary->last_payment_date,
            ]);

        return ApiResponse::success('Payment summaries retrieved.', [
            'summaries' => $summaries,
        ]);
    }

    public function adminPaymentDetails(PaymentIntent $paymentIntent)
    {
        $paymentIntent->load([
            'user:id,name,email',
            'account:id,user_id,account_number,balance,status',
            'refunds' => fn ($query) => $query->latest(),
            'refunds.transaction:id,type,amount,status,reference,description,balance_before,balance_after,created_at',
        ]);

        $transaction = Transaction::query()
            ->where(function ($query) use ($paymentIntent): void {
                $query->where('idempotency_key', 'payment-intent-'.$paymentIntent->id);

                if ($paymentIntent->stripe_payment_intent_id) {
                    $query->orWhere('reference', 'STRIPE-'.$paymentIntent->stripe_payment_intent_id);
                }

                if ($paymentIntent->gateway_reference) {
                    $query->orWhere('reference', 'STRIPE-'.$paymentIntent->gateway_reference);
                }
            })
            ->latest()
            ->first();

        $auditLogs = AuditLog::query()
            ->where('auditable_type', PaymentIntent::class)
            ->where('auditable_id', $paymentIntent->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (AuditLog $log): array => [
                'id' => $log->id,
                'event' => $log->event,
                'metadata' => $log->metadata,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'created_at' => $log->created_at,
            ]);

        return ApiResponse::success('Payment intent details retrieved.', [
            'payment_intent' => [
                'id' => $paymentIntent->id,
                'amount' => $paymentIntent->amount,
                'currency' => $paymentIntent->currency,
                'status' => $paymentIntent->status,
                'gateway' => $paymentIntent->gateway,
                'gateway_reference' => $paymentIntent->gateway_reference,
                'stripe_payment_intent_id' => $paymentIntent->stripe_payment_intent_id,
                'stripe_charge_id' => $paymentIntent->stripe_charge_id,
                'stripe_event_id' => $paymentIntent->stripe_event_id,
                'failure_reason' => $paymentIntent->failure_reason,
                'metadata' => $paymentIntent->metadata,
                'created_at' => $paymentIntent->created_at,
                'updated_at' => $paymentIntent->updated_at,
                'paid_at' => $paymentIntent->paid_at,
                'cancelled_at' => $paymentIntent->cancelled_at,
                'failed_at' => $paymentIntent->failed_at,
                'refundable_amount' => $this->depositPaymentService->refundableAmount($paymentIntent),
            ],
            'user' => $paymentIntent->user ? [
                'id' => $paymentIntent->user->id,
                'name' => $paymentIntent->user->name,
                'email' => $paymentIntent->user->email,
            ] : null,
            'account' => $paymentIntent->account ? [
                'id' => $paymentIntent->account->id,
                'account_number' => $paymentIntent->account->account_number,
                'balance' => $paymentIntent->account->balance,
                'status' => $paymentIntent->account->status,
            ] : null,
            'transaction' => $transaction ? [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'amount' => $transaction->amount,
                'status' => $transaction->status,
                'reference' => $transaction->reference,
                'idempotency_key' => $transaction->idempotency_key,
                'description' => $transaction->description,
                'balance_before' => $transaction->balance_before,
                'balance_after' => $transaction->balance_after,
                'created_at' => $transaction->created_at,
            ] : null,
            'audit_logs' => $auditLogs,
            'refunds' => $paymentIntent->refunds->map(fn (Refund $refund): array => [
                'id' => $refund->id,
                'amount' => $refund->amount,
                'currency' => $refund->currency,
                'status' => $refund->status,
                'reason' => $refund->reason,
                'failure_reason' => $refund->failure_reason,
                'stripe_refund_id' => $refund->stripe_refund_id,
                'stripe_charge_id' => $refund->stripe_charge_id,
                'processed_at' => $refund->processed_at,
                'created_at' => $refund->created_at,
                'transaction' => $refund->transaction ? [
                    'id' => $refund->transaction->id,
                    'type' => $refund->transaction->type,
                    'amount' => $refund->transaction->amount,
                    'status' => $refund->transaction->status,
                    'reference' => $refund->transaction->reference,
                    'description' => $refund->transaction->description,
                    'balance_before' => $refund->transaction->balance_before,
                    'balance_after' => $refund->transaction->balance_after,
                    'created_at' => $refund->transaction->created_at,
                ] : null,
            ]),
        ]);
    }

    public function refund(Request $request, PaymentIntent $paymentIntent)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $refund = $this->depositPaymentService->requestRefund(
            $paymentIntent,
            $request->user(),
            (float) $validated['amount'],
            $validated['reason'] ?? null
        );

        return ApiResponse::success('Refund requested.', [
            'refund' => [
                'id' => $refund->id,
                'payment_intent_id' => $refund->payment_intent_id,
                'amount' => $refund->amount,
                'currency' => $refund->currency,
                'status' => $refund->status,
                'reason' => $refund->reason,
                'stripe_refund_id' => $refund->stripe_refund_id,
                'stripe_charge_id' => $refund->stripe_charge_id,
                'failure_reason' => $refund->failure_reason,
                'processed_at' => $refund->processed_at,
                'created_at' => $refund->created_at,
            ],
        ], 201);
    }

    public function stripeSessionStatus(Request $request, PaymentIntent $paymentIntent)
    {
        if ($paymentIntent->user_id !== $request->user()->id) {
            return ApiResponse::error('Payment intent not found.', [], 404);
        }

        try {
            $stripeSession = $this->paymentGatewayService->retrieveStripeSessionStatus($paymentIntent);
        } catch (\Throwable $e) {
            \Log::warning('Unable to retrieve Stripe Checkout Session status', [
                'payment_intent_id' => $paymentIntent->id,
                'session_id' => $paymentIntent->gateway_reference,
                'error' => $e->getMessage(),
                'stripe_diagnostics' => $this->paymentGatewayService->stripeDiagnostics(),
            ]);

            return ApiResponse::error('Unable to retrieve Stripe session status.', [
                'stripe' => [$e->getMessage()],
                'diagnostics' => $this->paymentGatewayService->stripeDiagnostics(),
            ], 502);
        }

        return ApiResponse::success('Stripe session status retrieved.', [
            'payment_intent_id' => $paymentIntent->id,
            'local_status' => $paymentIntent->status,
            'gateway_reference' => $paymentIntent->gateway_reference,
            'stripe_session' => $stripeSession,
            'diagnostics' => $this->paymentGatewayService->stripeDiagnostics(),
            'listener_forward_to' => 'http://127.0.0.1:8001/api/webhooks/stripe',
        ]);
    }

    public function sandboxConfirm(Request $request, PaymentIntent $paymentIntent)
    {
        if (config('app.env') !== 'local' || ! (bool) config('services.payment_gateway.allow_sandbox_confirmation')) {
            return ApiResponse::error('Sandbox payment confirmation is disabled.', [], 404);
        }

        if ($paymentIntent->user_id !== $request->user()->id) {
            return ApiResponse::error('Payment intent not found.', [], 404);
        }

        $payload = json_encode([
            'gateway_reference' => $paymentIntent->gateway_reference,
            'status' => 'paid',
            'sandbox' => true,
        ], JSON_THROW_ON_ERROR);

        $signature = hash_hmac('sha256', $payload, (string) config('services.payment_gateway.webhook_secret'));

        if (! $this->paymentGatewayService->verifySignature($payload, $signature)) {
            return ApiResponse::error('Invalid payment gateway signature.', [], 401);
        }

        $intent = $this->depositPaymentService->handleWebhook(json_decode($payload, true), $payload);

        if (! $intent) {
            return ApiResponse::success('Sandbox webhook processed with no matching payment intent.', [
                'payment_intent_id' => null,
                'status' => 'not_found',
            ]);
        }

        return ApiResponse::success('Sandbox payment confirmed.', [
            'payment_intent_id' => $intent->id,
            'status' => $intent->status,
        ]);
    }

    public function webhook(Request $request)
    {
        $rawPayload = $request->getContent();

        if (! $this->paymentGatewayService->verifySignature($rawPayload, $request->header('X-DigiBank-Signature'))) {
            return ApiResponse::error('Invalid payment gateway signature.', [], 401);
        }

        $intent = $this->depositPaymentService->handleWebhook($request->all(), $rawPayload);

        if (! $intent) {
            return ApiResponse::success('Webhook processed with no matching payment intent.', [
                'payment_intent_id' => null,
                'status' => 'not_found',
            ]);
        }

        return ApiResponse::success('Webhook processed.', [
            'payment_intent_id' => $intent->id,
            'status' => $intent->status,
        ]);
    }

    public function stripeWebhook(Request $request)
    {
        $rawPayload = $request->getContent();

        try {
            $event = $this->paymentGatewayService->constructStripeEvent(
                $rawPayload,
                $request->header('Stripe-Signature')
            );
        } catch (\Throwable) {
            return ApiResponse::error('Invalid Stripe webhook signature.', [], 401);
        }

        \Log::info('Stripe webhook received', [
            'type' => $event['type'] ?? null,
            'session_id' => $event['data']['object']['id'] ?? null,
        ]);

        $intent = $this->depositPaymentService->handleStripeEvent($event, $rawPayload);

        if (! $intent) {
            return ApiResponse::success('Stripe webhook processed with no matching payment intent.', [
                'payment_intent_id' => null,
                'status' => 'not_found',
            ]);
        }

        return ApiResponse::success('Stripe webhook processed.', [
            'payment_intent_id' => $intent->id,
            'status' => $intent->status,
        ]);
    }

    private function idempotencyKey(Request $request): ?string
    {
        $key = $request->header('Idempotency-Key') ?: $request->input('idempotency_key');

        if (! is_string($key) || trim($key) === '') {
            return null;
        }

        return substr(trim($key), 0, 120);
    }

    private function applyAdminPaymentFilters(Builder $query, array $filters): void
    {
        $query
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $inner) use ($search): void {
                    $inner->whereHas('user', function (Builder $userQuery) use ($search): void {
                        $userQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                        ->orWhereHas('account', fn (Builder $accountQuery) => $accountQuery->where('account_number', 'like', "%{$search}%"));
                });
            })
            ->when($filters['date_from'] ?? null, fn (Builder $query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn (Builder $query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->when(isset($filters['amount_min']), fn (Builder $query) => $query->where('amount', '>=', $filters['amount_min']))
            ->when(isset($filters['amount_max']), fn (Builder $query) => $query->where('amount', '<=', $filters['amount_max']));
    }
}
