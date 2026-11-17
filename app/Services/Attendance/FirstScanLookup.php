<?php

namespace App\Services\Attendance;

use App\Models\AttendanceLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class FirstScanLookup
{
    /**
     * Find the first scan for each intern and local day represented by the given logs.
     *
     * @param  Collection<int, AttendanceLog>  $logs
     * @return Collection<string, AttendanceLog>
     */
    public function forLogsByLocalDay(Collection $logs, string $timezone): Collection
    {
        $dayPairs = $logs
            ->map(function (AttendanceLog $log) use ($timezone) {
                $date = $log->scan_timestamp->clone()->setTimezone($timezone)->toDateString();

                return [
                    'key' => $log->intern_user_id.'_'.$date,
                    'intern_user_id' => $log->intern_user_id,
                    'start' => Carbon::parse($date, $timezone)->startOfDay(),
                    'end' => Carbon::parse($date, $timezone)->endOfDay(),
                ];
            })
            ->unique('key')
            ->values();

        if ($dayPairs->isEmpty()) {
            return collect();
        }

        return AttendanceLog::query()
            ->from('attendance_logs as candidate')
            ->select([
                'candidate.log_id',
                'candidate.intern_user_id',
                'candidate.scan_timestamp',
            ])
            ->where(function ($query) use ($dayPairs) {
                foreach ($dayPairs as $dayPair) {
                    $query->orWhere(function ($query) use ($dayPair) {
                        $query
                            ->where('candidate.intern_user_id', $dayPair['intern_user_id'])
                            ->whereBetween('candidate.scan_timestamp', [$dayPair['start'], $dayPair['end']]);
                    });
                }
            })
            ->whereNotExists(function ($query) use ($dayPairs) {
                $query
                    ->selectRaw('1')
                    ->from('attendance_logs as earlier')
                    ->whereColumn('earlier.intern_user_id', 'candidate.intern_user_id')
                    ->where(function ($query) use ($dayPairs) {
                        foreach ($dayPairs as $dayPair) {
                            $query->orWhere(function ($query) use ($dayPair) {
                                $query
                                    ->where('candidate.intern_user_id', $dayPair['intern_user_id'])
                                    ->whereBetween('candidate.scan_timestamp', [$dayPair['start'], $dayPair['end']])
                                    ->whereBetween('earlier.scan_timestamp', [$dayPair['start'], $dayPair['end']]);
                            });
                        }
                    })
                    ->where(function ($query) {
                        $query
                            ->whereColumn('earlier.scan_timestamp', '<', 'candidate.scan_timestamp')
                            ->orWhere(function ($query) {
                                $query
                                    ->whereColumn('earlier.scan_timestamp', '=', 'candidate.scan_timestamp')
                                    ->whereColumn('earlier.log_id', '<', 'candidate.log_id');
                            });
                    });
            })
            ->get()
            ->keyBy(fn (AttendanceLog $log) => $log->intern_user_id.'_'.$log->scan_timestamp->clone()->setTimezone($timezone)->toDateString());
    }
}
