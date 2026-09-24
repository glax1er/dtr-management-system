<?php

namespace Database\Seeders;

use App\Models\College;
use App\Models\Program;
use Illuminate\Database\Seeder;

class ProgramSeeder extends Seeder
{
    /**
     * Seed the programs interns can be registered under.
     */
    public function run(): void
    {
        $programs = [
            'BSIT-BTM',
            'BSIT-IS',
            'BSCS',
            'BLIS',
        ];

        $cic = College::where('code', 'CIC')->first();

        foreach ($programs as $name) {
            Program::firstOrCreate(
                ['program_name' => $name],
                [
                    'college_id' => $cic?->id,
                    'created_at' => now(),
                ]
            );
        }
    }
}
