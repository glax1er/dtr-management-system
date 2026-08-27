<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPasswordNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends BaseResetPasswordNotification
{
    use Queueable;

    /**
     * Create a new notification instance.
     *
     * @param  string  $token
     */
    public function __construct($token)
    {
        parent::__construct($token);
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array<int, string>
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        $url = url(route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));

        $appName = config('app.name', 'DTR Management System');

        return (new MailMessage)
            ->subject("Reset Password Notification - {$appName}")
            ->greeting("Hello {$notifiable->name},")
            ->line("You are receiving this email because we received a password reset request for your account.")
            ->action('Reset Password', $url)
            ->line("This password reset link will expire in " . config('auth.passwords.'.config('auth.defaults.passwords').'.expire') . " minutes.")
            ->line("If you did not request a password reset, no further action is required.");
    }
}
