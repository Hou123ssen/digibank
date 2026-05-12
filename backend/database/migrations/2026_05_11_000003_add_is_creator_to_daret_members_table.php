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
            if (! Schema::hasColumn('daret_members', 'is_creator')) {
                $table->boolean('is_creator')->default(false);
            }
        });

        // Back-fill: mark the creator row (daret creator_id matches user_id in daret_members).
        DB::statement('
            UPDATE daret_members
            SET is_creator = 1
            WHERE id IN (
                SELECT dm.id
                FROM daret_members dm
                INNER JOIN darets d ON d.id = dm.daret_id
                WHERE dm.user_id = d.creator_id
            )
        ');
    }

    public function down(): void
    {
        Schema::table('daret_members', function (Blueprint $table) {
            if (Schema::hasColumn('daret_members', 'is_creator')) {
                $table->dropColumn('is_creator');
            }
        });
    }
};
