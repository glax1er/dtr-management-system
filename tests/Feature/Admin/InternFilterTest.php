<?php

use App\Models\Campus;
use App\Models\College;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\User;

beforeEach(function () {
    $this->campusObrero = Campus::create([
        'name' => 'Obrero Campus',
        'code' => 'OBR',
        'is_active' => true,
    ]);

    $this->campusTagum = Campus::create([
        'name' => 'Tagum Campus',
        'code' => 'TAG',
        'is_active' => true,
    ]);

    $this->collegeCic = College::create([
        'name' => 'College of Information and Computing',
        'code' => 'CIC',
        'campus' => 'Obrero',
        'campus_id' => $this->campusObrero->id,
        'is_active' => true,
    ]);

    $this->collegeCoE = College::create([
        'name' => 'College of Engineering',
        'code' => 'CoE',
        'campus' => 'Obrero',
        'campus_id' => $this->campusObrero->id,
        'is_active' => true,
    ]);

    $this->programIt = Program::create([
        'college_id' => $this->collegeCic->id,
        'program_name' => 'BS in Information Technology',
        'required_hours' => 486,
        'is_active' => true,
    ]);

    $this->programCs = Program::create([
        'college_id' => $this->collegeCic->id,
        'program_name' => 'BS in Computer Science',
        'required_hours' => 300,
        'is_active' => true,
    ]);

    $this->programCe = Program::create([
        'college_id' => $this->collegeCoE->id,
        'program_name' => 'BS in Civil Engineering',
        'required_hours' => 240,
        'is_active' => true,
    ]);

    $this->hteAccenture = Hte::create([
        'college_id' => $this->collegeCic->id,
        'hte_name' => 'Accenture Solutions',
        'status' => 'active',
    ]);

    $this->hteDcwd = Hte::create([
        'college_id' => $this->collegeCoE->id,
        'hte_name' => 'Davao City Water District',
        'status' => 'active',
    ]);

    $this->superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'is_active' => true,
    ]);

    // Create 3 verified interns with different statuses and properties
    $this->internPending = User::factory()->create(['name' => 'Pending Student', 'email' => 'pending@example.com']);
    $this->profilePending = InternProfile::create([
        'user_id' => $this->internPending->id,
        'program_id' => $this->programIt->program_id,
        'hte_id' => $this->hteAccenture->hte_id,
        'campus' => 'Obrero',
        'id_number' => '2026-00001',
        'sex' => 'male',
        'status' => 'pending',
        'privacy_accepted_at' => now(),
    ]);

    $this->internApproved = User::factory()->create(['name' => 'Approved Student', 'email' => 'approved@example.com']);
    $this->profileApproved = InternProfile::create([
        'user_id' => $this->internApproved->id,
        'program_id' => $this->programCs->program_id,
        'hte_id' => $this->hteAccenture->hte_id,
        'campus' => 'Obrero',
        'id_number' => '2026-00002',
        'sex' => 'female',
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    $this->internRejected = User::factory()->create(['name' => 'Rejected Student', 'email' => 'rejected@example.com']);
    $this->profileRejected = InternProfile::create([
        'user_id' => $this->internRejected->id,
        'program_id' => $this->programCe->program_id,
        'hte_id' => $this->hteDcwd->hte_id,
        'campus' => 'Tagum',
        'id_number' => '2026-00003',
        'sex' => 'male',
        'status' => 'rejected',
        'privacy_accepted_at' => now(),
    ]);
});

test('admin interns index defaults to all status and returns all statuses', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.interns.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('currentStatus', 'all')
        ->has('colleges')
        ->has('campuses')
        ->has('programs')
        ->has('htes')
        ->where('interns.data', function ($data) {
            $ids = collect($data)->pluck('user_id');

            return $ids->contains($this->internPending->id)
                && $ids->contains($this->internApproved->id)
                && $ids->contains($this->internRejected->id);
        })
    );
});

test('admin can filter interns by specific status tab', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.interns.index', ['status' => 'approved']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('currentStatus', 'approved')
        ->where('interns.data', function ($data) {
            $ids = collect($data)->pluck('user_id');

            return $ids->contains($this->internApproved->id)
                && ! $ids->contains($this->internPending->id)
                && ! $ids->contains($this->internRejected->id);
        })
    );
});

test('super admin can filter interns by college', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.interns.index', [
        'college_id' => $this->collegeCoE->id,
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('filters.college_id', $this->collegeCoE->id)
        ->where('interns.data', function ($data) {
            $ids = collect($data)->pluck('user_id');

            return $ids->contains($this->internRejected->id)
                && ! $ids->contains($this->internPending->id)
                && ! $ids->contains($this->internApproved->id);
        })
    );
});

test('super admin can filter interns by program', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.interns.index', [
        'program_id' => $this->programCs->program_id,
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('interns.data', function ($data) {
            $ids = collect($data)->pluck('user_id');

            return $ids->contains($this->internApproved->id)
                && ! $ids->contains($this->internPending->id);
        })
    );
});

test('super admin can filter interns by HTE', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.interns.index', [
        'hte_id' => $this->hteDcwd->hte_id,
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('interns.data', function ($data) {
            $ids = collect($data)->pluck('user_id');

            return $ids->contains($this->internRejected->id)
                && ! $ids->contains($this->internApproved->id);
        })
    );
});

test('admin can search interns by ID number', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.interns.index', [
        'search' => '2026-00002',
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('interns.data', function ($data) {
            $ids = collect($data)->pluck('user_id');

            return $ids->contains($this->internApproved->id)
                && ! $ids->contains($this->internPending->id);
        })
    );
});
