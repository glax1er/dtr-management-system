<?php

use App\Models\Hte;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;

test('admin can create an hte supervisor with a non-usep email address', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $hte = Hte::create(['hte_name' => 'Acme Corp', 'status' => 'active']);

    $response = $this->actingAs($admin)->post(route('admin.supervisors.store'), [
        'name' => 'Juan Dela Cruz',
        'email' => 'juan.delacruz@acmecorp.com',
        'hte_id' => $hte->hte_id,
    ]);

    $response->assertRedirect(route('admin.supervisors.index'));

    $user = User::where('email', 'juan.delacruz@acmecorp.com')->first();
    expect($user)->not->toBeNull();
    expect($user->hasVerifiedEmail())->toBeTrue();
    expect(SupervisorProfile::where('user_id', $user->id)->first()?->supervisor_type)->toBe('hte');
});

test('admin can create an ojt supervisor with a non-usep email address', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $program = Program::create(['program_name' => 'BSIT']);

    $response = $this->actingAs($admin)->post(route('admin.supervisors.store-ojt'), [
        'name' => 'Maria Santos',
        'email' => 'maria.santos@gmail.com',
        'program_id' => $program->program_id,
    ]);

    $response->assertRedirect(route('admin.supervisors.index'));

    $user = User::where('email', 'maria.santos@gmail.com')->first();
    expect($user)->not->toBeNull();
    expect($user->hasVerifiedEmail())->toBeTrue();
    expect(SupervisorProfile::where('user_id', $user->id)->first()?->supervisor_type)->toBe('ojt');
});

test('newly created hte and ojt supervisors can log in without an email verification step', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $hte = Hte::create(['hte_name' => 'Acme Corp', 'status' => 'active']);

    $this->actingAs($admin)->post(route('admin.supervisors.store'), [
        'name' => 'Juan Dela Cruz',
        'email' => 'juan.delacruz@acmecorp.com',
        'hte_id' => $hte->hte_id,
    ]);

    $supervisor = User::where('email', 'juan.delacruz@acmecorp.com')->first();

    $response = $this->post(route('login'), [
        'email' => $supervisor->email,
        'password' => config('supervisor.default_supervisor_password'),
    ]);

    $response->assertSessionDoesntHaveErrors('unverified_email');
    $this->assertAuthenticatedAs($supervisor);
});
