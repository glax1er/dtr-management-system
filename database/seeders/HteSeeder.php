<?php

namespace Database\Seeders;

use App\Models\College;
use App\Models\Hte;
use Illuminate\Database\Seeder;

class HteSeeder extends Seeder
{
    /**
     * Seed partner Host Training Establishments (HTEs) across colleges.
     */
    public function run(): void
    {
        $cic = College::where('code', 'CIC')->first();
        $coe = College::where('code', 'CoE')->first();
        $cba = College::where('code', 'CBA')->first();
        $coa = College::where('code', 'CoA')->first();

        $htes = [
            [
                'college_id' => $cic?->id,
                'hte_name' => 'Accenture Solutions Philippines',
                'address' => 'Robinsons Cybergate Delta, J.P. Laurel Ave, Davao City',
                'contact_number' => '09171234567',
                'status' => 'active',
            ],
            [
                'college_id' => $cic?->id,
                'hte_name' => 'Department of Information and Communications Technology (DICT RO11)',
                'address' => 'F. Torres St., Poblacion District, Davao City',
                'contact_number' => '09289876543',
                'status' => 'active',
            ],
            [
                'college_id' => $cic?->id,
                'hte_name' => 'USeP Knowledge and Technology Transfer Division (USeP-KTTD)',
                'address' => 'University of Southeastern Philippines, Bo. Obrero, Davao City',
                'contact_number' => '09195551234',
                'status' => 'active',
            ],
            [
                'college_id' => $coe?->id,
                'hte_name' => 'Davao City Water District (DCWD)',
                'address' => 'Km. 2.5, MacArthur Highway, Matina, Davao City',
                'contact_number' => '09228889900',
                'status' => 'active',
            ],
            [
                'college_id' => $cba?->id,
                'hte_name' => 'Mindanao Development Authority (MinDA)',
                'address' => '14th Floor, Pryce Tower, Pryce Business Park, J.P. Laurel Ave, Davao City',
                'contact_number' => '09331112233',
                'status' => 'active',
            ],
            [
                'college_id' => $coa?->id,
                'hte_name' => 'Department of Agriculture - RFO XI',
                'address' => 'F. Bangoy St., Agdao, Davao City',
                'contact_number' => '09456781234',
                'status' => 'active',
            ],
        ];

        foreach ($htes as $data) {
            Hte::updateOrCreate(
                ['hte_name' => $data['hte_name']],
                [
                    'college_id' => $data['college_id'],
                    'address' => $data['address'],
                    'contact_number' => $data['contact_number'],
                    'status' => $data['status'],
                ]
            );
        }

        // Seed 1 soft-deleted HTE to test the Admin Archives tab
        $archivedHte = Hte::withTrashed()->updateOrCreate(
            ['hte_name' => 'Legacy Web Solutions Inc.'],
            [
                'college_id' => $cic?->id,
                'address' => 'C.M. Recto Ave, Davao City',
                'contact_number' => '09180009999',
                'status' => 'inactive',
            ]
        );

        if (! $archivedHte->trashed()) {
            $archivedHte->delete();
        }
    }
}
