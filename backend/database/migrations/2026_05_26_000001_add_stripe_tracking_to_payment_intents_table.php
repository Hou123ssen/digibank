<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_intents', function (Blueprint $table) {
            if (! Schema::hasColumn('payment_intents', 'stripe_payment_intent_id')) {
                $table->string('stripe_payment_intent_id')->nullable()->after('gateway_reference');
            }

            if (! Schema::hasColumn('payment_intents', 'stripe_charge_id')) {
                $table->string('stripe_charge_id')->nullable()->after('stripe_payment_intent_id');
            }

            if (! Schema::hasColumn('payment_intents', 'stripe_event_id')) {
                $table->string('stripe_event_id')->nullable()->after('stripe_charge_id');
            }

            if (! Schema::hasColumn('payment_intents', 'failure_reason')) {
                $table->string('failure_reason')->nullable()->after('status');
            }

            if (! Schema::hasColumn('payment_intents', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('paid_at');
            }

            if (! Schema::hasColumn('payment_intents', 'failed_at')) {
                $table->timestamp('failed_at')->nullable()->after('cancelled_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payment_intents', function (Blueprint $table) {
            foreach ([
                'failed_at',
                'cancelled_at',
                'failure_reason',
                'stripe_event_id',
                'stripe_charge_id',
                'stripe_payment_intent_id',
            ] as $column) {
                if (Schema::hasColumn('payment_intents', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
