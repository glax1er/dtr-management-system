<?php

use App\Actions\Attendance\RecordScan;
use App\Exceptions\Attendance\InvalidScanException;
use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Kiosk;
use App\Models\Program;
use App\Models\User;
use App\Support\Attendance\ScanLabel;
use App\Support\Attendance\ScanRejectionReason;
use Illuminate\Support\Carbon;

function makeHte(string $name = 'CIC'): Hte
{
    return Hte::create(['hte_name' => $name]);
}

function makeProgram(): Program
{
    return Program::create(['program_name' => 'BSIT-BTM '.uniqid()]);
}

function makeIntern(Hte $hte, string $status = 'approved', ?string $qrCodeValue = null): User
{
    $user = User::factory()->create(['role' => 'intern']);

    InternProfile::create([
        'user_id' => $user->id,
        'id_number' => 'ID-'.$user->id,
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => makeProgram()->program_id,
        'status' => $status,
        'qr_code_value' => $qrCodeValue ?? 'QR-'.$user->id,
        'registered_at' => now(),
        'approved_at' => $status === 'approved' ? now() : null,
        'privacy_accepted_at' => now(),
    ]);

    return $user;
}

function makeKiosk(string $name = 'Main Gate'): Kiosk
{
    return Kiosk::create([
        'name' => $name,
        'device_token' => Kiosk::generateToken(),
        'is_active' => true,
    ]);
}

beforeEach(function () {
    $this->hte = makeHte();
    $this->kiosk = makeKiosk();
    $this->recordScan = new RecordScan;
});

test('a recognized, approved intern scanning within their own HTE is recorded as time in', function () {
    makeIntern($this->hte, qrCodeValue: 'QR-ABC');

    $result = ($this->recordScan)('QR-ABC', $this->kiosk, Carbon::parse('2026-07-16 08:00'));

    expect($result->label)->toBe(ScanLabel::TimeIn)
        ->and($result->isDuplicate)->toBeFalse()
        ->and(AttendanceLog::count())->toBe(1);
});

test('a second scan later the same day is labeled time out', function () {
    makeIntern($this->hte, qrCodeValue: 'QR-ABC');

    ($this->recordScan)('QR-ABC', $this->kiosk, Carbon::parse('2026-07-16 08:00'));
    $result = ($this->recordScan)('QR-ABC', $this->kiosk, Carbon::parse('2026-07-16 17:00'));

    expect($result->label)->toBe(ScanLabel::TimeOut)
        ->and(AttendanceLog::count())->toBe(2);
});

test('an unrecognized QR code is rejected and writes nothing', function () {
    try {
        ($this->recordScan)('NOT-A-REAL-QR', $this->kiosk, Carbon::parse('2026-07-16 08:00'));
        $this->fail('Expected InvalidScanException to be thrown.');
    } catch (InvalidScanException $e) {
        expect($e->reason)->toBe(ScanRejectionReason::QrNotRecognized);
    }

    expect(AttendanceLog::count())->toBe(0);
});

test('a pending intern cannot scan even with a valid QR value', function () {
    makeIntern($this->hte, status: 'pending', qrCodeValue: 'QR-PENDING');

    try {
        ($this->recordScan)('QR-PENDING', $this->kiosk, Carbon::parse('2026-07-16 08:00'));
        $this->fail('Expected InvalidScanException to be thrown.');
    } catch (InvalidScanException $e) {
        expect($e->reason)->toBe(ScanRejectionReason::InternNotApproved);
    }

    expect(AttendanceLog::count())->toBe(0);
});

test('a second scan within the 5-minute debounce window does not create a new row', function () {
    makeIntern($this->hte, qrCodeValue: 'QR-ABC');

    ($this->recordScan)('QR-ABC', $this->kiosk, Carbon::parse('2026-07-16 08:00:00'));
    $result = ($this->recordScan)('QR-ABC', $this->kiosk, Carbon::parse('2026-07-16 08:04:59'));

    expect($result->isDuplicate)->toBeTrue()
        ->and($result->timestamp->format('H:i:s'))->toBe('08:00:00')
        ->and(AttendanceLog::count())->toBe(1);
});

test('a scan exactly at the 5-minute boundary is treated as a new, real scan', function () {
    makeIntern($this->hte, qrCodeValue: 'QR-ABC');

    ($this->recordScan)('QR-ABC', $this->kiosk, Carbon::parse('2026-07-16 08:00:00'));
    $result = ($this->recordScan)('QR-ABC', $this->kiosk, Carbon::parse('2026-07-16 08:05:00'));

    expect($result->isDuplicate)->toBeFalse()
        ->and(AttendanceLog::count())->toBe(2);
});

test('a debounced duplicate still reports the label the real scan would have had', function () {
    makeIntern($this->hte, qrCodeValue: 'QR-ABC');

    ($this->recordScan)('QR-ABC', $this->kiosk, Carbon::parse('2026-07-16 08:00:00'));
    $result = ($this->recordScan)('QR-ABC', $this->kiosk, Carbon::parse('2026-07-16 08:02:00'));

    expect($result->label)->toBe(ScanLabel::TimeIn)
        ->and($result->isDuplicate)->toBeTrue();
});