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
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Contracts\RegisterResponse;
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
            RegisterResponse::class,
            \App\Http\Responses\RegisterResponse::class,
        );

        $this->app->singleton(
            LoginResponse::class,
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

            // Admin accounts bypass approval, verification, and supervisor checks.
            if ($user->isAdmin()) {
                return $user;
            }

            if (! $user->hasVerifiedEmail()) {
                $user->sendEmailVerificationNotification();

                throw ValidationException::withMessages([
                    'unverified_email' => $user->email,
                    Fortify::username() => 'Your email address is not verified yet. We have sent a 6-digit verification code to your email.',
                ]);
            }

            if ($user->isSupervisor()) {
                $profile = $user->supervisorProfile;

                if (! $profile || $profile->status !== 'active') {
                    throw ValidationException::withMessages([
                        Fortify::username() => 'Your supervisor account has been deactivated or archived. Please contact the administrator.',
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
            'showVerification' => $request->session()->get('show_verification', false),
            'verificationEmail' => $request->session()->get('verification_email'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(function (Request $request) {
            $user = $request->user();

            if ($user && $user->hasVerifiedEmail()) {
                return redirect()->intended(route('dashboard'));
            }

            return redirect()->route('login')->with([
                'show_verification' => true,
                'verification_email' => $user?->email,
                'status' => $request->session()->get('status', 'Please enter your 6-digit verification code.'),
            ]);
        });

        Fortify::registerView(fn (Request $request) => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            'registered' => $request->session()->get('registered', false),
            'showVerification' => $request->session()->get('show_verification', false),
            'verificationEmail' => $request->session()->get('verification_email'),
            'programs' => Program::query()
                ->select(['program_id', 'program_name'])
                ->orderBy('program_name')
                ->get(),
            'htes' => Hte::query()
                ->select(['hte_id', 'hte_name'])
                ->orderBy('hte_name')
                ->get(),
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
