<?php

namespace App\Http\Controllers\Admin;

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

        $schedulePeriod = SchedulePeriod::create([
            'hte_id' => null,
            'name' => $validated['name'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_schedule' => $validated['day_schedule'],
        ]);

        $this->notifyScheduleChange($schedulePeriod, ScheduleUpdatedNotification::ACTION_CREATED, $request->user());

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

        $this->notifyScheduleChange($schedulePeriod, ScheduleUpdatedNotification::ACTION_UPDATED, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Schedule period updated.']);
        return back();
    }

    public function destroy(Request $request, SchedulePeriod $schedulePeriod): RedirectResponse
    {
        if ($schedulePeriod->end_date->isPast()) {
            abort(403, 'Cannot delete a schedule period that has already ended.');
        }

        $scheduleName = $schedulePeriod->name ?? "{$schedulePeriod->start_date->format('M d, Y')} - {$schedulePeriod->end_date->format('M d, Y')}";
        $periodId = $schedulePeriod->id;

        $schedulePeriod->delete();

        $this->notifyScheduleChangeDeleted($scheduleName, $periodId, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Schedule period deleted.']);
        return back();
    }

    private function notifyScheduleChange(SchedulePeriod $schedulePeriod, string $action, ?User $actor = null): void
    {
        $recipients = User::query()
            ->whereIn('role', [User::ROLE_INTERN, User::ROLE_SUPERVISOR])
            ->get()
            ->filter(fn (User $user) => $user->wantsNotification('schedule_alerts'));

        if ($recipients->isNotEmpty()) {
            $scheduleName = $schedulePeriod->name ?? "{$schedulePeriod->start_date->format('M d, Y')} - {$schedulePeriod->end_date->format('M d, Y')}";
            Notification::send($recipients, new ScheduleUpdatedNotification(
                action: $action,
                scope: ScheduleUpdatedNotification::SCOPE_GLOBAL,
                scheduleName: $scheduleName,
                actor: $actor,
                schedulePeriodId: $schedulePeriod->id,
            ));
        }
    }

    private function notifyScheduleChangeDeleted(string $scheduleName, int $periodId, ?User $actor = null): void
    {
        $recipients = User::query()
            ->whereIn('role', [User::ROLE_INTERN, User::ROLE_SUPERVISOR])
            ->get()
            ->filter(fn (User $user) => $user->wantsNotification('schedule_alerts'));

        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, new ScheduleUpdatedNotification(
                action: ScheduleUpdatedNotification::ACTION_DELETED,
                scope: ScheduleUpdatedNotification::SCOPE_GLOBAL,
                scheduleName: $scheduleName,
                actor: $actor,
                schedulePeriodId: $periodId,
            ));
        }
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