<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JoinDaretByCodeRequest;
use App\Http\Requests\StoreDaretRequest;
use App\Http\Resources\DaretResource;
use App\Models\Daret;
use App\Models\DaretCycle;
use App\Models\DaretMember;
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
            ->with(['creator:id,name,email', 'members.user:id,name,email,trust_score', 'cycles'])
            ->whereHas('members', fn ($memberQuery) => $memberQuery->where('user_id', $user->id))
            ->latest()
            ->get();

        return ApiResponse::success('User darets retrieved successfully.', [
            'darets' => DaretResource::collection($darets)->resolve($request),
        ]);
    }

    public function show(Request $request, Daret $daret)
    {
        $daret->load([
            'creator:id,name,email',
            'members.user:id,name,email,trust_score',
            'cycles.beneficiary:id,name,email',
            'cycles.payments',
            'payments.user:id,name,email',
            'payments.cycle:id,daret_id,cycle_number,status',
        ]);

        return ApiResponse::success('Daret retrieved successfully.', [
            'daret' => (new DaretResource($daret))->resolve($request),
        ]);
    }

    public function store(StoreDaretRequest $request)
    {
        $daret = $this->daretService->create($request->user(), $request->validated());
        $daret->load(['creator:id,name,email', 'members.user:id,name,email,trust_score', 'cycles']);

        return ApiResponse::success('Daret created successfully.', [
            'daret' => (new DaretResource($daret))->resolve($request),
        ], 201);
    }

    public function joinByCode(JoinDaretByCodeRequest $request)
    {
        $daret = $this->daretService->joinByCode(
            $request->validated('invite_code'),
            $request->user()
        );
        $daret->load(['creator:id,name,email', 'members.user:id,name,email,trust_score', 'cycles']);

        return ApiResponse::success('Joined Daret successfully.', [
            'daret' => (new DaretResource($daret))->resolve($request),
        ]);
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

    public function analytics(Request $request)
    {
        $paidPayments = DaretPayment::query()->where('status', DaretPayment::STATUS_PAID);
        $expectedPayments = DaretCycle::query()
            ->join('darets', 'daret_cycles.daret_id', '=', 'darets.id')
            ->whereIn('daret_cycles.status', [
                DaretCycle::STATUS_PENDING,
                DaretCycle::STATUS_LATE,
                DaretCycle::STATUS_COMPLETED,
            ])
            ->sum('darets.current_members');
        $paidPaymentsCount = (clone $paidPayments)->count();
        $paymentCompletionRate = $expectedPayments > 0
            ? round(($paidPaymentsCount / $expectedPayments) * 100, 2)
            : 0.0;

        $userActiveDaretsCount = DaretMember::query()
            ->where('user_id', $request->user()->id)
            ->where('status', DaretMember::STATUS_ACTIVE)
            ->whereHas('daret', fn ($query) => $query->where('status', Daret::STATUS_ACTIVE))
            ->count();

        return ApiResponse::success('Daret analytics retrieved successfully.', [
            'analytics' => [
                'total_active_darets' => Daret::where('status', Daret::STATUS_ACTIVE)->count(),
                'completed_darets' => Daret::where('status', Daret::STATUS_COMPLETED)->count(),
                'total_daret_payments' => (float) (clone $paidPayments)->sum('amount'),
                'total_daret_payments_count' => $paidPaymentsCount,
                'total_pot_distributed' => (float) DaretPayment::query()
                    ->where('daret_payments.status', DaretPayment::STATUS_PAID)
                    ->whereHas('cycle', fn ($query) => $query->where('status', DaretCycle::STATUS_COMPLETED))
                    ->sum('amount'),
                'late_payments_count' => DaretPayment::where('status', DaretPayment::STATUS_LATE)->count(),
                'payment_completion_rate' => $paymentCompletionRate,
                'user_active_darets_count' => $userActiveDaretsCount,
            ],
        ]);
    }

    private function formatDaretSummary(Daret $daret, ?User $user): array
    {
        return [
            'id' => $daret->id,
            'creator_id' => $daret->creator_id,
            'name' => $daret->name,
            'description' => $daret->description,
            'contribution_amount' => $daret->contribution_amount,
            'total_members' => $daret->total_members,
            'capacity' => $daret->total_members,
            'current_members' => $daret->current_members,
            'members_count' => $daret->members_count ?? $daret->members()->count(),
            'frequency' => $daret->frequency,
            'payout_order_type' => $daret->payout_order_type,
            'invite_code' => $daret->invite_code,
            'status' => $daret->status,
            'current_cycle_number' => $this->currentCycleNumber($daret),
            'current_cycle' => $this->currentCycleNumber($daret),
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
                    'is_creator' => $member->is_creator,
                    'status' => $member->status,
                    'has_paid_current_cycle' => $this->memberHasPaidCurrentCycle($member, $daret),
                    'payment_status' => $this->memberCurrentPaymentStatus($member, $daret),
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
                'beneficiary_user_id' => $cycle->beneficiary_user_id,
                'payout_user_id' => $cycle->beneficiary_user_id,
                'due_date' => $cycle->due_date,
                'status' => $cycle->status,
                'started_at' => $cycle->started_at,
                'scheduled_date' => $cycle->due_date,
                'completed_at' => $cycle->completed_at,
                'paid_count' => $cycle->relationLoaded('payments')
                    ? $cycle->payments->where('status', DaretPayment::STATUS_PAID)->count()
                    : $cycle->payments()->where('status', DaretPayment::STATUS_PAID)->count(),
                'total_members' => $daret->members_count ?? $daret->members()->count(),
                'recipient' => $this->basicUser($cycle->beneficiary),
                'beneficiary' => $this->basicUser($cycle->beneficiary),
                'payout_user' => $this->basicUser($cycle->beneficiary),
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

                return [
                    'id' => $payment->id,
                    'daret_id' => $payment->daret_id,
                    'daret_cycle_id' => $payment->daret_cycle_id,
                    'user_id' => $payment->user_id,
                    'cycle_number' => $payment->cycle?->cycle_number,
                    'amount' => $payment->amount,
                    'status' => $payment->status,
                    'paid_at' => $payment->paid_at,
                    'created_at' => $payment->created_at,
                    'user' => $this->basicUser($paymentUser),
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
        $currentCycleNumber = $this->currentCycleNumber($daret);

        if (! $currentCycleNumber) {
            return false;
        }

        return $daret->payments()
            ->where('user_id', $user->id)
            ->where('status', DaretPayment::STATUS_PAID)
            ->whereHas('cycle', fn ($query) => $query->where('cycle_number', $currentCycleNumber))
            ->exists();
    }

    private function memberHasPaidCurrentCycle($member, Daret $daret): bool
    {
        return $this->memberCurrentPaymentStatus($member, $daret) === DaretPayment::STATUS_PAID;
    }

    private function memberCurrentPaymentStatus($member, Daret $daret): string
    {
        $currentCycleNumber = $this->currentCycleNumber($daret);

        if (! $currentCycleNumber) {
            return DaretPayment::STATUS_PENDING;
        }

        if ($member->relationLoaded('payments')) {
            return $member->payments->first(function ($payment) use ($currentCycleNumber): bool {
                return (int) $payment->cycle?->cycle_number === (int) $currentCycleNumber;
            })?->status ?? DaretPayment::STATUS_PENDING;
        }

        return $member->payments()
            ->whereHas('cycle', fn ($query) => $query->where('cycle_number', $currentCycleNumber))
            ->value('status') ?? DaretPayment::STATUS_PENDING;
    }

    private function currentCycleNumber(Daret $daret): ?int
    {
        if ($daret->relationLoaded('cycles')) {
            return $daret->cycles
                ->whereIn('status', [DaretCycle::STATUS_PENDING, DaretCycle::STATUS_LATE])
                ->sortBy('cycle_number')
                ->first()?->cycle_number;
        }

        return $daret->cycles()
            ->whereIn('status', [DaretCycle::STATUS_PENDING, DaretCycle::STATUS_LATE])
            ->oldest('cycle_number')
            ->value('cycle_number');
    }
}
