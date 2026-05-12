<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The live SQLite database was created from an older migration that used
     * `payout_user_id` and had no `due_date`.  The current codebase expects
     * `beneficiary_user_id` and `due_date` on every DaretCycle row.
     *
     * SQLite notes:
     *   - ->after() is NOT used.
     *   - New columns must be nullable (or have a DEFAULT) to be added via
     *     ALTER TABLE when existing rows are present.
     *   - FK constraints are advisory in SQLite; we add the column without one.
     */
    public function up(): void
    {
        // ── Step 1: add missing columns ──────────────────────────────────────
        Schema::table('daret_cycles', function (Blueprint $table) {
            if (! Schema::hasColumn('daret_cycles', 'beneficiary_user_id')) {
                $table->unsignedBigInteger('beneficiary_user_id')->nullable();
            }
            if (! Schema::hasColumn('daret_cycles', 'due_date')) {
                $table->date('due_date')->nullable();
            }
        });

        // ── Step 2: back-fill beneficiary_user_id from the old payout_user_id ─
        if (Schema::hasColumn('daret_cycles', 'payout_user_id')) {
            DB::statement(
                'UPDATE daret_cycles
                 SET beneficiary_user_id = payout_user_id
                 WHERE beneficiary_user_id IS NULL AND payout_user_id IS NOT NULL'
            );
        }

        // ── Step 3: back-fill due_date (created_at + 1 month as safe default) ─
        DB::statement(
            "UPDATE daret_cycles
             SET due_date = DATE(created_at, '+1 month')
             WHERE due_date IS NULL"
        );
    }

    public function down(): void
    {
        Schema::table('daret_cycles', function (Blueprint $table) {
            foreach (['due_date', 'beneficiary_user_id'] as $col) {
                if (Schema::hasColumn('daret_cycles', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
