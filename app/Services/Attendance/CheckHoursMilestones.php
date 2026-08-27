<?php

namespace App\Services\Attendance;

use App\Models\InternProfile;
use App\Models\User;
use App\Notifications\HoursMilestoneNotification;

class CheckHoursMilestones
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    /**
     * Checks an intern's current hours against milestones (50%, 80%, 100%)
     * and sends notifications if they haven't received them already.
     */
    public function check(int|InternProfile $intern): void
    {
        $profile = $intern instanceof InternProfile
            ? $intern
            : InternProfile::with(['user', 'program'])->find($intern);

        if (! $profile || ! $profile->user) {
            return;
        }

        $requiredHours = $profile->program?->required_hours ?? config('dtr.default_required_hours');
        if ($requiredHours <= 0) {
            return;
        }

        $totalHours = $this->calculator->totalHours($profile->user_id, $profile->hte_id);
        $percent = ($totalHours / $requiredHours) * 100;

        $user = $profile->user;

        // Check 100% milestone
        if ($percent >= 100) {
            if (! $this->hasReceivedMilestone($user, 'hours_milestone_100')) {
                $user->notify(new HoursMilestoneNotification(
                    milestone: HoursMilestoneNotification::MILESTONE_100,
                    totalHours: $totalHours,
                    requiredHours: $requiredHours,
                    internProfile: $profile,
                ));

                // Also notify assigned supervisors about 100% completion
                $this->notifySupervisorsAboutCompletion($profile, $totalHours, $requiredHours);
            }
            return;
        }

        // Check 80% milestone
        if ($percent >= 80) {
            if (! $this->hasReceivedMilestone($user, 'hours_milestone_80')) {
                $user->notify(new HoursMilestoneNotification(
                    milestone: HoursMilestoneNotification::MILESTONE_80,
                    totalHours: $totalHours,
                    requiredHours: $requiredHours,
                    internProfile: $profile,
                ));
            }
            return;
        }

        // Check 50% milestone
        if ($percent >= 50) {
            if (! $this->hasReceivedMilestone($user, 'hours_milestone_50')) {
                $user->notify(new HoursMilestoneNotification(
                    milestone: HoursMilestoneNotification::MILESTONE_50,
                    totalHours: $totalHours,
                    requiredHours: $requiredHours,
                    internProfile: $profile,
                ));
            }
        }
    }

    private function hasReceivedMilestone(User $user, string $type): bool
    {
        return $user->notifications()
            ->where('data->type', $type)
            ->exists();
    }

    private function notifySupervisorsAboutCompletion(InternProfile $profile, float $totalHours, int $requiredHours): void
    {
        User::query()
            ->where('role', User::ROLE_SUPERVISOR)
            ->whereHas('supervisorProfile', function ($query) use ($profile) {
                $query->where(function ($q) use ($profile) {
                    if ($profile->hte_id) {
                        $q->where('hte_id', $profile->hte_id);
                    }
                    if ($profile->program_id) {
                        $q->orWhere('program_id', $profile->program_id);
                    }
                });
            })
            ->get()
            ->each(function (User $supervisor) use ($profile, $totalHours, $requiredHours) {
                // Check if supervisor was already notified for this intern
                $alreadyNotified = $supervisor->notifications()
                    ->where('data->type', 'intern_completed_hours')
                    ->where('data->intern_user_id', $profile->user_id)
                    ->exists();

                if (! $alreadyNotified) {
                    $supervisor->notify(new HoursMilestoneNotification(
                        milestone: HoursMilestoneNotification::SUPERVISOR_INTERN_COMPLETED,
                        totalHours: $totalHours,
                        requiredHours: $requiredHours,
                        internProfile: $profile,
                    ));
                }
            });
    }
}
