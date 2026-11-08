<?php

use App\Actions\Attendance\RecordScan;
use App\Exceptions\Attendance\InvalidScanException;
use App\Models\AttendanceLog;
use App\Support\Attendance\ScanLabel;
use App\Support\Attendance\ScanRejectionReason;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

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

test('a scan stores a captured photo snapshot when provided', function () {
    Storage::fake('public');
    makeIntern($this->hte, qrCodeValue: 'QR-PHOTO');

    $fakeBase64 = 'data:image/jpeg;base64,'.base64_encode('fake-image-binary-data');

    $result = ($this->recordScan)(
        'QR-PHOTO',
        $this->kiosk,
        Carbon::parse('2026-07-16 08:00:00'),
        $fakeBase64,
    );

    expect($result->capturedPhotoUrl)->not->toBeNull()
        ->and(AttendanceLog::count())->toBe(1);

    $log = AttendanceLog::first();
    expect($log->captured_photo_path)->not->toBeNull();
    Storage::disk('public')->assertExists($log->captured_photo_path);
});

test('a duplicate scan returns previous captured photo without storing a new file', function () {
    Storage::fake('public');
    makeIntern($this->hte, qrCodeValue: 'QR-PHOTO');

    $fakeBase64 = 'data:image/jpeg;base64,'.base64_encode('fake-image-binary-data');

    $firstResult = ($this->recordScan)(
        'QR-PHOTO',
        $this->kiosk,
        Carbon::parse('2026-07-16 08:00:00'),
        $fakeBase64,
    );

    $dupResult = ($this->recordScan)(
        'QR-PHOTO',
        $this->kiosk,
        Carbon::parse('2026-07-16 08:02:00'),
        'data:image/jpeg;base64,'.base64_encode('different-photo-data'),
    );

    expect($dupResult->isDuplicate)->toBeTrue()
        ->and($dupResult->capturedPhotoUrl)->toBe($firstResult->capturedPhotoUrl)
        ->and(AttendanceLog::count())->toBe(1);
});

test('invalid base64 photo data does not crash scan and still records attendance', function () {
    Storage::fake('public');
    makeIntern($this->hte, qrCodeValue: 'QR-BAD-PHOTO');

    $result = ($this->recordScan)(
        'QR-BAD-PHOTO',
        $this->kiosk,
        Carbon::parse('2026-07-16 08:00:00'),
        'not-valid-base64!',
    );

    expect($result->isDuplicate)->toBeFalse()
        ->and(AttendanceLog::count())->toBe(1);

    $log = AttendanceLog::first();
    expect($log->captured_photo_path)->toBeNull();
});

test('kiosk scan POST endpoint accepts photo and returns captured_photo_url', function () {
    Storage::fake('public');
    makeIntern($this->hte, qrCodeValue: 'QR-HTTP-PHOTO');

    $fakeBase64 = 'data:image/jpeg;base64,'.base64_encode('fake-image-bytes');

    $response = $this->postJson(route('kiosk.scan.store', ['token' => $this->kiosk->device_token]), [
        'qr_code_value' => 'QR-HTTP-PHOTO',
        'photo' => $fakeBase64,
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'intern_name',
            'id_number',
            'program_name',
            'hte_name',
            'photo_url',
            'captured_photo_url',
            'label',
            'timestamp',
            'is_duplicate',
        ]);

    expect($response->json('captured_photo_url'))->not->toBeNull();
});
