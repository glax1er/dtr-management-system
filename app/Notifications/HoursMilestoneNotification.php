<?php

namespace App\Notifications;

use App\Models\InternProfile;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class HoursMilestoneNotification extends Notification
{
    use Queueable;

    public const MILESTONE_50 = 'milestone_50';
    public const MILESTONE_80 = 'milestone_80';
    public const MILESTONE_100 = 'milestone_100';
    public const SUPERVISOR_INTERN_COMPLETED = 'supervisor_intern_completed';

    public function __construct(
        public string $milestone,
        public float $totalHours,
        public int $requiredHours,
        public ?InternProfile $internProfile = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $internName = $this->internProfile?->user?->name ?? 'Intern';
        $rendered = round($this->totalHours, 1);
        $required = $this->requiredHours;

        return match ($this->milestone) {
            self::MILESTONE_50 => [
                'type' => 'hours_milestone_50',
                'title' => 'Halfway there! 50% OJT Hours Completed',
                'message' => "Great job! You have rendered {$rendered} of {$required} required hours (50%).",
                'href' => '/intern/dashboard?highlight_hours=1',
                'total_hours' => $this->totalHours,
                'required_hours' => $this->requiredHours,
            ],
            self::MILESTONE_80 => [
                'type' => 'hours_milestone_80',
                'title' => 'Almost there! 80% OJT Hours Completed',
                'message' => "You're close to the finish line! You have rendered {$rendered} of {$required} required hours (80%).",
                'href' => '/intern/dashboard?highlight_hours=1',
                'total_hours' => $this->totalHours,
                'required_hours' => $this->requiredHours,
            ],
            self::MILESTONE_100 => [
                'type' => 'hours_milestone_100',
                'title' => 'Congratulations! 100% OJT Hours Completed',
                'message' => "You have completed {$rendered} hours and reached 100% of your required OJT hours! You can now generate your final DTR.",
                'href' => '/intern/dashboard?highlight_hours=1',
                'total_hours' => $this->totalHours,
                'required_hours' => $this->requiredHours,
            ],
            self::SUPERVISOR_INTERN_COMPLETED => [
                'type' => 'intern_completed_hours',
                'title' => "Intern Completed Hours: {$internName}",
                'message' => "{$internName} has rendered {$rendered} hours (100% completed) and is ready for DTR sign-off.",
                'href' => $this->internProfile ? "/supervisor/interns?doc_intern={$this->internProfile->user_id}&open_summary=1" : '/supervisor/interns',
                'intern_user_id' => $this->internProfile?->user_id,
                'total_hours' => $this->totalHours,
                'required_hours' => $this->requiredHours,
            ],
            default => [
                'type' => 'hours_milestone',
                'title' => 'OJT Hours Update',
                'message' => "You have rendered {$rendered} of {$required} required hours.",
                'href' => '/intern/dashboard?highlight_hours=1',
                'total_hours' => $this->totalHours,
                'required_hours' => $this->requiredHours,
            ],
        };
    }
}
