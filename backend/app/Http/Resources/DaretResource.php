<?php

namespace App\Http\Resources;

use App\Models\DaretCycle;
use App\Models\DaretPayment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DaretResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'creator_id' => $this->creator_id,
            'name' => $this->name,
            'description' => $this->description,
            'contribution_amount' => $this->contribution_amount,
            'total_members' => $this->total_members,
            'capacity' => $this->total_members,
            'current_members' => $this->current_members,
            'members_count' => $this->membersCount(),
            'frequency' => $this->frequency,
            'payout_order_type' => $this->payout_order_type,
            'invite_code' => $this->invite_code,
            'status' => $this->status,
            'current_cycle_number' => $this->currentCycleNumber(),
            'current_cycle' => $this->currentCycleNumber(),
            'total_cycles' => $this->total_members,
            'started_at' => $this->started_at,
            'start_date' => $this->started_at,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'creator' => $this->whenLoaded('creator', fn () => new UserSummaryResource($this->creator)),
            'created_by' => $this->whenLoaded('creator', fn () => new UserSummaryResource($this->creator)),
            'is_creator' => $request->user() ? (int) $this->creator_id === (int) $request->user()->id : false,
            'is_member' => $request->user() ? $this->isMember($request->user()->id) : false,
            'has_paid_current_cycle' => $request->user() ? $this->hasPaidCurrentCycle($request->user()->id) : false,
            'current_payment_status' => $request->user() ? $this->currentPaymentStatus($request->user()->id) : null,
            'members' => $this->whenLoaded('members', fn () => DaretMemberResource::collection($this->members)),
            'cycles' => $this->whenLoaded('cycles', fn () => DaretCycleResource::collection($this->cycles)),
            'payments' => $this->whenLoaded('payments', fn () => DaretPaymentResource::collection($this->payments)),
        ];
    }

    private function currentCycleNumber(): ?int
    {
        if ($this->relationLoaded('cycles')) {
            return $this->cycles
                ->whereIn('status', [DaretCycle::STATUS_PENDING, DaretCycle::STATUS_LATE])
                ->sortBy('cycle_number')
                ->first()?->cycle_number;
        }

        return null;
    }

    private function membersCount(): int
    {
        if (isset($this->members_count)) {
            return (int) $this->members_count;
        }

        if ($this->relationLoaded('members')) {
            return $this->members->count();
        }

        return (int) $this->current_members;
    }

    private function isMember(int $userId): bool
    {
        if ($this->relationLoaded('members')) {
            return $this->members->contains('user_id', $userId);
        }

        return false;
    }

    private function hasPaidCurrentCycle(int $userId): bool
    {
        return $this->currentPaymentStatus($userId) === DaretPayment::STATUS_PAID;
    }

    private function currentPaymentStatus(int $userId): ?string
    {
        $cycleNumber = $this->currentCycleNumber();

        if (! $cycleNumber) {
            return null;
        }

        if ($this->relationLoaded('payments')) {
            return $this->payments->first(function ($payment) use ($cycleNumber, $userId): bool {
                return (int) $payment->user_id === $userId && (int) $payment->cycle?->cycle_number === $cycleNumber;
            })?->status;
        }

        return $this->payments()
            ->where('user_id', $userId)
            ->whereHas('cycle', fn ($query) => $query->where('cycle_number', $cycleNumber))
            ->value('status');
    }
}
