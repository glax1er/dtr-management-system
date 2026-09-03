<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null, bool $restrictToUsepDomain = true): array
    {
        return [
            'name' => $this->nameRules(),
            'email' => $this->emailRules($userId, $restrictToUsepDomain),
        ];
    }

    /**
     * Requires at least two words (first + last name), to prevent
     * someone registering with only a single-word name.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return [
            'required',
            'string',
            'max:255',
            'regex:/^\S+(\s+\S+)+$/',
        ];
    }

    /**
     * Restricts registration to official @usep.edu.ph email addresses.
     * This restriction is intern-only — HTE and OJT supervisors are
     * provisioned by admins and may use any valid email address, so
     * callers acting on their behalf pass $restrictToUsepDomain = false.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null, bool $restrictToUsepDomain = true): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            ...($restrictToUsepDomain ? ['regex:/^[^@\s]+@usep\.edu\.ph$/i'] : []),
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }
}