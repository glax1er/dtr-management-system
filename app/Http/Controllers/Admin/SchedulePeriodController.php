<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SchedulePeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SchedulePeriodController extends Controller
{
    public function index(): Response
    {
        $periods = SchedulePeriod::whereNull('hte_id')
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (SchedulePeriod $period) => [
                'id' => $period->id,
                'name' => $period->name,
                'start_date' => $period->start_date->toDateString(),
                'end_date' => $period->end_date->toDateString(),
                'day_schedule' => $period->day_schedule,
            ]);

        return Inertia::render('admin/schedule', [
            'periods' => $periods,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatePayload($request);

        SchedulePeriod::create([
            'hte_id' => null,
            'name' => $validated['name'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_schedule' => $validated['day_schedule'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Global schedule period created.']);
        return back();
    }

    public function update(Request $request, SchedulePeriod $schedulePeriod): RedirectResponse
    {
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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Schedule period updated.']);
        return back();
    }

    public function destroy(SchedulePeriod $schedulePeriod): RedirectResponse
    {
        if ($schedulePeriod->end_date->isPast()) {
            abort(403, 'Cannot delete a schedule period that has already ended.');
        }

        $schedulePeriod->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Schedule period deleted.']);
        return back();
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