<?php

namespace Database\Seeders;

use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class OjtSupervisorSeeder extends Seeder
{
    /**
     * Seed OJT supervisors for testing purposes.
     * Usage: php artisan db:seed --class=OjtSupervisorSeeder
     *
     * Creates:
     * - 1 OJT supervisor for BSIT-BTM program
     * - 1 OJT supervisor for BSCS program (if exists)
     */
    public function run(): void
    {
        $programs = Program::where('is_active', true)
            ->limit(2)
            ->get();

        if ($programs->isEmpty()) {
            $this->command->warn('No active programs found. Please seed programs first.');
            return;
        }

        DB::transaction(function () use ($programs) {
            foreach ($programs as $index => $program) {
                $this->createOjtSupervisor(
                    name: "OJT Supervisor {$program->program_name}",
                    email: "ojt-supervisor-{$program->program_id}@dtr.local",
                    program: $program,
                );
            }
        });

        $this->command->info('OJT supervisors seeded successfully.');
    }

    private function createOjtSupervisor(string $name, string $email, Program $program): void
    {
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make(config('supervisor.default_supervisor_password')),
                'role' => User::ROLE_SUPERVISOR,
            ]
        );

        SupervisorProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'program_id' => $program->program_id,
                'supervisor_type' => 'ojt',
                'status' => 'active',
                'created_at' => now(),
            ]
        );

        $this->command->line("Created OJT Supervisor: <comment>{$name}</comment> ({$email})");
    }
}
