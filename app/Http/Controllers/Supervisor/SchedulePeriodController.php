<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\SchedulePeriod;
use App\Models\User;
use App\Notifications\ScheduleUpdatedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
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

        $schedulePeriod = SchedulePeriod::create([
            'hte_id' => $hteId,
            'name' => $validated['name'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_schedule' => $validated['day_schedule'],
        ]);

        $this->notifyHteInterns($schedulePeriod, ScheduleUpdatedNotification::ACTION_CREATED, $request->user(), $hteId);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'HTE schedule override created.']);
        return back();
    }

    public function update(Request $request, SchedulePeriod $schedulePeriod): RedirectResponse
    {
        $hteId = $request->user()->supervisorProfile->hte_id;

        if ($schedulePeriod->hte_id !== $hteId) {
            abort(403);
        }

        if ($schedulePeriod->end_date->endOfDay()->isPast()) {
            abort(403, 'Cannot edit a schedule period that has already ended.');
        }

        $validated = $this->validatePayload($request);

        $schedulePeriod->update([
            'name' => $validated['name'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_schedule' => $validated['day_schedule'],
        ]);

        $this->notifyHteInterns($schedulePeriod, ScheduleUpdatedNotification::ACTION_UPDATED, $request->user(), $hteId);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Override updated.']);
        return back();
    }

    public function destroy(Request $request, SchedulePeriod $schedulePeriod): RedirectResponse
    {
        $hteId = $request->user()->supervisorProfile->hte_id;

        if ($schedulePeriod->hte_id !== $hteId) {
            abort(403);
        }

        if ($schedulePeriod->end_date->endOfDay()->isPast()) {
            abort(403, 'Cannot delete a schedule period that has already ended.');
        }

        $scheduleName = $schedulePeriod->name ?? "{$schedulePeriod->start_date->format('M d, Y')} - {$schedulePeriod->end_date->format('M d, Y')}";
        $periodId = $schedulePeriod->id;

        $schedulePeriod->delete();

        $this->notifyHteInternsDeleted($scheduleName, $periodId, $request->user(), $hteId);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Override removed.']);
        return back();
    }

    private function notifyHteInterns(SchedulePeriod $schedulePeriod, string $action, User $actor, int $hteId): void
    {
        $recipients = User::query()
            ->where('role', User::ROLE_INTERN)
            ->whereHas('internProfile', fn ($q) => $q->where('hte_id', $hteId))
            ->get()
            ->filter(fn (User $user) => $user->wantsNotification('schedule_alerts'));

        if ($recipients->isNotEmpty()) {
            $hteName = $actor->supervisorProfile?->hte?->hte_name;
            $scheduleName = $schedulePeriod->name ?? "{$schedulePeriod->start_date->format('M d, Y')} - {$schedulePeriod->end_date->format('M d, Y')}";

            Notification::send($recipients, new ScheduleUpdatedNotification(
                action: $action,
                scope: ScheduleUpdatedNotification::SCOPE_HTE,
                scheduleName: $scheduleName,
                hteName: $hteName,
                actor: $actor,
                schedulePeriodId: $schedulePeriod->id,
            ));
        }
    }

    private function notifyHteInternsDeleted(string $scheduleName, int $periodId, User $actor, int $hteId): void
    {
        $recipients = User::query()
            ->where('role', User::ROLE_INTERN)
            ->whereHas('internProfile', fn ($q) => $q->where('hte_id', $hteId))
            ->get()
            ->filter(fn (User $user) => $user->wantsNotification('schedule_alerts'));

        if ($recipients->isNotEmpty()) {
            $hteName = $actor->supervisorProfile?->hte?->hte_name;

            Notification::send($recipients, new ScheduleUpdatedNotification(
                action: ScheduleUpdatedNotification::ACTION_DELETED,
                scope: ScheduleUpdatedNotification::SCOPE_HTE,
                scheduleName: $scheduleName,
                hteName: $hteName,
                actor: $actor,
                schedulePeriodId: $periodId,
            ));
        }
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