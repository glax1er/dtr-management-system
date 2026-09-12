<?php

use App\Models\College;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;

beforeEach(function () {
    $this->collegeA = College::firstOrCreate(
        ['code' => 'CO_A'],
        ['name' => 'College A', 'is_active' => true]
    );
    $this->collegeB = College::firstOrCreate(
        ['code' => 'CO_B'],
        ['name' => 'College B', 'is_active' => true]
    );

    $this->superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'is_active' => true,
    ]);

    $this->collegeAdminA = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $this->collegeA->id,
        'is_active' => true,
    ]);

    $this->programA = Program::create([
        'college_id' => $this->collegeA->id,
        'program_name' => 'Prog A '.uniqid(),
        'required_hours' => 300,
        'is_active' => true,
    ]);

    $this->programB = Program::create([
        'college_id' => $this->collegeB->id,
        'program_name' => 'Prog B '.uniqid(),
        'required_hours' => 300,
        'is_active' => true,
    ]);

    $this->hte = Hte::firstOrCreate(
        ['hte_name' => 'University Partner HTE'],
        ['status' => 'active']
    );
});

test('college admin only sees programs from their assigned college', function () {
    $response = $this->actingAs($this->collegeAdminA)->get(route('admin.programs.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/programs')
        ->where('programs.data', function ($data) {
            $programIds = collect($data)->pluck('program_id');

            return $programIds->contains($this->programA->program_id)
                && ! $programIds->contains($this->programB->program_id);
        })
    );
});

test('super admin sees programs from all colleges', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.programs.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/programs')
        ->where('programs.data', function ($data) {
            $programIds = collect($data)->pluck('program_id');

            return $programIds->contains($this->programA->program_id)
                && $programIds->contains($this->programB->program_id);
        })
    );
});

test('college admin cannot update a program belonging to another college', function () {
    $response = $this->actingAs($this->collegeAdminA)->patch(route('admin.programs.update', $this->programB), [
        'program_name' => 'Attempted Rename',
        'required_hours' => 400,
    ]);

    $response->assertForbidden();
});

test('college admin only sees interns in their college', function () {
    $internUserA = User::factory()->create(['role' => User::ROLE_INTERN]);
    $internUserB = User::factory()->create(['role' => User::ROLE_INTERN]);

    InternProfile::create([
        'user_id' => $internUserA->id,
        'program_id' => $this->programA->program_id,
        'hte_id' => $this->hte->hte_id,
        'id_number' => 'ID-A-'.uniqid(),
        'sex' => 'male',
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    InternProfile::create([
        'user_id' => $internUserB->id,
        'program_id' => $this->programB->program_id,
        'hte_id' => $this->hte->hte_id,
        'id_number' => 'ID-B-'.uniqid(),
        'sex' => 'female',
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    $response = $this->actingAs($this->collegeAdminA)->get(route('admin.interns.index', ['status' => 'approved']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('interns.data', function ($data) use ($internUserA, $internUserB) {
            $userIds = collect($data)->pluck('user_id');

            return $userIds->contains($internUserA->id)
                && ! $userIds->contains($internUserB->id);
        })
    );
});

test('college admin only sees OJT supervisors belonging to their college programs', function () {
    $supUserA = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    $supUserB = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    SupervisorProfile::create([
        'user_id' => $supUserA->id,
        'supervisor_type' => 'ojt',
        'program_id' => $this->programA->program_id,
    ]);

    SupervisorProfile::create([
        'user_id' => $supUserB->id,
        'supervisor_type' => 'ojt',
        'program_id' => $this->programB->program_id,
    ]);

    $response = $this->actingAs($this->collegeAdminA)->get(route('admin.supervisors.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/supervisors/index')
        ->where('supervisors.data', function ($data) use ($supUserA, $supUserB) {
            $userIds = collect($data)->pluck('user_id');

            return $userIds->contains($supUserA->id)
                && ! $userIds->contains($supUserB->id);
        })
    );
});

test('HTEs are shared and visible to all college admins', function () {
    $response = $this->actingAs($this->collegeAdminA)->get(route('admin.htes.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/htes/index')
        ->where('htes.data', function ($data) {
            return collect($data)->pluck('hte_id')->contains($this->hte->hte_id);
        })
    );
});
