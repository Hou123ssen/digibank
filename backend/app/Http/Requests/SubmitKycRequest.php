<?php

namespace App\Http\Requests;

class SubmitKycRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'national_id_number' => ['required', 'string', 'max:100'],
            'full_name' => ['required', 'string', 'max:255'],
            'birth_date' => ['required', 'date', 'before:today'],
            'cin_front' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:4096'],
            'cin_back' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:4096'],
            'selfie' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }
}
