<?php

namespace App\Notifications;

use App\Models\InternProfile;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewInternRegistrationNotification extends Notification
{
    use Queueable;

    public function __construct(
        public InternProfile $internProfile,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $name = $this->internProfile->user?->name ?? 'New Intern';
        $idNumber = $this->internProfile->id_number;
        $programName = $this->internProfile->program?->program_name;
        $hteName = $this->internProfile->hte?->hte_name;

        $metaParts = array_filter([$idNumber, $programName, $hteName]);
        $metaString = ! empty($metaParts) ? ' ('.implode(' • ', $metaParts).')' : '';

        return [
            'type' => 'intern_registration',
            'title' => "New intern sign-up: {$name}",
            'message' => "{$name}{$metaString} registered and is pending approval.",
            'href' => '/admin/interns?status=pending',
            'intern_user_id' => $this->internProfile->user_id,
            'id_number' => $idNumber,
        ];
    }
}
