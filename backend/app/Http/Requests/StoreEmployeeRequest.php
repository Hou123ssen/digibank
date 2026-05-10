<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class StoreEmployeeRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:8'],
            'department' => ['required', Rule::in(['kyc', 'tickets', 'cagnotte', 'audit', 'support'])],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}
