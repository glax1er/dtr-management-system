<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class MissedTimeOutNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $date,
        public ?string $timeIn = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $timeInStr = $this->timeIn ? " ({$this->timeIn})" : '';

        $monthStr = substr($this->date, 0, 7);

        return [
            'type' => 'missed_timeout',
            'title' => "Missing Time-Out for {$this->date}",
            'message' => "You clocked in on {$this->date}{$timeInStr} but did not record a Time-Out. Please submit a Resolution Ticket if needed.",
            'href' => "/intern/dashboard?month={$monthStr}&highlight_date={$this->date}",
            'date' => $this->date,
        ];
    }
}
