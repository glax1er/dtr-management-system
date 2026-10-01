<?php

namespace Database\Seeders;

use App\Models\Campus;
use App\Models\College;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class InternSeeder extends Seeder
{
    /**
     * Seed specific test persona interns and a realistic pool of interns across colleges and HTEs.
     */
    public function run(): void
    {
        $password = Hash::make('password');

        $bsitBtm = Program::where('program_name', 'BSIT-BTM')->first();
        $bsitIs = Program::where('program_name', 'BSIT-IS')->first();
        $bscs = Program::where('program_name', 'BSCS')->first();
        $blis = Program::where('program_name', 'BLIS')->first();
        $bsce = Program::where('program_name', 'BSCE')->first();
        $bsee = Program::where('program_name', 'BSEE')->first();
        $bsba = Program::where('program_name', 'BSBA')->first();
        $bsAgri = Program::where('program_name', 'BSAgri')->first();

        $accenture = Hte::where('hte_name', 'Accenture Solutions Philippines')->first();
        $dict = Hte::where('hte_name', 'Department of Information and Communications Technology (DICT RO11)')->first();
        $usepKttd = Hte::where('hte_name', 'USeP Knowledge and Technology Transfer Division (USeP-KTTD)')->first();
        $dcwd = Hte::where('hte_name', 'Davao City Water District (DCWD)')->first();
        $minda = Hte::where('hte_name', 'Mindanao Development Authority (MinDA)')->first();
        $da = Hte::where('hte_name', 'Department of Agriculture - RFO XI')->first();

        // ── 1. Specific Curated Test Personas ───────────────────────────────────
        $personas = [
            // Persona 1: Primary active approved intern (normal progress ~53%)
            [
                'email' => 'intern.alex@dtr.test',
                'name' => 'Alex Rivera',
                'id_number' => '2023-00101',
                'sex' => 'male',
                'contact_number' => '09171110001',
                'program_id' => $bsitBtm?->program_id,
                'hte_id' => $accenture?->hte_id,
                'campus' => 'Obrero',
                'status' => 'approved',
                'qr_code_value' => 'dtr-alex-rivera-202300101',
                'must_change_password' => false,
                'registered_at' => now()->subDays(60),
                'approved_at' => now()->subDays(59),
            ],
            // Persona 2: Missed time-out intern (yesterday clocked in, no time-out)
            [
                'email' => 'intern.beatrice@dtr.test',
                'name' => 'Beatrice Santos',
                'id_number' => '2023-00102',
                'sex' => 'female',
                'contact_number' => '09171110002',
                'program_id' => $bsitBtm?->program_id,
                'hte_id' => $accenture?->hte_id,
                'campus' => 'Obrero',
                'status' => 'approved',
                'qr_code_value' => 'dtr-beatrice-santos-202300102',
                'must_change_password' => false,
                'registered_at' => now()->subDays(50),
                'approved_at' => now()->subDays(49),
            ],
            // Persona 3: Pending intern registration (test Admin/College Admin approval)
            [
                'email' => 'intern.pending@dtr.test',
                'name' => 'Carlo Mendoza',
                'id_number' => '2023-00103',
                'sex' => 'male',
                'contact_number' => '09171110003',
                'program_id' => $bscs?->program_id,
                'hte_id' => $dict?->hte_id,
                'campus' => 'Obrero',
                'status' => 'pending',
                'qr_code_value' => null,
                'must_change_password' => false,
                'registered_at' => now()->subHours(4),
                'approved_at' => null,
            ],
            // Persona 4: Rejected intern registration (test undo or archive)
            [
                'email' => 'intern.rejected@dtr.test',
                'name' => 'Diana Cruz',
                'id_number' => '2023-00104',
                'sex' => 'female',
                'contact_number' => '09171110004',
                'program_id' => $bsitIs?->program_id,
                'hte_id' => $accenture?->hte_id,
                'campus' => 'Obrero',
                'status' => 'rejected',
                'qr_code_value' => null,
                'must_change_password' => false,
                'registered_at' => now()->subDays(10),
                'approved_at' => null,
            ],
            // Persona 5: Completed 100% hours intern (test completion certificate & summary)
            [
                'email' => 'intern.completed@dtr.test',
                'name' => 'Eduardo Ramos',
                'id_number' => '2023-00105',
                'sex' => 'male',
                'contact_number' => '09171110005',
                'program_id' => $bsitBtm?->program_id,
                'hte_id' => $usepKttd?->hte_id,
                'campus' => 'Obrero',
                'status' => 'approved',
                'qr_code_value' => 'dtr-eduardo-ramos-202300105',
                'must_change_password' => false,
                'registered_at' => now()->subDays(90),
                'approved_at' => now()->subDays(89),
            ],
            // Persona 6: Document revision required intern (has rejected doc with reason)
            [
                'email' => 'intern.revision@dtr.test',
                'name' => 'Fiona Lim',
                'id_number' => '2023-00106',
                'sex' => 'female',
                'contact_number' => '09171110006',
                'program_id' => $bscs?->program_id,
                'hte_id' => $dict?->hte_id,
                'campus' => 'Obrero',
                'status' => 'approved',
                'qr_code_value' => 'dtr-fiona-lim-202300106',
                'must_change_password' => false,
                'registered_at' => now()->subDays(45),
                'approved_at' => now()->subDays(44),
            ],
            // Persona 7: First-time login prompt intern (must_change_password = true)
            [
                'email' => 'intern.newpass@dtr.test',
                'name' => 'Gabriel Torres',
                'id_number' => '2023-00107',
                'sex' => 'male',
                'contact_number' => '09171110007',
                'program_id' => $bsce?->program_id,
                'hte_id' => $dcwd?->hte_id,
                'campus' => 'Obrero',
                'status' => 'approved',
                'qr_code_value' => 'dtr-gabriel-torres-202300107',
                'must_change_password' => true,
                'registered_at' => now()->subDays(20),
                'approved_at' => now()->subDays(19),
            ],
        ];

        foreach ($personas as $p) {
            $user = User::updateOrCreate(
                ['email' => $p['email']],
                [
                    'role' => User::ROLE_INTERN,
                    'name' => $p['name'],
                    'campus' => $p['campus'],
                    'password' => $password,
                    'email_verified_at' => now(),
                    'must_change_password' => $p['must_change_password'],
                    'is_active' => true,
                ]
            );

            InternProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'id_number' => $p['id_number'],
                    'contact_number' => $p['contact_number'],
                    'sex' => $p['sex'],
                    'program_id' => $p['program_id'],
                    'hte_id' => $p['hte_id'],
                    'campus' => $p['campus'],
                    'status' => $p['status'],
                    'qr_code_value' => $p['qr_code_value'],
                    'registered_at' => $p['registered_at'],
                    'approved_at' => $p['approved_at'],
                    'privacy_accepted_at' => $p['registered_at'],
                ]
            );
        }

        // Persona 8: Soft-deleted / archived intern for testing Admin Archives
        $archivedUser = User::updateOrCreate(
            ['email' => 'intern.archived@dtr.test'],
            [
                'role' => User::ROLE_INTERN,
                'name' => 'Hannah Morales',
                'campus' => 'Obrero',
                'password' => $password,
                'email_verified_at' => now(),
                'must_change_password' => false,
                'is_active' => false,
            ]
        );

        $archivedProfile = InternProfile::withTrashed()->updateOrCreate(
            ['user_id' => $archivedUser->id],
            [
                'id_number' => '2023-00108',
                'contact_number' => '09171110008',
                'sex' => 'female',
                'program_id' => $bsitIs?->program_id,
                'hte_id' => $accenture?->hte_id,
                'campus' => 'Obrero',
                'status' => 'rejected',
                'qr_code_value' => null,
                'registered_at' => now()->subDays(30),
                'approved_at' => null,
                'privacy_accepted_at' => now()->subDays(30),
            ]
        );

        if (! $archivedProfile->trashed()) {
            $archivedProfile->delete();
        }

        // ── 2. Realistic Pool of 16 Additional Active Interns Across Colleges ───
        $pool = [
            ['name' => 'Ian James Castillo', 'sex' => 'male', 'prog' => $bsitBtm, 'hte' => $accenture, 'campus' => 'Obrero'],
            ['name' => 'Jessica Mae Diaz', 'sex' => 'female', 'prog' => $bsitBtm, 'hte' => $accenture, 'campus' => 'Obrero'],
            ['name' => 'Kevin Dale Perez', 'sex' => 'male', 'prog' => $bsitIs, 'hte' => $dict, 'campus' => 'Obrero'],
            ['name' => 'Lara Nicole Gonzales', 'sex' => 'female', 'prog' => $bsitIs, 'hte' => $accenture, 'campus' => 'Obrero'],
            ['name' => 'Marc Anthony Villar', 'sex' => 'male', 'prog' => $bscs, 'hte' => $dict, 'campus' => 'Obrero'],
            ['name' => 'Nathalie Rose Tan', 'sex' => 'female', 'prog' => $bscs, 'hte' => $usepKttd, 'campus' => 'Obrero'],
            ['name' => 'Oliver Lance Garcia', 'sex' => 'male', 'prog' => $blis, 'hte' => $usepKttd, 'campus' => 'Obrero'],
            ['name' => 'Patricia Anne Reyes', 'sex' => 'female', 'prog' => $blis, 'hte' => $usepKttd, 'campus' => 'Obrero'],
            ['name' => 'Quentin Kyle Flores', 'sex' => 'male', 'prog' => $bsce, 'hte' => $dcwd, 'campus' => 'Obrero'],
            ['name' => 'Rachelle Joy Gomez', 'sex' => 'female', 'prog' => $bsce, 'hte' => $dcwd, 'campus' => 'Obrero'],
            ['name' => 'Sam Christian Alcantara', 'sex' => 'male', 'prog' => $bsee, 'hte' => $dcwd, 'campus' => 'Obrero'],
            ['name' => 'Trisha Bianca Dela Cruz', 'sex' => 'female', 'prog' => $bsee, 'hte' => $dcwd, 'campus' => 'Obrero'],
            ['name' => 'Uriah Sean Navarro', 'sex' => 'male', 'prog' => $bsba, 'hte' => $minda, 'campus' => 'Obrero'],
            ['name' => 'Vanessa Claire Soriano', 'sex' => 'female', 'prog' => $bsba, 'hte' => $minda, 'campus' => 'Obrero'],
            ['name' => 'William Dave Aquino', 'sex' => 'male', 'prog' => $bsAgri, 'hte' => $da, 'campus' => 'Tagum'],
            ['name' => 'Ysabelle Sofia Cortez', 'sex' => 'female', 'prog' => $bsAgri, 'hte' => $da, 'campus' => 'Tagum'],
        ];

        foreach ($pool as $idx => $item) {
            $num = str_pad((string) (120 + $idx), 3, '0', STR_PAD_LEFT);
            $slug = Str::slug($item['name']);
            $email = "intern.{$slug}@dtr.test";

            $user = User::updateOrCreate(
                ['email' => $email],
                [
                    'role' => User::ROLE_INTERN,
                    'name' => $item['name'],
                    'campus' => $item['campus'],
                    'password' => $password,
                    'email_verified_at' => now(),
                    'must_change_password' => false,
                    'is_active' => true,
                ]
            );

            InternProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'id_number' => "2023-00{$num}",
                    'contact_number' => '0917'.str_pad((string) (1000000 + $idx), 7, '0', STR_PAD_LEFT),
                    'sex' => $item['sex'],
                    'program_id' => $item['prog']?->program_id,
                    'hte_id' => $item['hte']?->hte_id,
                    'campus' => $item['campus'],
                    'status' => 'approved',
                    'qr_code_value' => "dtr-intern-{$slug}-202300{$num}",
                    'registered_at' => now()->subDays(55 - ($idx % 10)),
                    'approved_at' => now()->subDays(54 - ($idx % 10)),
                    'privacy_accepted_at' => now()->subDays(54 - ($idx % 10)),
                ]
            );
        }
    }
}
