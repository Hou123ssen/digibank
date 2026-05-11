<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DaretPaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'daret_cycle_id' => $this->daret_cycle_id,
            'daret_id' => $this->daret_id,
            'user_id' => $this->user_id,
            'cycle_number' => $this->whenLoaded('cycle', fn () => $this->cycle?->cycle_number),
            'amount' => $this->amount,
            'status' => $this->status,
            'paid_at' => $this->paid_at,
            'created_at' => $this->created_at,
            'user' => $this->whenLoaded('user', fn () => new UserSummaryResource($this->user)),
        ];
    }
}
