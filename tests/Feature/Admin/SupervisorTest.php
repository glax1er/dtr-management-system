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

test('supervisor creation requires unique and valid email', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $hte = Hte::create(['hte_name' => 'Company ABC', 'status' => 'active']);
    User::factory()->create(['email' => 'existing@example.com']);

    // Duplicate email
    $response = $this->actingAs($admin)->post(route('admin.supervisors.store'), [
        'name' => 'Jane Doe',
        'email' => 'existing@example.com',
        'hte_id' => $hte->hte_id,
    ]);
    $response->assertSessionHasErrors(['email']);

    // Invalid email format
    $response = $this->actingAs($admin)->post(route('admin.supervisors.store'), [
        'name' => 'Jane Doe',
        'email' => 'not-an-email',
        'hte_id' => $hte->hte_id,
    ]);
    $response->assertSessionHasErrors(['email']);
});
