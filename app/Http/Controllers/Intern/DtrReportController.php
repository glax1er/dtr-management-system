<?php

namespace App\Http\Controllers\Intern;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intern\DownloadDtrReportRequest;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Support\Carbon;
use Mpdf\Mpdf;
use Mpdf\Output\Destination;
use Symfony\Component\HttpFoundation\Response;

class DtrReportController extends Controller
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    /**
     * Renders a PDF in the intern's existing 2-column DTR layout: one
     * row per day, with the day's first scan as "Time In (Morning)"
     * and last scan as "Time Out (Afternoon)".
     *
     * This used to be a CSV — swapped to a styled PDF (via mPDF) once
     * the team needed control over the actual visual layout, not just
     * the data. Only this method and its Blade view changed; the data
     * itself (DailyAttendanceCalculator) is completely untouched — see
     * its own comment for why it was built decoupled from rendering
     * in the first place.
     */
    public function download(DownloadDtrReportRequest $request): Response
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

        $html = view('reports.dtr', [
            'user' => $user,
            'profile' => $profile,
            'month' => $month,
            'days' => $days,
            'totalHours' => $days->sum('hoursRendered'),
        ])->render();

        $mpdf = new Mpdf([
            'format' => 'Letter',
            'margin_top' => 15,
            'margin_bottom' => 15,
            'margin_left' => 15,
            'margin_right' => 15,
        ]);
        $mpdf->WriteHTML($html);

        $filename = sprintf(
            'DTR_%s_%s.pdf',
            str_replace(' ', '_', $profile->id_number),
            $month->format('Y-m'),
        );

        return response(
            $mpdf->Output($filename, Destination::STRING_RETURN),
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ],
        );
    }
}