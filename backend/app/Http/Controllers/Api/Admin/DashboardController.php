<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cagnotte;
use App\Models\Daret;
use App\Models\KycVerification;
use App\Models\Transaction;
use App\Models\User;
use App\Support\ApiResponse;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function stats()
    {
        $totalUsers = $this->countUsersByRole(User::ROLE_USER);

        return ApiResponse::success('Admin dashboard stats retrieved successfully.', [
            'total_users' => $totalUsers,
            'employees_count' => $this->countUsersByRole(User::ROLE_EMPLOYEE),
            'active_darets' => $this->countWhereIn('darets', 'status', [Daret::STATUS_ACTIVE, 'started']),
            'active_cagnottes' => $this->countWhereIn('cagnottes', 'status', [Cagnotte::STATUS_ACTIVE, 'approved']),
            'transactions_today' => $this->countCreatedToday('transactions'),
            'user_growth' => $this->userGrowth(),
            'transaction_volume' => $this->transactionVolume(),
            'kyc_distribution' => $this->kycDistribution($totalUsers),
            'trust_level_distribution' => $this->trustLevelDistribution(),
            'system_events' => [],
        ]);
    }

    private function countUsersByRole(string $role): int
    {
        if (!Schema::hasTable('users') || !Schema::hasColumn('users', 'role')) {
            return 0;
        }

        return User::query()->where('role', $role)->count();
    }

    private function countWhereIn(string $table, string $column, array $values): int
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, $column)) {
            return 0;
        }

        return DB::table($table)->whereIn($column, $values)->count();
    }

    private function countCreatedToday(string $table): int
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'created_at')) {
            return 0;
        }

        return DB::table($table)->whereDate('created_at', today())->count();
    }

    private function userGrowth(): array
    {
        if (!Schema::hasTable('users') || !Schema::hasColumn('users', 'created_at')) {
            return [];
        }

        $start = today()->subDays(29);
        $counts = User::query()
            ->selectRaw('DATE(created_at) as signup_date, COUNT(*) as aggregate')
            ->where('role', User::ROLE_USER)
            ->whereDate('created_at', '>=', $start)
            ->groupBy('signup_date')
            ->pluck('aggregate', 'signup_date');

        return collect(CarbonPeriod::create($start, today()))
            ->map(fn ($date): array => [
                'date' => $date->toDateString(),
                'count' => (int) ($counts[$date->toDateString()] ?? 0),
            ])
            ->values()
            ->all();
    }

    private function transactionVolume(): array
    {
        return [
            'transfers' => $this->countTransactionsByTypes([
                Transaction::TYPE_TRANSFER_IN,
                Transaction::TYPE_TRANSFER_OUT,
            ]),
            'deposits' => $this->countTransactionsByTypes([Transaction::TYPE_DEPOSIT]),
            'withdrawals' => $this->countTransactionsByTypes([Transaction::TYPE_WITHDRAW]),
            'daret_payments' => $this->countWhereIn('daret_payments', 'status', ['paid']),
            'cagnotte_donations' => $this->tableCount('cagnotte_donations'),
        ];
    }

    private function countTransactionsByTypes(array $types): int
    {
        if (!Schema::hasTable('transactions') || !Schema::hasColumn('transactions', 'type')) {
            return 0;
        }

        return Transaction::query()->whereIn('type', $types)->count();
    }

    private function tableCount(string $table): int
    {
        if (!Schema::hasTable($table)) {
            return 0;
        }

        return DB::table($table)->count();
    }

    private function kycDistribution(int $totalUsers): array
    {
        $distribution = [
            'approved' => 0,
            'pending' => 0,
            'pending_review' => 0,
            'needs_review' => 0,
            'rejected' => 0,
            'not_submitted' => 0,
        ];

        if (!Schema::hasTable('kyc_verifications') || !Schema::hasColumn('kyc_verifications', 'status')) {
            $distribution['not_submitted'] = $totalUsers;

            return $distribution;
        }

        foreach (array_keys($distribution) as $status) {
            if ($status === 'not_submitted') {
                continue;
            }

            $distribution[$status] = KycVerification::query()
                ->whereHas('user', fn ($query) => $query->where('role', User::ROLE_USER))
                ->where('status', $status)
                ->count();
        }

        $submittedUsers = KycVerification::query()
            ->whereHas('user', fn ($query) => $query->where('role', User::ROLE_USER))
            ->distinct('user_id')
            ->count('user_id');
        $distribution['not_submitted'] = max(0, $totalUsers - $submittedUsers);

        return $distribution;
    }

    private function trustLevelDistribution(): array
    {
        $distribution = [
            'excellent' => 0,
            'trusted' => 0,
            'normal' => 0,
            'risky' => 0,
        ];

        if (!Schema::hasTable('users') || !Schema::hasColumn('users', 'trust_score')) {
            return $distribution;
        }

        $userQuery = User::query()->where('role', User::ROLE_USER);

        $distribution['excellent'] = (clone $userQuery)->where('trust_score', '>=', 80)->count();
        $distribution['trusted'] = (clone $userQuery)->whereBetween('trust_score', [65, 79])->count();
        $distribution['normal'] = (clone $userQuery)->whereBetween('trust_score', [40, 64])->count();
        $distribution['risky'] = (clone $userQuery)->where('trust_score', '<', 40)->count();

        return $distribution;
    }
}
