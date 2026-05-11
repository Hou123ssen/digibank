<?php

namespace App\Http\Resources;

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
            'beneficiary' => $this->whenLoaded('beneficiary', fn () => new UserSummaryResource($this->beneficiary)),
            'payments' => $this->whenLoaded('payments', fn () => DaretPaymentResource::collection($this->payments)),
        ];
    }
}
