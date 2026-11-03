<?php

use App\Models\Campus;
use App\Models\College;
use App\Models\CollegeAdminProfile;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->campus = Campus::firstOrCreate(
        ['code' => 'TEST_CAMPUS'],
        ['name' => 'Test Campus Main', 'is_active' => true]
    );

    $this->collegeA = College::firstOrCreate(
        ['code' => 'CADMIN_A'],
        ['name' => 'College Admin Test A', 'campus_id' => $this->campus->id, 'campus' => 'Test Campus Main', 'is_active' => true]
    );
    $this->collegeB = College::firstOrCreate(
        ['code' => 'CADMIN_B'],
        ['name' => 'College Admin Test B', 'campus_id' => $this->campus->id, 'campus' => 'Test Campus Main', 'is_active' => true]
    );

    $this->superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'is_active' => true,
    ]);

    $this->collegeAdmin = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $this->collegeA->id,
        'campus' => 'Test Campus Main',
        'is_active' => true,
    ]);

    $this->collegeAdminProfile = CollegeAdminProfile::firstOrCreate(
        ['user_id' => $this->collegeAdmin->id],
        [
            'college_id' => $this->collegeA->id,
            'campus_id' => $this->campus->id,
            'employee_id' => 'EMP-001',
            'position' => 'College Dean',
        ]
    );
});

test('super admin can view college admins management page', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.college-admins.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/college-admins/index')
        ->has('collegeAdmins.data')
        ->has('colleges')
        ->has('campuses')
    );
});

test('college admin cannot view college admins management page', function () {
    $response = $this->actingAs($this->collegeAdmin)->get(route('admin.college-admins.index'));

    $response->assertForbidden();
});

test('intern and supervisor cannot view college admins management page', function () {
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    $this->actingAs($intern)->get(route('admin.college-admins.index'))->assertForbidden();
    $this->actingAs($supervisor)->get(route('admin.college-admins.index'))->assertForbidden();
});

test('super admin can create a college admin with profile', function () {
    $response = $this->actingAs($this->superAdmin)->post(route('admin.college-admins.store'), [
        'name' => 'New College Admin User',
        'email' => 'newcollegadminprofile@example.com',
        'college_id' => $this->collegeA->id,
        'campus_id' => $this->campus->id,
        'employee_id' => 'EMP-NEW-100',
        'position' => 'Associate Dean',
        'password' => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
    ]);

    $response->assertRedirect();

    $newUser = User::where('email', 'newcollegadminprofile@example.com')->first();
    expect($newUser)->not->toBeNull();
    expect($newUser->role)->toBe(User::ROLE_COLLEGE_ADMIN);
    expect($newUser->college_id)->toBe($this->collegeA->id);
    expect($newUser->is_active)->toBeTrue();
    expect(Hash::check('SecurePass123!', $newUser->password))->toBeTrue();

    // Check college_admin_profiles table
    $profile = CollegeAdminProfile::where('user_id', $newUser->id)->first();
    expect($profile)->not->toBeNull();
    expect($profile->college_id)->toBe($this->collegeA->id);
    expect($profile->campus_id)->toBe($this->campus->id);
    expect($profile->employee_id)->toBe('EMP-NEW-100');
    expect($profile->position)->toBe('Associate Dean');
});

test('super admin can update a college admin and profile', function () {
    $response = $this->actingAs($this->superAdmin)->patch(route('admin.college-admins.update', $this->collegeAdmin), [
        'name' => 'Updated College Admin Name',
        'email' => 'updated_cadmin_email@example.com',
        'college_id' => $this->collegeB->id,
        'campus_id' => $this->campus->id,
        'employee_id' => 'EMP-UPDATED-999',
        'position' => 'College Coordinator',
    ]);

    $response->assertRedirect();

    $this->collegeAdmin->refresh();
    expect($this->collegeAdmin->name)->toBe('Updated College Admin Name');
    expect($this->collegeAdmin->email)->toBe('updated_cadmin_email@example.com');
    expect($this->collegeAdmin->college_id)->toBe($this->collegeB->id);

    $profile = CollegeAdminProfile::where('user_id', $this->collegeAdmin->id)->first();
    expect($profile)->not->toBeNull();
    expect($profile->college_id)->toBe($this->collegeB->id);
    expect($profile->employee_id)->toBe('EMP-UPDATED-999');
    expect($profile->position)->toBe('College Coordinator');
});

test('super admin can toggle college admin status', function () {
    expect($this->collegeAdmin->is_active)->toBeTrue();

    // Deactivate
    $this->actingAs($this->superAdmin)->patch(route('admin.college-admins.updateStatus', $this->collegeAdmin));
    $this->collegeAdmin->refresh();
    expect($this->collegeAdmin->is_active)->toBeFalse();

    // Reactivate
    $this->actingAs($this->superAdmin)->patch(route('admin.college-admins.updateStatus', $this->collegeAdmin));
    $this->collegeAdmin->refresh();
    expect($this->collegeAdmin->is_active)->toBeTrue();
});

test('super admin can delete a college admin account and profile', function () {
    $response = $this->actingAs($this->superAdmin)->delete(route('admin.college-admins.destroy', $this->collegeAdmin));

    $response->assertRedirect();
    expect(User::where('id', $this->collegeAdmin->id)->exists())->toBeFalse();
    expect(CollegeAdminProfile::where('user_id', $this->collegeAdmin->id)->exists())->toBeFalse();
});
