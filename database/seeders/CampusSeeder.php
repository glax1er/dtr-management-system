<?php

namespace Database\Seeders;

use App\Models\Campus;
use App\Models\College;
use App\Models\CollegeAdminProfile;
use App\Models\InternProfile;
use App\Models\User;
use Illuminate\Database\Seeder;

class CampusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $campuses = [
            [
                'name' => 'Obrero',
                'code' => 'OBR',
                'address' => 'Iñigo St., Bo. Obrero, Davao City',
                'description' => 'Main Campus of the University of Southeastern Philippines.',
                'is_active' => true,
            ],
            [
                'name' => 'Mintal',
                'code' => 'MIN',
                'address' => 'Mintal, Tugbok District, Davao City',
                'description' => 'Mintal Campus of the University of Southeastern Philippines.',
                'is_active' => true,
            ],
            [
                'name' => 'Tagum',
                'code' => 'TAG',
                'address' => 'Apokon, Tagum City, Davao del Norte',
                'description' => 'Tagum-Mabini Campus (Tagum Unit).',
                'is_active' => true,
            ],
            [
                'name' => 'Mabini',
                'code' => 'MAB',
                'address' => 'Pindasan, Mabini, Davao de Oro',
                'description' => 'Tagum-Mabini Campus (Mabini Unit).',
                'is_active' => true,
            ],
            [
                'name' => 'Malabog',
                'code' => 'MAL',
                'address' => 'Malabog, Paquibato District, Davao City',
                'description' => 'Malabog Extension Campus.',
                'is_active' => true,
            ],
        ];

        foreach ($campuses as $data) {
            Campus::updateOrCreate(
                ['code' => $data['code']],
                [
                    'name' => $data['name'],
                    'address' => $data['address'],
                    'description' => $data['description'],
                    'is_active' => $data['is_active'],
                ]
            );
        }

        // Link existing colleges with matching campus names or codes
        $allCampuses = Campus::all();
        foreach (College::all() as $college) {
            if (! $college->campus_id && $college->campus) {
                $matched = $allCampuses->first(fn ($c) => strcasecmp($c->name, $college->campus) === 0 || (! empty($c->code) && strcasecmp($c->code, $college->campus) === 0));
                if ($matched) {
                    $college->update(['campus_id' => $matched->id]);
                }
            }
        }

        // Backfill campus_id on intern profiles that pre-date the FK column.
        // Map both campus name and code so both formats are resolved (consistent with migration).
        $campusMap = collect();
        foreach ($allCampuses as $c) {
            $campusMap->put(strtolower($c->name), $c);
            if (! empty($c->code)) {
                $campusMap->put(strtolower($c->code), $c);
            }
        }

        InternProfile::withTrashed()->whereNull('campus_id')->each(function (InternProfile $profile) use ($campusMap) {
            $campusId = null;

            // 1. Direct campus string on the profile (by name or code)
            if ($profile->campus && $campusMap->has(strtolower($profile->campus))) {
                $campusId = $campusMap->get(strtolower($profile->campus))->id;
            }

            // 2. Via program → college (supporting soft-deleted colleges as well)
            if ($campusId === null) {
                $college = $profile->program?->college()->withTrashed()->first() ?? $profile->program?->college;
                if ($college) {
                    if ($college->campus_id) {
                        $campusId = $college->campus_id;
                    } elseif ($college->campus && $campusMap->has(strtolower($college->campus))) {
                        $campusId = $campusMap->get(strtolower($college->campus))->id;
                    }
                }
            }

            if ($campusId !== null) {
                $profile->campus_id = $campusId;
                $profile->saveQuietly();
            }
        });

        // Backfill college admin profiles for existing college admins
        $collegeAdmins = User::where('role', User::ROLE_COLLEGE_ADMIN)
            ->orWhere(fn ($q) => $q->where('role', User::ROLE_ADMIN)->whereNotNull('college_id'))
            ->get();

        foreach ($collegeAdmins as $admin) {
            $campusId = null;
            if ($admin->college?->campus_id) {
                $campusId = $admin->college->campus_id;
            } elseif ($admin->campus) {
                $campusId = $allCampuses->first(fn ($c) => strcasecmp($c->name, $admin->campus) === 0 || (! empty($c->code) && strcasecmp($c->code, $admin->campus) === 0))?->id;
            }

            CollegeAdminProfile::firstOrCreate(
                ['user_id' => $admin->id],
                [
                    'college_id' => $admin->college_id,
                    'campus_id' => $campusId,
                ]
            );
        }
    }
}
