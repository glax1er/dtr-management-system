<?php

namespace App\Notifications;

use App\Models\TwoFactorResetRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TwoFactorResetRequestNotification extends Notification
{
    use Queueable;

    public function __construct(
        public TwoFactorResetRequest $resetRequest,
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
        $userName = $this->resetRequest->user->name;
        $userEmail = $this->resetRequest->user->email;
        $meta = $userEmail !== '' ? " ({$userEmail})" : '';

        return [
            'type' => 'two_factor_reset',
            'title' => "2FA Reset Request: {$userName}",
            'message' => "{$userName}{$meta} confirmed email consent for 2FA reset and is awaiting administrator approval.",
            'href' => "/admin/two-factor-resets?highlight={$this->resetRequest->id}",
            'reset_request_id' => $this->resetRequest->id,
            'user_id' => $this->resetRequest->user_id,
        ];
    }
}
