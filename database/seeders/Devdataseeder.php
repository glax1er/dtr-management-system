<?php

namespace Database\Seeders;

use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Dev-only: generates randomized HTEs, supervisors, interns, and
 * attendance logs so the supervisor "My Interns" page (sorting,
 * filtering, date-range) has real data to exercise instead of an
 * empty table.
 *
 * Not wired into DatabaseSeeder::run() on purpose — this is sample
 * data for local testing, not part of the app's real seed set. Run
 * it explicitly:
 *
 *   php artisan db:seed --class=DevDataSeeder
 */
class DevDataSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command->warn('Skipping DevDataSeeder: refusing to run in production.');

            return;
        }

        // Depends on programs already existing.
        $this->call(ProgramSeeder::class);

        $programIds = Program::pluck('program_id');

        collect(['USeP-CIC', 'USeP-CoE'])->each(function (string $hteName) use ($programIds) {
            $hte = Hte::create([
                'hte_name' => $hteName,
                'address' => fake()->address(),
                'contact_number' => fake()->numerify('09#########'),
                'status' => 'active',
            ]);

            $supervisorUser = User::create([
                'role' => User::ROLE_SUPERVISOR,
                'name' => fake()->name(),
                'email' => Str::slug($hteName) . '-supervisor@dtr.test',
                'password' => config('supervisor.default_supervisor_password'),
                'email_verified_at' => now(),
            ]);

            SupervisorProfile::create([
                'user_id' => $supervisorUser->id,
                'hte_id' => $hte->hte_id,
                'status' => 'active',
                'created_at' => now(),
            ]);

            $hte->refreshContactPerson();

            // A handful of interns per HTE, with names varied enough to
            // actually see the name filter/sort do something.
            collect(range(1, 8))->each(function (int $i) use ($hte, $programIds, $supervisorUser) {
                $internUser = User::create([
                    'role' => User::ROLE_INTERN,
                    'name' => fake()->name(),
                    'email' => fake()->unique()->safeEmail(),
                    'password' => 'password',
                    'email_verified_at' => now(),
                ]);

                InternProfile::create([
                    'user_id' => $internUser->id,
                    'id_number' => fake()->unique()->numerify('##-####-###'),
                    'contact_number' => fake()->numerify('09#########'),
                    'sex' => fake()->randomElement(['male', 'female']),
                    'hte_id' => $hte->hte_id,
                    'program_id' => $programIds->random(),
                    'status' => 'approved',
                    'qr_code_value' => (string) Str::uuid(),
                    'registered_at' => now(),
                    'approved_at' => now(),
                    'privacy_accepted_at' => now(),
                ]);

                $this->seedAttendanceLogs($internUser->id, $supervisorUser->id);
            });
        });
    }

    /**
     * Backfills the last 45 calendar days with plausible scans: skips
     * weekends, randomizes time-in around the punctuality cutoff so
     * both "On Time" and "Late" show up, and occasionally leaves a
     * day open (time-in only, no time-out) to exercise that state too.
     */
    private function seedAttendanceLogs(int $internUserId, int $supervisorUserId): void
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone);

        for ($daysAgo = 45; $daysAgo >= 1; $daysAgo--) {
            $date = $today->clone()->subDays($daysAgo);

            if ($date->isWeekend()) {
                continue;
            }

            // ~15% chance an intern just didn't come in that day.
            if (fake()->boolean(15)) {
                continue;
            }

            $timeIn = $date->clone()->setTime(7, 0)->addMinutes(fake()->numberBetween(0, 90));

            AttendanceLog::create([
                'intern_user_id' => $internUserId,
                'supervisor_user_id' => $supervisorUserId,
                'scan_timestamp' => $timeIn,
            ]);

            // ~10% chance of forgetting to time out — leaves the day "open".
            if (fake()->boolean(10)) {
                continue;
            }

            $timeOut = $date->clone()->setTime(16, 30)->addMinutes(fake()->numberBetween(0, 120));

            AttendanceLog::create([
                'intern_user_id' => $internUserId,
                'supervisor_user_id' => $supervisorUserId,
                'scan_timestamp' => $timeOut,
            ]);
        }
    }
}
