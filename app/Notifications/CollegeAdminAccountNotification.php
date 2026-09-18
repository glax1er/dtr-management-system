<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Dispatched to Super Admins when a College Admin account is created,
 * updated, activated, or deactivated - providing an audit trail in their
 * notification center.
 */
class CollegeAdminAccountNotification extends Notification
{
    use Queueable;

    public const EVENT_CREATED = 'created';

    public const EVENT_UPDATED = 'updated';

    public const EVENT_ACTIVATED = 'activated';

    public const EVENT_DEACTIVATED = 'deactivated';

    public const EVENT_DELETED = 'deleted';

    public function __construct(
        public string $event,
        public User $targetAdmin,
        public ?User $actor = null,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $adminName = $this->targetAdmin->name;
        $college = $this->targetAdmin->college;
        $collegeName = $college !== null ? $college->name : 'Unknown College';
        $actorName = $this->actor !== null ? $this->actor->name : 'System';

        [$title, $message] = match ($this->event) {
            self::EVENT_CREATED => [
                'College Admin Account Created',
                "{$actorName} created a new college administrator account for {$adminName} ({$collegeName}).",
            ],
            self::EVENT_UPDATED => [
                'College Admin Account Updated',
                "{$actorName} updated the account details for college administrator {$adminName} ({$collegeName}).",
            ],
            self::EVENT_ACTIVATED => [
                'College Admin Account Activated',
                "{$actorName} activated the college administrator account for {$adminName} ({$collegeName}).",
            ],
            self::EVENT_DEACTIVATED => [
                'College Admin Account Deactivated',
                "{$actorName} deactivated the college administrator account for {$adminName} ({$collegeName}).",
            ],
            self::EVENT_DELETED => [
                'College Admin Account Deleted',
                "{$actorName} permanently deleted the college administrator account for {$adminName} ({$collegeName}).",
            ],
            default => [
                'College Admin Account Change',
                "A change was made to the college administrator account for {$adminName} ({$collegeName}) by {$actorName}.",
            ],
        };

        return [
            'type' => 'college_admin_account',
            'event' => $this->event,
            'title' => $title,
            'message' => $message,
            'href' => '/admin/college-admins',
            'target_admin_id' => $this->targetAdmin->id,
            'target_admin_name' => $adminName,
            'college_name' => $collegeName,
        ];
    }
}
