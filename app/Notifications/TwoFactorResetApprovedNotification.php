<?php

namespace App\Notifications;

use App\Models\TwoFactorResetRequest;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TwoFactorResetApprovedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public TwoFactorResetRequest $resetRequest,
        public User $admin,
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
            ->subject("Security Alert: Two-Factor Authentication Reset - {$appName}")
            ->view('emails.two-factor-reset-approved', [
                'user' => $notifiable,
                'adminName' => $this->admin->name,
                'actionAt' => $this->resetRequest->admin_action_at?->format('M d, Y h:i A') ?? now()->format('M d, Y h:i A'),
                'loginUrl' => $loginUrl,
                'appName' => $appName,
            ]);
    }
}
