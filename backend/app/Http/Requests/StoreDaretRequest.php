<?php

namespace App\Http\Requests;

class StoreDaretRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'contribution_amount' => ['required', 'numeric', 'gt:0'],
            'total_members' => ['required', 'integer', 'min:2', 'max:100'],
            'frequency' => ['nullable', 'in:monthly,weekly'],
            'payout_order_type' => ['nullable', 'in:sequential,random,auto_rotation'],
        ];
    }
}
