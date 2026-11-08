<?php

use App\Models\Hte;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());
});

test('two factor challenge redirects to login when not authenticated', function () {
    $response = $this->get(route('two-factor.login'));

    $response->assertRedirect(route('login'));
});

test('two factor challenge can be rendered', function () {
    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $user = User::factory()->withTwoFactor()->create(['role' => User::ROLE_ADMIN]);

    $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->get(route('two-factor.login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/two-factor-challenge'),
        );
});

test('intern logging in with two factor redirects to intern dashboard when no intended url', function () {
    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $hte = Hte::create(['hte_name' => 'Test HTE']);
    $intern = makeIntern($hte, 'approved');
    $intern->forceFill([
        'two_factor_secret' => encrypt('secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
        'two_factor_confirmed_at' => now(),
        'email_verified_at' => now(),
    ])->save();

    $this->post(route('login'), [
        'email' => $intern->email,
        'password' => 'password',
    ]);

    $response = $this->post(route('two-factor.login'), [
        'recovery_code' => 'recovery-code-1',
    ]);

    $response->assertRedirect(route('intern.dashboard'));
});

test('intern logging in with two factor ignores unauthorized admin intended url and redirects safely to intern dashboard', function () {
    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $hte = Hte::create(['hte_name' => 'Test HTE']);
    $intern = makeIntern($hte, 'approved');
    $intern->forceFill([
        'two_factor_secret' => encrypt('secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
        'two_factor_confirmed_at' => now(),
        'email_verified_at' => now(),
    ])->save();

    $this->withSession(['url.intended' => route('admin.dashboard')])
        ->post(route('login'), [
            'email' => $intern->email,
            'password' => 'password',
        ]);

    $response = $this->post(route('two-factor.login'), [
        'recovery_code' => 'recovery-code-1',
    ]);

    // Must NOT redirect to admin dashboard (which triggers 403 Unauthorized action)
    $response->assertRedirect(route('intern.dashboard'));
    $this->assertNull(session('url.intended'));
});

test('intern logging in with two factor preserves authorized intern intended url', function () {
    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $hte = Hte::create(['hte_name' => 'Test HTE']);
    $intern = makeIntern($hte, 'approved');
    $intern->forceFill([
        'two_factor_secret' => encrypt('secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
        'two_factor_confirmed_at' => now(),
        'email_verified_at' => now(),
    ])->save();

    $this->withSession(['url.intended' => route('intern.schedule.index')])
        ->post(route('login'), [
            'email' => $intern->email,
            'password' => 'password',
        ]);

    $response = $this->post(route('two-factor.login'), [
        'recovery_code' => 'recovery-code-1',
    ]);

    $response->assertRedirect(route('intern.schedule.index'));
});

test('user logging in with two factor redirects to first login password change if required', function () {
    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $hte = Hte::create(['hte_name' => 'Test HTE']);
    $intern = makeIntern($hte, 'approved');
    $intern->forceFill([
        'two_factor_secret' => encrypt('secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
        'two_factor_confirmed_at' => now(),
        'email_verified_at' => now(),
        'must_change_password' => true,
    ])->save();

    $this->post(route('login'), [
        'email' => $intern->email,
        'password' => 'password',
    ]);

    $response = $this->post(route('two-factor.login'), [
        'recovery_code' => 'recovery-code-1',
    ]);

    $response->assertRedirect(route('password.first-login'));
});
