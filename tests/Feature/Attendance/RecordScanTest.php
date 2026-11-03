<?php

use App\Actions\Attendance\RecordScan;
use App\Exceptions\Attendance\InvalidScanException;
use App\Models\AttendanceLog;
use App\Support\Attendance\ScanLabel;
use App\Support\Attendance\ScanRejectionReason;
use Illuminate\Support\Carbon;

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
