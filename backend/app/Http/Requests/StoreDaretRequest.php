<?php

namespace App\Http\Requests;

class StoreDaretRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'name'                => ['required', 'string', 'max:255'],
            'description'         => ['nullable', 'string', 'max:1000'],
            'contribution_amount' => ['required', 'numeric', 'min:1'],
            'total_members'       => ['required', 'integer', 'min:2', 'max:100'],
            'frequency'           => ['nullable', 'string', 'in:monthly,weekly'],
            'payout_order_type'   => ['nullable', 'string', 'in:sequential,random,auto_rotation'],
        ];
    }
}
