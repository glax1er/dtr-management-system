<?php

use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\User;

function makeApprovedIntern(): User
{
    $hte = Hte::create(['hte_name' => 'Test HTE']);
    $program = Program::create(['program_name' => 'BSCS-'.uniqid()]);

    $user = User::factory()->create(['role' => User::ROLE_INTERN]);

    InternProfile::create([
        'user_id' => $user->id,
        'id_number' => '2026-'.$user->id,
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
    ]);

    return $user;
}

test('guests are redirected away from the intern dashboard', function () {
    $this->get(route('intern.dashboard'))->assertRedirect(route('login'));
});

test('a supervisor cannot access the intern dashboard', function () {
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    $this->actingAs($supervisor)
        ->get(route('intern.dashboard'))
        ->assertForbidden();
});

test('an approved intern can view their dashboard, including the attendance log table', function () {
    $intern = makeApprovedIntern();

    $this->actingAs($intern)
        ->get(route('intern.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Intern/dashboard')
            ->has('profile')
            ->has('hours')
            ->has('today')
            ->has('month')
            ->has('monthLabel')
            ->has('logs')
            ->has('monthTotalHours')
            ->has('canGoNextMonth')
        );
});

test('the generic /dashboard route redirects an approved intern to their own dashboard', function () {
    $intern = makeApprovedIntern();

    $this->actingAs($intern)
        ->get(route('dashboard'))
        ->assertRedirect(route('intern.dashboard'));
});

test('an intern can page the dashboard log table to a specific month', function () {
    $intern = makeApprovedIntern();

    $this->actingAs($intern)
        ->get(route('intern.dashboard', ['month' => '2026-06']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Intern/dashboard')
            ->where('month', '2026-06')
            ->where('monthLabel', 'June 2026')
        );
});

test('an intern can download their DTR report as a CSV', function () {
    $intern = makeApprovedIntern();

    $response = $this->actingAs($intern)->get(route('intern.dtr-report.download'));

    $response->assertOk();
    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
});
