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

    $this->hteA = Hte::create([
        'college_id' => $this->collegeA->id,
        'hte_name' => 'College A Partner HTE '.uniqid(),
        'status' => 'active',
    ]);

    $this->hteB = Hte::create([
        'college_id' => $this->collegeB->id,
        'hte_name' => 'College B Partner HTE '.uniqid(),
        'status' => 'active',
    ]);
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
        'hte_id' => $this->hteA->hte_id,
        'id_number' => 'ID-A-'.uniqid(),
        'sex' => 'male',
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    InternProfile::create([
        'user_id' => $internUserB->id,
        'program_id' => $this->programB->program_id,
        'hte_id' => $this->hteB->hte_id,
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

test('college admin only sees HTEs from their assigned college', function () {
    $response = $this->actingAs($this->collegeAdminA)->get(route('admin.htes.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/htes/index')
        ->where('htes.data', function ($data) {
            $hteIds = collect($data)->pluck('hte_id');

            return $hteIds->contains($this->hteA->hte_id)
                && ! $hteIds->contains($this->hteB->hte_id);
        })
    );
});

test('super admin sees HTEs from all colleges', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.htes.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/htes/index')
        ->where('htes.data', function ($data) {
            $hteIds = collect($data)->pluck('hte_id');

            return $hteIds->contains($this->hteA->hte_id)
                && $hteIds->contains($this->hteB->hte_id);
        })
    );
});

test('college admin cannot update an HTE belonging to another college', function () {
    $response = $this->actingAs($this->collegeAdminA)->patch(route('admin.htes.update', $this->hteB), [
        'hte_name' => 'Attempted HTE Rename',
        'address' => 'Some address',
    ]);

    $response->assertForbidden();
});

test('college admin only sees HTE supervisors belonging to their college HTEs', function () {
    $supHteUserA = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    $supHteUserB = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    SupervisorProfile::create([
        'user_id' => $supHteUserA->id,
        'supervisor_type' => 'hte',
        'hte_id' => $this->hteA->hte_id,
        'status' => 'active',
        'created_at' => now(),
    ]);

    SupervisorProfile::create([
        'user_id' => $supHteUserB->id,
        'supervisor_type' => 'hte',
        'hte_id' => $this->hteB->hte_id,
        'status' => 'active',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->collegeAdminA)->get(route('admin.supervisors.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/supervisors/index')
        ->where('supervisors.data', function ($data) use ($supHteUserA, $supHteUserB) {
            $userIds = collect($data)->pluck('user_id');

            return $userIds->contains($supHteUserA->id)
                && ! $userIds->contains($supHteUserB->id);
        })
    );
});

test('college admin cannot create an HTE supervisor with an HTE from another college', function () {
    $response = $this->actingAs($this->collegeAdminA)->post(route('admin.supervisors.store'), [
        'name' => 'Cross College Supervisor',
        'email' => 'cross-college@example.com',
        'hte_id' => $this->hteB->hte_id,
    ]);

    $response->assertStatus(422);
});

test('college admin cannot update an HTE supervisor belonging to another college', function () {
    $supHteUserB = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    $profileB = SupervisorProfile::create([
        'user_id' => $supHteUserB->id,
        'supervisor_type' => 'hte',
        'hte_id' => $this->hteB->hte_id,
        'status' => 'active',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->collegeAdminA)->patch(route('admin.supervisors.update', $profileB), [
        'name' => 'Attempted Supervisor Rename',
        'email' => 'attempted@example.com',
        'hte_id' => $this->hteA->hte_id,
    ]);

    $response->assertForbidden();
});

test('college admin cannot access super admin only routes', function () {
    $this->actingAs($this->collegeAdminA)
        ->get(route('admin.admins.index'))
        ->assertForbidden();

    $this->actingAs($this->collegeAdminA)
        ->get(route('admin.college-admins.index'))
        ->assertForbidden();

    $this->actingAs($this->collegeAdminA)
        ->get(route('admin.colleges.index'))
        ->assertForbidden();

    $this->actingAs($this->collegeAdminA)
        ->get(route('admin.campuses.index'))
        ->assertForbidden();
});

test('college admin can still see interns whose program was soft-deleted', function () {
    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'college_id' => $this->collegeA->id,
        'email_verified_at' => now(),
    ]);

    $internProfile = InternProfile::create([
        'user_id' => $internUser->id,
        'program_id' => $this->programA->program_id,
        'hte_id' => $this->hteA->hte_id,
        'id_number' => 'ID-SOFT-'.uniqid(),
        'sex' => 'male',
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    // Soft-delete the program
    $this->programA->delete();

    // The intern should still appear in the college admin's list via user.college_id fallback
    $response = $this->actingAs($this->collegeAdminA)->get(route('admin.interns.index', ['status' => 'approved']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('interns.data', function ($data) use ($internUser) {
            return collect($data)->pluck('user_id')->contains($internUser->id);
        })
    );
});

test('college admin cannot access completion summary of an intern from another college', function () {
    $internUserB = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'college_id' => $this->collegeB->id,
        'email_verified_at' => now(),
    ]);

    InternProfile::create([
        'user_id' => $internUserB->id,
        'program_id' => $this->programB->program_id,
        'hte_id' => $this->hteB->hte_id,
        'id_number' => 'ID-B-COMP-'.uniqid(),
        'sex' => 'female',
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    $response = $this->actingAs($this->collegeAdminA)->getJson(route('supervisor.interns.completion-summary', $internUserB->id));

    $response->assertForbidden();
});

test('college admin can restore archived intern even if program is soft-deleted', function () {
    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'college_id' => $this->collegeA->id,
        'email_verified_at' => now(),
    ]);

    $internProfile = InternProfile::create([
        'user_id' => $internUser->id,
        'program_id' => $this->programA->program_id,
        'hte_id' => $this->hteA->hte_id,
        'id_number' => 'ID-ARCH-'.uniqid(),
        'sex' => 'male',
        'status' => 'rejected',
        'privacy_accepted_at' => now(),
    ]);

    $internProfile->delete();
    $this->programA->delete();

    $response = $this->actingAs($this->collegeAdminA)->post(route('admin.archives.restore', [
        'type' => 'interns',
        'id' => $internProfile->user_id,
    ]));

    $response->assertRedirect();
    $this->assertFalse($internProfile->fresh()->trashed());
});
