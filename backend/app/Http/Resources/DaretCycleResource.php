<?php

namespace App\Http\Resources;

use App\Models\DaretPayment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DaretCycleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'daret_id' => $this->daret_id,
            'cycle_number' => $this->cycle_number,
            'beneficiary_user_id' => $this->beneficiary_user_id,
            'due_date' => $this->due_date,
            'status' => $this->status,
            'started_at' => $this->started_at,
            'completed_at' => $this->completed_at,
            'scheduled_date' => $this->due_date,
            'paid_count' => $this->relationLoaded('payments')
                ? $this->payments->where('status', DaretPayment::STATUS_PAID)->count()
                : $this->payments()->where('status', DaretPayment::STATUS_PAID)->count(),
            'total_members' => $this->daret?->current_members,
            'beneficiary' => $this->whenLoaded('beneficiary', fn () => new UserSummaryResource($this->beneficiary)),
            'recipient' => $this->whenLoaded('beneficiary', fn () => new UserSummaryResource($this->beneficiary)),
            'payout_user' => $this->whenLoaded('beneficiary', fn () => new UserSummaryResource($this->beneficiary)),
            'payments' => $this->whenLoaded('payments', fn () => DaretPaymentResource::collection($this->payments)),
        ];
    }
}
