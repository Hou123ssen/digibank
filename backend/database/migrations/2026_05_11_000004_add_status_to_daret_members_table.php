<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daret_members', function (Blueprint $table) {
            if (! Schema::hasColumn('daret_members', 'status')) {
                $table->string('status')->default('active');
            }
            if (! Schema::hasColumn('daret_members', 'has_received_payout')) {
                $table->boolean('has_received_payout')->default(false);
            }
        });

        // Back-fill: all existing rows are considered active.
        DB::table('daret_members')->whereNull('status')->update(['status' => 'active']);
    }

    public function down(): void
    {
        Schema::table('daret_members', function (Blueprint $table) {
            foreach (['has_received_payout', 'status'] as $col) {
                if (Schema::hasColumn('daret_members', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
