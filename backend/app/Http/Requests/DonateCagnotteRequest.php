<?php

namespace App\Http\Requests;

class DonateCagnotteRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
