<?php

use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Kiosk;
use App\Models\Program;
use App\Models\ResolutionTicket;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Support\Carbon;

test('HTE supervisor can access resolution ticket logs', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);

    [$intern, $ticket, $resolver] = makeInternWithResolvedTicket($hte, $program, ResolutionTicket::STATUS_APPROVED);

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.logs'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/resolution-tickets-logs')
            ->has('tickets.data', 1)
            ->where('tickets.data.0.id', $ticket->id)
            ->where('tickets.data.0.status', ResolutionTicket::STATUS_APPROVED)
            ->where('totalResolved', 1)
        );
});

test('OJT supervisor cannot access resolution ticket logs', function () {
    [$ojtSupervisor] = makeOjtSupervisor();

    $this->actingAs($ojtSupervisor)
        ->get(route('supervisor.resolution-tickets.logs'))
        ->assertForbidden();
});

test('resolution ticket logs only show tickets from the supervisor HTE', function () {
    [$supervisorA, $hteA] = makeHteSupervisor();
    [$supervisorB, $hteB] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);

    [$internA, $ticketA] = makeInternWithResolvedTicket($hteA, $program, ResolutionTicket::STATUS_APPROVED);
    [$internB, $ticketB] = makeInternWithResolvedTicket($hteB, $program, ResolutionTicket::STATUS_APPROVED);

    $this->actingAs($supervisorA)
        ->get(route('supervisor.resolution-tickets.logs'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.id', $ticketA->id)
        );
});

test('resolution ticket logs can filter by status', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);

    [$intern1, $ticketApproved] = makeInternWithResolvedTicket($hte, $program, ResolutionTicket::STATUS_APPROVED);
    [$intern2, $ticketRejected] = makeInternWithResolvedTicket($hte, $program, ResolutionTicket::STATUS_REJECTED, 'Punch log missing');

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.logs', ['status' => 'rejected']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.id', $ticketRejected->id)
            ->where('tickets.data.0.status', 'rejected')
            ->where('tickets.data.0.rejection_reason', 'Punch log missing')
        );

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.logs', ['status' => 'approved']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.id', $ticketApproved->id)
            ->where('tickets.data.0.status', 'approved')
        );
});

test('resolution ticket logs correctly attach scan snapshots for the ticket date', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);

    [$intern, $ticket] = makeInternWithResolvedTicket($hte, $program, ResolutionTicket::STATUS_APPROVED);

    $kiosk = Kiosk::create([
        'name' => 'Main Gate Kiosk',
        'device_token' => 'kiosk-token-'.uniqid(),
        'is_active' => true,
    ]);

    // Create a physical scan on that date with captured photo
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'kiosk_id' => $kiosk->id,
        'captured_photo_path' => 'attendance-snapshots/test-photo.jpg',
        'scan_timestamp' => Carbon::parse('2026-07-20 07:50:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.logs'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.time_in_photo_url', fn ($val) => str_contains((string) $val, 'test-photo.jpg'))
            ->where('tickets.data.0.time_in_scanned_at', '7:50 AM')
        );
});

test('HTE supervisor can view scan snapshots page', function () {
    [$supervisor, $hte] = makeHteSupervisor();
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);

    $intern = User::factory()->create(['name' => 'John Snapshot', 'role' => User::ROLE_INTERN]);
    InternProfile::create([
        'user_id' => $intern->id,
        'id_number' => '2026-999',
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    $kiosk = Kiosk::create([
        'name' => 'Entrance Scanner',
        'device_token' => 'token-'.uniqid(),
        'is_active' => true,
    ]);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'kiosk_id' => $kiosk->id,
        'captured_photo_path' => 'attendance-snapshots/scan-snapshot.jpg',
        'scan_timestamp' => Carbon::parse('2026-07-20 08:15:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.resolution-tickets.snapshots'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/resolution-tickets-snapshots')
            ->has('snapshots.data', 1)
            ->where('snapshots.data.0.intern_name', 'John Snapshot')
            ->where('snapshots.data.0.kiosk_name', 'Entrance Scanner')
            ->where('snapshots.data.0.label', 'time_in')
            ->where('totalSnapshots', 1)
        );
});

test('OJT supervisor cannot access scan snapshots page', function () {
    [$ojtSupervisor] = makeOjtSupervisor();

    $this->actingAs($ojtSupervisor)
        ->get(route('supervisor.resolution-tickets.snapshots'))
        ->assertForbidden();
});
