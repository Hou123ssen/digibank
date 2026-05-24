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
            if (! Schema::hasColumn('daret_members', 'auto_debit_authorized')) {
                $table->boolean('auto_debit_authorized')->default(false);
            }

            if (! Schema::hasColumn('daret_members', 'auto_debit_authorized_at')) {
                $table->timestamp('auto_debit_authorized_at')->nullable();
            }
        });

        DB::table('daret_members')
            ->where('auto_debit_authorized', false)
            ->update([
                'auto_debit_authorized' => true,
                'auto_debit_authorized_at' => now(),
            ]);
    }

    public function down(): void
    {
        Schema::table('daret_members', function (Blueprint $table) {
            foreach (['auto_debit_authorized_at', 'auto_debit_authorized'] as $column) {
                if (Schema::hasColumn('daret_members', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
