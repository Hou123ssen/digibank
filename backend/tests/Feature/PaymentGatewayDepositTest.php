<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\PaymentIntent;
use App\Models\Transaction;
use App\Models\User;
use App\Services\PaymentGatewayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
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
        config(['services.stripe.secret_key' => 'sk_test_fake']);
        config(['services.stripe.webhook_secret' => 'whsec_test_secret']);
        config(['services.stripe.currency' => 'mad']);
    }

    public function test_stripe_checkout_session_is_created_without_updating_balance(): void
    {
        $this->fakeStripeCheckoutSession('cs_test_deposit_1', 'https://checkout.stripe.test/pay/cs_test_deposit_1');
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
            ->assertJsonPath('data.checkout_url', 'https://checkout.stripe.test/pay/cs_test_deposit_1')
            ->assertJsonStructure(['data' => ['checkout_url', 'payment_intent_id']]);

        $this->assertEquals('0.00', $account->fresh()->balance);
        $this->assertDatabaseHas('payment_intents', [
            'user_id' => $user->id,
            'account_id' => $account->id,
            'amount' => '250.00',
            'gateway' => PaymentIntent::GATEWAY_STRIPE,
            'gateway_reference' => 'cs_test_deposit_1',
            'status' => PaymentIntent::STATUS_PENDING,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.payment_intent.created',
        ]);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_checkout_url_falls_back_to_frontend_when_return_url_is_laravel_root(): void
    {
        $this->fakeStripeCheckoutSession('cs_test_deposit_2', 'https://checkout.stripe.test/pay/cs_test_deposit_2');
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
            ->assertJsonPath('data.checkout_url', 'https://checkout.stripe.test/pay/cs_test_deposit_2');

        $this->assertEquals('0.00', $account->fresh()->balance);
    }

    public function test_stripe_webhook_success_updates_balance_once(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300, 'cs_test_success_1');

        $this->signedStripeWebhook([
            'id' => 'evt_test_success',
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => $intent->gateway_reference,
                'payment_intent' => 'pi_test_success_1',
            ]],
        ])->assertOk()
            ->assertJsonPath('data.status', PaymentIntent::STATUS_PAID);

        $this->assertEquals('300.00', $account->fresh()->balance);
        $this->assertDatabaseHas('payment_intents', [
            'id' => $intent->id,
            'status' => PaymentIntent::STATUS_PAID,
            'gateway_reference' => 'cs_test_success_1',
            'stripe_payment_intent_id' => 'pi_test_success_1',
            'stripe_event_id' => 'evt_test_success',
        ]);
        $this->assertDatabaseHas('transactions', [
            'account_id' => $account->id,
            'user_id' => $user->id,
            'type' => Transaction::TYPE_DEPOSIT,
            'amount' => '300.00',
            'balance_before' => '0.00',
            'balance_after' => '300.00',
            'description' => 'Stripe deposit',
            'reference' => 'STRIPE-pi_test_success_1',
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

    public function test_checkout_session_completed_payload_matches_gateway_reference_and_credits_once(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 725, 'cs_test_exact_match_1');

        $payload = [
            'id' => 'evt_test_exact_match',
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_exact_match_1',
                    'object' => 'checkout.session',
                    'payment_intent' => 'pi_test_exact_match_1',
                ],
            ],
        ];

        $this->signedStripeWebhook($payload)
            ->assertOk()
            ->assertJsonPath('data.payment_intent_id', $intent->id)
            ->assertJsonPath('data.status', PaymentIntent::STATUS_PAID);

        $this->assertSame(PaymentIntent::STATUS_PAID, $intent->fresh()->status);
        $this->assertNotNull($intent->fresh()->paid_at);
        $this->assertSame('pi_test_exact_match_1', $intent->fresh()->stripe_payment_intent_id);
        $this->assertSame('evt_test_exact_match', $intent->fresh()->stripe_event_id);
        $this->assertEquals('725.00', $account->fresh()->balance);
        $this->assertDatabaseHas('transactions', [
            'account_id' => $account->id,
            'user_id' => $user->id,
            'type' => Transaction::TYPE_DEPOSIT,
            'amount' => '725.00',
            'balance_before' => '0.00',
            'balance_after' => '725.00',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.payment_intent.paid',
        ]);

        $this->signedStripeWebhook($payload)
            ->assertOk()
            ->assertJsonPath('data.payment_intent_id', $intent->id)
            ->assertJsonPath('data.status', PaymentIntent::STATUS_PAID);

        $this->assertEquals('725.00', $account->fresh()->balance);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.webhook.replayed',
        ]);
    }

    public function test_can_retrieve_stripe_session_status_for_local_payment_intent(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 500, 'cs_test_status_1');
        Sanctum::actingAs($user);

        $gateway = Mockery::mock(PaymentGatewayService::class)->makePartial();
        $gateway->shouldReceive('retrieveStripeSessionStatus')
            ->once()
            ->with(Mockery::on(fn (PaymentIntent $paymentIntent): bool => $paymentIntent->id === $intent->id))
            ->andReturn([
                'id' => 'cs_test_status_1',
                'status' => 'complete',
                'payment_status' => 'paid',
                'payment_intent' => 'pi_test_status_1',
                'amount_total' => 50000,
                'currency' => 'mad',
            ]);
        $gateway->shouldReceive('stripeDiagnostics')
            ->andReturn([
                'secret_key_present' => true,
                'secret_key_masked' => 'sk_test_...1234',
                'secret_key_has_whitespace' => false,
                'webhook_secret_present' => true,
                'webhook_secret_masked' => 'whsec_...5678',
                'webhook_secret_has_whitespace' => false,
            ]);
        $this->app->instance(PaymentGatewayService::class, $gateway);

        $this->getJson("/api/deposits/{$intent->id}/stripe-session-status")
            ->assertOk()
            ->assertJsonPath('data.gateway_reference', 'cs_test_status_1')
            ->assertJsonPath('data.stripe_session.id', 'cs_test_status_1')
            ->assertJsonPath('data.stripe_session.status', 'complete')
            ->assertJsonPath('data.stripe_session.payment_status', 'paid')
            ->assertJsonPath('data.diagnostics.secret_key_masked', 'sk_test_...1234')
            ->assertJsonPath('data.listener_forward_to', 'http://127.0.0.1:8001/api/webhooks/stripe');
    }

    public function test_stripe_webhook_logs_and_acknowledges_unknown_session_id(): void
    {
        $this->signedStripeWebhook([
            'id' => 'evt_unknown_session',
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'data' => ['object' => ['id' => 'cs_test_missing_local_intent']],
        ])->assertOk()
            ->assertJsonPath('data.payment_intent_id', null)
            ->assertJsonPath('data.status', 'not_found');

        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.payment_intent.not_found',
        ]);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_duplicate_stripe_webhook_does_not_double_credit(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300, 'cs_test_duplicate_1');
        $event = [
            'id' => 'evt_test_duplicate',
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => $intent->gateway_reference,
                'payment_intent' => 'pi_test_duplicate_1',
            ]],
        ];

        $this->signedStripeWebhook($event)->assertOk();
        $this->signedStripeWebhook($event)->assertOk()
            ->assertJsonPath('data.status', PaymentIntent::STATUS_PAID);

        $this->assertEquals('300.00', $account->fresh()->balance);
        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.webhook.replayed',
        ]);
    }

    public function test_cancelled_stripe_payment_does_not_update_balance(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300, 'cs_test_cancelled_1');

        $this->signedStripeWebhook([
            'id' => 'evt_test_expired',
            'object' => 'event',
            'type' => 'checkout.session.expired',
            'data' => ['object' => ['id' => $intent->gateway_reference]],
        ])->assertOk()
            ->assertJsonPath('data.status', PaymentIntent::STATUS_CANCELLED);

        $this->assertEquals('0.00', $account->fresh()->balance);
        $this->assertSame(PaymentIntent::STATUS_CANCELLED, $intent->fresh()->status);
        $this->assertNotNull($intent->fresh()->cancelled_at);
        $this->assertSame('Stripe Checkout session expired.', $intent->fresh()->failure_reason);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.payment_intent.cancelled',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'title' => 'Deposit cancelled',
            'type' => Notification::TYPE_WARNING,
        ]);
    }

    public function test_failed_stripe_payment_intent_does_not_update_balance(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300, 'cs_test_failed_1');

        $this->signedStripeWebhook([
            'id' => 'evt_test_payment_failed',
            'object' => 'event',
            'type' => 'payment_intent.payment_failed',
            'data' => [
                'object' => [
                    'id' => 'pi_test_failed_1',
                    'latest_charge' => 'ch_test_failed_1',
                    'metadata' => ['payment_intent_id' => (string) $intent->id],
                    'last_payment_error' => ['message' => 'Your card was declined.'],
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.payment_intent_id', $intent->id)
            ->assertJsonPath('data.status', PaymentIntent::STATUS_FAILED);

        $intent->refresh();

        $this->assertEquals('0.00', $account->fresh()->balance);
        $this->assertSame(PaymentIntent::STATUS_FAILED, $intent->status);
        $this->assertSame('pi_test_failed_1', $intent->stripe_payment_intent_id);
        $this->assertSame('ch_test_failed_1', $intent->stripe_charge_id);
        $this->assertSame('evt_test_payment_failed', $intent->stripe_event_id);
        $this->assertSame('Your card was declined.', $intent->failure_reason);
        $this->assertNotNull($intent->failed_at);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.payment_intent.failed',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'title' => 'Deposit failed',
            'type' => Notification::TYPE_WARNING,
        ]);
    }

    public function test_charge_failed_does_not_update_balance(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300, 'cs_test_charge_failed_1');

        $this->signedStripeWebhook([
            'id' => 'evt_test_charge_failed',
            'object' => 'event',
            'type' => 'charge.failed',
            'data' => [
                'object' => [
                    'id' => 'ch_test_failed_2',
                    'payment_intent' => 'pi_test_failed_2',
                    'metadata' => ['payment_intent_id' => (string) $intent->id],
                    'failure_message' => 'Insufficient funds.',
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.payment_intent_id', $intent->id)
            ->assertJsonPath('data.status', PaymentIntent::STATUS_FAILED);

        $this->assertEquals('0.00', $account->fresh()->balance);
        $this->assertSame(PaymentIntent::STATUS_FAILED, $intent->fresh()->status);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_local_payment_status_endpoint_returns_failure_details(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 120, 'cs_test_status_failed_1');
        $intent->update([
            'status' => PaymentIntent::STATUS_FAILED,
            'stripe_payment_intent_id' => 'pi_test_status_failed_1',
            'stripe_charge_id' => 'ch_test_status_failed_1',
            'stripe_event_id' => 'evt_test_status_failed_1',
            'failure_reason' => 'Card declined.',
            'failed_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->getJson("/api/deposits/{$intent->id}/status")
            ->assertOk()
            ->assertJsonPath('data.status', PaymentIntent::STATUS_FAILED)
            ->assertJsonPath('data.failure_reason', 'Card declined.')
            ->assertJsonPath('data.stripe_payment_intent_id', 'pi_test_status_failed_1')
            ->assertJsonPath('data.stripe_charge_id', 'ch_test_status_failed_1')
            ->assertJsonPath('data.stripe_event_id', 'evt_test_status_failed_1');
    }

    public function test_admin_can_list_payment_intents_with_stripe_refs(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 120, 'cs_test_admin_1');
        $intent->update([
            'stripe_payment_intent_id' => 'pi_test_admin_1',
            'stripe_charge_id' => 'ch_test_admin_1',
            'stripe_event_id' => 'evt_test_admin_1',
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_ADMIN]));

        $this->getJson('/api/admin/payments')
            ->assertOk()
            ->assertJsonPath('data.payments.data.0.id', $intent->id)
            ->assertJsonPath('data.payments.data.0.user.id', $user->id)
            ->assertJsonPath('data.payments.data.0.gateway_reference', 'cs_test_admin_1')
            ->assertJsonPath('data.payments.data.0.stripe_payment_intent_id', 'pi_test_admin_1')
            ->assertJsonPath('data.payments.data.0.stripe_charge_id', 'ch_test_admin_1')
            ->assertJsonPath('data.payments.data.0.stripe_event_id', 'evt_test_admin_1');
    }

    public function test_invalid_signature_is_rejected(): void
    {
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 300);

        $this->call(
            'POST',
            '/api/webhooks/stripe',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => 'bad-signature',
            ],
            json_encode([
                'id' => 'evt_test_bad',
                'object' => 'event',
                'type' => 'checkout.session.completed',
                'data' => ['object' => ['id' => $intent->gateway_reference]],
            ])
        )->assertUnauthorized();

        $this->assertEquals('0.00', $account->fresh()->balance);
        $this->assertSame(PaymentIntent::STATUS_PENDING, $intent->fresh()->status);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_local_sandbox_confirmation_credits_through_webhook_logic(): void
    {
        config(['app.env' => 'local']);
        config(['services.payment_gateway.allow_sandbox_confirmation' => true]);
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 450);
        Sanctum::actingAs($user);

        $this->postJson("/api/deposits/{$intent->id}/sandbox-confirm")
            ->assertOk()
            ->assertJsonPath('data.status', PaymentIntent::STATUS_PAID);

        $this->assertEquals('450.00', $account->fresh()->balance);
        $this->assertDatabaseHas('transactions', [
            'account_id' => $account->id,
            'type' => Transaction::TYPE_DEPOSIT,
            'amount' => '450.00',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'deposit.payment_intent.paid',
        ]);
    }

    public function test_sandbox_confirmation_is_disabled_outside_local(): void
    {
        config(['app.env' => 'production']);
        [$user, $account] = $this->userWithAccount();
        $intent = $this->pendingIntent($user, $account, 450);
        Sanctum::actingAs($user);

        $this->postJson("/api/deposits/{$intent->id}/sandbox-confirm")
            ->assertNotFound();

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

    private function pendingIntent(User $user, Account $account, float $amount, ?string $reference = null): PaymentIntent
    {
        return PaymentIntent::create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'amount' => $amount,
            'currency' => 'MAD',
            'gateway' => PaymentIntent::GATEWAY_STRIPE,
            'gateway_reference' => $reference ?? 'cs_test_'.random_int(1000, 9999),
            'status' => PaymentIntent::STATUS_PENDING,
        ]);
    }

    private function fakeStripeCheckoutSession(string $sessionId, string $checkoutUrl): void
    {
        $gateway = Mockery::mock(PaymentGatewayService::class)->makePartial();
        $gateway->shouldReceive('createStripeCheckoutSession')
            ->once()
            ->andReturn(['id' => $sessionId, 'url' => $checkoutUrl]);

        $this->app->instance(PaymentGatewayService::class, $gateway);
    }

    private function signedStripeWebhook(array $event)
    {
        $payload = json_encode($event);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$payload, 'whsec_test_secret');

        return $this->call(
            'POST',
            '/api/webhooks/stripe',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}",
            ],
            $payload
        );
    }

}
