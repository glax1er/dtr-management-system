<?php

use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Kiosk;
use App\Models\Program;
use App\Models\User;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Support\Carbon;

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

test('an intern can download their DTR report as a PDF and empty dates are excluded', function () {
    $intern = makeApprovedIntern();
    $profile = $intern->internProfile;
    $profile->update(['approved_at' => Carbon::parse('2026-07-01 08:00:00')]);

    $kiosk = Kiosk::create([
        'name' => 'Main Gate Kiosk',
        'device_token' => 'kiosk-test-token',
        'is_active' => true,
    ]);

    // Add attendance on 2026-07-06 only
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'kiosk_id' => $kiosk->id,
        'scan_timestamp' => Carbon::parse('2026-07-06 08:00:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'kiosk_id' => $kiosk->id,
        'scan_timestamp' => Carbon::parse('2026-07-06 17:00:00', 'Asia/Manila'),
    ]);

    $response = $this->actingAs($intern)->get(route('intern.dtr-report.download', [
        'start' => '2026-07-01',
        'end' => '2026-07-10',
    ]));

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

test('an early scan-in beyond the allowance does not inflate rendered hours', function () {
    $intern = makeApprovedIntern();
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    // Expected start is 08:00 (config('dtr.expected_start_time') default),
    // with a 60-minute early-arrival allowance (config('dtr.early_arrival_allowance_minutes')
    // default) — so counting only ever starts at 07:00 at the earliest.
    // Intern scans in at 06:30 and out at 17:00 — the 30 minutes before
    // 07:00 must not be counted as rendered time.
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

    // 07:00 to 17:00 is 10 hours, minus the 1-hour lunch deduction = 9.
    // (Not 8, which is what clamping straight to 08:00 would give; not
    // 10.5, which is what 06:30-17:00 minus lunch would give.)
    expect($day->timeIn->clone()->setTimezone('Asia/Manila')->format('H:i'))->toBe('06:30')
        ->and($day->hoursRendered)->toBe(9.0)
        ->and($day->lunchDeducted)->toBeTrue();
});

test('a scan-in within the early-arrival allowance counts in full', function () {
    $intern = makeApprovedIntern();
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    // Expected start is 08:00, allowance is 60 minutes, so a 07:15 scan-in
    // (within the allowance window) should count from 07:15, not 08:00.
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 07:15:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $day = (new DailyAttendanceCalculator)->forIntern($intern->id, $intern->internProfile->hte_id)->first();

    // 07:15 to 17:00 is 9h45m, minus the 1-hour lunch deduction = 8.75.
    expect($day->timeIn->clone()->setTimezone('Asia/Manila')->format('H:i'))->toBe('07:15')
        ->and($day->hoursRendered)->toBe(8.75)
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
