<?php

namespace Database\Seeders;

use App\Models\Campus;
use App\Models\College;
use App\Models\CollegeAdminProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed Super Admins and College Admins with complete profile associations.
     */
    public function run(): void
    {
        $password = Hash::make('password');

        // 1. Super Admins
        User::updateOrCreate(
            ['email' => 'admin@dtr.test'],
            [
                'role' => User::ROLE_SUPER_ADMIN,
                'name' => 'System Super Admin',
                'password' => $password,
                'email_verified_at' => now(),
                'must_change_password' => false,
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'superadmin2@dtr.test'],
            [
                'role' => User::ROLE_SUPER_ADMIN,
                'name' => 'System Auditor Admin',
                'password' => $password,
                'email_verified_at' => now(),
                'must_change_password' => false,
                'is_active' => true,
            ]
        );

        // 2. College Admins
        $cic = College::where('code', 'CIC')->first();
        $coe = College::where('code', 'CoE')->first();
        $cba = College::where('code', 'CBA')->first();
        $coa = College::where('code', 'CoA')->first();

        $obrero = Campus::where('code', 'OBR')->first();
        $tagum = Campus::where('code', 'TAG')->first();

        $collegeAdmins = [
            [
                'email' => 'admin.cic@dtr.test',
                'name' => 'Dr. Evelyn Tan',
                'college_id' => $cic?->id,
                'campus' => 'Obrero',
                'campus_id' => $obrero?->id,
                'employee_id' => 'EMP-CIC-101',
                'position' => 'College Dean & OJT Head',
                'is_active' => true,
            ],
            [
                'email' => 'admin.coe@dtr.test',
                'name' => 'Engr. Manuel Santos',
                'college_id' => $coe?->id,
                'campus' => 'Obrero',
                'campus_id' => $obrero?->id,
                'employee_id' => 'EMP-COE-102',
                'position' => 'Associate Dean',
                'is_active' => true,
            ],
            [
                'email' => 'admin.cba@dtr.test',
                'name' => 'Prof. Alicia Lim',
                'college_id' => $cba?->id,
                'campus' => 'Obrero',
                'campus_id' => $obrero?->id,
                'employee_id' => 'EMP-CBA-103',
                'position' => 'OJT Program Chair',
                'is_active' => true,
            ],
            [
                'email' => 'admin.coa@dtr.test',
                'name' => 'Dr. Fernando Roxas',
                'college_id' => $coa?->id,
                'campus' => 'Tagum',
                'campus_id' => $tagum?->id,
                'employee_id' => 'EMP-COA-104',
                'position' => 'Campus OJT Director',
                'is_active' => true,
            ],
            [
                'email' => 'admin.inactive@dtr.test',
                'name' => 'Former College Admin',
                'college_id' => $cic?->id,
                'campus' => 'Obrero',
                'campus_id' => $obrero?->id,
                'employee_id' => 'EMP-CIC-000',
                'position' => 'Former Coordinator',
                'is_active' => false,
            ],
        ];

        foreach ($collegeAdmins as $adminData) {
            $user = User::updateOrCreate(
                ['email' => $adminData['email']],
                [
                    'role' => User::ROLE_COLLEGE_ADMIN,
                    'name' => $adminData['name'],
                    'college_id' => $adminData['college_id'],
                    'campus' => $adminData['campus'],
                    'password' => $password,
                    'email_verified_at' => now(),
                    'must_change_password' => false,
                    'is_active' => $adminData['is_active'],
                ]
            );

            CollegeAdminProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'college_id' => $adminData['college_id'],
                    'campus_id' => $adminData['campus_id'],
                    'employee_id' => $adminData['employee_id'],
                    'position' => $adminData['position'],
                ]
            );
        }
    }
}
