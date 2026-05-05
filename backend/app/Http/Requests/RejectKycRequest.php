<?php

namespace App\Http\Requests;

class RejectKycRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'rejection_reason' => ['required', 'string', 'max:2000'],
        ];
    }
}
