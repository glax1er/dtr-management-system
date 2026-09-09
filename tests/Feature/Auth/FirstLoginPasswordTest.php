<?php

use App\Models\Hte;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('newly created supervisor from admin controller has must_change_password set to true', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $hte = Hte::create(['hte_name' => 'Acme Corp', 'status' => 'active']);

    $response = $this->actingAs($admin)->post(route('admin.supervisors.store'), [
        'name' => 'Jane Supervisor',
        'email' => 'jane.supervisor@example.com',
        'hte_id' => $hte->hte_id,
    ]);

    $response->assertRedirect(route('admin.supervisors.index'));

    $supervisor = User::where('email', 'jane.supervisor@example.com')->firstOrFail();
    expect($supervisor->must_change_password)->toBeTrue();
});

test('supervisor with must_change_password is redirected to first-login screen when accessing other routes', function () {
    $supervisor = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'must_change_password' => true,
    ]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    $response = $this->actingAs($supervisor)->get(route('supervisor.dashboard'));

    $response->assertRedirect(route('password.first-login'));
});

test('first-login screen renders successfully for supervisor requiring password change', function () {
    $supervisor = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($supervisor)->get(route('password.first-login'));

    $response->assertOk();
});

test('supervisor cannot update password with incorrect current password', function () {
    $supervisor = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'password' => Hash::make('Supervisor@123'),
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($supervisor)->post(route('password.first-login.update'), [
        'current_password' => 'WrongPassword!123',
        'password' => 'NewSecurePassword@2026',
        'password_confirmation' => 'NewSecurePassword@2026',
    ]);

    $response->assertSessionHasErrors('current_password');
    expect($supervisor->fresh()->must_change_password)->toBeTrue();
});

test('supervisor cannot reuse the default supervisor password', function () {
    $defaultPassword = config('supervisor.default_supervisor_password', 'Supervisor@123');
    $supervisor = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'password' => Hash::make($defaultPassword),
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($supervisor)->post(route('password.first-login.update'), [
        'current_password' => $defaultPassword,
        'password' => $defaultPassword,
        'password_confirmation' => $defaultPassword,
    ]);

    $response->assertSessionHasErrors('password');
    expect($supervisor->fresh()->must_change_password)->toBeTrue();
});

test('supervisor successfully updates password and is redirected to dashboard with must_change_password set to false', function () {
    $supervisor = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'password' => Hash::make('Supervisor@123'),
        'must_change_password' => true,
    ]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    $response = $this->actingAs($supervisor)->post(route('password.first-login.update'), [
        'current_password' => 'Supervisor@123',
        'password' => 'MyNewSafeP@ssword2026',
        'password_confirmation' => 'MyNewSafeP@ssword2026',
    ]);

    $response->assertRedirect(route('supervisor.dashboard'));

    $refreshed = $supervisor->fresh();
    expect($refreshed->must_change_password)->toBeFalse();
    expect(Hash::check('MyNewSafeP@ssword2026', $refreshed->password))->toBeTrue();
});

test('supervisor who does not require password change is redirected away from first-login screen', function () {
    $supervisor = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'must_change_password' => false,
    ]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    $response = $this->actingAs($supervisor)->get(route('password.first-login'));

    $response->assertRedirect(route('supervisor.dashboard'));
});

test('supervisor still using default password requires password change even if must_change_password is false', function () {
    $defaultPassword = config('supervisor.default_supervisor_password', 'Supervisor@123');
    $supervisor = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'password' => Hash::make($defaultPassword),
        'must_change_password' => false,
    ]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    expect($supervisor->requiresPasswordChange())->toBeTrue();

    $response = $this->actingAs($supervisor)->get(route('supervisor.dashboard'));
    $response->assertRedirect(route('password.first-login'));
});
