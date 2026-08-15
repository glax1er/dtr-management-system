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

function makeInternWithResolvedTicket(Hte $hte, Program $program, string $status): array
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

    $resolver = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    $ticket = ResolutionTicket::create([
        'intern_user_id' => $intern->id,
        'date' => Carbon::parse('2026-07-20'),
        'proposed_time_in' => Carbon::parse('2026-07-20 07:45:00', 'Asia/Manila'),
        'reason' => 'Forgot to scan in.',
        'status' => $status,
        'resolved_by' => $resolver->id,
        'resolved_at' => now(),
    ]);

    return [$intern, $ticket, $resolver];
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
            ->where('tickets.0.proposed_time_in', '7:45 AM')
        );
});

test('an HTE supervisor receives pending resolution tickets in global notifications', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);

    $this->actingAs($supervisor)
        ->get(route('supervisor.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 1)
            ->where('notifications.items.0.title', "Resolution request from {$intern->name}")
            ->where('notifications.items.0.href', '/supervisor/resolution-tickets')
        );
});

test('an intern receives a notification when their resolution request is approved', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket, $resolver] = makeInternWithResolvedTicket($hte, $program, ResolutionTicket::STATUS_APPROVED);

    $this->actingAs($intern)
        ->get(route('intern.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 1)
            ->where(
                'notifications.items.0.title',
                "Your resolution request on {$ticket->date->toDateString()} was approved",
            )
            ->where('notifications.items.0.href', '/intern/dashboard')
        );
});

test('an intern receives a notification when their resolution request is rejected', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket, $resolver] = makeInternWithResolvedTicket($hte, $program, ResolutionTicket::STATUS_REJECTED);

    $this->actingAs($intern)
        ->get(route('intern.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 1)
            ->where(
                'notifications.items.0.title',
                "Your resolution request on {$ticket->date->toDateString()} was rejected",
            )
            ->where('notifications.items.0.href', '/intern/dashboard')
        );
});

test('notifications can be cleared and will not reappear until there is new activity', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);

    $this->actingAs($supervisor)
        ->post(route('notifications.clear'))
        ->assertRedirect();

    $this->actingAs($supervisor->fresh())
        ->get(route('supervisor.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 0)
        );
});

test('notifications have a dedicated view page and show all notifications', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);

    $this->actingAs($supervisor)
        ->get(route('notifications.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 1)
            ->where('notifications.items.0.title', "Resolution request from {$intern->name}")
        );
});

test('notifications mark-read route updates supervisor cleared timestamp', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);

    $this->actingAs($supervisor)
        ->post(route('notifications.markRead'))
        ->assertNoContent();

    $this->assertNotNull($supervisor->fresh()->notifications_cleared_at);
});

test('admin notification page shows no notifications and does not reference resolution requests', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $this->actingAs($admin)
        ->get(route('notifications.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 0)
        );
});

test('an OJT supervisor does not receive resolution ticket notifications', function () {
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
