<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_intents', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'payment_intents_status_created_idx');
            $table->index(['gateway', 'created_at'], 'payment_intents_gateway_created_idx');
            $table->index('stripe_payment_intent_id', 'payment_intents_stripe_pi_idx');
            $table->index('stripe_charge_id', 'payment_intents_stripe_charge_idx');
        });
    }

    public function down(): void
    {
        Schema::table('payment_intents', function (Blueprint $table) {
            $table->dropIndex('payment_intents_stripe_charge_idx');
            $table->dropIndex('payment_intents_stripe_pi_idx');
            $table->dropIndex('payment_intents_gateway_created_idx');
            $table->dropIndex('payment_intents_status_created_idx');
        });
    }
};
