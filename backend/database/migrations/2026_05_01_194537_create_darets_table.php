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
        Schema::create('darets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('contribution_amount', 15, 2);
            $table->unsignedInteger('total_members');
            $table->unsignedInteger('current_members')->default(1);
            $table->enum('frequency', ['monthly', 'weekly']);
            $table->enum('payout_order_type', ['sequential', 'random', 'auto_rotation']);
            $table->string('invite_code')->unique();
            $table->enum('status', ['open', 'active', 'completed', 'cancelled'])->default('open');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'frequency']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('darets');
    }
};
