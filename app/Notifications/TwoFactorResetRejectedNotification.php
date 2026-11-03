<?php

namespace App\Notifications;

use App\Models\TwoFactorResetRequest;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TwoFactorResetRejectedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public TwoFactorResetRequest $resetRequest,
        public User $admin,
        public ?string $rejectionReason = null,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(mixed $notifiable): MailMessage
    {
        $appName = config('app.name', 'DTR Management System');
        $loginUrl = route('login');

        return (new MailMessage)
            ->subject("2FA Reset Request Update - {$appName}")
            ->view('emails.two-factor-reset-rejected', [
                'user' => $notifiable,
                'adminName' => $this->admin->name,
                'rejectionReason' => $this->rejectionReason,
                'loginUrl' => $loginUrl,
                'appName' => $appName,
            ]);
    }
}
