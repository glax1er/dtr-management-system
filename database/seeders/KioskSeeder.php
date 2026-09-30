<?php

namespace Database\Seeders;

use App\Models\Kiosk;
use Illuminate\Database\Seeder;

class KioskSeeder extends Seeder
{
    /**
     * Seed attendance kiosks with easy-to-test deterministic device tokens.
     */
    public function run(): void
    {
        $kiosks = [
            [
                'name' => 'CIC Main Lobby Kiosk',
                'device_token' => 'kiosk-cic-lobby-token',
                'is_active' => true,
            ],
            [
                'name' => 'CoE Engineering Lab Kiosk',
                'device_token' => 'kiosk-coe-lab-token',
                'is_active' => true,
            ],
            [
                'name' => 'Accenture Innovation Hub Kiosk',
                'device_token' => 'kiosk-accenture-token',
                'is_active' => true,
            ],
            [
                'name' => 'DICT Regional Office Kiosk',
                'device_token' => 'kiosk-dict-ro11-token',
                'is_active' => true,
            ],
            [
                'name' => 'Tagum Unit Maintenance Kiosk',
                'device_token' => 'kiosk-tagum-inactive-token',
                'is_active' => false,
            ],
        ];

        foreach ($kiosks as $kiosk) {
            Kiosk::updateOrCreate(
                ['device_token' => $kiosk['device_token']],
                [
                    'name' => $kiosk['name'],
                    'is_active' => $kiosk['is_active'],
                ]
            );
        }
    }
}
