<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('darets', function (Blueprint $table) {
            if (! Schema::hasColumn('darets', 'description')) {
                // Note: ->after() is omitted — SQLite does not support column positioning.
                $table->text('description')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('darets', function (Blueprint $table) {
            if (Schema::hasColumn('darets', 'description')) {
                $table->dropColumn('description');
            }
        });
    }
};
