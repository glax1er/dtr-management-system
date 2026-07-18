<?php

namespace App\Concerns;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rules\Password;

trait PasswordValidationRules
{
    /**
     * Requires 8+ chars, at least one uppercase, one lowercase,
     * one number, and one symbol.
     *
     * @return array<int, Password|ValidationRule|array<mixed>|string>
     */
    protected function passwordRules(): array
    {
        return [
            'required',
            'string',
            Password::default()->mixedCase()->numbers()->symbols(),
            'confirmed',
        ];
    }

    protected function currentPasswordRules(): array
    {
        return ['required', 'string', 'current_password'];
    }
}