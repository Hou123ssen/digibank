<?php

namespace App\Http\Requests;

class JoinDaretByCodeRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'invite_code' => ['required', 'string', 'max:32'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('invite_code')) {
            $this->merge([
                'invite_code' => strtoupper(trim((string) $this->input('invite_code'))),
            ]);
        }
    }
}
