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
        Schema::create('daret_cycles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daret_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('cycle_number');
            $table->foreignId('beneficiary_user_id')->constrained('users')->cascadeOnDelete();
            $table->date('due_date');
            $table->enum('status', ['pending', 'completed', 'late'])->default('pending');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['daret_id', 'cycle_number']);
            $table->index(['daret_id', 'status']);
            $table->index('due_date');
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
