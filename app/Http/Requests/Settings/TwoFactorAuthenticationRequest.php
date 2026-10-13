<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\InteractsWithTwoFactorState;

class TwoFactorAuthenticationRequest extends FormRequest
{
    use InteractsWithTwoFactorState {
        ensureStateIsValid as traitEnsureStateIsValid;
    }

    /**
     * Ensure the two-factor authentication state is valid and handle transitions.
     */
    public function ensureStateIsValid(): void
    {
        if (! Fortify::confirmsTwoFactorAuthentication()) {
            return;
        }

        // Never reset 2FA state during Inertia partial reloads (e.g. background notification polling)
        if ($this->header('X-Inertia-Partial-Data')) {
            return;
        }

        $currentTime = time();

        if (! $this->user()->hasEnabledTwoFactorAuthentication()) {
            $this->session()->put('two_factor_empty_at', $currentTime);
        }

        if ($this->hasJustBegunConfirmingTwoFactorAuthentication()) {
            $this->session()->put('two_factor_confirming_at', $currentTime);
        }

        if ($this->neverFinishedConfirmingTwoFactorAuthentication($currentTime)) {
            app(DisableTwoFactorAuthentication::class)($this->user());

            $this->session()->put('two_factor_empty_at', $currentTime);
            $this->session()->remove('two_factor_confirming_at');
        }
    }

    /**
     * Determine if two-factor authentication was never totally confirmed once confirmation started.
     */
    protected function neverFinishedConfirmingTwoFactorAuthentication(int $currentTime): bool
    {
        $confirmingAt = $this->session()->get('two_factor_confirming_at');

        if (! $confirmingAt) {
            return false;
        }

        // Allow up to 15 minutes for the user to scan the QR code and submit the confirmation code,
        // rather than wiping it on the very next request or during active page visits.
        return ! $this->session()->hasOldInput('code') &&
            is_null($this->user()->two_factor_confirmed_at) &&
            ($currentTime - $confirmingAt) > 900;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [];
    }
}
