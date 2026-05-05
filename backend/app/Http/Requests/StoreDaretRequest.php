<?php

namespace App\Http\Requests;

class StoreDaretRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'contribution_amount' => ['required', 'numeric', 'gt:0'],
            'total_members' => ['required', 'integer', 'min:2', 'max:100'],
        ];
    }
}
