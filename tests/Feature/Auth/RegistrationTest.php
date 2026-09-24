<?php

use App\Models\College;
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

test('intern registration rejects an HTE from a different college', function () {
    $collegeA = College::create(['name' => 'College A', 'code' => 'CA']);
    $collegeB = College::create(['name' => 'College B', 'code' => 'CB']);

    $hteA = Hte::create(['hte_name' => 'HTE of College A', 'college_id' => $collegeA->id]);
    $programB = Program::create(['program_name' => 'Program B', 'college_id' => $collegeB->id]);

    $response = $this->post(route('register.store'), [
        'name' => 'Student B',
        'email' => 'student.b@usep.edu.ph',
        'id_number' => '2026-00002',
        'sex' => 'female',
        'college_id' => $collegeB->id,
        'hte_id' => $hteA->hte_id,
        'program_id' => $programB->program_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response->assertSessionHasErrors(['hte_id']);
});

test('intern registration succeeds when HTE belongs to the selected college', function () {
    $collegeA = College::create(['name' => 'College Alpha', 'code' => 'CAL']);
    $hteA = Hte::create(['hte_name' => 'HTE Alpha', 'college_id' => $collegeA->id]);
    $programA = Program::create(['program_name' => 'Program Alpha', 'college_id' => $collegeA->id]);

    $response = $this->post(route('register.store'), [
        'name' => 'Student Alpha',
        'email' => 'student.alpha@usep.edu.ph',
        'id_number' => '2026-00003',
        'sex' => 'male',
        'college_id' => $collegeA->id,
        'hte_id' => $hteA->hte_id,
        'program_id' => $programA->program_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response->assertSessionDoesntHaveErrors(['hte_id']);
    $response->assertRedirect(route('verification.notice'));
});
