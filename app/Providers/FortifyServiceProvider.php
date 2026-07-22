<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\Hte;
use App\Models\Program;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(
            \Laravel\Fortify\Contracts\RegisterResponse::class,
            \App\Http\Responses\RegisterResponse::class,
        );

        $this->app->singleton(
            \Laravel\Fortify\Contracts\LoginResponse::class,
            \App\Http\Responses\LoginResponse::class,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureAuthentication();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure how Fortify authenticates login attempts.
     *
     * Replaces Fortify's default credential check so we can block interns
     * whose `intern_profiles.status` isn't `approved` yet from logging in,
     * even with correct credentials.
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request) {
            $user = User::where('email', $request->email)->first();

            if (! $user || ! Hash::check((string) $request->password, $user->password)) {
                return null;
            }

            if ($user->isIntern()) {
                // ADDED — email must be verified before approval status even
                // matters. Flash the email on its own key (in addition to
                // the usual validation error) so the login page can pop the
                // "resend verification link" dialog instead of just showing
                // a plain inline error under the field.
                if (! $user->hasVerifiedEmail()) {
                    $request->session()->flash('unverified_email', $user->email);

                    throw ValidationException::withMessages([
                        Fortify::username() => 'Your email address is not verified. Please check the verification link sent to your email.',
                    ]);
                }

                $status = $user->internProfile?->status;

                if ($status !== 'approved') {
                    throw ValidationException::withMessages([
                        Fortify::username() => match ($status) {
                            'rejected' => 'Your registration was not approved. Please contact your program coordinator.',
                            default => 'Your registration is still pending admin approval. Please check back later.',
                        },
                    ]);
                }
            }

            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
            // ADDED — set only when authenticateUsing() just blocked this
            // person for an unverified email; tells the login page to pop
            // the "resend verification link" dialog.
            'unverifiedEmail' => $request->session()->get('unverified_email'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));    

        Fortify::registerView(fn (Request $request) => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            // CHANGED — was 'registered' (pending-approval dialog). Now
            // drives the "verify your email" dialog shown right after
            // Create Account instead.
            'verifyEmail' => $request->session()->get('verifyEmail', false),
            'registeredEmail' => $request->session()->get('registeredEmail'),
            'programs' => Program::query()
                ->where('is_active', true)
                ->orderBy('program_name')
                ->get(['program_id', 'program_name']),
            'htes' => Hte::query()
                ->where('status', 'active')
                ->orderBy('hte_name')
                ->get(['hte_id', 'hte_name']),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('passkeys', function (Request $request) {
            return Limit::perMinute(10)->by(
                ($request->input('credential.id') ?: $request->session()->getId()).'|'.$request->ip(),
            );
        });
    }
}