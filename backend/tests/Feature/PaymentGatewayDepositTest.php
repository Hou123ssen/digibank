<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\PaymentIntent;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentGatewayDepositTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.payment_gateway.webhook_secret' => 'test-webhook-secret']);
        config(['services.payment_gateway.frontend_url' => 'http://localhost:5174']);
        config(['services.payment_gateway.return_url' => 'http://localhost:5174/accounts']);
    }

    public function test_payment_intent_creation_does_not_update_balance(): void
    {
        [$user, $account] = $this->userWithAccount();
        Sanctum::actingAs($user);

        $this->withHeader('Idempotency-Key', 'intent-create-1')
            ->postJson('/api/deposits/create-payment-intent', [
                'amount' => 250,
                'gateway' => PaymentIntent::GATEWAY_STRIPE,
            ])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', PaymentIntent::STATUS_PENDING)
            ->assertJsonPath('data.checkout_url', 'http://localhost:5174/accounts?deposit_intent_id=1')
            ->assertJsonStructure(['data' => ['checkout_url', 'payment_intent_id']]);

        $this->assertEquals('0.00', $account->fresh()->balance);
        $this->assertDatabaseHas('payment_intents', [
            'user_id' => $user->id,
            'account_id' => $account->id,
            'amount' => '250.00',
            'gateway' => PaymentIntent::GATEWAY_STRIPE,
            'status' => PaymentIntent::STATUS_PENDING,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.payment_intent.created',
        ]);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_checkout_url_falls_back_to_frontend_when_return_url_is_laravel_root(): void
    {
        config(['app.url' => 'http://localhost:8001']);
        config(['services.payment_gateway.frontend_url' => 'http://localhost:5174']);
        config(['services.payment_gateway.return_url' => 'http://localhost:8001']);

        [$user, $account] = $this->userWithAccount();
        Sanctum::actingAs($user);

        $this->postJson('/api/deposits/create-payment-intent', [
            'amount' => 250,
            'gateway' => PaymentIntent::GATEWAY_STRIPE,
        ])
            ->assertCreated()
            ->assertJsonPath('data.checkout_url', 'http://localhost:5174/accounts?deposit_intent_id=1');

        $this->assertEquals('0.00', $account->fresh()->balance);
    }

    public function test_successful_webhook_updates_balance_once(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300);

        $this->signedWebhook([
            'gateway_reference' => $intent->gateway_reference,
            'status' => 'paid',
        ])->assertOk()
            ->assertJsonPath('data.status', PaymentIntent::STATUS_PAID);

        $this->assertEquals('300.00', $account->fresh()->balance);
        $this->assertDatabaseHas('transactions', [
            'account_id' => $account->id,
            'user_id' => $user->id,
            'type' => Transaction::TYPE_DEPOSIT,
            'amount' => '300.00',
            'balance_before' => '0.00',
            'balance_after' => '300.00',
            'description' => 'Secure gateway deposit',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'title' => 'Deposit credited',
            'type' => Notification::TYPE_SUCCESS,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.payment_intent.paid',
        ]);
    }

    public function test_duplicate_webhook_does_not_double_credit(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300);
        $event = [
            'gateway_reference' => $intent->gateway_reference,
            'status' => 'paid',
        ];

        $this->signedWebhook($event)->assertOk();
        $this->signedWebhook($event)->assertOk()
            ->assertJsonPath('data.status', PaymentIntent::STATUS_PAID);

        $this->assertEquals('300.00', $account->fresh()->balance);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.webhook.replayed',
        ]);
    }

    public function test_failed_webhook_does_not_update_balance(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300);

        $this->signedWebhook([
            'gateway_reference' => $intent->gateway_reference,
            'status' => 'failed',
        ])->assertOk()
            ->assertJsonPath('data.status', PaymentIntent::STATUS_FAILED);

        $this->assertEquals('0.00', $account->fresh()->balance);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.payment_intent.failed',
        ]);
    }

    public function test_invalid_signature_is_rejected(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300);

        $this->call(
            'POST',
            '/api/webhooks/payment-gateway',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_DIGIBANK_SIGNATURE' => 'bad-signature',
            ],
            json_encode(['gateway_reference' => $intent->gateway_reference, 'status' => 'paid'])
        )->assertUnauthorized();

        $this->assertEquals('0.00', $account->fresh()->balance);
        $this->assertSame(PaymentIntent::STATUS_PENDING, $intent->fresh()->status);
        $this->assertDatabaseCount('transactions', 0);
    }

    private function userWithAccount(): array
    {
        $user = User::factory()->create();
        $account = Account::create([
            'user_id' => $user->id,
            'account_number' => (string) random_int(1000000000, 9999999999),
            'balance' => 0,
            'overdraft_limit' => 0,
            'status' => Account::STATUS_ACTIVE,
        ]);

        return [$user, $account];
    }

    private function pendingIntent(User $user, Account $account, float $amount): PaymentIntent
    {
        return PaymentIntent::create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'amount' => $amount,
            'currency' => 'MAD',
            'gateway' => PaymentIntent::GATEWAY_STRIPE,
            'gateway_reference' => 'STRIPE-TEST-'.random_int(1000, 9999),
            'status' => PaymentIntent::STATUS_PENDING,
        ]);
    }

    private function signedWebhook(array $event)
    {
        $payload = json_encode($event);
        $signature = hash_hmac('sha256', $payload, 'test-webhook-secret');

        return $this->call(
            'POST',
            '/api/webhooks/payment-gateway',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_DIGIBANK_SIGNATURE' => $signature,
            ],
            $payload
        );
    }
}
