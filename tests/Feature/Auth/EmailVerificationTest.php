<?php

use App\Models\EmailVerificationCode;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::emailVerification());
});

test('email verification notice redirects to login modal with verification state', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->get(route('verification.notice'));

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('show_verification', true);
});

test('verified user or admin is redirected away from verification screen', function () {
    $user = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $response = $this->actingAs($user)->get(route('verification.notice'));

    $response->assertRedirect(route('dashboard'));
});

test('unverified user can verify email using valid 6-digit code', function () {
    Event::fake();

    $user = User::factory()->unverified()->create([
        'role' => User::ROLE_SUPERVISOR,
    ]);
    SupervisorProfile::create([
        'user_id' => $user->id,
        'supervisor_type' => 'ojt',
        'status' => 'active',
    ]);

    $code = EmailVerificationCode::generateFor($user->email);

    $response = $this->actingAs($user)->post(route('verification.verify-code'), [
        'code' => $code,
    ]);

    Event::assertDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    $response->assertRedirect(route('dashboard'));
});

test('intern with pending approval is logged out after verifying email and prompted to wait for approval', function () {
    Event::fake();

    $user = User::factory()->unverified()->create([
        'role' => User::ROLE_INTERN,
    ]);
    $hte = Hte::create(['hte_name' => 'Test HTE']);
    $program = Program::create(['program_name' => 'BSIT']);
    InternProfile::create([
        'user_id' => $user->id,
        'id_number' => '2026-99999',
        'sex' => 'female',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'pending',
        'privacy_accepted_at' => now(),
    ]);

    $code = EmailVerificationCode::generateFor($user->email);

    $response = $this->actingAs($user)->post(route('verification.verify-code'), [
        'code' => $code,
    ]);

    Event::assertDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    $this->assertGuest();
    $response->assertRedirect(route('login'));
    $response->assertSessionHas('status');
});

test('email is not verified with invalid 6-digit code', function () {
    Event::fake();

    $user = User::factory()->unverified()->create();
    EmailVerificationCode::generateFor($user->email);

    $response = $this->actingAs($user)->post(route('verification.verify-code'), [
        'code' => '000000',
    ]);

    Event::assertNotDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
    $response->assertSessionHasErrors('code');
});

test('resending verification notification generates new code and sends email', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->post(route('verification.send'));

    $response->assertSessionHas('status');
    Notification::assertSentTo($user, EmailVerificationCodeNotification::class);
});

test('admin account is always considered verified and exempt', function () {
    $admin = User::factory()->unverified()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    expect($admin->isAdmin())->toBeTrue();
    expect($admin->hasVerifiedEmail())->toBeTrue();
});