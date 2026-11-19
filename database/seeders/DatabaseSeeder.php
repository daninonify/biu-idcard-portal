<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Staff accounts. Change these passwords straight after the first login
     * (Settings > Password), or set SEED_ADMIN_PASSWORD before seeding.
     */
    public function run(): void
    {
        // `?:` so an empty SEED_ADMIN_PASSWORD= (as in .env.example) never seeds a blank password
        $password = env('SEED_ADMIN_PASSWORD') ?: 'ChangeMe!2026';

        User::query()->updateOrCreate(['email' => 'admin@idcard.test'], [
            'name' => 'Portal Administrator',
            'role' => Role::Admin,
            'is_active' => true,
            'password' => $password,
            'email_verified_at' => now(),
        ]);

        User::query()->updateOrCreate(['email' => 'operator@idcard.test'], [
            'name' => 'Card Operator',
            'role' => Role::Operator,
            'is_active' => true,
            'password' => $password,
            'email_verified_at' => now(),
        ]);

        if (config('idcard.directory.driver') === 'demo') {
            $this->call(DemoCardSeeder::class);
        }
    }
}
