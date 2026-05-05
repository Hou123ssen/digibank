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
        if (! Schema::hasColumn('users', 'trust_score')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedTinyInteger('trust_score')->default(50)->after('role');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'trust_score')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('trust_score');
            });
        }
    }
};
