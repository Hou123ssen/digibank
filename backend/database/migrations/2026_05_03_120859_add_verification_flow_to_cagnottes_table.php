<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('cagnottes')) {
            return;
        }

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE cagnottes MODIFY status ENUM('pending', 'active', 'rejected', 'completed') DEFAULT 'pending'");
        }

        Schema::table('cagnottes', function (Blueprint $table) {
            if (! Schema::hasColumn('cagnottes', 'verification_code')) {
                $table->string('verification_code')->nullable()->unique()->after('creator_id');
            }

            if (! Schema::hasColumn('cagnottes', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('cagnottes', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }

            if (! Schema::hasColumn('cagnottes', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('approved_at');
            }
        });

        DB::table('cagnottes')
            ->whereNull('verification_code')
            ->orderBy('id')
            ->each(function (object $cagnotte): void {
                DB::table('cagnottes')
                    ->where('id', $cagnotte->id)
                    ->update(['verification_code' => 'CAG-'.str_pad((string) $cagnotte->id, 6, '0', STR_PAD_LEFT)]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cagnottes', function (Blueprint $table) {
            if (Schema::hasColumn('cagnottes', 'rejection_reason')) {
                $table->dropColumn('rejection_reason');
            }

            if (Schema::hasColumn('cagnottes', 'approved_at')) {
                $table->dropColumn('approved_at');
            }

            if (Schema::hasColumn('cagnottes', 'approved_by')) {
                $table->dropConstrainedForeignId('approved_by');
            }

            if (Schema::hasColumn('cagnottes', 'verification_code')) {
                $table->dropUnique(['verification_code']);
                $table->dropColumn('verification_code');
            }
        });

        if (Schema::hasTable('cagnottes') && in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE cagnottes MODIFY status ENUM('active', 'completed') DEFAULT 'active'");
        }
    }
};
