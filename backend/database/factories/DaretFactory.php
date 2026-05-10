<?php

namespace Database\Factories;

use App\Models\Daret;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Daret>
 */
class DaretFactory extends Factory
{
    protected $model = Daret::class;

    public function definition(): array
    {
        $totalMembers = fake()->numberBetween(2, 12);

        return [
            'creator_id' => User::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'contribution_amount' => fake()->randomFloat(2, 50, 5000),
            'total_members' => $totalMembers,
            'current_members' => 1,
            'frequency' => fake()->randomElement([Daret::FREQUENCY_MONTHLY, Daret::FREQUENCY_WEEKLY]),
            'payout_order_type' => fake()->randomElement([
                Daret::PAYOUT_ORDER_SEQUENTIAL,
                Daret::PAYOUT_ORDER_RANDOM,
                Daret::PAYOUT_ORDER_AUTO_ROTATION,
            ]),
            'status' => Daret::STATUS_OPEN,
            'started_at' => null,
            'completed_at' => null,
        ];
    }
}
