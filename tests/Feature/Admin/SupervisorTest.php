<?php

use App\Models\Hte;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;

test('admin can create an HTE supervisor with any valid email address', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $hte = Hte::create(['hte_name' => 'Company XYZ', 'status' => 'active']);

    $response = $this->actingAs($admin)->post(route('admin.supervisors.store'), [
        'name' => 'Jane Doe',
        'email' => 'jane.doe@company.com',
        'hte_id' => $hte->hte_id,
    ]);

    $response->assertRedirect(route('admin.supervisors.index'));
    $response->assertSessionHasNoErrors();

    $user = User::where('email', 'jane.doe@company.com')->first();
    expect($user)->not->toBeNull();
    expect($user->role)->toBe(User::ROLE_SUPERVISOR);

    $profile = SupervisorProfile::where('user_id', $user->id)->first();
    expect($profile)->not->toBeNull();
    expect($profile->supervisor_type)->toBe('hte');
    expect($profile->hte_id)->toBe($hte->hte_id);
});

test('admin can create an OJT supervisor with any valid email address', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $program = Program::create(['program_name' => 'BSIT-Test']);

    $response = $this->actingAs($admin)->post(route('admin.supervisors.store-ojt'), [
        'name' => 'Prof Smith',
        'email' => 'prof.smith@external-domain.org',
        'program_id' => $program->program_id,
    ]);

    $response->assertRedirect(route('admin.supervisors.index'));
    $response->assertSessionHasNoErrors();

    $user = User::where('email', 'prof.smith@external-domain.org')->first();
    expect($user)->not->toBeNull();
    expect($user->role)->toBe(User::ROLE_SUPERVISOR);

    $profile = SupervisorProfile::where('user_id', $user->id)->first();
    expect($profile)->not->toBeNull();
    expect($profile->supervisor_type)->toBe('ojt');
    expect($profile->program_id)->toBe($program->program_id);
});

test('supervisor creation validates email presence, format, and uniqueness', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $hte = Hte::create(['hte_name' => 'Company ABC', 'status' => 'active']);
    $program = Program::create(['program_name' => 'BSIT-Test']);
    User::factory()->create(['email' => 'existing@example.com']);

    // Missing email
    $this->actingAs($admin)->post(route('admin.supervisors.store'), [
        'name' => 'Jane Doe',
        'email' => '',
        'hte_id' => $hte->hte_id,
    ])->assertSessionHasErrors([
        'email' => 'The email address is required.',
    ]);

    // Duplicate email
    $this->actingAs($admin)->post(route('admin.supervisors.store'), [
        'name' => 'Jane Doe',
        'email' => 'existing@example.com',
        'hte_id' => $hte->hte_id,
    ])->assertSessionHasErrors([
        'email' => 'This email is already registered.',
    ]);

    // Invalid email format (HTE)
    $this->actingAs($admin)->post(route('admin.supervisors.store'), [
        'name' => 'Jane Doe',
        'email' => 'invalid-email-format',
        'hte_id' => $hte->hte_id,
    ])->assertSessionHasErrors([
        'email' => 'The email must be a valid email address.',
    ]);

    // Invalid email format (OJT)
    $this->actingAs($admin)->post(route('admin.supervisors.store-ojt'), [
        'name' => 'Prof Smith',
        'email' => 'not-an-email',
        'program_id' => $program->program_id,
    ])->assertSessionHasErrors([
        'email' => 'The email must be a valid email address.',
    ]);
});

