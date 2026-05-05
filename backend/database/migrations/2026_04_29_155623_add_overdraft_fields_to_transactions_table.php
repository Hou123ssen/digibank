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
        Schema::table('transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('transactions', 'is_overdraft')) {
                $table->boolean('is_overdraft')->default(false)->after('description');
            }

            if (! Schema::hasColumn('transactions', 'overdraft_amount')) {
                $table->decimal('overdraft_amount', 15, 2)->nullable()->after('is_overdraft');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'overdraft_amount')) {
                $table->dropColumn('overdraft_amount');
            }

            if (Schema::hasColumn('transactions', 'is_overdraft')) {
                $table->dropColumn('is_overdraft');
            }
        });
    }
};
