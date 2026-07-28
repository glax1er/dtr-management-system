<?php

use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));
    $response->assertOk();
});

test('new interns can register and are sent to the pending-approval screen', function () {
    $hte = Hte::create(['hte_name' => 'Test HTE']);
    $program = Program::create(['program_name' => 'BSIT-BTM']);

    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'id_number' => '2026-00001',
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $this->assertGuest();
    $response->assertRedirect(route('register'));
    expect(InternProfile::first()->status)->toBe('pending');
});