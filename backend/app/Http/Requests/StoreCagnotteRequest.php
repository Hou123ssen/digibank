<?php

namespace App\Http\Requests;

class StoreCagnotteRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'target_amount' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
