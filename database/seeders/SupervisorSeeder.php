<?php

namespace Database\Seeders;

use App\Models\Hte;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SupervisorSeeder extends Seeder
{
    /**
     * Seed OJT Program Coordinators and HTE Supervisors across partner companies and programs.
     */
    public function run(): void
    {
        $password = Hash::make('password');

        $bsit = Program::where('program_name', 'BSIT-BTM')->first();
        $bscs = Program::where('program_name', 'BSCS')->first();
        $bsce = Program::where('program_name', 'BSCE')->first();

        $accenture = Hte::where('hte_name', 'Accenture Solutions Philippines')->first();
        $dict = Hte::where('hte_name', 'Department of Information and Communications Technology (DICT RO11)')->first();
        $dcwd = Hte::where('hte_name', 'Davao City Water District (DCWD)')->first();
        $usepKttd = Hte::where('hte_name', 'USeP Knowledge and Technology Transfer Division (USeP-KTTD)')->first();

        // 1. OJT Program Supervisors
        $ojtSupervisors = [
            [
                'email' => 'ojt.it@dtr.test',
                'name' => 'Prof. Allan Reyes',
                'program_id' => $bsit?->program_id,
            ],
            [
                'email' => 'ojt.cs@dtr.test',
                'name' => 'Dr. Maria Santos',
                'program_id' => $bscs?->program_id,
            ],
            [
                'email' => 'ojt.coe@dtr.test',
                'name' => 'Engr. David Tan',
                'program_id' => $bsce?->program_id,
            ],
        ];

        foreach ($ojtSupervisors as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'role' => User::ROLE_SUPERVISOR,
                    'name' => $data['name'],
                    'password' => $password,
                    'email_verified_at' => now(),
                    'must_change_password' => false,
                    'is_active' => true,
                ]
            );

            SupervisorProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'program_id' => $data['program_id'],
                    'hte_id' => null,
                    'supervisor_type' => 'ojt',
                    'status' => 'active',
                ]
            );
        }

        // 2. HTE Supervisors
        $hteSupervisors = [
            [
                'email' => 'supervisor.accenture@dtr.test',
                'name' => 'Mark Bautista',
                'hte_id' => $accenture?->hte_id,
            ],
            [
                'email' => 'supervisor.dict@dtr.test',
                'name' => 'Sarah Geronimo',
                'hte_id' => $dict?->hte_id,
            ],
            [
                'email' => 'supervisor.dcwd@dtr.test',
                'name' => 'Roberto Gomez',
                'hte_id' => $dcwd?->hte_id,
            ],
            [
                'email' => 'supervisor.usep@dtr.test',
                'name' => 'Jennifer Yap',
                'hte_id' => $usepKttd?->hte_id,
            ],
        ];

        foreach ($hteSupervisors as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'role' => User::ROLE_SUPERVISOR,
                    'name' => $data['name'],
                    'password' => $password,
                    'email_verified_at' => now(),
                    'must_change_password' => false,
                    'is_active' => true,
                ]
            );

            SupervisorProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'hte_id' => $data['hte_id'],
                    'program_id' => null,
                    'supervisor_type' => 'hte',
                    'status' => 'active',
                ]
            );
        }

        // Refresh contact person for all HTEs
        Hte::all()->each(fn (Hte $hte) => $hte->refreshContactPerson());

        // 3. Seed 1 soft-deleted supervisor for testing the Archives tab
        $archivedUser = User::updateOrCreate(
            ['email' => 'supervisor.archived@dtr.test'],
            [
                'role' => User::ROLE_SUPERVISOR,
                'name' => 'Former Tech Supervisor',
                'password' => $password,
                'email_verified_at' => now(),
                'must_change_password' => false,
                'is_active' => false,
            ]
        );

        $archivedProfile = SupervisorProfile::withTrashed()->updateOrCreate(
            ['user_id' => $archivedUser->id],
            [
                'hte_id' => $accenture?->hte_id,
                'program_id' => null,
                'supervisor_type' => 'hte',
                'status' => 'inactive',
            ]
        );

        if (! $archivedProfile->trashed()) {
            $archivedProfile->delete();
        }
    }
}
