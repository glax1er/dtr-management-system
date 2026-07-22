<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureEventListeners();
        $this->configureEmailVerificationUrl();
    }

    /**
     * Send the "verify your email" notification as soon as a new account
     * registers. Fortify fires `Registered` right after the user (and, for
     * interns, their profile) is created — this is what actually queues
     * the verification email; without it, `MustVerifyEmail` only gates
     * routes, it never triggers the email itself.
     */
    protected function configureEventListeners(): void
    {
        Event::listen(Registered::class, SendEmailVerificationNotification::class);
    }

    /**
     * ADDED — point the "verify email" link at our own guest-accessible
     * route instead of Fortify's default `verification.verify`.
     *
     * Interns are logged straight out right after registering, and login
     * itself is blocked until the email is verified (see
     * FortifyServiceProvider::configureAuthentication()). Fortify's default
     * verification route requires the visitor to already be authenticated
     * as the account being verified — which they can't be, since verifying
     * is a precondition for logging in. Without this override, clicking the
     * emailed link would just bounce them to the login page in a loop.
     *
     * VerifyEmailController validates the signed URL itself and doesn't
     * require an active session.
     */
    protected function configureEmailVerificationUrl(): void
    {
        VerifyEmail::createUrlUsing(function ($notifiable) {
            return URL::temporarySignedRoute(
                'verification.verify.public',
                now()->addMinutes(60),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ],
            );
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}