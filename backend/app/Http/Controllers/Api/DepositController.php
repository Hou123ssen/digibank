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
            'paid_at' => $paymentIntent->paid_at,
        ]);
    }

    public function webhook(Request $request)
    {
        $rawPayload = $request->getContent();

        if (! $this->paymentGatewayService->verifySignature($rawPayload, $request->header('X-DigiBank-Signature'))) {
            return ApiResponse::error('Invalid payment gateway signature.', [], 401);
        }

        $intent = $this->depositPaymentService->handleWebhook($request->all(), $rawPayload);

        return ApiResponse::success('Webhook processed.', [
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
