<?php

namespace App\Notifications;

use App\Models\TwoFactorResetRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TwoFactorResetConfirmationNotification extends Notification
{
    use Queueable;

    public function __construct(
        public TwoFactorResetRequest $resetRequest,
        public string $plainToken,
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
        $confirmUrl = route('two-factor.reset.confirm.view', [
            'token' => $this->plainToken,
        ]);

        return (new MailMessage)
            ->subject("Action Required: 2FA Reset Authorization - {$appName}")
            ->view('emails.two-factor-reset-confirmation', [
                'user' => $notifiable,
                'confirmUrl' => $confirmUrl,
                'requestedAt' => $this->resetRequest->created_at?->format('M d, Y h:i A') ?? now()->format('M d, Y h:i A'),
                'userIp' => $this->resetRequest->user_ip,
                'reason' => $this->resetRequest->reason,
                'appName' => $appName,
                'expiresInMinutes' => TwoFactorResetRequest::USER_CONFIRMATION_EXPIRY_MINUTES,
            ]);
    }
}
