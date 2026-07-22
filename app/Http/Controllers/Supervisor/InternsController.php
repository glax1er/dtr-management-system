<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InternsController extends Controller
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    public function index(Request $request): Response
    {
        $supervisorProfile = $request->user()->supervisorProfile;

        $interns = InternProfile::query()
            ->where('hte_id', $supervisorProfile->hte_id)
            ->with(['user', 'program'])
            ->get()
            ->map(fn (InternProfile $intern) => [
                'user_id' => $intern->user_id,
                'name' => $intern->user->name,
                'id_number' => $intern->id_number,
                'program_name' => $intern->program?->program_name,
                'status' => $intern->status,
                'total_hours' => $this->calculator->totalHours($intern->user_id),
            ])
            ->sortBy('name')
            ->values();

        return Inertia::render('supervisor/interns', [
            'interns' => $interns,
        ]);
    }
}