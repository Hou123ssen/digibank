<?php

namespace App\Http\Requests;

class RejectCagnotteRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'rejection_reason' => ['required', 'string', 'max:2000'],
        ];
    }
}
