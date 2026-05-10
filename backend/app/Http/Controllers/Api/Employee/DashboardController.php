<?php

namespace App\Http\Controllers\Api\Employee;

use App\Http\Controllers\Controller;
use App\Models\Cagnotte;
use App\Models\CagnotteDonation;
use App\Models\KycVerification;
use App\Models\Ticket;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();
        $department = $this->department($user->department);

        return ApiResponse::success('Employee dashboard stats retrieved successfully.', match ($department) {
            'kyc' => $this->kycStats(),
            'tickets' => $this->ticketStats($user->id),
            'cagnotte' => $this->cagnotteStats($user->id),
            default => [
                'department' => $department,
                'cards' => [],
                'activity' => [],
            ],
        });
    }

    public function performance(Request $request)
    {
        $user = $request->user();
        $department = $this->department($user->department);

        return ApiResponse::success('Employee performance retrieved successfully.', match ($department) {
            'tickets' => [
                'resolved_this_week' => Ticket::query()
                    ->where('assigned_to', $user->id)
                    ->where('status', Ticket::STATUS_RESOLVED)
                    ->where('updated_at', '>=', now()->startOfWeek())
                    ->count(),
                'avg_response_time' => '0 min',
                'satisfaction_rate' => 0,
            ],
            'kyc' => [
                'processed_this_week' => KycVerification::query()
                    ->where('reviewed_by', $user->id)
                    ->where('reviewed_at', '>=', now()->startOfWeek())
                    ->count(),
                'approval_rate' => $this->rate(
                    KycVerification::query()->where('reviewed_by', $user->id)->where('status', KycVerification::STATUS_APPROVED)->count(),
                    KycVerification::query()->where('reviewed_by', $user->id)->count()
                ),
            ],
            'cagnotte' => [
                'processed_this_week' => Cagnotte::query()
                    ->where('approved_by', $user->id)
                    ->where('updated_at', '>=', now()->startOfWeek())
                    ->count(),
                'approval_rate' => $this->rate(
                    Cagnotte::query()->where('approved_by', $user->id)->where('status', Cagnotte::STATUS_ACTIVE)->count(),
                    Cagnotte::query()->where('approved_by', $user->id)->count()
                ),
            ],
            default => [],
        });
    }

    public function activity(Request $request)
    {
        $user = $request->user();
        $department = $this->department($user->department);

        $activity = match ($department) {
            'kyc' => $this->kycActivity(),
            'tickets' => $this->ticketActivity($user->id),
            'cagnotte' => $this->cagnotteActivity(),
            default => [],
        };

        return ApiResponse::success('Employee activity retrieved successfully.', [
            'activities' => $activity,
        ]);
    }

    private function kycStats(): array
    {
        return [
            'department' => 'kyc',
            'pending_kyc' => KycVerification::query()
                ->whereIn('status', [KycVerification::STATUS_PENDING, KycVerification::STATUS_PENDING_REVIEW])
                ->count(),
            'needs_review' => KycVerification::query()->where('status', KycVerification::STATUS_NEEDS_REVIEW)->count(),
            'approved_today' => KycVerification::query()
                ->where('status', KycVerification::STATUS_APPROVED)
                ->whereDate('reviewed_at', today())
                ->count(),
            'rejected_today' => KycVerification::query()
                ->where('status', KycVerification::STATUS_REJECTED)
                ->whereDate('reviewed_at', today())
                ->count(),
            'activity' => $this->kycActivity(),
        ];
    }

    private function ticketStats(int $employeeId): array
    {
        $visibleTickets = Ticket::query()
            ->where(function ($query) use ($employeeId): void {
                $query->where('assigned_to', $employeeId)
                    ->orWhereNull('assigned_to');
            });

        $recentTickets = Ticket::query()
            ->where(function ($query) use ($employeeId): void {
                $query->where('assigned_to', $employeeId)
                    ->orWhereNull('assigned_to');
            })
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Ticket $ticket): array => [
                'id' => $ticket->id,
                'title' => $ticket->title,
                'priority' => $ticket->priority,
                'sentiment' => $ticket->sentiment,
                'status' => $ticket->status,
                'reference' => "#{$ticket->id}",
            ])
            ->values()
            ->all();

        return [
            'department' => 'tickets',
            'open_tickets' => (clone $visibleTickets)
                ->whereIn('status', [Ticket::STATUS_OPEN, Ticket::STATUS_IN_PROGRESS])
                ->count(),
            'assigned_tickets' => Ticket::query()->where('assigned_to', $employeeId)->count(),
            'urgent_tickets' => (clone $visibleTickets)
                ->where('priority', 'urgent')
                ->whereIn('status', [Ticket::STATUS_OPEN, Ticket::STATUS_IN_PROGRESS])
                ->count(),
            'resolved_tickets' => Ticket::query()->where('assigned_to', $employeeId)->where('status', Ticket::STATUS_RESOLVED)->count(),
            'avg_response_time' => '0 min',
            'satisfaction_rate' => 0,
            'recent_tickets' => $recentTickets,
            'activity' => $this->ticketActivity($employeeId),
        ];
    }

    private function cagnotteStats(int $employeeId): array
    {
        return [
            'department' => 'cagnotte',
            'pending_cagnotte' => Cagnotte::query()->where('status', Cagnotte::STATUS_PENDING)->count(),
            'approved_requests' => Cagnotte::query()
                ->where('approved_by', $employeeId)
                ->where('status', Cagnotte::STATUS_ACTIVE)
                ->count(),
            'rejected_requests' => Cagnotte::query()
                ->where('approved_by', $employeeId)
                ->where('status', Cagnotte::STATUS_REJECTED)
                ->count(),
            'donation_activity' => CagnotteDonation::query()->whereDate('created_at', today())->count(),
            'activity' => $this->cagnotteActivity(),
        ];
    }

    private function kycActivity(): array
    {
        return KycVerification::query()
            ->with('user:id,name,email')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (KycVerification $kyc): array => [
                'type' => 'kyc_' . $kyc->status,
                'description' => 'KYC ' . str_replace('_', ' ', $kyc->status),
                'subject' => $kyc->user?->name ?? $kyc->full_name,
                'created_at' => $kyc->updated_at,
            ])
            ->values()
            ->all();
    }

    private function ticketActivity(int $employeeId): array
    {
        return Ticket::query()
            ->where(function ($query) use ($employeeId): void {
                $query->where('assigned_to', $employeeId)
                    ->orWhereNull('assigned_to');
            })
            ->latest('updated_at')
            ->limit(8)
            ->get()
            ->map(fn (Ticket $ticket): array => [
                'type' => 'ticket_' . $ticket->status,
                'description' => 'Ticket ' . str_replace('_', ' ', $ticket->status),
                'subject' => $ticket->title,
                'created_at' => $ticket->updated_at,
            ])
            ->values()
            ->all();
    }

    private function cagnotteActivity(): array
    {
        return Cagnotte::query()
            ->latest('updated_at')
            ->limit(8)
            ->get()
            ->map(fn (Cagnotte $cagnotte): array => [
                'type' => 'cagnotte_' . $cagnotte->status,
                'description' => 'Cagnotte ' . str_replace('_', ' ', $cagnotte->status),
                'subject' => $cagnotte->title,
                'created_at' => $cagnotte->updated_at,
            ])
            ->values()
            ->all();
    }

    private function rate(int $part, int $total): int
    {
        return $total > 0 ? (int) round(($part / $total) * 100) : 0;
    }

    private function department(?string $department): string
    {
        return strtolower(trim((string) $department));
    }
}
