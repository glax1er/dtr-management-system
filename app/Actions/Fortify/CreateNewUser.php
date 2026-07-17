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

            'id_number' => ['required', 'string', 'max:50', 'unique:intern_profiles,id_number'],

            'contact_number' => ['nullable', 'string', 'max:20'],

            'sex' => ['required', 'in:male,female'],

            'program_id' => ['required', 'integer', 'exists:programs,program_id'],

            'hte_id' => ['required', 'integer', 'exists:htes,hte_id'],

            'password' => $this->passwordRules(),
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
            ]);

            return $user;
        });
    }
}