<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AiBankingContextService
{
    public function build(User $user, ?string $pageContext = null): array
    {
        $user->loadMissing(['account', 'kycVerification']);

        $transactions = $user->transactions()
            ->latest()
            ->limit(60)
            ->get();

        $now = Carbon::now();
        $monthStart = $now->copy()->startOfMonth();
        $previousMonthStart = $now->copy()->subMonthNoOverflow()->startOfMonth();
        $previousMonthEnd = $now->copy()->subMonthNoOverflow()->endOfMonth();

        $monthly = $transactions->filter(fn (Transaction $tx): bool => $tx->created_at >= $monthStart);
        $previousMonthly = $user->transactions()
            ->whereBetween('created_at', [$previousMonthStart, $previousMonthEnd])
            ->get();

        $monthlyOutgoing = $this->sumByTypes($monthly, [Transaction::TYPE_WITHDRAW, Transaction::TYPE_TRANSFER_OUT]);
        $monthlyIncoming = $this->sumByTypes($monthly, [Transaction::TYPE_DEPOSIT, Transaction::TYPE_TRANSFER_IN]);
        $previousOutgoing = $this->sumByTypes($previousMonthly, [Transaction::TYPE_WITHDRAW, Transaction::TYPE_TRANSFER_OUT]);
        $todayIncoming = $this->sumByTypes(
            $transactions->filter(fn (Transaction $tx): bool => $tx->created_at->isToday()),
            [Transaction::TYPE_DEPOSIT, Transaction::TYPE_TRANSFER_IN]
        );
        $todayOutgoing = $this->sumByTypes(
            $transactions->filter(fn (Transaction $tx): bool => $tx->created_at->isToday()),
            [Transaction::TYPE_WITHDRAW, Transaction::TYPE_TRANSFER_OUT]
        );

        $categories = $this->spendingCategories($monthly);

        return [
            'generated_at' => $now->toIso8601String(),
            'current_page' => $pageContext,
            'security_scope' => 'Only the authenticated user data below is available. Full account numbers, tokens, passwords, and secrets are never included.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ],
            'account' => [
                'status' => $user->account?->status,
                'masked_account_number' => $this->maskAccount($user->account?->account_number),
                'balance' => (float) ($user->account?->balance ?? 0),
                'overdraft_limit' => (float) ($user->account?->overdraft_limit ?? 0),
            ],
            'kyc' => [
                'status' => $user->kycVerification?->status ?? 'not_submitted',
                'is_approved' => $user->isKycApproved(),
                'rejection_reason' => $user->kycVerification?->rejection_reason,
                'submitted_at' => $user->kycVerification?->created_at?->toIso8601String(),
                'reviewed_at' => $user->kycVerification?->reviewed_at?->toIso8601String(),
            ],
            'trust_score' => [
                'score' => (int) $user->trust_score,
                'recent_logs' => $user->trustScoreLogs()
                    ->latest()
                    ->limit(8)
                    ->get(['change_type', 'points', 'reason', 'created_at'])
                    ->map(fn ($log): array => [
                        'change_type' => $log->change_type,
                        'points' => $log->points,
                        'reason' => $log->reason,
                        'created_at' => $log->created_at?->toIso8601String(),
                    ])
                    ->all(),
            ],
            'transactions' => [
                'recent' => $transactions
                    ->take(12)
                    ->map(fn (Transaction $tx): array => $this->transactionSummary($tx))
                    ->values()
                    ->all(),
                'monthly_stats' => [
                    'incoming' => $monthlyIncoming,
                    'outgoing' => $monthlyOutgoing,
                    'net' => $monthlyIncoming - $monthlyOutgoing,
                    'previous_month_outgoing' => $previousOutgoing,
                    'outgoing_change_percent' => $previousOutgoing > 0
                        ? round((($monthlyOutgoing - $previousOutgoing) / $previousOutgoing) * 100, 1)
                        : null,
                    'today_incoming' => $todayIncoming,
                    'today_outgoing' => $todayOutgoing,
                    'spending_categories' => $categories,
                    'unusual_transfers' => $this->unusualTransfers($monthly),
                ],
            ],
            'tickets' => [
                'recent' => $user->tickets()
                    ->latest()
                    ->limit(8)
                    ->get(['id', 'title', 'category', 'priority', 'status', 'created_at', 'updated_at'])
                    ->map(fn ($ticket): array => [
                        'id' => $ticket->id,
                        'title' => $ticket->title,
                        'category' => $ticket->category,
                        'priority' => $ticket->priority,
                        'status' => $ticket->status,
                        'created_at' => $ticket->created_at?->toIso8601String(),
                        'updated_at' => $ticket->updated_at?->toIso8601String(),
                    ])
                    ->all(),
            ],
            'notifications' => [
                'unread_count' => $user->notifications()->where('is_read', false)->count(),
                'recent' => $user->notifications()
                    ->latest()
                    ->limit(8)
                    ->get(['title', 'message', 'type', 'is_read', 'created_at'])
                    ->map(fn ($notification): array => [
                        'title' => $notification->title,
                        'message' => $notification->message,
                        'type' => $notification->type,
                        'is_read' => $notification->is_read,
                        'created_at' => $notification->created_at?->toIso8601String(),
                    ])
                    ->all(),
            ],
            'cagnottes' => [
                'my_requests' => $user->cagnottes()
                    ->latest()
                    ->limit(8)
                    ->get(['id', 'title', 'target_amount', 'current_amount', 'status', 'created_at'])
                    ->map(fn ($cagnotte): array => [
                        'id' => $cagnotte->id,
                        'title' => $cagnotte->title,
                        'target_amount' => (float) $cagnotte->target_amount,
                        'current_amount' => (float) $cagnotte->current_amount,
                        'status' => $cagnotte->status,
                        'created_at' => $cagnotte->created_at?->toIso8601String(),
                    ])
                    ->all(),
            ],
            'darets' => [
                'participation' => $user->daretMemberships()
                    ->with('daret:id,name,contribution_amount,total_members,status,current_cycle_number')
                    ->latest()
                    ->limit(8)
                    ->get()
                    ->map(fn ($member): array => [
                        'daret_id' => $member->daret?->id,
                        'name' => $member->daret?->name,
                        'contribution_amount' => (float) ($member->daret?->contribution_amount ?? 0),
                        'total_members' => $member->daret?->total_members,
                        'status' => $member->daret?->status,
                        'current_cycle' => $member->daret?->current_cycle_number,
                        'payout_order' => $member->payout_order,
                    ])
                    ->all(),
            ],
            'available_api_sources' => [
                'GET /api/accounts/me',
                'GET /api/transactions/me',
                'GET /api/kyc/me',
                'GET /api/trust-score/me',
                'GET /api/tickets/my',
                'GET /api/notifications',
                'GET /api/cagnottes',
                'GET /api/cagnottes/my-requests',
                'GET /api/darets',
                'GET /api/darets/my',
            ],
        ];
    }

    private function transactionSummary(Transaction $tx): array
    {
        return [
            'id' => $tx->id,
            'type' => $tx->type,
            'amount' => (float) $tx->amount,
            'status' => $tx->status,
            'reference' => $tx->reference,
            'description' => $tx->description,
            'is_overdraft' => (bool) $tx->is_overdraft,
            'overdraft_amount' => (float) ($tx->overdraft_amount ?? 0),
            'created_at' => $tx->created_at?->toIso8601String(),
        ];
    }

    private function sumByTypes(Collection $transactions, array $types): float
    {
        return round($transactions
            ->whereIn('type', $types)
            ->sum(fn (Transaction $tx): float => abs((float) $tx->amount)), 2);
    }

    private function spendingCategories(Collection $transactions): array
    {
        return $transactions
            ->filter(fn (Transaction $tx): bool => in_array($tx->type, [Transaction::TYPE_WITHDRAW, Transaction::TYPE_TRANSFER_OUT], true))
            ->groupBy(fn (Transaction $tx): string => $this->categoryFor($tx->description, $tx->type))
            ->map(fn (Collection $items): float => round($items->sum(fn (Transaction $tx): float => abs((float) $tx->amount)), 2))
            ->sortDesc()
            ->all();
    }

    private function unusualTransfers(Collection $transactions): array
    {
        $outgoing = $transactions
            ->filter(fn (Transaction $tx): bool => $tx->type === Transaction::TYPE_TRANSFER_OUT)
            ->values();

        $average = $outgoing->avg(fn (Transaction $tx): float => abs((float) $tx->amount)) ?: 0;
        $threshold = max(1000, $average * 2.5);

        return $outgoing
            ->filter(fn (Transaction $tx): bool => abs((float) $tx->amount) >= $threshold)
            ->take(5)
            ->map(fn (Transaction $tx): array => $this->transactionSummary($tx))
            ->values()
            ->all();
    }

    private function categoryFor(?string $description, string $type): string
    {
        $text = strtolower((string) $description);

        return match (true) {
            str_contains($text, 'restaurant') || str_contains($text, 'food') || str_contains($text, 'café') => 'restaurants',
            str_contains($text, 'rent') || str_contains($text, 'loyer') => 'housing',
            str_contains($text, 'school') || str_contains($text, 'education') => 'education',
            str_contains($text, 'health') || str_contains($text, 'medical') || str_contains($text, 'pharma') => 'health',
            str_contains($text, 'transport') || str_contains($text, 'taxi') => 'transport',
            $type === Transaction::TYPE_TRANSFER_OUT => 'transfers',
            default => 'cash_withdrawals',
        };
    }

    private function maskAccount(?string $accountNumber): ?string
    {
        if (! $accountNumber) {
            return null;
        }

        return '****' . substr($accountNumber, -4);
    }
}
