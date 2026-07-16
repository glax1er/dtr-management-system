<?php

namespace Database\Seeders;

use App\Models\Hte;
use Illuminate\Database\Seeder;

class HteSeeder extends Seeder
{
    /**
     * Seed a handful of host training establishments interns can be
     * assigned to at registration.
     */
    public function run(): void
    {
        $htes = [
            [
                'hte_name' => 'USeP-CIC',
                'address' => 'Inigo st., B.o. Obrero, Davao City',
                'contact_person' => null,
                'contact_number' => null,
            ],
            [
                'hte_name' => 'USeP - Supply Management Unit',
                'address' => 'Inigo st., B.o. Obrero, Davao City, Davao City',
                'contact_person' => null,
                'contact_number' => null,
            ],
        ];

        foreach ($htes as $hte) {
            Hte::firstOrCreate(['hte_name' => $hte['hte_name']], $hte);
        }
    }
}