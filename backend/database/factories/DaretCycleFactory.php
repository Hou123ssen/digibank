<?php

namespace Database\Factories;

use App\Models\Daret;
use App\Models\DaretCycle;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DaretCycle>
 */
class DaretCycleFactory extends Factory
{
    protected $model = DaretCycle::class;

    public function definition(): array
    {
        return [
            'daret_id' => Daret::factory(),
            'cycle_number' => 1,
            'beneficiary_user_id' => User::factory(),
            'due_date' => now()->addMonth()->toDateString(),
            'status' => DaretCycle::STATUS_PENDING,
            'started_at' => null,
            'completed_at' => null,
        ];
    }
}
