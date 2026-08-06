<?php

use App\Models\AttendanceLog;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Support\Carbon;
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
        'privacy_accepted_at' => now(),
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
            ->component('intern/dashboard')
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
            ->component('intern/dashboard')
            ->where('month', '2026-06')
            ->where('monthLabel', 'June 2026')
        );
});

test('an intern can download their DTR report as a CSV', function () {
    $intern = makeApprovedIntern();

    $response = $this->actingAs($intern)->get(route('intern.dtr-report.download'));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/pdf');
});
test('a first scan before the time-out cutoff is a normal time-in', function () {
    $intern = makeApprovedIntern();
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 08:00:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $day = (new DailyAttendanceCalculator)->forIntern($intern->id, $intern->internProfile->hte_id)->first();

    expect($day->isMissingTimeIn())->toBeFalse()
        ->and($day->timeIn->clone()->setTimezone('Asia/Manila')->format('H:i'))->toBe('08:00')
        ->and($day->timeOut->clone()->setTimezone('Asia/Manila')->format('H:i'))->toBe('17:00');
});

test('a first scan after the time-out cutoff has no time-in and the scan becomes a time-out', function () {
    $intern = makeApprovedIntern();
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $day = (new DailyAttendanceCalculator)->forIntern($intern->id, $intern->internProfile->hte_id)->first();

    expect($day->isMissingTimeIn())->toBeTrue()
        ->and($day->timeIn)->toBeNull()
        ->and($day->timeOut->clone()->setTimezone('Asia/Manila')->format('H:i'))->toBe('17:00')
        ->and($day->hoursRendered)->toBe(0.0);
});

test('an early scan-in does not inflate rendered hours before the expected start time', function () {
    $intern = makeApprovedIntern();
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    // Expected start is 08:00 (config('dtr.expected_start_time') default).
    // Intern scans in at 06:30 and out at 17:00 — the 1.5 hours before
    // 08:00 must not be counted as rendered time.
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 06:30:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $day = (new DailyAttendanceCalculator)->forIntern($intern->id, $intern->internProfile->hte_id)->first();

    // 08:00 to 17:00 is 9 hours, minus the 1-hour lunch deduction = 8.
    // (Not 10.5, which is what 06:30-17:00 minus lunch would give.)
    expect($day->timeIn->clone()->setTimezone('Asia/Manila')->format('H:i'))->toBe('06:30')
        ->and($day->hoursRendered)->toBe(8.0)
        ->and($day->lunchDeducted)->toBeTrue();
});

test('a scan-in at or after the expected start time is unaffected by the clamp', function () {
    $intern = makeApprovedIntern();
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 08:00:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $day = (new DailyAttendanceCalculator)->forIntern($intern->id, $intern->internProfile->hte_id)->first();

    expect($day->hoursRendered)->toBe(8.0);
});

test('a scan exactly at the time-out cutoff still counts as a normal time-in', function () {
    $intern = makeApprovedIntern();
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 13:00:00', 'Asia/Manila'),
    ]);

    $day = (new DailyAttendanceCalculator)->forIntern($intern->id, $intern->internProfile->hte_id)->first();

    expect($day->isMissingTimeIn())->toBeFalse()
        ->and($day->timeIn->clone()->setTimezone('Asia/Manila')->format('H:i'))->toBe('13:00');
});
