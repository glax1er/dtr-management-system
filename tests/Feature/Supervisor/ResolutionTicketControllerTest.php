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

function makeInternWithResolvedTicket(Hte $hte, Program $program, string $status, ?string $rejectionReason = null): array
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
        'rejection_reason' => $rejectionReason,
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
            ->has('tickets.data', 1)
            ->where('tickets.data.0.proposed_time_in', '7:45 AM')
            ->where('tickets.total', 1)
        );
});

test('resolution tickets are sorted with most recent date on top', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
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

    ResolutionTicket::create([
        'intern_user_id' => $intern->id,
        'date' => Carbon::parse('2026-08-20'),
        'proposed_time_in' => Carbon::parse('2026-08-20 08:00:00', 'Asia/Manila'),
        'reason' => 'Forgot scan 1',
        'status' => ResolutionTicket::STATUS_PENDING,
    ]);

    ResolutionTicket::create([
        'intern_user_id' => $intern->id,
        'date' => Carbon::parse('2026-08-27'),
        'proposed_time_in' => Carbon::parse('2026-08-27 08:00:00', 'Asia/Manila'),
        'reason' => 'Forgot scan 2',
        'status' => ResolutionTicket::STATUS_PENDING,
    ]);

    ResolutionTicket::create([
        'intern_user_id' => $intern->id,
        'date' => Carbon::parse('2026-08-25'),
        'proposed_time_in' => Carbon::parse('2026-08-25 08:00:00', 'Asia/Manila'),
        'reason' => 'Forgot scan 3',
        'status' => ResolutionTicket::STATUS_PENDING,
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/resolution-tickets')
            ->has('tickets.data', 3)
            ->where('tickets.data.0.date', '2026-08-27')
            ->where('tickets.data.1.date', '2026-08-25')
            ->where('tickets.data.2.date', '2026-08-20')
        );
});

test('resolution tickets can be filtered by search query and type', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);

    $internA = User::factory()->create(['name' => 'Alice Johnson', 'role' => User::ROLE_INTERN]);
    InternProfile::create([
        'user_id' => $internA->id,
        'id_number' => '2026-'.$internA->id,
        'sex' => 'female',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    $internB = User::factory()->create(['name' => 'Bob Smith', 'role' => User::ROLE_INTERN]);
    InternProfile::create([
        'user_id' => $internB->id,
        'id_number' => '2026-'.$internB->id,
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    ResolutionTicket::create([
        'intern_user_id' => $internA->id,
        'date' => Carbon::parse('2026-08-20'),
        'proposed_time_in' => Carbon::parse('2026-08-20 08:00:00', 'Asia/Manila'),
        'proposed_time_out' => null,
        'reason' => 'Forgot time in',
        'status' => ResolutionTicket::STATUS_PENDING,
    ]);

    ResolutionTicket::create([
        'intern_user_id' => $internB->id,
        'date' => Carbon::parse('2026-08-21'),
        'proposed_time_in' => Carbon::parse('2026-08-21 08:00:00', 'Asia/Manila'),
        'proposed_time_out' => Carbon::parse('2026-08-21 17:00:00', 'Asia/Manila'),
        'reason' => 'Kiosk was down',
        'status' => ResolutionTicket::STATUS_PENDING,
    ]);

    // Search by name
    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.index', ['search' => 'Alice']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.intern_name', 'Alice Johnson')
        );

    // Filter by type
    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.index', ['type' => 'no_record']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.intern_name', 'Bob Smith')
            ->where('tickets.data.0.type', 'no_record')
        );
});

test('resolution tickets pagination works properly', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
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

    for ($i = 1; $i <= 5; $i++) {
        ResolutionTicket::create([
            'intern_user_id' => $intern->id,
            'date' => Carbon::parse("2026-08-0{$i}"),
            'proposed_time_in' => Carbon::parse("2026-08-0{$i} 08:00:00", 'Asia/Manila'),
            'reason' => "Ticket {$i}",
            'status' => ResolutionTicket::STATUS_PENDING,
        ]);
    }

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.index', ['per_page' => 2, 'page' => 1]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('tickets.data', 2)
            ->where('tickets.current_page', 1)
            ->where('tickets.last_page', 3)
            ->where('tickets.total', 5)
        );

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.index', ['per_page' => 2, 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('tickets.data', 2)
            ->where('tickets.current_page', 2)
        );
});

use App\Notifications\ResolutionTicketNotification;

test('an HTE supervisor receives pending resolution tickets in global notifications', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);
    $supervisor->notify(new ResolutionTicketNotification($ticket, ResolutionTicketNotification::REQUEST_SUBMITTED));

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
    $intern->notify(new ResolutionTicketNotification($ticket, ResolutionTicketNotification::REQUEST_APPROVED));

    $this->actingAs($intern)
        ->get(route('intern.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 1)
            ->where(
                'notifications.items.0.title',
                'Your resolution request was approved',
            )
            ->where('notifications.items.0.href', '/intern/dashboard')
        );
});

test('an intern receives a notification when their resolution request is rejected', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket, $resolver] = makeInternWithResolvedTicket(
        $hte,
        $program,
        ResolutionTicket::STATUS_REJECTED,
        'Attendance log was not found in punch book.',
    );
    $intern->notify(new ResolutionTicketNotification($ticket, ResolutionTicketNotification::REQUEST_REJECTED));

    $this->actingAs($intern)
        ->get(route('intern.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 1)
            ->where(
                'notifications.items.0.title',
                'Your resolution request was rejected',
            )
            ->where('notifications.items.0.href', '/intern/dashboard')
            ->where('notifications.items.0.data.rejection_reason', 'Attendance log was not found in punch book.')
            ->where('notifications.items.0.data.date', '2026-07-20')
        );

    $this->actingAs($intern)
        ->get(route('notifications.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 1)
            ->where('notifications.items.0.data.rejection_reason', 'Attendance log was not found in punch book.')
            ->where('notifications.items.0.data.date', '2026-07-20')
        );
});

test('notifications can be cleared and will not reappear until there is new activity', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);
    $supervisor->notify(new ResolutionTicketNotification($ticket, ResolutionTicketNotification::REQUEST_SUBMITTED));

    $this->actingAs($supervisor)
        ->delete(route('notifications.clear'))
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
    $supervisor->notify(new ResolutionTicketNotification($ticket, ResolutionTicketNotification::REQUEST_SUBMITTED));

    $this->actingAs($supervisor)
        ->get(route('notifications.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.count', 1)
            ->where('notifications.items.0.title', "Resolution request from {$intern->name}")
        );
});

test('notifications mark-read route marks notification as read', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);
    $supervisor->notify(new ResolutionTicketNotification($ticket, ResolutionTicketNotification::REQUEST_SUBMITTED));
    $notification = $supervisor->notifications()->first();

    $this->actingAs($supervisor)
        ->post(route('notifications.markRead', $notification->id))
        ->assertRedirect();

    $this->assertNotNull($notification->fresh()->read_at);
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

    $this->actingAs($supervisor)
        ->patch(route('supervisor.resolution-tickets.reject', $ticket), [
            'rejection_reason' => 'Invalid.',
        ])
        ->assertForbidden();
});

test('an HTE supervisor can reject a resolution ticket with a reason and notify the intern', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);

    $this->actingAs($supervisor)
        ->patch(route('supervisor.resolution-tickets.reject', $ticket), [
            'rejection_reason' => 'No matching supervisor logbook record found.',
        ])
        ->assertRedirect();

    $ticket->refresh();
    expect($ticket->status)->toBe(ResolutionTicket::STATUS_REJECTED);
    expect($ticket->rejection_reason)->toBe('No matching supervisor logbook record found.');
    expect($ticket->resolved_by)->toBe($supervisor->id);
    expect($ticket->resolved_at)->not->toBeNull();

    $notification = $intern->notifications()->first();
    expect($notification)->not->toBeNull();
    expect($notification->data['rejection_reason'])->toBe('No matching supervisor logbook record found.');
    expect($notification->data['message'])->toContain('No matching supervisor logbook record found.');
});

test('an HTE supervisor cannot reject a resolution ticket without a reason', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    [$intern, $ticket] = makeInternWithPendingTicket($hte, $program);

    $this->actingAs($supervisor)
        ->patch(route('supervisor.resolution-tickets.reject', $ticket), [
            'rejection_reason' => '',
        ])
        ->assertSessionHasErrors('rejection_reason');

    expect($ticket->fresh()->status)->toBe(ResolutionTicket::STATUS_PENDING);
});
