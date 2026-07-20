<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\InternProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered intern account.
     *
     * Public registration is intern-only — supervisor and admin accounts
     * are provisioned separately, not through this form. Creates the
     * shared `users` row and the intern's `intern_profiles` row together;
     * the profile always starts out `pending`, awaiting approval.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),

            'id_number' => [
                'required',
                'string',
                'regex:/^\d{4}-\d{5}$/',
                'unique:intern_profiles,id_number',
            ],

            'contact_number' => [
                'nullable',
                'string',
                'regex:/^09\d{9}$/',
            ],

            'sex' => ['required', 'in:male,female'],

            'program_id' => ['required', 'integer', 'exists:programs,program_id'],

            'hte_id' => ['required', 'integer', 'exists:htes,hte_id'],

            // ADDED — 'accepted' rule requires the field to be true/1/"on"/"yes";
            // missing or false both fail validation, so the checkbox is effectively required
            'privacy_accepted' => ['accepted'],

            'password' => $this->passwordRules(),
        ], [
            'id_number.regex' => 'Format must be XXXX-XXXXX.',
            'contact_number.regex' => 'Must be 11 digits starting with 09.',
            'password.mixed_case' => 'Must include uppercase, lowercase, a number, and a symbol.',
            'password.numbers' => 'Must include uppercase, lowercase, a number, and a symbol.',
            'password.symbols' => 'Must include uppercase, lowercase, a number, and a symbol.',
            'password.min' => 'Must include uppercase, lowercase, a number, and a symbol.',
        ])->validate();

        return DB::transaction(function () use ($input) {
            $user = User::create([
                'role' => User::ROLE_INTERN,
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
            ]);

            InternProfile::create([
                'user_id' => $user->id,
                'id_number' => $input['id_number'],
                'contact_number' => $input['contact_number'] ?? null,
                'sex' => $input['sex'],
                'hte_id' => $input['hte_id'],
                'program_id' => $input['program_id'],
                'status' => 'pending',
                'privacy_accepted_at' => now(), // ADDED — records the actual moment consent was given
            ]);

            return $user;
        });
    }
}