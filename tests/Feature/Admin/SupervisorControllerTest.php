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

    // Log out the admin before attempting the supervisor login so the
    // previous actingAs() session does not bleed into this request.
    $this->post(route('logout'));

    $response = $this->post(route('login'), [
        'email' => $supervisor->email,
        'password' => config('supervisor.default_supervisor_password'),
    ]);

    $response->assertSessionDoesntHaveErrors('unverified_email');
    $this->assertAuthenticatedAs($supervisor);
});

test('reassigning an HTE supervisor refreshes contact person on both old and new HTEs', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $oldHte = Hte::create(['hte_name' => 'Old HTE', 'status' => 'active']);
    $newHte = Hte::create(['hte_name' => 'New HTE', 'status' => 'active']);

    $user = User::factory()->create([
        'name' => 'Jane Supervisor',
        'email' => 'jane@example.com',
        'role' => User::ROLE_SUPERVISOR,
    ]);
    $profile = SupervisorProfile::create([
        'user_id' => $user->id,
        'hte_id' => $oldHte->hte_id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    $oldHte->refreshContactPerson();
    expect($oldHte->fresh()->contact_person)->toBe('Jane Supervisor');
    expect($newHte->fresh()->contact_person)->toBeNull();

    // Reassign supervisor to New HTE
    $response = $this->actingAs($admin)->patch(route('admin.supervisors.update', $profile), [
        'name' => 'Jane Supervisor',
        'email' => 'jane@example.com',
        'hte_id' => $newHte->hte_id,
    ]);

    $response->assertRedirect();

    // Old HTE should have its contact_person cleared/refreshed, New HTE should have Jane Supervisor
    expect($oldHte->fresh()->contact_person)->toBeNull();
    expect($newHte->fresh()->contact_person)->toBe('Jane Supervisor');
});
