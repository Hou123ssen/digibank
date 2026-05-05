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
        if (Schema::hasTable('daret_cycles')) {
            return;
        }

        Schema::create('daret_cycles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daret_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('cycle_number');
            $table->foreignId('payout_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['daret_id', 'cycle_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daret_cycles');
    }
};
