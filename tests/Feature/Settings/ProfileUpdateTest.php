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

test('sole administrator cannot delete their account', function () {
    // Ensure only 1 admin exists
    User::where('role', User::ROLE_ADMIN)->delete();
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'password' => 'password',
    ]);

    $response = $this
        ->actingAs($admin)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response->assertSessionHasErrors('password');
    expect($admin->fresh())->not->toBeNull();
});

test('administrator can delete their account if other administrators exist', function () {
    User::factory()->create(['role' => User::ROLE_ADMIN]);
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'password' => 'password',
    ]);

    $response = $this
        ->actingAs($admin)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response->assertSessionHasNoErrors();
    $this->assertGuest();
    expect($admin->fresh())->toBeNull();
});

