<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BankingModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_and_account(): void
    {
        $response = $this->postJson('/api/auth/register', $this->registerPayload());

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => ['user' => ['id', 'name', 'email', 'role'], 'account' => ['account_number'], 'token'],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'phone' => '+212 600000000',
            'role' => 'user',
        ]);

        $this->assertDatabaseCount('accounts', 1);
        $this->assertEquals('0.00', User::first()->account->balance);
        $this->assertEquals('0.00', User::first()->account->overdraft_limit);
    }

    public function test_login_returns_token(): void
    {
        $this->postJson('/api/auth/register', $this->registerPayload());

        $response = $this->postJson('/api/auth/login', [
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['user', 'token']]);
    }

    public function test_deposit_updates_balance(): void
    {
        $token = $this->registerAndGetToken();

        $response = $this->withToken($token)->postJson('/api/accounts/deposit', [
            'amount' => 150.75,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.account.balance', '150.75');

        $this->assertDatabaseHas('transactions', [
            'type' => Transaction::TYPE_DEPOSIT,
            'amount' => '150.75',
            'balance_before' => '0.00',
            'balance_after' => '150.75',
            'status' => Transaction::STATUS_SUCCESS,
        ]);
    }

    public function test_withdraw_updates_balance(): void
    {
        $token = $this->registerAndGetToken();

        $this->withToken($token)->postJson('/api/accounts/deposit', ['amount' => 200]);

        $response = $this->withToken($token)->postJson('/api/accounts/withdraw', [
            'amount' => 80,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.account.balance', '120.00');

        $this->assertDatabaseHas('transactions', [
            'type' => Transaction::TYPE_WITHDRAW,
            'amount' => '80.00',
            'balance_before' => '200.00',
            'balance_after' => '120.00',
        ]);
    }

    public function test_transfer_moves_money_between_accounts(): void
    {
        $fromToken = $this->registerAndGetToken('sender@example.com');
        $this->registerAndGetToken('receiver@example.com');
        $receiver = User::where('email', 'receiver@example.com')->first();
        $toAccountNumber = $receiver->account->account_number;

        $this->withToken($fromToken)->postJson('/api/accounts/deposit', ['amount' => 300]);

        $response = $this->withToken($fromToken)->postJson('/api/accounts/transfer', [
            'account_number' => $toAccountNumber,
            'amount' => 125,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.from_account.balance', '175.00')
            ->assertJsonPath('data.to_account.balance', '125.00');

        $this->assertEquals('125.00', $receiver->account->fresh()->balance);
    }

    public function test_cannot_withdraw_above_balance_plus_overdraft_limit(): void
    {
        $token = $this->registerAndGetToken();
        User::where('email', 'john@example.com')->first()->account->update([
            'overdraft_limit' => 0,
        ]);

        $response = $this->withToken($token)->postJson('/api/accounts/withdraw', [
            'amount' => 1,
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['amount']);

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_withdraw_within_overdraft_limit_works(): void
    {
        $token = $this->registerAndGetToken();
        $user = User::where('email', 'john@example.com')->first();
        $user->account->update([
            'balance' => 100,
            'overdraft_limit' => 500,
        ]);

        $response = $this->withToken($token)->postJson('/api/accounts/withdraw', [
            'amount' => 300,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.account.balance', '-200.00');

        $this->assertDatabaseHas('transactions', [
            'type' => Transaction::TYPE_WITHDRAW,
            'balance_before' => '100.00',
            'balance_after' => '-200.00',
            'is_overdraft' => true,
            'overdraft_amount' => '200.00',
        ]);
    }

    public function test_withdraw_above_overdraft_limit_fails(): void
    {
        $token = $this->registerAndGetToken();
        $user = User::where('email', 'john@example.com')->first();
        $user->account->update([
            'balance' => 100,
            'overdraft_limit' => 500,
        ]);

        $response = $this->withToken($token)->postJson('/api/accounts/withdraw', [
            'amount' => 601,
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('errors.amount.0', 'Insufficient funds. Overdraft limit exceeded.');

        $this->assertEquals('100.00', $user->account->fresh()->balance);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_transfer_within_overdraft_limit_works(): void
    {
        $fromToken = $this->registerAndGetToken('sender@example.com');
        $sender = User::where('email', 'sender@example.com')->first();
        $sender->account->update([
            'balance' => 100,
            'overdraft_limit' => 500,
        ]);

        $this->registerAndGetToken('receiver@example.com');
        $receiver = User::where('email', 'receiver@example.com')->first();

        $response = $this->withToken($fromToken)->postJson('/api/accounts/transfer', [
            'account_number' => $receiver->account->account_number,
            'amount' => 300,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.from_account.balance', '-200.00')
            ->assertJsonPath('data.to_account.balance', '300.00')
            ->assertJsonPath('data.transfer_out_transaction.is_overdraft', true)
            ->assertJsonPath('data.transfer_out_transaction.overdraft_amount', '200.00');

        $this->assertDatabaseHas('transactions', [
            'type' => Transaction::TYPE_TRANSFER_OUT,
            'balance_after' => '-200.00',
            'is_overdraft' => true,
            'overdraft_amount' => '200.00',
        ]);

        $this->assertDatabaseHas('transactions', [
            'type' => Transaction::TYPE_TRANSFER_IN,
            'balance_after' => '300.00',
            'is_overdraft' => false,
        ]);
    }

    public function test_transfer_above_overdraft_limit_fails(): void
    {
        $fromToken = $this->registerAndGetToken('sender@example.com');
        $sender = User::where('email', 'sender@example.com')->first();
        $sender->account->update([
            'balance' => 100,
            'overdraft_limit' => 500,
        ]);

        $this->registerAndGetToken('receiver@example.com');
        $receiver = User::where('email', 'receiver@example.com')->first();

        $response = $this->withToken($fromToken)->postJson('/api/accounts/transfer', [
            'account_number' => $receiver->account->account_number,
            'amount' => 601,
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('errors.amount.0', 'Insufficient funds. Overdraft limit exceeded.');

        $this->assertEquals('100.00', $sender->account->fresh()->balance);
        $this->assertEquals('0.00', $receiver->account->fresh()->balance);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_deposit_reduces_negative_balance(): void
    {
        $token = $this->registerAndGetToken();
        $user = User::where('email', 'john@example.com')->first();
        $user->account->update([
            'balance' => -200,
            'overdraft_limit' => 500,
        ]);

        $response = $this->withToken($token)->postJson('/api/accounts/deposit', [
            'amount' => 100,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.account.balance', '-100.00');

        $this->assertDatabaseHas('transactions', [
            'type' => Transaction::TYPE_DEPOSIT,
            'balance_before' => '-200.00',
            'balance_after' => '-100.00',
            'is_overdraft' => true,
            'overdraft_amount' => '100.00',
        ]);
    }

    public function test_transaction_history_includes_overdraft_fields(): void
    {
        $token = $this->registerAndGetToken();
        $user = User::where('email', 'john@example.com')->first();
        $user->account->update([
            'balance' => 100,
            'overdraft_limit' => 500,
        ]);

        $this->withToken($token)->postJson('/api/accounts/withdraw', [
            'amount' => 300,
        ]);

        $this->withToken($token)->getJson('/api/transactions/me')
            ->assertOk()
            ->assertJsonPath('data.transactions.0.type', Transaction::TYPE_WITHDRAW)
            ->assertJsonPath('data.transactions.0.is_overdraft', true)
            ->assertJsonPath('data.transactions.0.overdraft_amount', '200.00');
    }

    public function test_transactions_are_recorded_correctly(): void
    {
        $fromToken = $this->registerAndGetToken('sender@example.com');
        $this->registerAndGetToken('receiver@example.com');
        $toAccountNumber = User::where('email', 'receiver@example.com')->first()->account->account_number;

        $this->withToken($fromToken)->postJson('/api/accounts/deposit', ['amount' => 500]);
        $this->withToken($fromToken)->postJson('/api/accounts/withdraw', ['amount' => 100]);
        $this->withToken($fromToken)->postJson('/api/accounts/transfer', [
            'account_number' => $toAccountNumber,
            'amount' => 50,
        ]);

        $this->assertDatabaseHas('transactions', ['type' => Transaction::TYPE_DEPOSIT]);
        $this->assertDatabaseHas('transactions', ['type' => Transaction::TYPE_WITHDRAW]);
        $this->assertDatabaseHas('transactions', ['type' => Transaction::TYPE_TRANSFER_OUT]);
        $this->assertDatabaseHas('transactions', ['type' => Transaction::TYPE_TRANSFER_IN]);
        $this->assertDatabaseCount('transactions', 4);

        $this->withToken($fromToken)->getJson('/api/transactions/me')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data.transactions');
    }

    private function registerAndGetToken(string $email = 'john@example.com'): string
    {
        return $this->postJson('/api/auth/register', $this->registerPayload($email))
            ->json('data.token');
    }

    private function registerPayload(string $email = 'john@example.com'): array
    {
        return [
            'name' => 'John Doe',
            'email' => $email,
            'phone' => '+212 600000000',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];
    }
}
