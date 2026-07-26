<?php

use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * @return array{0: User, 1: Hte}
 */
function makeSupervisorWithHte(): array
{
    $hte = Hte::create(['hte_name' => 'Test HTE']);

    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    return [$supervisor, $hte];
}

function makeApprovedInternForHte(Hte $hte): User
{
    $program = Program::create(['program_name' => 'BSCS-'.uniqid()]);

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

    return $intern;
}

test('a day with no time-in shows missing_time_in punctuality, without crashing', function () {
    [$supervisor, $hte] = makeSupervisorWithHte();
    $intern = makeApprovedInternForHte($hte);

    // Earliest (only) scan of the day is 2:00 PM — after the 13:00
    // cutoff, so DailyAttendance::$timeIn is null for this day.
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 14:00:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['month' => '2026-07']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/interns')
            ->has('logs', 1, fn ($log) => $log
                ->where('punctuality', 'missing_time_in')
                ->where('time_in', null)
                ->etc()
            )
        );
});

test('a time-in at or before the expected start time is marked on_time', function () {
    [$supervisor, $hte] = makeSupervisorWithHte();
    $intern = makeApprovedInternForHte($hte);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 07:45:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['month' => '2026-07']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('logs', 1, fn ($log) => $log
                ->where('punctuality', 'on_time')
                ->etc()
            )
        );
});

test('a time-in after the expected start time (but before the cutoff) is marked late', function () {
    [$supervisor, $hte] = makeSupervisorWithHte();
    $intern = makeApprovedInternForHte($hte);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 09:30:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['month' => '2026-07']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('logs', 1, fn ($log) => $log
                ->where('punctuality', 'late')
                ->etc()
            )
        );
});