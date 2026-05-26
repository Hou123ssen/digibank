<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreatePaymentIntentRequest;
use App\Models\PaymentIntent;
use App\Services\DepositPaymentService;
use App\Services\PaymentGatewayService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

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

    public function adminPayments()
    {
        $payments = PaymentIntent::query()
            ->with('user:id,name,email')
            ->latest()
            ->paginate(50)
            ->through(fn (PaymentIntent $paymentIntent): array => [
                'id' => $paymentIntent->id,
                'user' => $paymentIntent->user ? [
                    'id' => $paymentIntent->user->id,
                    'name' => $paymentIntent->user->name,
                    'email' => $paymentIntent->user->email,
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
            ]);

        return ApiResponse::success('Payment intents retrieved.', [
            'payments' => $payments,
        ]);
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
}
