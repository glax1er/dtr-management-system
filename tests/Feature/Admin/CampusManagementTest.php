<?php

use App\Models\Campus;
use App\Models\College;
use App\Models\User;

beforeEach(function () {
    $this->superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'is_active' => true,
    ]);

    $this->collegeA = College::firstOrCreate(
        ['code' => 'TEST_COLLEGE_CAMPUS'],
        ['name' => 'Campus Test College', 'is_active' => true]
    );

    $this->collegeAdmin = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $this->collegeA->id,
        'is_active' => true,
    ]);

    $this->campus = Campus::create([
        'name' => 'Test Campus '.uniqid(),
        'code' => 'TC_'.uniqid(),
        'address' => '123 University Ave',
        'description' => 'Test campus description',
        'is_active' => true,
    ]);
});

test('super admin can view campuses index', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.campuses.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/campuses/index')
        ->has('campuses.data')
        ->has('filters')
    );
});

test('college admin cannot view campuses index', function () {
    $response = $this->actingAs($this->collegeAdmin)->get(route('admin.campuses.index'));

    $response->assertForbidden();
});

test('intern and supervisor cannot view campuses index', function () {
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    $this->actingAs($intern)->get(route('admin.campuses.index'))->assertForbidden();
    $this->actingAs($supervisor)->get(route('admin.campuses.index'))->assertForbidden();
});

test('super admin can create a new campus', function () {
    $code = 'NEW_'.rand(100, 999);
    $response = $this->actingAs($this->superAdmin)->post(route('admin.campuses.store'), [
        'name' => 'New Campus '.uniqid(),
        'code' => strtolower($code),
        'address' => 'New Campus Address',
        'description' => 'New Campus Description',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('campuses', [
        'code' => strtoupper($code),
        'address' => 'New Campus Address',
        'is_active' => true,
    ]);
});

test('campus creation requires unique name and code', function () {
    $response = $this->actingAs($this->superAdmin)->post(route('admin.campuses.store'), [
        'name' => $this->campus->name,
        'code' => $this->campus->code,
    ]);

    $response->assertSessionHasErrors(['name', 'code']);
});

test('super admin can update a campus', function () {
    $response = $this->actingAs($this->superAdmin)->patch(route('admin.campuses.update', $this->campus), [
        'name' => 'Updated Campus Name',
        'code' => 'UPD_CODE',
        'address' => 'Updated Address',
        'description' => 'Updated Description',
    ]);

    $response->assertRedirect();
    $this->campus->refresh();
    expect($this->campus->name)->toBe('Updated Campus Name');
    expect($this->campus->code)->toBe('UPD_CODE');
    expect($this->campus->address)->toBe('Updated Address');
});

test('super admin can toggle campus active status', function () {
    expect($this->campus->is_active)->toBeTrue();

    // Deactivate
    $this->actingAs($this->superAdmin)->patch(route('admin.campuses.updateStatus', $this->campus), [
        'is_active' => false,
    ]);

    $this->campus->refresh();
    expect($this->campus->is_active)->toBeFalse();

    // Reactivate
    $this->actingAs($this->superAdmin)->patch(route('admin.campuses.updateStatus', $this->campus), [
        'is_active' => true,
    ]);

    $this->campus->refresh();
    expect($this->campus->is_active)->toBeTrue();
});

test('super admin can soft delete a campus', function () {
    $response = $this->actingAs($this->superAdmin)->delete(route('admin.campuses.destroy', $this->campus));

    $response->assertRedirect();
    expect(Campus::where('id', $this->campus->id)->exists())->toBeFalse();
    expect(Campus::withTrashed()->where('id', $this->campus->id)->exists())->toBeTrue();
});

test('super admin can restore an archived campus', function () {
    $this->campus->delete();
    expect(Campus::where('id', $this->campus->id)->exists())->toBeFalse();

    $response = $this->actingAs($this->superAdmin)->post(route('admin.archives.restore', [
        'type' => 'campuses',
        'id' => $this->campus->id,
    ]));

    $response->assertRedirect();
    expect(Campus::where('id', $this->campus->id)->exists())->toBeTrue();
});

test('super admin can permanently delete an archived campus', function () {
    $this->campus->delete();

    $response = $this->actingAs($this->superAdmin)->delete(route('admin.archives.forceDelete', [
        'type' => 'campuses',
        'id' => $this->campus->id,
    ]));

    $response->assertRedirect();
    expect(Campus::withTrashed()->where('id', $this->campus->id)->exists())->toBeFalse();
});

test('campuses index returns correct interns count', function () {
    $program = \App\Models\Program::create([
        'college_id' => $this->collegeA->id,
        'program_name' => 'BS IT '.uniqid(),
        'is_active' => true,
        'required_hours' => 500,
    ]);

    $hte = \App\Models\Hte::create([
        'college_id' => $this->collegeA->id,
        'hte_name' => 'HTE '.uniqid(),
        'address' => 'HTE Address',
        'status' => 'active',
    ]);

    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'email_verified_at' => now(),
    ]);

    \App\Models\InternProfile::create([
        'user_id' => $internUser->id,
        'id_number' => 'ID-'.uniqid(),
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'campus' => $this->campus->name,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
        'approved_at' => now(),
    ]);

    $response = $this->actingAs($this->superAdmin)->get(route('admin.campuses.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/campuses/index')
        ->where('campuses.data', function ($campuses) {
            $campusRecord = collect($campuses)->firstWhere('id', $this->campus->id);
            expect($campusRecord)->not->toBeNull();
            expect($campusRecord['interns_count'])->toBe(1);

            return true;
        })
    );
});

