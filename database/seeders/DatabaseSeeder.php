<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database with complete system-wide test data.
     */
    public function run(): void
    {
        $this->call([
            CampusSeeder::class,
            CollegeSeeder::class,
            ProgramSeeder::class,
            HteSeeder::class,
            KioskSeeder::class,
            SchedulePeriodSeeder::class,
            AdminUserSeeder::class,
            SupervisorSeeder::class,
            DocumentTemplateSeeder::class,
            InternSeeder::class,
            InternDocumentSeeder::class,
            AttendanceSeeder::class,
            NotificationSeeder::class,
        ]);
    }
}
