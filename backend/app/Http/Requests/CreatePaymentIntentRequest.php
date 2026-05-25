<?php

namespace App\Http\Requests;

use App\Models\PaymentIntent;
use Illuminate\Validation\Rule;

class CreatePaymentIntentRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:10', 'max:50000'],
            'gateway' => ['required', 'string', Rule::in([
                PaymentIntent::GATEWAY_STRIPE,
                PaymentIntent::GATEWAY_CMI,
                PaymentIntent::GATEWAY_BANK,
            ])],
        ];
    }
}
