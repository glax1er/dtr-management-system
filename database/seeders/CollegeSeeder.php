<?php

namespace Database\Seeders;

use App\Models\Campus;
use App\Models\College;
use App\Models\Program;
use Illuminate\Database\Seeder;

class CollegeSeeder extends Seeder
{
    /**
     * Seed USeP colleges and link initial programs.
     */
    public function run(): void
    {
        $colleges = [
            [
                'name' => 'College of Information and Computing',
                'code' => 'CIC',
                'campus' => 'Obrero',
                'description' => 'Computing, Information Technology, and Information Systems programs.',
            ],
            [
                'name' => 'College of Engineering',
                'code' => 'CoE',
                'campus' => 'Obrero',
                'description' => 'Civil, Electrical, Mechanical, and Electronics Engineering programs.',
            ],
            [
                'name' => 'College of Arts and Sciences',
                'code' => 'CAS',
                'campus' => 'Obrero',
                'description' => 'Natural Sciences, Mathematics, Languages, and Social Sciences programs.',
            ],
            [
                'name' => 'College of Business Administration',
                'code' => 'CBA',
                'campus' => 'Obrero',
                'description' => 'Business Administration, Entrepreneurship, and Accountancy programs.',
            ],
            [
                'name' => 'College of Education',
                'code' => 'CED',
                'campus' => 'Obrero',
                'description' => 'Elementary, Secondary, and Special Education programs.',
            ],
            [
                'name' => 'College of Agriculture',
                'code' => 'CoA',
                'campus' => 'Tagum',
                'description' => 'Agricultural and Agribusiness programs.',
            ],
        ];

        foreach ($colleges as $data) {
            $campusId = Campus::where('name', $data['campus'])->value('id');

            $college = College::updateOrCreate(
                ['code' => $data['code']],
                [
                    'name' => $data['name'],
                    'campus' => $data['campus'],
                    'campus_id' => $campusId,
                    'description' => $data['description'],
                    'is_active' => true,
                ]
            );

            // If CIC, associate existing default programs
            if ($college->code === 'CIC') {
                Program::whereIn('program_name', ['BSIT-BTM', 'BSIT-IS', 'BSCS', 'BLIS'])
                    ->whereNull('college_id')
                    ->update(['college_id' => $college->id]);
            }
        }
    }
}
