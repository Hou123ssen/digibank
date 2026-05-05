<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('accounts')) {
            return;
        }

        DB::table('accounts')
            ->select('accounts.id', 'users.trust_score', 'kyc_verifications.status')
            ->join('users', 'accounts.user_id', '=', 'users.id')
            ->leftJoin('kyc_verifications', 'kyc_verifications.user_id', '=', 'users.id')
            ->orderBy('accounts.id')
            ->each(function (object $account): void {
                DB::table('accounts')
                    ->where('id', $account->id)
                    ->update([
                        'overdraft_limit' => (int) $account->trust_score >= 70 && $account->status === 'approved'
                            ? 500
                            : 0,
                    ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('accounts')) {
            return;
        }

        DB::table('accounts')->update([
            'overdraft_limit' => 500,
        ]);
    }
};
