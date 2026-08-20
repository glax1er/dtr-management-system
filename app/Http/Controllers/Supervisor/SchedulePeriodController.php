<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\SchedulePeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SchedulePeriodController extends Controller
{
    public function index(Request $request): Response
    {
        $hteId = $request->user()->supervisorProfile->hte_id;

        // Global periods first (read-only reference for the supervisor),
        // then this HTE's own overrides — both shown together so the
        // supervisor can see exactly what they're overriding.
        $globalPeriods = SchedulePeriod::whereNull('hte_id')
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (SchedulePeriod $period) => $this->toArray($period, 'global'));

        $ownPeriods = SchedulePeriod::where('hte_id', $hteId)
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (SchedulePeriod $period) => $this->toArray($period, 'hte'));

        return Inertia::render('supervisor/schedule', [
            'globalPeriods' => $globalPeriods,
            'periods' => $ownPeriods,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $hteId = $request->user()->supervisorProfile->hte_id;
        $validated = $this->validatePayload($request);

        SchedulePeriod::create([
            'hte_id' => $hteId,
            'name' => $validated['name'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_schedule' => $validated['day_schedule'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'HTE schedule override created.']);
        return back();
    }

    public function update(Request $request, SchedulePeriod $schedulePeriod): RedirectResponse
    {
        $hteId = $request->user()->supervisorProfile->hte_id;

        if ($schedulePeriod->hte_id !== $hteId) {
            abort(403);
        }

        if ($schedulePeriod->end_date->isPast()) {
            abort(403, 'Cannot edit a schedule period that has already ended.');
        }

        $validated = $this->validatePayload($request);

        $schedulePeriod->update([
            'name' => $validated['name'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_schedule' => $validated['day_schedule'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Override updated.']);
        return back();
    }

    public function destroy(Request $request, SchedulePeriod $schedulePeriod): RedirectResponse
    {
        $hteId = $request->user()->supervisorProfile->hte_id;

        if ($schedulePeriod->hte_id !== $hteId) {
            abort(403);
        }

        if ($schedulePeriod->end_date->isPast()) {
            abort(403, 'Cannot delete a schedule period that has already ended.');
        }

        $schedulePeriod->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Override removed.']);
        return back();
    }

    private function toArray(SchedulePeriod $period, string $scope): array
    {
        return [
            'id' => $period->id,
            'name' => $period->name,
            'start_date' => $period->start_date->toDateString(),
            'end_date' => $period->end_date->toDateString(),
            'day_schedule' => $period->day_schedule,
            'scope' => $scope,
        ];
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'day_schedule' => ['required', 'array'],
            'day_schedule.monday' => ['nullable', 'date_format:H:i'],
            'day_schedule.tuesday' => ['nullable', 'date_format:H:i'],
            'day_schedule.wednesday' => ['nullable', 'date_format:H:i'],
            'day_schedule.thursday' => ['nullable', 'date_format:H:i'],
            'day_schedule.friday' => ['nullable', 'date_format:H:i'],
            'day_schedule.saturday' => ['nullable', 'date_format:H:i'],
            'day_schedule.sunday' => ['nullable', 'date_format:H:i'],
        ]);
    }
}