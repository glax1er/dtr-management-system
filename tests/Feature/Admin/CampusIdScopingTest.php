<?php

use App\Models\Campus;
use App\Models\College;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\User;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();

    $this->campusObrero = Campus::create([
        'name' => 'Obrero Campus '.uniqid(),
        'code' => 'OBR_'.uniqid(),
        'is_active' => true,
    ]);

    $this->campusMintal = Campus::create([
        'name' => 'Mintal Campus '.uniqid(),
        'code' => 'MIN_'.uniqid(),
        'is_active' => true,
    ]);

    $this->collegeObrero = College::create([
        'name' => 'College of Computing '.uniqid(),
        'code' => 'COC_'.uniqid(),
        'campus' => $this->campusObrero->name,
        'campus_id' => $this->campusObrero->id,
        'is_active' => true,
    ]);

    $this->collegeMintal = College::create([
        'name' => 'College of Agriculture '.uniqid(),
        'code' => 'COA_'.uniqid(),
        'campus' => $this->campusMintal->name,
        'campus_id' => $this->campusMintal->id,
        'is_active' => true,
    ]);

    $this->programObrero = Program::create([
        'college_id' => $this->collegeObrero->id,
        'program_name' => 'BSIT '.uniqid(),
        'is_active' => true,
        'required_hours' => 500,
    ]);

    $this->programMintal = Program::create([
        'college_id' => $this->collegeMintal->id,
        'program_name' => 'BS Agriculture '.uniqid(),
        'is_active' => true,
        'required_hours' => 500,
    ]);

    $this->hteObrero = Hte::create([
        'college_id' => $this->collegeObrero->id,
        'hte_name' => 'Tech Company '.uniqid(),
        'status' => 'active',
    ]);

    $this->hteMintal = Hte::create([
        'college_id' => $this->collegeMintal->id,
        'hte_name' => 'Agri Company '.uniqid(),
        'status' => 'active',
    ]);

    $this->superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'is_active' => true,
    ]);
});

test('same id_number can be registered across different campuses', function () {
    $sharedIdNumber = '2026-12345';

    // 1. Register intern at Obrero campus
    $response1 = $this->post(route('register.store'), [
        'name' => 'Obrero Student',
        'email' => 'student.obrero@usep.edu.ph',
        'id_number' => $sharedIdNumber,
        'sex' => 'male',
        'campus' => $this->campusObrero->name,
        'college_id' => $this->collegeObrero->id,
        'program_id' => $this->programObrero->program_id,
        'hte_id' => $this->hteObrero->hte_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response1->assertRedirect(route('verification.notice'));

    $profile1 = InternProfile::where('id_number', $sharedIdNumber)
        ->where('campus_id', $this->campusObrero->id)
        ->first();
    expect($profile1)->not->toBeNull();
    expect($profile1->campus)->toBe($this->campusObrero->name);

    // 2. Register second intern with the SAME id_number at Mintal campus
    $response2 = $this->post(route('register.store'), [
        'name' => 'Mintal Student',
        'email' => 'student.mintal@usep.edu.ph',
        'id_number' => $sharedIdNumber,
        'sex' => 'female',
        'campus' => $this->campusMintal->name,
        'college_id' => $this->collegeMintal->id,
        'program_id' => $this->programMintal->program_id,
        'hte_id' => $this->hteMintal->hte_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response2->assertRedirect(route('verification.notice'));

    $profile2 = InternProfile::where('id_number', $sharedIdNumber)
        ->where('campus_id', $this->campusMintal->id)
        ->first();
    expect($profile2)->not->toBeNull();
    expect($profile2->campus)->toBe($this->campusMintal->name);
    expect($profile2->user_id)->not->toBe($profile1->user_id);
});

test('same id_number cannot be registered twice within the same campus', function () {
    $sharedIdNumber = '2026-54321';

    // 1. Register first intern at Obrero
    $this->post(route('register.store'), [
        'name' => 'Obrero Student 1',
        'email' => 'student.obrero1@usep.edu.ph',
        'id_number' => $sharedIdNumber,
        'sex' => 'male',
        'campus' => $this->campusObrero->name,
        'college_id' => $this->collegeObrero->id,
        'program_id' => $this->programObrero->program_id,
        'hte_id' => $this->hteObrero->hte_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertRedirect(route('verification.notice'));

    // 2. Attempt registering second intern with the SAME id_number at the SAME campus
    $response = $this->post(route('register.store'), [
        'name' => 'Obrero Student 2',
        'email' => 'student.obrero2@usep.edu.ph',
        'id_number' => $sharedIdNumber,
        'sex' => 'female',
        'campus' => $this->campusObrero->name,
        'college_id' => $this->collegeObrero->id,
        'program_id' => $this->programObrero->program_id,
        'hte_id' => $this->hteObrero->hte_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response->assertSessionHasErrors(['id_number']);
});

test('scopeForCampus correctly resolves interns via model, integer ID, and string name', function () {
    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'email_verified_at' => now(),
        'campus' => $this->campusObrero->name,
    ]);

    $profile = InternProfile::create([
        'user_id' => $internUser->id,
        'id_number' => '2026-77777',
        'sex' => 'male',
        'hte_id' => $this->hteObrero->hte_id,
        'program_id' => $this->programObrero->program_id,
        'campus' => $this->campusObrero->name,
        'campus_id' => $this->campusObrero->id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
        'approved_at' => now(),
    ]);

    // Test with Campus model
    expect(InternProfile::forCampus($this->campusObrero)->count())->toBe(1);
    expect(InternProfile::forCampus($this->campusMintal)->count())->toBe(0);

    // Test with integer campus ID
    expect(InternProfile::forCampus($this->campusObrero->id)->count())->toBe(1);
    expect(InternProfile::forCampus($this->campusMintal->id)->count())->toBe(0);

    // Test with string campus name
    expect(InternProfile::forCampus($this->campusObrero->name)->count())->toBe(1);
    expect(InternProfile::forCampus($this->campusMintal->name)->count())->toBe(0);
});

test('scopeForCampus resolves legacy records when campus_id is null', function () {
    $legacyUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'email_verified_at' => now(),
        'campus' => $this->campusMintal->name,
    ]);

    // Legacy profile with campus_id = null but campus string set
    InternProfile::create([
        'user_id' => $legacyUser->id,
        'id_number' => '2026-88888',
        'sex' => 'female',
        'hte_id' => $this->hteMintal->hte_id,
        'program_id' => $this->programMintal->program_id,
        'campus' => $this->campusMintal->name,
        'campus_id' => null,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
        'approved_at' => now(),
    ]);

    // Should resolve via integer ID (because scope loads campus model and checks name fallback)
    expect(InternProfile::forCampus($this->campusMintal->id)->count())->toBe(1);
    // Should resolve via Campus model
    expect(InternProfile::forCampus($this->campusMintal)->count())->toBe(1);
    // Should resolve via string name
    expect(InternProfile::forCampus($this->campusMintal->name)->count())->toBe(1);
});

test('admin can update intern without triggering false unique validation on their own id_number', function () {
    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'email' => 'original@usep.edu.ph',
    ]);

    $profile = InternProfile::create([
        'user_id' => $internUser->id,
        'id_number' => '2026-33333',
        'sex' => 'male',
        'hte_id' => $this->hteObrero->hte_id,
        'program_id' => $this->programObrero->program_id,
        'campus_id' => $this->campusObrero->id,
        'campus' => $this->campusObrero->name,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
    ]);

    $response = $this->actingAs($this->superAdmin)->patch(route('admin.interns.update', $profile), [
        'name' => 'Updated Name',
        'email' => 'original@usep.edu.ph',
        'id_number' => '2026-33333', // Keeping the same ID number
        'contact_number' => '09123456789',
        'sex' => 'male',
        'hte_id' => $this->hteObrero->hte_id,
        'program_id' => $this->programObrero->program_id,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();
    expect($internUser->fresh()->name)->toBe('Updated Name');
});

test('admin updating intern to another college program updates campus_id and campus', function () {
    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'email' => 'transfer@usep.edu.ph',
        'campus' => $this->campusObrero->name,
    ]);

    $profile = InternProfile::create([
        'user_id' => $internUser->id,
        'id_number' => '2026-44444',
        'sex' => 'female',
        'hte_id' => $this->hteObrero->hte_id,
        'program_id' => $this->programObrero->program_id,
        'campus_id' => $this->campusObrero->id,
        'campus' => $this->campusObrero->name,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
    ]);

    // Transfer intern to Mintal program and Mintal HTE
    $response = $this->actingAs($this->superAdmin)->patch(route('admin.interns.update', $profile), [
        'name' => 'Transfer Student',
        'email' => 'transfer@usep.edu.ph',
        'id_number' => '2026-44444',
        'sex' => 'female',
        'hte_id' => $this->hteMintal->hte_id,
        'program_id' => $this->programMintal->program_id,
    ]);

    $response->assertSessionHasNoErrors();
    $profile->refresh();

    // Check that campus_id and campus were updated to Mintal
    expect($profile->campus_id)->toBe($this->campusMintal->id);
    expect($profile->campus)->toBe($this->campusMintal->name);
    expect($internUser->fresh()->campus)->toBe($this->campusMintal->name);
});

test('admin cannot update intern id_number to match another intern in the same campus', function () {
    $existingUser = User::factory()->create(['role' => User::ROLE_INTERN]);
    InternProfile::create([
        'user_id' => $existingUser->id,
        'id_number' => '2026-66666',
        'sex' => 'male',
        'hte_id' => $this->hteObrero->hte_id,
        'program_id' => $this->programObrero->program_id,
        'campus_id' => $this->campusObrero->id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
    ]);

    $internToUpdate = User::factory()->create(['role' => User::ROLE_INTERN]);
    $profileToUpdate = InternProfile::create([
        'user_id' => $internToUpdate->id,
        'id_number' => '2026-77771',
        'sex' => 'female',
        'hte_id' => $this->hteObrero->hte_id,
        'program_id' => $this->programObrero->program_id,
        'campus_id' => $this->campusObrero->id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
    ]);

    $response = $this->actingAs($this->superAdmin)->patch(route('admin.interns.update', $profileToUpdate), [
        'name' => 'Attempt Duplicate',
        'email' => $internToUpdate->email,
        'id_number' => '2026-66666', // Conflicting ID in same campus
        'sex' => 'female',
        'hte_id' => $this->hteObrero->hte_id,
        'program_id' => $this->programObrero->program_id,
    ]);

    $response->assertSessionHasErrors(['id_number']);
});

test('admin CAN update intern id_number to match an intern in a different campus', function () {
    // Intern in Mintal has ID 2026-88881
    $mintalUser = User::factory()->create(['role' => User::ROLE_INTERN]);
    InternProfile::create([
        'user_id' => $mintalUser->id,
        'id_number' => '2026-88881',
        'sex' => 'male',
        'hte_id' => $this->hteMintal->hte_id,
        'program_id' => $this->programMintal->program_id,
        'campus_id' => $this->campusMintal->id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
    ]);

    // Intern in Obrero
    $obreroUser = User::factory()->create(['role' => User::ROLE_INTERN]);
    $obreroProfile = InternProfile::create([
        'user_id' => $obreroUser->id,
        'id_number' => '2026-99991',
        'sex' => 'female',
        'hte_id' => $this->hteObrero->hte_id,
        'program_id' => $this->programObrero->program_id,
        'campus_id' => $this->campusObrero->id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
    ]);

    // Update Obrero intern to have the same ID number as Mintal intern
    $response = $this->actingAs($this->superAdmin)->patch(route('admin.interns.update', $obreroProfile), [
        'name' => 'Obrero Updated',
        'email' => $obreroUser->email,
        'id_number' => '2026-88881', // Allowed because they are in different campuses
        'sex' => 'female',
        'hte_id' => $this->hteObrero->hte_id,
        'program_id' => $this->programObrero->program_id,
    ]);

    $response->assertSessionHasNoErrors();
    expect($obreroProfile->fresh()->id_number)->toBe('2026-88881');
});

