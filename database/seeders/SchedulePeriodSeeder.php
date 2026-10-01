<?php

namespace Database\Seeders;

use App\Models\College;
use App\Models\Hte;
use App\Models\SchedulePeriod;
use Illuminate\Database\Seeder;

class SchedulePeriodSeeder extends Seeder
{
    /**
     * Seed all 3 tiers of the schedule period hierarchy:
     * 1. Global Admin Schedule (Tier 1)
     * 2. College Schedule (Tier 2)
     * 3. HTE Specific Override (Tier 3)
     */
    public function run(): void
    {
        $cic = College::where('code', 'CIC')->first();
        $accenture = Hte::where('hte_name', 'Accenture Solutions Philippines')->first();

        // 1. Tier 1: University-Wide Global Default Schedule (08:00 AM)
        SchedulePeriod::updateOrCreate(
            [
                'name' => 'AY 2026-2027 1st Semester University-Wide Schedule',
                'college_id' => null,
                'hte_id' => null,
            ],
            [
                'start_date' => '2026-06-01',
                'end_date' => '2026-12-31',
                'day_schedule' => [
                    'monday' => '08:00',
                    'tuesday' => '08:00',
                    'wednesday' => '08:00',
                    'thursday' => '08:00',
                    'friday' => '08:00',
                    'saturday' => null,
                    'sunday' => null,
                ],
            ]
        );

        // 2. Tier 2: College-Specific Schedule (CIC Early Shift: 07:30 AM)
        if ($cic) {
            SchedulePeriod::updateOrCreate(
                [
                    'name' => 'CIC Early Shift Schedule',
                    'college_id' => $cic->id,
                    'hte_id' => null,
                ],
                [
                    'start_date' => '2026-06-01',
                    'end_date' => '2026-12-31',
                    'day_schedule' => [
                        'monday' => '07:30',
                        'tuesday' => '07:30',
                        'wednesday' => '07:30',
                        'thursday' => '07:30',
                        'friday' => '07:30',
                        'saturday' => null,
                        'sunday' => null,
                    ],
                ]
            );
        }

        // 3. Tier 3: HTE Override Schedule (Accenture Corporate Shift: 09:00 AM)
        if ($accenture) {
            SchedulePeriod::updateOrCreate(
                [
                    'name' => 'Accenture Tech Shift Override',
                    'hte_id' => $accenture->hte_id,
                ],
                [
                    'college_id' => null,
                    'start_date' => '2026-06-01',
                    'end_date' => '2026-12-31',
                    'day_schedule' => [
                        'monday' => '09:00',
                        'tuesday' => '09:00',
                        'wednesday' => '09:00',
                        'thursday' => '09:00',
                        'friday' => '09:00',
                        'saturday' => null,
                        'sunday' => null,
                    ],
                ]
            );
        }
    }
}
