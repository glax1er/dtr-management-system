<?php

namespace Database\Seeders;

use App\Models\College;
use App\Models\Program;
use Illuminate\Database\Seeder;

class ProgramSeeder extends Seeder
{
    /**
     * Seed the academic programs interns can be registered under across colleges.
     */
    public function run(): void
    {
        $programs = [
            'CIC' => [
                ['name' => 'BSIT-BTM', 'hours' => 486],
                ['name' => 'BSIT-IS', 'hours' => 486],
                ['name' => 'BSCS', 'hours' => 300],
                ['name' => 'BLIS', 'hours' => 300],
            ],
            'CoE' => [
                ['name' => 'BSCE', 'hours' => 240],
                ['name' => 'BSEE', 'hours' => 240],
                ['name' => 'BSME', 'hours' => 240],
            ],
            'CBA' => [
                ['name' => 'BSBA', 'hours' => 600],
                ['name' => 'BSA', 'hours' => 400],
            ],
            'CoA' => [
                ['name' => 'BSAgri', 'hours' => 240],
            ],
        ];

        foreach ($programs as $collegeCode => $list) {
            $college = College::where('code', $collegeCode)->first();

            foreach ($list as $prog) {
                Program::updateOrCreate(
                    ['program_name' => $prog['name']],
                    [
                        'college_id' => $college?->id,
                        'required_hours' => $prog['hours'],
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
