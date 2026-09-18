<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\College;
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
        $user = $request->user();
        $isSuperAdmin = $user->isSuperAdmin();
        $collegeId = $user->isCollegeAdmin() ? $user->college_id : null;

        $colleges = $isSuperAdmin
            ? College::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
            : [];

        $query = SchedulePeriod::whereNull('hte_id')
            ->with('college:id,name,code')
            ->orderByDesc('start_date');

        if (! $isSuperAdmin && $collegeId !== null) {
            // College Admin sees their college's schedules AND the university global baseline schedule
            $query->where(function ($q) use ($collegeId) {
                $q->where('college_id', $collegeId)
                    ->orWhereNull('college_id');
            });
        }

        $periods = $query->get()->map(fn (SchedulePeriod $period) => $this->toArray($period, $user));

        return Inertia::render('admin/schedule', [
            'periods' => $periods,
            'isSuperAdmin' => $isSuperAdmin,
            'colleges' => $colleges,
            'userCollege' => $user->college ? [
                'id' => $user->college->id,
                'name' => $user->college->name,
                'code' => $user->college->code,
            ] : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->isSuperAdmin();
        $validated = $this->validatePayload($request, $isSuperAdmin);

        $collegeId = $isSuperAdmin
            ? ($validated['college_id'] ?? null)
            : $user->college_id;

        $schedulePeriod = SchedulePeriod::create([
            'hte_id' => null,
            'college_id' => $collegeId,
            'name' => $validated['name'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_schedule' => $validated['day_schedule'],
        ]);

        $schedulePeriod->load('college:id,name,code');

        $this->notifyScheduleChange($schedulePeriod, ScheduleUpdatedNotification::ACTION_CREATED, $user);

        $flashMessage = $collegeId === null
            ? 'University-wide global schedule period created.'
            : 'Global schedule period for '.($schedulePeriod->college?->name ?? 'college').' created.';

        Inertia::flash('toast', ['type' => 'success', 'message' => $flashMessage]);

        return back();
    }

    public function update(Request $request, SchedulePeriod $schedulePeriod): RedirectResponse
    {
        abort_if($schedulePeriod->hte_id !== null, 404);

        $user = $request->user();
        $isSuperAdmin = $user->isSuperAdmin();

        if ($user->isCollegeAdmin()) {
            abort_if(
                $schedulePeriod->college_id !== $user->college_id,
                403,
                'Unauthorized. You can only update schedules for your own college.'
            );
        }

        $validated = $this->validatePayload($request, $isSuperAdmin);

        $updateData = [
            'name' => $validated['name'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'day_schedule' => $validated['day_schedule'],
        ];

        if ($isSuperAdmin) {
            $updateData['college_id'] = $validated['college_id'] ?? null;
        }

        $schedulePeriod->update($updateData);
        $schedulePeriod->load('college:id,name,code');

        $this->notifyScheduleChange($schedulePeriod, ScheduleUpdatedNotification::ACTION_UPDATED, $user);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Schedule period updated.']);

        return back();
    }

    public function destroy(Request $request, SchedulePeriod $schedulePeriod): RedirectResponse
    {
        abort_if($schedulePeriod->hte_id !== null, 404);

        $user = $request->user();

        if ($user->isCollegeAdmin()) {
            abort_if(
                $schedulePeriod->college_id !== $user->college_id,
                403,
                'Unauthorized. You can only delete schedules for your own college.'
            );
        }

        $scheduleName = $schedulePeriod->name ?? "{$schedulePeriod->start_date->format('M d, Y')} - {$schedulePeriod->end_date->format('M d, Y')}";
        $periodId = $schedulePeriod->id;
        $collegeId = $schedulePeriod->college_id;
        $college = $schedulePeriod->college;
        $collegeName = $college !== null ? $college->name : null;

        $schedulePeriod->delete();

        $this->notifyScheduleChangeDeleted($scheduleName, $periodId, $collegeId, $collegeName, $user);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Schedule period deleted.']);

        return back();
    }

    private function notifyScheduleChange(SchedulePeriod $schedulePeriod, string $action, ?User $actor = null): void
    {
        $collegeId = $schedulePeriod->college_id;
        $collegeName = $schedulePeriod->college?->name;
        $scope = $collegeId === null ? ScheduleUpdatedNotification::SCOPE_GLOBAL : ScheduleUpdatedNotification::SCOPE_COLLEGE;

        $query = User::query();

        if ($collegeId === null) {
            // University-wide schedule: notify all verified approved interns and HTE supervisors
            $query->where(function ($q) {
                $q->where(function ($iq) {
                    $iq->where('role', User::ROLE_INTERN)
                        ->whereHas('internProfile', fn ($sub) => $sub
                            ->where('status', 'approved')
                            ->whereHas('user', fn ($user) => $user->whereNotNull('email_verified_at')));
                })->orWhere(function ($sq) {
                    $sq->where('role', User::ROLE_SUPERVISOR)
                        ->whereHas('supervisorProfile', fn ($sp) => $sp->where('supervisor_type', 'hte'));
                });
            });
        } else {
            // College-specific schedule: notify interns and supervisors belonging to this college
            $query->where(function ($q) use ($collegeId) {
                $q->where(function ($iq) use ($collegeId) {
                    $iq->where('role', User::ROLE_INTERN)
                        ->whereHas('internProfile', fn ($sub) => $sub
                            ->where('status', 'approved')
                            ->whereHas('user', fn ($user) => $user->whereNotNull('email_verified_at'))
                            ->where(function ($profile) use ($collegeId) {
                                $profile->whereHas('program', fn ($program) => $program->where('college_id', $collegeId))
                                    ->orWhereHas('user', fn ($user) => $user->where('college_id', $collegeId));
                            }));
                })->orWhere(function ($sq) use ($collegeId) {
                    $sq->where('role', User::ROLE_SUPERVISOR)
                        ->whereHas('supervisorProfile', fn ($sp) => $sp->where(function ($sub) use ($collegeId) {
                            $sub->where(fn ($hq) => $hq->where('supervisor_type', 'hte')->whereHas('hte', fn ($h) => $h->where('college_id', $collegeId)))
                                ->orWhere(fn ($pq) => $pq->where('supervisor_type', 'ojt')->whereHas('program', fn ($p) => $p->where('college_id', $collegeId)));
                        }));
                });
            });
        }

        $recipients = $query->get()->filter(fn (User $user) => $user->wantsNotification('schedule_alerts'));

        if ($recipients->isNotEmpty()) {
            $scheduleName = $schedulePeriod->name ?? "{$schedulePeriod->start_date->format('M d, Y')} - {$schedulePeriod->end_date->format('M d, Y')}";
            Notification::send($recipients, new ScheduleUpdatedNotification(
                action: $action,
                scope: $scope,
                scheduleName: $scheduleName,
                collegeName: $collegeName,
                actor: $actor,
                schedulePeriodId: $schedulePeriod->id,
                startDate: $schedulePeriod->start_date->toDateString(),
            ));
        }
    }

    private function notifyScheduleChangeDeleted(string $scheduleName, int $periodId, ?int $collegeId = null, ?string $collegeName = null, ?User $actor = null): void
    {
        $scope = $collegeId === null ? ScheduleUpdatedNotification::SCOPE_GLOBAL : ScheduleUpdatedNotification::SCOPE_COLLEGE;

        $query = User::query();

        if ($collegeId === null) {
            $query->where(function ($q) {
                $q->where(function ($iq) {
                    $iq->where('role', User::ROLE_INTERN)
                        ->whereHas('internProfile', fn ($sub) => $sub
                            ->where('status', 'approved')
                            ->whereHas('user', fn ($user) => $user->whereNotNull('email_verified_at')));
                })->orWhere(function ($sq) {
                    $sq->where('role', User::ROLE_SUPERVISOR)
                        ->whereHas('supervisorProfile', fn ($sp) => $sp->where('supervisor_type', 'hte'));
                });
            });
        } else {
            $query->where(function ($q) use ($collegeId) {
                $q->where(function ($iq) use ($collegeId) {
                    $iq->where('role', User::ROLE_INTERN)
                        ->whereHas('internProfile', fn ($sub) => $sub
                            ->where('status', 'approved')
                            ->whereHas('user', fn ($user) => $user->whereNotNull('email_verified_at'))
                            ->where(function ($profile) use ($collegeId) {
                                $profile->whereHas('program', fn ($program) => $program->where('college_id', $collegeId))
                                    ->orWhereHas('user', fn ($user) => $user->where('college_id', $collegeId));
                            }));
                })->orWhere(function ($sq) use ($collegeId) {
                    $sq->where('role', User::ROLE_SUPERVISOR)
                        ->whereHas('supervisorProfile', fn ($sp) => $sp->where(function ($sub) use ($collegeId) {
                            $sub->where(fn ($hq) => $hq->where('supervisor_type', 'hte')->whereHas('hte', fn ($h) => $h->where('college_id', $collegeId)))
                                ->orWhere(fn ($pq) => $pq->where('supervisor_type', 'ojt')->whereHas('program', fn ($p) => $p->where('college_id', $collegeId)));
                        }));
                });
            });
        }

        $recipients = $query->get()->filter(fn (User $user) => $user->wantsNotification('schedule_alerts'));

        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, new ScheduleUpdatedNotification(
                action: ScheduleUpdatedNotification::ACTION_DELETED,
                scope: $scope,
                scheduleName: $scheduleName,
                collegeName: $collegeName,
                actor: $actor,
                schedulePeriodId: $periodId,
            ));
        }
    }

    private function validatePayload(Request $request, bool $isSuperAdmin = false): array
    {
        $rules = [
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
        ];

        if ($isSuperAdmin) {
            $rules['college_id'] = ['nullable', 'integer', 'exists:colleges,id'];
        }

        return $request->validate($rules);
    }

    private function toArray(SchedulePeriod $period, User $viewer): array
    {
        $isGlobal = $period->college_id === null;
        $isOwner = $viewer->isSuperAdmin() || ($period->college_id !== null && $period->college_id === $viewer->college_id);
        $college = $period->college;

        return [
            'id' => $period->id,
            'name' => $period->name,
            'start_date' => $period->start_date->toDateString(),
            'end_date' => $period->end_date->toDateString(),
            'day_schedule' => $period->day_schedule,
            'college_id' => $period->college_id,
            'college' => $college !== null ? [
                'id' => $college->id,
                'name' => $college->name,
                'code' => $college->code,
            ] : null,
            'scope' => $isGlobal ? 'global' : 'college',
            'scope_label' => $isGlobal
                ? 'University-wide Global Schedule'
                : 'Global schedule set by '.($college !== null ? $college->name : 'College'),
            'is_owner' => $isOwner,
        ];
    }
}
