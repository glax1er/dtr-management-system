<?php

use App\Actions\Attendance\ComputeRenderedHoursForDay;
use App\Models\AttendanceLog;
use App\Models\User;
use Illuminate\Support\Carbon;

function scan(User $intern, User $supervisor, string $time): void
{
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse($time),
    ]);
}

beforeEach(function () {
    $this->intern = User::factory()->create(['role' => 'intern']);
    $this->supervisor = User::factory()->create(['role' => 'supervisor']);
    $this->compute = new ComputeRenderedHoursForDay;
});

test('no scans for the day returns zero and incomplete', function () {
    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->timeIn)->toBeNull()
        ->and($result->timeOut)->toBeNull()
        ->and($result->hours)->toBe(0.0)
        ->and($result->isComplete())->toBeFalse();
});

test('a single scan is reported as incomplete, not as zero-length hours', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 08:00');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->timeIn->format('H:i'))->toBe('08:00')
        ->and($result->timeOut)->toBeNull()
        ->and($result->isComplete())->toBeFalse();
});

test('a normal shift crossing lunch gets the 1-hour deduction', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 08:00');
    scan($this->intern, $this->supervisor, '2026-07-16 17:00');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->hours)->toBe(8.0)
        ->and($result->lunchDeducted)->toBeTrue()
        ->and($result->isComplete())->toBeTrue();
});

test('a morning-only shift ending before lunch is not deducted', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 08:00');
    scan($this->intern, $this->supervisor, '2026-07-16 11:00');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->hours)->toBe(3.0)
        ->and($result->lunchDeducted)->toBeFalse();
});

test('an afternoon-only shift starting exactly when lunch ends is not deducted', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 13:00');
    scan($this->intern, $this->supervisor, '2026-07-16 17:00');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->hours)->toBe(4.0)
        ->and($result->lunchDeducted)->toBeFalse();
});

test('extra scans in between are ignored, only earliest and latest count', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 08:00');
    scan($this->intern, $this->supervisor, '2026-07-16 12:03'); // accidental re-scan
    scan($this->intern, $this->supervisor, '2026-07-16 12:04'); // accidental re-scan
    scan($this->intern, $this->supervisor, '2026-07-16 17:00');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->timeIn->format('H:i'))->toBe('08:00')
        ->and($result->timeOut->format('H:i'))->toBe('17:00')
        ->and($result->hours)->toBe(8.0);
});

test('a shift entirely inside the lunch window clamps to zero instead of going negative', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 12:15');
    scan($this->intern, $this->supervisor, '2026-07-16 12:45');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->hours)->toBe(0.0)
        ->and($result->lunchDeducted)->toBeTrue();
});

test('only counts scans from the requested day', function () {
    scan($this->intern, $this->supervisor, '2026-07-15 08:00');
    scan($this->intern, $this->supervisor, '2026-07-15 17:00');
    scan($this->intern, $this->supervisor, '2026-07-16 09:00');
    scan($this->intern, $this->supervisor, '2026-07-16 15:00');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->timeIn->format('Y-m-d H:i'))->toBe('2026-07-16 09:00');
});

test('a completed day under 30 minutes is flagged as suspiciously short', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 08:00');
    scan($this->intern, $this->supervisor, '2026-07-16 08:10');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->isSuspiciouslyShort)->toBeTrue()
        ->and($result->isComplete())->toBeTrue();
});

test('a completed day at exactly 30 minutes is not flagged', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 08:00');
    scan($this->intern, $this->supervisor, '2026-07-16 08:30');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->isSuspiciouslyShort)->toBeFalse();
});

test('a normal full day is not flagged as short', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 08:00');
    scan($this->intern, $this->supervisor, '2026-07-16 17:00');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->isSuspiciouslyShort)->toBeFalse();
});

test('an incomplete day (single scan) is not flagged as short', function () {
    scan($this->intern, $this->supervisor, '2026-07-16 08:00');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->isSuspiciouslyShort)->toBeFalse()
        ->and($result->isComplete())->toBeFalse();
});

test('a day with no scans at all is not flagged as short', function () {
    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->isSuspiciouslyShort)->toBeFalse();
});

test('the short-shift flag is based on the raw gap, not the lunch-deducted hours', function () {
    // A shift entirely inside the lunch window: raw gap is 30 minutes
    // (not flagged as short), but hours rendered clamps to 0 after
    // the lunch deduction. These are two separate concerns and should
    // not be conflated.
    scan($this->intern, $this->supervisor, '2026-07-16 12:15');
    scan($this->intern, $this->supervisor, '2026-07-16 12:45');

    $result = ($this->compute)($this->intern->id, Carbon::parse('2026-07-16'));

    expect($result->isSuspiciouslyShort)->toBeFalse()
        ->and($result->hours)->toBe(0.0);
});