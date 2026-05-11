<?php

namespace App\Http\Resources;

use App\Models\DaretCycle;
use App\Models\DaretPayment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DaretMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'daret_id' => $this->daret_id,
            'user_id' => $this->user_id,
            'payout_order' => $this->payout_order,
            'joined_at' => $this->joined_at,
            'is_creator' => (bool) $this->is_creator,
            'status' => $this->status,
            'has_paid_current_cycle' => $this->hasPaidCurrentCycle(),
            'payment_status' => $this->currentPaymentStatus(),
            'user' => $this->whenLoaded('user', fn () => new UserSummaryResource($this->user)),
        ];
    }

    private function hasPaidCurrentCycle(): bool
    {
        return $this->currentPaymentStatus() === DaretPayment::STATUS_PAID;
    }

    private function currentPaymentStatus(): string
    {
        $cycleId = DaretCycle::query()
            ->where('daret_id', $this->daret_id)
            ->whereIn('status', [DaretCycle::STATUS_PENDING, DaretCycle::STATUS_LATE])
            ->oldest('cycle_number')
            ->value('id');

        if (! $cycleId) {
            return DaretPayment::STATUS_PENDING;
        }

        return DaretPayment::query()
            ->where('daret_cycle_id', $cycleId)
            ->where('user_id', $this->user_id)
            ->value('status') ?? DaretPayment::STATUS_PENDING;
    }
}
