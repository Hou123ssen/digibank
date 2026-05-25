<?php

namespace App\Services;

use App\Models\PaymentIntent;
use Illuminate\Support\Str;

class PaymentGatewayService
{
    public function createCheckoutUrl(PaymentIntent $intent): string
    {
        $frontendUrl = rtrim((string) config('services.payment_gateway.frontend_url', 'http://localhost:5174'), '/');
        $returnUrl = trim((string) config('services.payment_gateway.return_url'));
        $target = $returnUrl !== '' ? $returnUrl : $frontendUrl.'/accounts';

        if ($this->isLaravelRootUrl($target)) {
            $target = $frontendUrl.'/accounts';
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
}
