<?php

namespace App\Http\Controllers\Intern;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intern\DownloadDtrReportRequest;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DtrReportController extends Controller
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    /**
     * Streams a CSV in the intern's existing 2-column DTR layout:
     * one row per day, with the day's first scan as "Time In (Morning)"
     * and last scan as "Time Out (Afternoon)".
     *
     * NOTE: FR-12 flags the exact report format/fields as still needing
     * sign-off from the team. CSV was chosen here specifically because
     * it needs zero extra libraries (built into PHP via fputcsv) and
     * opens directly in Excel/Sheets. If the finalized format turns out
     * to need a styled PDF/table layout instead, only this method needs
     * to change — the underlying data (DailyAttendanceCalculator) stays
     * the same.
     */
    public function download(DownloadDtrReportRequest $request): StreamedResponse
    {
        $user = $request->user();
        $profile = $user->internProfile()->with(['hte', 'program'])->firstOrFail();
        $timezone = config('dtr.timezone');

        $validated = $request->validated();
        $month = isset($validated['month'])
            ? Carbon::createFromFormat('Y-m-d', $validated['month'].'-01', $timezone)->startOfMonth()
            : Carbon::now($timezone)->startOfMonth();

        $days = $this->calculator->forIntern(
            $user->id,
            from: $month->clone()->startOfMonth(),
            to: $month->clone()->endOfMonth(),
        );

        $filename = sprintf(
            'DTR_%s_%s.csv',
            str_replace(' ', '_', $profile->id_number),
            $month->format('Y-m'),
        );

        $callback = function () use ($user, $profile, $month, $days) {
            $handle = fopen('php://output', 'w');

            // Header block, matching the intern's existing DTR paper form.
            fputcsv($handle, ['Daily Time Record']);
            fputcsv($handle, ['Name', $user->name]);
            fputcsv($handle, ['ID Number', $profile->id_number]);
            fputcsv($handle, ['HTE', $profile->hte->hte_name]);
            fputcsv($handle, ['Program', $profile->program->program_name]);
            fputcsv($handle, ['Month', $month->format('F Y')]);
            fputcsv($handle, []);

            fputcsv($handle, [
                'Date', 'Day', 'Time In (Morning)', 'Time Out (Afternoon)',
                'Hours Rendered', 'Lunch Deducted', 'Status',
            ]);

            foreach ($days as $day) {
                $row = $day->toArray();
                fputcsv($handle, [
                    $row['date'],
                    $row['day'],
                    $row['time_in'],
                    $row['time_out'] ?? '—',
                    number_format($row['hours_rendered'], 2),
                    $row['lunch_deducted'] ? 'Yes' : 'No',
                    $row['status'] === 'open' ? 'No time-out recorded' : 'Complete',
                ]);
            }

            fputcsv($handle, []);
            fputcsv($handle, ['Total Hours Rendered', number_format($days->sum('hoursRendered'), 2)]);

            fclose($handle);
        };

        return response()->streamDownload($callback, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
