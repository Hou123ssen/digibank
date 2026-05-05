<?php

namespace App\Http\Requests;

class StoreTicketMessageRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:5000'],
        ];
    }
}
