<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'cih_team@gmail.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('geeks_cih_2026'),
                'role' => User::ROLE_ADMIN,
            ]
        );
    }
}
