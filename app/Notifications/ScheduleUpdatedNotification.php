<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ScheduleUpdatedNotification extends Notification
{
    use Queueable;

    public const ACTION_CREATED = 'created';
    public const ACTION_UPDATED = 'updated';
    public const ACTION_DELETED = 'deleted';

    public const SCOPE_GLOBAL = 'global';
    public const SCOPE_HTE = 'hte';

    public function __construct(
        public string $action,
        public string $scope = self::SCOPE_GLOBAL,
        public ?string $scheduleName = null,
        public ?string $hteName = null,
        public ?User $actor = null,
        public ?int $schedulePeriodId = null,
        public ?string $startDate = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $name = $this->scheduleName ?? ($this->scope === self::SCOPE_HTE ? 'HTE schedule' : 'Training schedule');
        $actionVerb = match ($this->action) {
            self::ACTION_CREATED => 'created',
            self::ACTION_UPDATED => 'updated',
            self::ACTION_DELETED => 'removed',
            default => 'updated',
        };

        $isSupervisor = $notifiable instanceof User && $notifiable->isSupervisor();

        if ($this->scope === self::SCOPE_HTE) {
            $hteLabel = $this->hteName ? "for {$this->hteName}" : '';
            $title = match ($this->action) {
                self::ACTION_CREATED => 'New HTE Schedule Override',
                self::ACTION_DELETED => 'HTE Schedule Override Removed',
                default => 'HTE Schedule Override Updated',
            };
            $message = trim("The schedule override {$hteLabel} has been {$actionVerb} by your supervisor.");
            $href = $isSupervisor
                ? ('/supervisor/schedule' . ($this->schedulePeriodId && $this->action !== self::ACTION_DELETED ? '?highlight=' . $this->schedulePeriodId : ''))
                : '/intern/schedule';
        } else {
            $title = match ($this->action) {
                self::ACTION_CREATED => 'New OJT Schedule Created',
                self::ACTION_DELETED => 'OJT Schedule Removed',
                default => 'OJT Schedule Updated',
            };
            $message = "The official OJT schedule ({$name}) has been {$actionVerb} by the administrator.";

            $href = $isSupervisor
                ? ('/supervisor/schedule' . ($this->schedulePeriodId && $this->action !== self::ACTION_DELETED ? '?highlight=' . $this->schedulePeriodId : ''))
                : '/intern/schedule';
        }

        return [
            'type' => 'schedule_updated',
            'title' => $title,
            'message' => $message,
            'href' => $href,
            'action' => $this->action,
            'scope' => $this->scope,
            'schedule_name' => $this->scheduleName,
            'hte_name' => $this->hteName,
            'schedule_period_id' => $this->schedulePeriodId,
            'start_date' => $this->startDate,
        ];
    }
}
