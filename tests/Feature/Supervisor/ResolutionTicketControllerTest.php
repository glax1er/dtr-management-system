<?php

use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\ResolutionTicket;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * @return array{0: User, 1: Hte}
 */
function makeHteSupervisor(): array
{
    $hte = Hte::create(['hte_name' => 'Test HTE '.uniqid()]);

    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'hte_id' => $hte->hte_id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    return [$supervisor, $hte];
}

/**
 * @return array{0: User, 1: Program}
 */
function makeOjtSupervisor(): array
{
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);

    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'ojt',
        'program_id' => $program->program_id,
        'status' => 'active',
    ]);

    return [$supervisor, $program];
}

function makeInternWithPendingTicket(Hte $hte, Program $program): array
{
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);

    InternProfile::create([
        'user_id' => $intern->id,
        'id_number' => '2026-'.$intern->id,
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    $ticket = ResolutionTicket::create([
        'intern_user_id' => $intern->id,
        'date' => Carbon::parse('2026-07-20'),
        'proposed_time_in' => Carbon::parse('2026-07-20 07:45:00', 'Asia/Manila'),
        'reason' => 'Forgot to scan in.',
        'status' => ResolutionTicket::STATUS_PENDING,
    ]);

    return [$intern, $ticket];
}

test('an HTE supervisor can view resolution tickets from their own HTE', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/resolution-tickets')
            ->has('tickets', 1)
        );
});

test('an OJT supervisor cannot view the resolution tickets page', function () {
    [$supervisor] = makeOjtSupervisor();

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.index'))
        ->assertForbidden();
});

test('an OJT supervisor cannot approve a resolution ticket', function () {
    [$supervisor] = makeOjtSupervisor();
    $hte = Hte::create(['hte_name' => 'Test HTE '.uniqid()]);
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);

    $this->actingAs($supervisor)
        ->patch(route('supervisor.resolution-tickets.approve', $ticket))
        ->assertForbidden();

    expect($ticket->fresh()->status)->toBe(ResolutionTicket::STATUS_PENDING);
});

test('an OJT supervisor cannot reject a resolution ticket', function () {
    [$supervisor] = makeOjtSupervisor();
    $hte = Hte::create(['hte_name' => 'Test HTE '.uniqid()]);
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);

    $this->actingAs($supervisor)
        ->patch(route('supervisor.resolution-tickets.reject', $ticket))
        ->assertForbidden();

    expect($ticket->fresh()->status)->toBe(ResolutionTicket::STATUS_PENDING);
});

test('an HTE supervisor cannot act on a ticket from a different HTE', function () {
    [$supervisor] = makeHteSupervisor();
    $otherHte = Hte::create(['hte_name' => 'Other HTE '.uniqid()]);
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($otherHte, $program);

    $this->actingAs($supervisor)
        ->patch(route('supervisor.resolution-tickets.approve', $ticket))
        ->assertForbidden();
});
