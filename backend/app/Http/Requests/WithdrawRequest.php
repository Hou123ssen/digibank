<?php

namespace App\Http\Requests;

class WithdrawRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
