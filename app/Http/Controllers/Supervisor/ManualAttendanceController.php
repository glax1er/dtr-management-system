<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\InternProfile;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
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
            ->with(['user:id,name', 'program:program_id,program_name'])
            ->get()
            ->map(fn (InternProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'id_number' => $profile->id_number,
                'program_name' => $profile->program?->program_name,
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

        $timezone = config('dtr.timezone');

        $conflicts = collect($validated['dates'])
            ->filter(function (string $date) use ($validated, $timezone) {
                $start = Carbon::parse($date, $timezone)->startOfDay();
                $end = Carbon::parse($date, $timezone)->endOfDay();

                return AttendanceLog::where('intern_user_id', $validated['intern_user_id'])
                    ->whereBetween('scan_timestamp', [$start, $end])
                    ->whereNotNull('kiosk_id')
                    ->exists();
            })
            ->values();

        return response()->json(['conflicts' => $conflicts]);
    }

    /**
     * Plain JSON endpoint, same reasoning as checkConflicts() above.
     *
     * Looks up whatever attendance already exists for one intern on one
     * date (kiosk scans or a prior manual entry — either way, derived
     * through the same MIN/MAX-per-day logic the rest of the app uses)
     * so the frontend can pre-fill the Time In / Time Out fields when a
     * supervisor picks a date that already has a record, instead of
     * making them re-type values that are just going to overwrite what's
     * already there.
     */
    public function lookup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'intern_user_id' => ['required', 'integer', 'exists:intern_profiles,user_id'],
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $this->authorizeIntern($request, $validated['intern_user_id']);

        $timezone = config('dtr.timezone');
        $day = Carbon::createFromFormat('Y-m-d', $validated['date'], $timezone)->startOfDay();
        $hteId = InternProfile::where('user_id', $validated['intern_user_id'])->value('hte_id');

        $existingDay = (new DailyAttendanceCalculator())
            ->forIntern($validated['intern_user_id'], $hteId, $day->clone(), $day->clone()->endOfDay())
            ->first();

        if ($existingDay === null || $existingDay->isFullyMissing()) {
            return response()->json(['found' => false]);
        }

        return response()->json([
            'found' => true,
            'time_in' => $existingDay->timeIn?->clone()->setTimezone($timezone)->format('H:i'),
            'time_out' => $existingDay->timeOut?->clone()->setTimezone($timezone)->format('H:i'),
        ]);
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
            // Both are individually optional now — a supervisor may only
            // know a time-out (the intern forgot to scan in) or only a
            // time-in (still ongoing / forgot to scan out). The "at least
            // one of the two" rule, and the time_out > time_in check
            // (only when both are present), are enforced below instead of
            // via declarative rules, since "required unless a sibling
            // field is filled" isn't expressible per-row with wildcard
            // rules alone.
            'entries.*.time_in' => ['nullable', 'date_format:H:i'],
            'entries.*.time_out' => ['nullable', 'date_format:H:i'],
        ]);

        $validator = Validator::make($validated, []);
        $validator->after(function ($validator) use ($validated) {
            foreach ($validated['entries'] as $index => $entry) {
                $timeIn = $entry['time_in'] ?? null;
                $timeOut = $entry['time_out'] ?? null;

                if ($timeIn === null && $timeOut === null) {
                    $validator->errors()->add(
                        "entries.$index.time_in",
                        'Each record needs a time in, a time out, or both.'
                    );

                    continue;
                }

                if ($timeIn !== null && $timeOut !== null && $timeOut <= $timeIn) {
                    $validator->errors()->add(
                        "entries.$index.time_out",
                        'Time out must be after time in.'
                    );
                }
            }
        });
        $validator->validate();

        $this->authorizeIntern($request, $validated['intern_user_id']);

        $timezone = config('dtr.timezone');

        DB::transaction(function () use ($validated, $timezone) {
            foreach ($validated['entries'] as $entry) {
                $start = Carbon::parse($entry['date'], $timezone)->startOfDay();
                $end = Carbon::parse($entry['date'], $timezone)->endOfDay();

                AttendanceLog::where('intern_user_id', $validated['intern_user_id'])
                    ->whereBetween('scan_timestamp', [$start, $end])
                    ->delete();

                if (! empty($entry['time_in'])) {
                    AttendanceLog::create([
                        'intern_user_id' => $validated['intern_user_id'],
                        'supervisor_user_id' => auth()->id(),
                        'scan_timestamp' => Carbon::createFromFormat(
                            'Y-m-d H:i', $entry['date'].' '.$entry['time_in'], $timezone
                        ),
                    ]);
                }

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

        app(\App\Services\Attendance\CheckHoursMilestones::class)->check($validated['intern_user_id']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Attendance records saved.']);
        return back();
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