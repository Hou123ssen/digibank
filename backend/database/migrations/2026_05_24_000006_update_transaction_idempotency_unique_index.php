<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('transactions', 'idempotency_key')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('transactions_account_idempotency_unique');
            $table->unique(['account_id', 'type', 'idempotency_key'], 'transactions_account_type_idempotency_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('transactions', 'idempotency_key')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('transactions_account_type_idempotency_unique');
            $table->unique(['account_id', 'idempotency_key'], 'transactions_account_idempotency_unique');
        });
    }
};
