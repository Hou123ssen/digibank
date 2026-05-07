<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDaretRequest;
use App\Models\Daret;
use App\Models\DaretPayment;
use App\Models\User;
use App\Services\DaretService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class DaretController extends Controller
{
    public function __construct(private readonly DaretService $daretService)
    {
    }

    public function index(Request $request)
    {
        $darets = Daret::query()
            ->with(['creator:id,name,email', 'members.user:id,name,email,trust_score'])
            ->withCount('members')
            ->latest()
            ->get()
            ->map(fn (Daret $daret): array => $this->formatDaretSummary($daret, $request->user()));

        return ApiResponse::success('Darets retrieved successfully.', [
            'darets' => $darets,
        ]);
    }

    public function my(Request $request)
    {
        $user = $request->user();

        $darets = Daret::query()
            ->with(['creator:id,name,email', 'members.user:id,name,email,trust_score'])
            ->withCount('members')
            ->where(function ($query) use ($user): void {
                $query->where('creator_id', $user->id)
                    ->orWhereHas('members', fn ($memberQuery) => $memberQuery->where('user_id', $user->id));
            })
            ->latest()
            ->get()
            ->map(fn (Daret $daret): array => $this->formatDaretSummary($daret, $user));

        return ApiResponse::success('User darets retrieved successfully.', [
            'darets' => $darets,
        ]);
    }

    public function show(Request $request, Daret $daret)
    {
        $daret->load([
            'creator:id,name,email',
            'members.user:id,name,email,trust_score',
            'members.payments',
            'cycles.payoutUser:id,name,email',
            'cycles.payments',
            'payments.user:id,name,email',
            'payments.member.user:id,name,email,trust_score',
            'payments.cycle:id,daret_id,cycle_number,status',
        ])->loadCount('members');

        return ApiResponse::success('Daret retrieved successfully.', [
            'daret' => $this->formatDaretDetail($daret, $request->user()),
        ]);
    }

    public function store(StoreDaretRequest $request)
    {
        $daret = $this->daretService->create($request->user(), $request->validated());

        return ApiResponse::success('Daret created successfully.', [
            'daret' => $daret,
        ], 201);
    }

    public function join(Request $request, Daret $daret)
    {
        $daret = $this->daretService->join($daret, $request->user());

        return ApiResponse::success('Joined Daret successfully.', [
            'daret' => $daret,
        ]);
    }

    public function start(Request $request, Daret $daret)
    {
        $daret = $this->daretService->start($daret, $request->user());

        return ApiResponse::success('Daret started successfully.', [
            'daret' => $daret,
        ]);
    }

    public function pay(Request $request, Daret $daret)
    {
        $result = $this->daretService->pay($daret, $request->user());

        return ApiResponse::success('Daret contribution paid successfully.', $result);
    }

    private function formatDaretSummary(Daret $daret, ?User $user): array
    {
        return [
            'id' => $daret->id,
            'creator_id' => $daret->creator_id,
            'name' => $daret->name,
            'contribution_amount' => $daret->contribution_amount,
            'total_members' => $daret->total_members,
            'capacity' => $daret->total_members,
            'members_count' => $daret->members_count ?? $daret->members()->count(),
            'status' => $daret->status,
            'current_cycle_number' => $daret->current_cycle_number,
            'current_cycle' => $daret->current_cycle_number,
            'total_cycles' => $daret->total_members,
            'started_at' => $daret->started_at,
            'start_date' => $daret->started_at,
            'completed_at' => $daret->completed_at,
            'created_at' => $daret->created_at,
            'updated_at' => $daret->updated_at,
            'creator' => $this->basicUser($daret->creator),
            'created_by' => $this->basicUser($daret->creator),
            'members' => $this->formatMembers($daret, $user),
            'is_creator' => $user ? $daret->creator_id === $user->id : false,
            'is_member' => $user ? $this->isMember($daret, $user) : false,
            'has_paid_current_cycle' => $user ? $this->hasPaidCurrentCycle($daret, $user) : false,
        ];
    }

    private function formatDaretDetail(Daret $daret, ?User $user): array
    {
        return [
            ...$this->formatDaretSummary($daret, $user),
            'members' => $this->formatMembers($daret, $user),
            'cycles' => $this->formatCycles($daret),
            'payments' => $this->formatPayments($daret),
        ];
    }

    private function formatMembers(Daret $daret, ?User $user): array
    {
        if (! $daret->relationLoaded('members')) {
            return [];
        }

        return $daret->members
            ->sortBy(fn ($member) => $member->payout_order ?? $member->id)
            ->values()
            ->map(function ($member) use ($daret): array {
                $memberUser = $member->user;

                return [
                    'id' => $member->id,
                    'daret_id' => $member->daret_id,
                    'user_id' => $member->user_id,
                    'name' => $memberUser?->name,
                    'email' => $memberUser?->email,
                    'trust_score' => $memberUser?->trust_score,
                    'payout_order' => $member->payout_order,
                    'joined_at' => $member->joined_at,
                    'is_creator' => $daret->creator_id === $member->user_id,
                    'has_paid_current_cycle' => $this->memberHasPaidCurrentCycle($member, $daret),
                    'user' => $this->basicUser($memberUser),
                ];
            })
            ->all();
    }

    private function formatCycles(Daret $daret): array
    {
        if (! $daret->relationLoaded('cycles')) {
            return [];
        }

        return $daret->cycles
            ->sortBy('cycle_number')
            ->values()
            ->map(fn ($cycle): array => [
                'id' => $cycle->id,
                'daret_id' => $cycle->daret_id,
                'cycle_number' => $cycle->cycle_number,
                'payout_user_id' => $cycle->payout_user_id,
                'status' => $cycle->status,
                'started_at' => $cycle->started_at,
                'scheduled_date' => $cycle->started_at,
                'completed_at' => $cycle->completed_at,
                'paid_count' => $cycle->relationLoaded('payments') ? $cycle->payments->count() : $cycle->payments()->count(),
                'total_members' => $daret->members_count ?? $daret->members()->count(),
                'recipient' => $this->basicUser($cycle->payoutUser),
                'beneficiary' => $this->basicUser($cycle->payoutUser),
                'payout_user' => $this->basicUser($cycle->payoutUser),
            ])
            ->all();
    }

    private function formatPayments(Daret $daret): array
    {
        if (! $daret->relationLoaded('payments')) {
            return [];
        }

        return $daret->payments
            ->sortByDesc('paid_at')
            ->values()
            ->map(function ($payment): array {
                $paymentUser = $payment->user;
                $memberUser = $payment->member?->user;

                return [
                    'id' => $payment->id,
                    'daret_id' => $payment->daret_id,
                    'daret_cycle_id' => $payment->daret_cycle_id,
                    'daret_member_id' => $payment->daret_member_id,
                    'user_id' => $payment->user_id,
                    'cycle_number' => $payment->cycle?->cycle_number,
                    'amount' => $payment->amount,
                    'status' => $payment->status,
                    'paid_at' => $payment->paid_at,
                    'created_at' => $payment->created_at,
                    'user' => $this->basicUser($paymentUser),
                    'member' => [
                        'id' => $payment->member?->id,
                        'user_id' => $payment->member?->user_id,
                        'name' => $memberUser?->name,
                        'email' => $memberUser?->email,
                        'trust_score' => $memberUser?->trust_score,
                        'user' => $this->basicUser($memberUser),
                    ],
                ];
            })
            ->all();
    }

    private function basicUser(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ];
    }

    private function isMember(Daret $daret, User $user): bool
    {
        if ($daret->relationLoaded('members')) {
            return $daret->members->contains('user_id', $user->id);
        }

        return $daret->members()->where('user_id', $user->id)->exists();
    }

    private function hasPaidCurrentCycle(Daret $daret, User $user): bool
    {
        if (! $daret->current_cycle_number) {
            return false;
        }

        return $daret->payments()
            ->where('user_id', $user->id)
            ->where('status', DaretPayment::STATUS_PAID)
            ->whereHas('cycle', fn ($query) => $query->where('cycle_number', $daret->current_cycle_number))
            ->exists();
    }

    private function memberHasPaidCurrentCycle($member, Daret $daret): bool
    {
        if (! $daret->current_cycle_number) {
            return false;
        }

        if ($member->relationLoaded('payments')) {
            return $member->payments->contains(function ($payment) use ($daret): bool {
                return $payment->status === DaretPayment::STATUS_PAID
                    && $payment->cycle?->cycle_number === $daret->current_cycle_number;
            });
        }

        return $member->payments()
            ->where('status', DaretPayment::STATUS_PAID)
            ->whereHas('cycle', fn ($query) => $query->where('cycle_number', $daret->current_cycle_number))
            ->exists();
    }
}
