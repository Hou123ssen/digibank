<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('daret_payments')) {
            return;
        }

        Schema::create('daret_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daret_id')->constrained()->cascadeOnDelete();
            $table->foreignId('daret_cycle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('daret_member_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->string('status')->default('paid');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['daret_cycle_id', 'daret_member_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daret_payments');
    }
};
