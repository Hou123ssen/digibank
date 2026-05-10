<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Schema;

class UserController extends Controller
{
    public function index()
    {
        $hasPhone = Schema::hasColumn('users', 'phone');

        $users = User::query()
            ->with([
                'account:id,user_id,balance,account_number,status',
                'kycVerification:id,user_id,status,cin_front_path,cin_back_path,selfie_path,created_at,updated_at',
                'trustScoreLogs:id,user_id,change_type,points,old_score,new_score,reason,created_at',
                'daretMemberships.daret:id,name,status',
                'cagnottes:id,creator_id,title,target_amount,current_amount,status',
                'tickets:id,user_id,title,status,priority,created_at',
            ])
            ->latest()
            ->get()
            ->map(fn (User $user): array => $this->formatUser($user, $hasPhone))
            ->values();

        return ApiResponse::success('Users retrieved successfully.', $users);
    }

    private function formatUser(User $user, bool $hasPhone): array
    {
        $score = (int) ($user->trust_score ?? 0);
        $account = $user->account;
        $kyc = $user->kycVerification;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $hasPhone ? $user->phone : null,
            'role' => $user->role,
            'status' => $user->status ?? $account?->status ?? 'active',
            'created_at' => $user->created_at,
            'account' => [
                'balance' => (float) ($account?->balance ?? 0),
                'account_number' => $account?->account_number,
                'status' => $account?->status ?? 'active',
            ],
            'kyc' => [
                'status' => $kyc?->status ?? 'not_submitted',
                'cin_front_url' => $kyc?->cin_front_url,
                'cin_back_url' => $kyc?->cin_back_url,
                'selfie_url' => $kyc?->selfie_url,
                'submitted_at' => $kyc?->created_at,
            ],
            'trust_score' => [
                'score' => $score,
                'level' => $this->trustLevel($score),
            ],
            'trust_history' => $user->trustScoreLogs
                ->sortByDesc('created_at')
                ->map(fn ($log): array => [
                    'action' => $log->reason,
                    'delta' => $log->change_type === 'decrease' ? -$log->points : $log->points,
                    'date' => $log->created_at,
                    'by' => 'System',
                ])
                ->values()
                ->all(),
            'darets' => $user->daretMemberships
                ->map(fn ($membership): array => [
                    'name' => $membership->daret?->name ?? 'Daret',
                    'role' => $membership->payout_order === 1 ? 'creator' : 'member',
                    'status' => $membership->daret?->status ?? 'unknown',
                ])
                ->values()
                ->all(),
            'cagnottes' => $user->cagnottes
                ->map(fn ($cagnotte): array => [
                    'title' => $cagnotte->title,
                    'raised' => (float) $cagnotte->current_amount,
                    'goal' => (float) $cagnotte->target_amount,
                    'status' => $cagnotte->status,
                ])
                ->values()
                ->all(),
            'tickets' => $user->tickets
                ->map(fn ($ticket): array => [
                    'subject' => $ticket->title,
                    'status' => $ticket->status,
                    'priority' => $ticket->priority,
                    'created_at' => $ticket->created_at,
                ])
                ->values()
                ->all(),
            'logs' => [],
        ];
    }

    private function trustLevel(int $score): string
    {
        return match (true) {
            $score >= 80 => 'excellent',
            $score >= 65 => 'trusted',
            $score >= 40 => 'normal',
            default => 'risky',
        };
    }
}
