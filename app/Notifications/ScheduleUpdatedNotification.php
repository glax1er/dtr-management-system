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

        if ($this->scope === self::SCOPE_HTE) {
            $hteLabel = $this->hteName ? "for {$this->hteName}" : '';
            $title = match ($this->action) {
                self::ACTION_CREATED => 'New HTE Schedule Override',
                self::ACTION_DELETED => 'HTE Schedule Override Removed',
                default => 'HTE Schedule Override Updated',
            };
            $message = trim("The schedule override {$hteLabel} has been {$actionVerb} by your supervisor.");
            $href = '/intern/attendance';
        } else {
            $title = match ($this->action) {
                self::ACTION_CREATED => 'New Training Schedule Created',
                self::ACTION_DELETED => 'Training Schedule Removed',
                default => 'Training Schedule Updated',
            };
            $message = "The official training schedule ({$name}) has been {$actionVerb} by the administrator.";

            $isSupervisor = $notifiable instanceof User && $notifiable->isSupervisor();
            $href = $isSupervisor ? '/supervisor/schedule' : '/intern/attendance';
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
        ];
    }
}
