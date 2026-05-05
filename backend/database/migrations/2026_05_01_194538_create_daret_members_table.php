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
        if (Schema::hasTable('daret_members')) {
            return;
        }

        Schema::create('daret_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daret_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('payout_order')->nullable();
            $table->timestamp('joined_at');
            $table->timestamps();

            $table->unique(['daret_id', 'user_id']);
            $table->unique(['daret_id', 'payout_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daret_members');
    }
};
