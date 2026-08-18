<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

class EmailVerificationCodeNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $code,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'DTR Management System');

        return (new MailMessage)
            ->subject("Your Verification Code - {$appName}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Thank you for using {$appName}. Please use the following 6-digit code to verify your email address:")
            ->line(new HtmlString(
                '<div style="text-align: center; margin: 28px 0;">'
                .'<span style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #94a3b8; color: #0f172a; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 14px 28px; border-radius: 8px; font-family: monospace;">'
                .e($this->code)
                .'</span>'
                .'</div>'
            ))
            ->line("This verification code will expire in 15 minutes.")
            ->line("If you did not request this verification code, please ignore this email or contact support if you suspect unauthorized activity.");
    }
}
