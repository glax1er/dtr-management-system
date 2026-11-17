<?php

use App\Models\AttendanceLog;
use App\Models\User;
use App\Services\Attendance\FirstScanLookup;
use Illuminate\Support\Facades\DB;

test('first scan lookup resolves local-day first scans for a page with one query', function () {
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);
    $otherIntern = User::factory()->create(['role' => User::ROLE_INTERN]);

    $firstScan = AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => '2026-07-20 08:00:00',
    ]);

    $laterSameDay = AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => '2026-07-20 17:00:00',
    ]);

    $firstNextDay = AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => '2026-07-21 08:00:00',
    ]);

    $firstOtherIntern = AttendanceLog::create([
        'intern_user_id' => $otherIntern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => '2026-07-20 08:30:00',
    ]);

    $pageLogs = AttendanceLog::query()
        ->whereIn('log_id', [$laterSameDay->log_id, $firstNextDay->log_id, $firstOtherIntern->log_id])
        ->get();

    DB::flushQueryLog();
    DB::enableQueryLog();

    $firstScans = app(FirstScanLookup::class)->forLogsByLocalDay($pageLogs, 'Asia/Manila');
    $queries = collect(DB::getQueryLog())
        ->filter(fn (array $query) => str_contains($query['query'], 'attendance_logs'))
        ->count();

    DB::disableQueryLog();

    expect($firstScans->get($intern->id.'_2026-07-20')?->log_id)->toBe($firstScan->log_id)
        ->and($firstScans->get($intern->id.'_2026-07-21')?->log_id)->toBe($firstNextDay->log_id)
        ->and($firstScans->get($otherIntern->id.'_2026-07-20')?->log_id)->toBe($firstOtherIntern->log_id)
        ->and($queries)->toBe(1);
});
