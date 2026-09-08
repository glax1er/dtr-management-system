<?php

use App\Models\Hte;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users are redirected from /dashboard to their role dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('intern.dashboard'));
});

test('an HTE supervisor is redirected from /dashboard to the supervisor dashboard', function () {
    $hte = Hte::create(['hte_name' => 'Test HTE']);
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'hte_id' => $hte->hte_id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    $this->actingAs($supervisor)
        ->get(route('dashboard'))
        ->assertRedirect(route('supervisor.dashboard'));
});

test('an OJT supervisor is redirected from /dashboard straight to their roster, not the dashboard', function () {
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'ojt',
        'status' => 'active',
    ]);

    $this->actingAs($supervisor)
        ->get(route('dashboard'))
        ->assertRedirect(route('supervisor.interns.index'));

    // Defense in depth: even a direct/bookmarked hit to the dashboard
    // route itself bounces an OJT supervisor back to their roster.
    $this->actingAs($supervisor)
        ->get(route('supervisor.dashboard'))
        ->assertRedirect(route('supervisor.interns.index'));
});
