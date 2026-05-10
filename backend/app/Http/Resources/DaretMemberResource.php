<?php

namespace App\Http\Resources;

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
            'user' => $this->whenLoaded('user', fn () => new UserSummaryResource($this->user)),
        ];
    }
}
