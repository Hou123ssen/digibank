<?php

namespace Database\Factories;

use App\Models\Daret;
use App\Models\DaretMember;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DaretMember>
 */
class DaretMemberFactory extends Factory
{
    protected $model = DaretMember::class;

    public function definition(): array
    {
        return [
            'daret_id' => Daret::factory(),
            'user_id' => User::factory(),
            'payout_order' => null,
            'joined_at' => now(),
            'is_creator' => false,
            'status' => DaretMember::STATUS_ACTIVE,
        ];
    }
}
