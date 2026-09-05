<?php

use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Support\Facades\Notification;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));
    $response->assertOk();
});

test('new interns can register and are sent a verification code to their email', function () {
    Notification::fake();

    $hte = Hte::create(['hte_name' => 'Test HTE']);
    $program = Program::create(['program_name' => 'BSIT-BTM']);

    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test.intern@usep.edu.ph',
        'id_number' => '2026-00001',
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response->assertRedirect(route('verification.notice'));

    $user = User::where('email', 'test.intern@usep.edu.ph')->first();
    expect($user)->not->toBeNull();
    expect($user->hasVerifiedEmail())->toBeFalse();
    expect(InternProfile::first()->status)->toBe('pending');

    Notification::assertSentTo($user, EmailVerificationCodeNotification::class);
});
