<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('darets', function (Blueprint $table) {
            if (! Schema::hasColumn('darets', 'current_cycle')) {
                $table->unsignedInteger('current_cycle')->nullable();
            }
        });

        DB::table('darets')
            ->whereNull('current_cycle')
            ->where('status', 'active')
            ->update(['current_cycle' => 1]);
    }

    public function down(): void
    {
        Schema::table('darets', function (Blueprint $table) {
            if (Schema::hasColumn('darets', 'current_cycle')) {
                $table->dropColumn('current_cycle');
            }
        });
    }
};
