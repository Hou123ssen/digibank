<?php

namespace Database\Factories;

use App\Models\DaretCycle;
use App\Models\DaretPayment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DaretPayment>
 */
class DaretPaymentFactory extends Factory
{
    protected $model = DaretPayment::class;

    public function definition(): array
    {
        return [
            'daret_cycle_id' => DaretCycle::factory(),
            'daret_id' => fn (array $attributes) => DaretCycle::find($attributes['daret_cycle_id'])?->daret_id,
            'user_id' => User::factory(),
            'amount' => fake()->randomFloat(2, 50, 5000),
            'status' => DaretPayment::STATUS_PENDING,
            'paid_at' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (): array => [
            'status' => DaretPayment::STATUS_PAID,
            'paid_at' => now(),
        ]);
    }
}
