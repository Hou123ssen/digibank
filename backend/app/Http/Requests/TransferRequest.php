<?php

namespace App\Http\Requests;

class TransferRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'account_number' => ['required', 'string', 'exists:accounts,account_number'],
            'amount' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
