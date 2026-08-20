<?php

namespace App\Notifications;

use App\Models\InternProfile;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class InternApprovalNotification extends Notification
{
    use Queueable;

    public function __construct(
        public InternProfile $internProfile,
        public string $status, // 'approved' | 'rejected'
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        if ($this->status === 'approved') {
            return [
                'type' => 'intern_approval',
                'title' => 'Your account has been approved!',
                'message' => 'Your intern registration has been approved. You can now access your dashboard and DTR QR code.',
                'href' => '/intern/dashboard',
                'intern_user_id' => $this->internProfile->user_id,
            ];
        }

        return [
            'type' => 'intern_approval',
            'title' => 'Your account registration was rejected',
            'message' => 'Your intern registration was not approved. Please contact your coordinator or administrator.',
            'href' => '/intern/dashboard',
            'intern_user_id' => $this->internProfile->user_id,
        ];
    }
}
