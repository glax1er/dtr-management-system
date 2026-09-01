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
function makeHteSupervisorForManualAttendanceTest(): array
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

function makeApprovedInternForManualAttendanceTest(Hte $hte): User
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

test('lookup reports nothing found when the intern has no attendance on that date', function () {
    [$supervisor, $hte] = makeHteSupervisorForManualAttendanceTest();
    $intern = makeApprovedInternForManualAttendanceTest($hte);

    $this->actingAs($supervisor)
        ->postJson('/supervisor/manual-attendance/lookup', [
            'intern_user_id' => $intern->id,
            'date' => '2026-07-20',
        ])
        ->assertOk()
        ->assertJson(['found' => false]);
});

test('lookup returns the existing time in and time out for a date that already has scans', function () {
    [$supervisor, $hte] = makeHteSupervisorForManualAttendanceTest();
    $intern = makeApprovedInternForManualAttendanceTest($hte);

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
        ->postJson('/supervisor/manual-attendance/lookup', [
            'intern_user_id' => $intern->id,
            'date' => '2026-07-20',
        ])
        ->assertOk()
        ->assertJson([
            'found' => true,
            'time_in' => '07:45',
            'time_out' => '17:00',
        ]);
});

test('a supervisor cannot look up attendance for an intern outside their HTE', function () {
    [$supervisor] = makeHteSupervisorForManualAttendanceTest();
    $otherHte = Hte::create(['hte_name' => 'Other HTE']);
    $outsideIntern = makeApprovedInternForManualAttendanceTest($otherHte);

    $this->actingAs($supervisor)
        ->postJson('/supervisor/manual-attendance/lookup', [
            'intern_user_id' => $outsideIntern->id,
            'date' => '2026-07-20',
        ])
        ->assertForbidden();
});

test('an entry with only a time out (no time in) is accepted', function () {
    [$supervisor, $hte] = makeHteSupervisorForManualAttendanceTest();
    $intern = makeApprovedInternForManualAttendanceTest($hte);

    $this->actingAs($supervisor)
        ->post('/supervisor/manual-attendance', [
            'intern_user_id' => $intern->id,
            'entries' => [
                ['date' => '2026-07-20', 'time_in' => null, 'time_out' => '17:00'],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(AttendanceLog::where('intern_user_id', $intern->id)->count())->toBe(1);
});

test('an entry with only a time in (no time out) is accepted', function () {
    [$supervisor, $hte] = makeHteSupervisorForManualAttendanceTest();
    $intern = makeApprovedInternForManualAttendanceTest($hte);

    $this->actingAs($supervisor)
        ->post('/supervisor/manual-attendance', [
            'intern_user_id' => $intern->id,
            'entries' => [
                ['date' => '2026-07-20', 'time_in' => '08:00', 'time_out' => null],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(AttendanceLog::where('intern_user_id', $intern->id)->count())->toBe(1);
});

test('an entry with neither a time in nor a time out is rejected', function () {
    [$supervisor, $hte] = makeHteSupervisorForManualAttendanceTest();
    $intern = makeApprovedInternForManualAttendanceTest($hte);

    $this->actingAs($supervisor)
        ->post('/supervisor/manual-attendance', [
            'intern_user_id' => $intern->id,
            'entries' => [
                ['date' => '2026-07-20', 'time_in' => null, 'time_out' => null],
            ],
        ])
        ->assertSessionHasErrors('entries.0.time_in');

    expect(AttendanceLog::where('intern_user_id', $intern->id)->count())->toBe(0);
});

test('a time out at or before the time in is rejected when both are present', function () {
    [$supervisor, $hte] = makeHteSupervisorForManualAttendanceTest();
    $intern = makeApprovedInternForManualAttendanceTest($hte);

    $this->actingAs($supervisor)
        ->post('/supervisor/manual-attendance', [
            'intern_user_id' => $intern->id,
            'entries' => [
                ['date' => '2026-07-20', 'time_in' => '17:00', 'time_out' => '08:00'],
            ],
        ])
        ->assertSessionHasErrors('entries.0.time_out');

    expect(AttendanceLog::where('intern_user_id', $intern->id)->count())->toBe(0);
});

test('checkConflicts and store correctly detect and replace early morning scans across timezone boundaries', function () {
    [$supervisor, $hte] = makeHteSupervisorForManualAttendanceTest();
    $intern = makeApprovedInternForManualAttendanceTest($hte);

    $kiosk = \App\Models\Kiosk::create([
        'name' => 'Main Gate',
        'device_token' => 'test-token',
        'is_active' => true,
    ]);

    // 07:30 AM Manila time on 2026-07-20 is 2026-07-19 23:30:00 UTC
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'kiosk_id' => $kiosk->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 07:30:00', config('dtr.timezone')),
    ]);

    // checkConflicts should detect it on 2026-07-20
    $this->actingAs($supervisor)
        ->postJson('/supervisor/manual-attendance/check', [
            'intern_user_id' => $intern->id,
            'dates' => ['2026-07-20'],
        ])
        ->assertOk()
        ->assertJson([
            'conflicts' => ['2026-07-20'],
        ]);

    // store should delete the existing early morning scan and create new entry
    $this->actingAs($supervisor)
        ->post('/supervisor/manual-attendance', [
            'intern_user_id' => $intern->id,
            'entries' => [
                ['date' => '2026-07-20', 'time_in' => '08:00', 'time_out' => '17:00'],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $logs = AttendanceLog::where('intern_user_id', $intern->id)->get();
    expect($logs)->toHaveCount(2);
    expect($logs->pluck('kiosk_id')->filter()->count())->toBe(0);
});

