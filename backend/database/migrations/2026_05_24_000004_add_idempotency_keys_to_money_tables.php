<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('transactions', 'idempotency_key')) {
                $table->string('idempotency_key')->nullable()->after('reference');
                $table->unique(['account_id', 'idempotency_key'], 'transactions_account_idempotency_unique');
            }
        });

        Schema::table('cagnotte_donations', function (Blueprint $table) {
            if (! Schema::hasColumn('cagnotte_donations', 'idempotency_key')) {
                $table->string('idempotency_key')->nullable()->after('amount');
                $table->unique(['user_id', 'idempotency_key'], 'cagnotte_donations_user_idempotency_unique');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cagnotte_donations', function (Blueprint $table) {
            if (Schema::hasColumn('cagnotte_donations', 'idempotency_key')) {
                $table->dropUnique('cagnotte_donations_user_idempotency_unique');
                $table->dropColumn('idempotency_key');
            }
        });

        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'idempotency_key')) {
                $table->dropUnique('transactions_account_idempotency_unique');
                $table->dropColumn('idempotency_key');
            }
        });
    }
};
