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