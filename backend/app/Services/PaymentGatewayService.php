<?php

namespace App\Services;

use App\Models\PaymentIntent;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;

class PaymentGatewayService
{
    public function createStripeCheckoutSession(PaymentIntent $intent): array
    {
        $secret = $this->stripeSecretKey();

        if ($secret === '') {
            throw new \RuntimeException('Stripe secret key is not configured.');
        }

        Log::info('Creating Stripe Checkout Session', [
            'payment_intent_id' => $intent->id,
            'stripe_key' => $this->maskedStripeKey($secret),
            'stripe_key_has_whitespace' => $this->hasOuterWhitespace((string) config('services.stripe.secret_key')),
        ]);

        $client = new StripeClient($secret);
        $successUrl = $this->appendQuery($this->frontendAccountsUrl(), ['deposit_intent_id' => $intent->id]);
        $cancelUrl = $this->appendQuery($this->frontendAccountsUrl(), ['deposit_intent_id' => $intent->id]);

        $session = $client->checkout->sessions->create([
            'mode' => 'payment',
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'client_reference_id' => (string) $intent->id,
            'metadata' => [
                'payment_intent_id' => (string) $intent->id,
                'account_id' => (string) $intent->account_id,
                'user_id' => (string) $intent->user_id,
            ],
            'payment_intent_data' => [
                'metadata' => [
                    'payment_intent_id' => (string) $intent->id,
                    'account_id' => (string) $intent->account_id,
                    'user_id' => (string) $intent->user_id,
                ],
            ],
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => strtolower((string) config('services.stripe.currency', 'mad')),
                    'unit_amount' => $this->stripeAmount((float) $intent->amount),
                    'product_data' => [
                        'name' => 'DigiBank account recharge',
                    ],
                ],
            ]],
        ]);

        return [
            'id' => $session->id,
            'url' => $session->url,
        ];
    }

    public function constructStripeEvent(string $payload, ?string $signature): array
    {
        $secret = $this->stripeWebhookSecret();

        if ($secret === '' || ! is_string($signature) || $signature === '') {
            throw new SignatureVerificationException('Stripe webhook secret or signature is missing.', null);
        }

        $event = Webhook::constructEvent($payload, $signature, $secret);

        return $event instanceof \Stripe\Event ? $event->toArray() : (array) $event;
    }

    public function retrieveStripeSessionStatus(PaymentIntent $intent): array
    {
        $secret = $this->stripeSecretKey();

        if ($secret === '') {
            throw new \RuntimeException('Stripe secret key is not configured.');
        }

        $client = new StripeClient($secret);
        $session = $client->checkout->sessions->retrieve($intent->gateway_reference, []);

        Log::info('Retrieved Stripe Checkout Session status', [
            'payment_intent_id' => $intent->id,
            'session_id' => $session->id,
            'status' => $session->status,
            'payment_status' => $session->payment_status,
            'stripe_key' => $this->maskedStripeKey($secret),
            'stripe_key_has_whitespace' => $this->hasOuterWhitespace((string) config('services.stripe.secret_key')),
        ]);

        return [
            'id' => $session->id,
            'status' => $session->status,
            'payment_status' => $session->payment_status,
            'payment_intent' => $session->payment_intent,
            'amount_total' => $session->amount_total,
            'currency' => $session->currency,
        ];
    }

    public function createStripeRefund(string $chargeId, float $amount, string $currency, array $metadata = [], ?string $reason = null): array
    {
        $secret = $this->stripeSecretKey();

        if ($secret === '') {
            throw new \RuntimeException('Stripe secret key is not configured.');
        }

        $client = new StripeClient($secret);
        $refund = $client->refunds->create(array_filter([
            'charge' => $chargeId,
            'amount' => $this->stripeAmount($amount),
            'metadata' => $metadata,
            'reason' => $this->stripeRefundReason($reason),
        ], fn ($value): bool => $value !== null && $value !== []));

        return [
            'id' => $refund->id,
            'status' => $refund->status,
            'charge' => is_string($refund->charge) ? $refund->charge : $chargeId,
        ];
    }

    public function stripeDiagnostics(): array
    {
        $secret = (string) config('services.stripe.secret_key');
        $webhookSecret = (string) config('services.stripe.webhook_secret');

        return [
            'secret_key_present' => trim($secret) !== '',
            'secret_key_masked' => $this->maskedStripeKey($this->stripeSecretKey()),
            'secret_key_has_whitespace' => $this->hasOuterWhitespace($secret),
            'webhook_secret_present' => trim($webhookSecret) !== '',
            'webhook_secret_masked' => $this->maskedStripeKey($this->stripeWebhookSecret()),
            'webhook_secret_has_whitespace' => $this->hasOuterWhitespace($webhookSecret),
        ];
    }

    public function createCheckoutUrl(PaymentIntent $intent): string
    {
        $returnUrl = trim((string) config('services.payment_gateway.return_url'));
        $target = $returnUrl !== '' ? $returnUrl : $this->frontendAccountsUrl();

        if ($this->isLaravelRootUrl($target)) {
            $target = $this->frontendAccountsUrl();
        }

        return $this->appendQuery($target, ['deposit_intent_id' => $intent->id]);
    }

    public function makeReference(string $gateway): string
    {
        return Str::upper($gateway).'-'.now()->format('YmdHis').'-'.Str::upper(Str::random(12));
    }

    public function verifySignature(string $payload, ?string $signature): bool
    {
        $secret = (string) config('services.payment_gateway.webhook_secret');

        if ($secret === '' || ! is_string($signature) || $signature === '') {
            return false;
        }

        $expected = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expected, $signature);
    }

    private function isLaravelRootUrl(string $url): bool
    {
        $appUrl = rtrim((string) config('app.url'), '/');

        if ($appUrl === '') {
            return false;
        }

        $targetHost = parse_url($url, PHP_URL_HOST);
        $targetPort = parse_url($url, PHP_URL_PORT);
        $appHost = parse_url($appUrl, PHP_URL_HOST);
        $appPort = parse_url($appUrl, PHP_URL_PORT);

        return $targetHost === $appHost
            && (string) $targetPort === (string) $appPort;
    }

    private function appendQuery(string $url, array $params): string
    {
        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.http_build_query($params);
    }

    private function frontendAccountsUrl(): string
    {
        return rtrim((string) config('services.payment_gateway.frontend_url', 'http://localhost:5174'), '/').'/accounts';
    }

    private function stripeAmount(float $amount): int
    {
        return (int) round($amount * 100);
    }

    private function stripeRefundReason(?string $reason): ?string
    {
        return match ($reason) {
            'duplicate', 'fraudulent', 'requested_by_customer' => $reason,
            default => null,
        };
    }

    private function stripeSecretKey(): string
    {
        return trim((string) config('services.stripe.secret_key'));
    }

    private function stripeWebhookSecret(): string
    {
        return trim((string) config('services.stripe.webhook_secret'));
    }

    private function maskedStripeKey(string $key): ?string
    {
        if ($key === '') {
            return null;
        }

        $prefix = substr($key, 0, min(8, strlen($key)));
        $suffix = strlen($key) > 4 ? substr($key, -4) : '';

        return $prefix.'...'.$suffix;
    }

    private function hasOuterWhitespace(string $value): bool
    {
        return $value !== trim($value);
    }
}
