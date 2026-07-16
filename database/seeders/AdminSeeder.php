<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    /**
     * Seed the first admin account.
     *
     * Admins are never self-registered — this is the one-time bootstrap
     * account. Credentials come from the environment so nothing sensitive
     * is hardcoded in source, with safe fallback defaults for local dev
     * only. In production, seeding is skipped entirely unless ADMIN_EMAIL
     * and ADMIN_PASSWORD are both explicitly set.
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (app()->environment('production') && (! $email || ! $password)) {
            $this->command?->warn(
                'Skipping AdminSeeder: ADMIN_EMAIL / ADMIN_PASSWORD are not set in production.',
            );

            return;
        }

        User::firstOrCreate(
            ['email' => $email ?? 'admin@dtr.test'],
            [
                'role' => User::ROLE_ADMIN,
                'name' => 'System Admin',
                'password' => $password ?? 'password',
                'email_verified_at' => now(),
            ],
        );
    }
}