<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\InternProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ManualAttendanceController extends Controller
{
    public function create(Request $request): Response
    {
        $supervisorProfile = $request->user()->supervisorProfile;

        $interns = InternProfile::query()
            ->where('hte_id', $supervisorProfile->hte_id)
            ->where('status', 'approved')
            ->with('user:id,name')
            ->get()
            ->map(fn (InternProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
            ])
            ->sortBy('name')
            ->values();

        return Inertia::render('supervisor/manual-attendance', [
            'interns' => $interns,
        ]);
    }

    /**
     * Plain JSON endpoint — NOT routed through Inertia's router.post()
     * on the frontend, called via a normal fetch() instead. This is
     * what lets it safely return raw JSON without Inertia complaining.
     */
    public function checkConflicts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'intern_user_id' => ['required', 'integer', 'exists:intern_profiles,user_id'],
            'dates' => ['required', 'array', 'min:1'],
            'dates.*' => ['date_format:Y-m-d'],
        ]);

        $this->authorizeIntern($request, $validated['intern_user_id']);

        $conflicts = collect($validated['dates'])
            ->filter(fn (string $date) => AttendanceLog::where('intern_user_id', $validated['intern_user_id'])
                ->whereDate('scan_timestamp', $date)
                ->whereNotNull('kiosk_id')
                ->exists())
            ->values();

        return response()->json(['conflicts' => $conflicts]);
    }

    /**
     * Actual save — always an Inertia redirect, never raw JSON, since
     * this IS called via router.post() from the frontend.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'intern_user_id' => ['required', 'integer', 'exists:intern_profiles,user_id'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.date' => ['required', 'date_format:Y-m-d'],
            'entries.*.time_in' => ['required', 'date_format:H:i'],
            'entries.*.time_out' => ['nullable', 'date_format:H:i', 'after:entries.*.time_in'],
        ]);

        $this->authorizeIntern($request, $validated['intern_user_id']);

        $timezone = config('dtr.timezone');

        DB::transaction(function () use ($validated, $timezone) {
            foreach ($validated['entries'] as $entry) {
                AttendanceLog::where('intern_user_id', $validated['intern_user_id'])
                    ->whereDate('scan_timestamp', $entry['date'])
                    ->delete();

                AttendanceLog::create([
                    'intern_user_id' => $validated['intern_user_id'],
                    'supervisor_user_id' => auth()->id(),
                    'scan_timestamp' => Carbon::createFromFormat(
                        'Y-m-d H:i', $entry['date'].' '.$entry['time_in'], $timezone
                    ),
                ]);

                if (! empty($entry['time_out'])) {
                    AttendanceLog::create([
                        'intern_user_id' => $validated['intern_user_id'],
                        'supervisor_user_id' => auth()->id(),
                        'scan_timestamp' => Carbon::createFromFormat(
                            'Y-m-d H:i', $entry['date'].' '.$entry['time_out'], $timezone
                        ),
                    ]);
                }
            }
        });

        return back()->with('success', 'Attendance records saved.');
    }

    private function authorizeIntern(Request $request, int $internUserId): void
    {
        $supervisorProfile = $request->user()->supervisorProfile;

        $belongsToHte = InternProfile::where('user_id', $internUserId)
            ->where('hte_id', $supervisorProfile->hte_id)
            ->exists();

        if (! $belongsToHte) {
            abort(403);
        }
    }
}