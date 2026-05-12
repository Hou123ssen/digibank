<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Adds columns that were in the create_darets_table migration but were missing
     * from the live SQLite database because it was seeded from an earlier schema.
     *
     * SQLite notes:
     *   - ->after() is NOT used (not supported).
     *   - Unique indexes are added in a separate Schema::table() call after the
     *     invite_code column is back-filled, to avoid NULL uniqueness issues.
     */
    public function up(): void
    {
        // ── Step 1: add the missing columns ──────────────────────────────────
        Schema::table('darets', function (Blueprint $table) {
            if (! Schema::hasColumn('darets', 'frequency')) {
                $table->string('frequency')->default('monthly');
            }
            if (! Schema::hasColumn('darets', 'payout_order_type')) {
                $table->string('payout_order_type')->default('random');
            }
            if (! Schema::hasColumn('darets', 'invite_code')) {
                // Temporarily nullable so existing rows don't violate NOT NULL.
                $table->string('invite_code')->nullable();
            }
            if (! Schema::hasColumn('darets', 'current_members')) {
                $table->unsignedInteger('current_members')->default(1);
            }
        });

        // ── Step 2: back-fill invite_code for any existing rows ───────────────
        DB::table('darets')->whereNull('invite_code')->orderBy('id')->each(function ($daret) {
            do {
                $code = 'DRT-' . strtoupper(Str::random(6));
            } while (DB::table('darets')->where('invite_code', $code)->exists());

            DB::table('darets')->where('id', $daret->id)->update(['invite_code' => $code]);
        });

        // ── Step 3: add unique index on invite_code (separate call for SQLite) ─
        $indexes = collect(DB::select("PRAGMA index_list('darets')"))->pluck('name')->all();
        if (! in_array('darets_invite_code_unique', $indexes, true)) {
            Schema::table('darets', function (Blueprint $table) {
                $table->unique('invite_code');
            });
        }
    }

    public function down(): void
    {
        Schema::table('darets', function (Blueprint $table) {
            foreach (['current_members', 'invite_code', 'payout_order_type', 'frequency'] as $col) {
                if (Schema::hasColumn('darets', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
