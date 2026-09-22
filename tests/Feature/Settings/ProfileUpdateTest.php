<?php

use App\Models\User;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $originalEmail = $user->email;
    $originalVerifiedAt = $user->email_verified_at;

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe($originalEmail);
    expect($user->email_verified_at)->toEqual($originalVerifiedAt);
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});

test('intern profile page provides college and campus in idCard and profileDetails', function () {
    $campus = \App\Models\Campus::create([
        'name' => 'Mintal',
        'code' => 'MIN',
    ]);

    $college = \App\Models\College::create([
        'name' => 'College of Applied Economics',
        'code' => 'CAE',
        'campus' => 'Mintal',
        'campus_id' => $campus->id,
    ]);

    $program = \App\Models\Program::create([
        'college_id' => $college->id,
        'program_name' => 'BS Economics',
    ]);

    $hte = \App\Models\Hte::create([
        'hte_name' => 'NEDA Region XI',
        'address' => 'Davao City',
    ]);

    $user = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'college_id' => $college->id,
        'campus' => 'Mintal',
    ]);

    \App\Models\InternProfile::create([
        'user_id' => $user->id,
        'id_number' => '2023-99999',
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'campus' => 'Mintal',
        'status' => 'approved',
        'privacy_accepted_at' => now(),
        'registered_at' => now(),
    ]);

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->where('idCard.college', 'College of Applied Economics')
            ->where('idCard.campus', 'Mintal')
            ->where('profileDetails.college', 'College of Applied Economics')
            ->where('profileDetails.campus', 'Mintal')
        );
});

test('supervisor profile page provides college and campus without redundancy', function () {
    $campus = \App\Models\Campus::create([
        'name' => 'Obrero',
        'code' => 'OBR',
    ]);

    $college = \App\Models\College::create([
        'name' => 'College of Information and Computing',
        'code' => 'CIC',
        'campus' => 'Obrero',
        'campus_id' => $campus->id,
    ]);

    $program = \App\Models\Program::create([
        'college_id' => $college->id,
        'program_name' => 'BS Information Technology',
    ]);

    $user = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'campus' => 'Obrero',
    ]);

    \App\Models\SupervisorProfile::create([
        'user_id' => $user->id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'ojt',
        'status' => 'active',
    ]);

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->where('idCard.college', 'College of Information and Computing')
            ->where('idCard.campus', 'Obrero')
            ->where('idCard.subtitle', 'OJT Supervisor')
            ->where('profileDetails.college', 'College of Information and Computing')
            ->where('profileDetails.campus', 'Obrero')
        );
});

test('college admin profile page provides college and campus without duplicate college name', function () {
    $campus = \App\Models\Campus::create([
        'name' => 'Tagum',
        'code' => 'TAG',
    ]);

    $college = \App\Models\College::create([
        'name' => 'College of Agriculture',
        'code' => 'CoA',
        'campus' => 'Tagum',
        'campus_id' => $campus->id,
    ]);

    $user = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $college->id,
        'campus' => 'Tagum',
    ]);

    \App\Models\CollegeAdminProfile::create([
        'user_id' => $user->id,
        'college_id' => $college->id,
        'campus_id' => $campus->id,
        'employee_id' => 'EMP-777',
        'position' => 'College Dean',
    ]);

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->where('idCard.college', 'College of Agriculture')
            ->where('idCard.campus', 'Tagum')
            ->where('idCard.detail', 'College Dean') // Position, not redundant college name!
            ->where('idCard.id_number', 'EMP-777')
            ->where('profileDetails.college', 'College of Agriculture')
            ->where('profileDetails.campus', 'Tagum')
            ->where('profileDetails.id_number', 'EMP-777')
        );
});
