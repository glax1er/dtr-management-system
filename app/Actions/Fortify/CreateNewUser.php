<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Campus;
use App\Models\College;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
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
        // Resolve campus_id early so we can scope the id_number uniqueness check.
        $resolvedCampusId = $this->resolveCampusId($input);

        Validator::make($input, [
            ...$this->profileRules(),

            'id_number' => [
                'required',
                'string',
                'regex:/^\d{4}-\d{5}$/',
                // Scoped uniqueness: same id_number is only a conflict within the
                // same campus. When campus_id cannot be determined yet we fall
                // back to the global unique constraint so registration still works.
                $resolvedCampusId !== null
                    ? Rule::unique('intern_profiles', 'id_number')
                        ->where(function ($q) use ($resolvedCampusId, $input) {
                            $q->where('campus_id', $resolvedCampusId);
                            if (! empty($input['campus'])) {
                                $q->orWhere(fn ($sub) => $sub->whereNull('campus_id')->where('campus', $input['campus']));
                            }
                        })
                    : Rule::unique('intern_profiles', 'id_number'),
            ],

            'contact_number' => [
                'nullable',
                'string',
                'regex:/^09\d{9}$/',
            ],

            'sex' => ['required', 'in:male,female'],

            'campus' => ['nullable', 'string', 'max:100'],

            'college_id' => ['nullable', 'integer', 'exists:colleges,id'],

            'program_id' => [
                'required',
                'integer',
                'exists:programs,program_id',
                function ($attribute, $value, $fail) use ($input) {
                    if (! empty($input['college_id'])) {
                        $program = Program::where('program_id', $value)->first();
                        if ($program && $program->college_id && (int) $program->college_id !== (int) $input['college_id']) {
                            $fail('The selected program does not belong to the selected college.');
                        }
                    }
                },
            ],

            'hte_id' => [
                'required',
                'integer',
                'exists:htes,hte_id',
                function ($attribute, $value, $fail) use ($input) {
                    $program = ! empty($input['program_id']) ? Program::where('program_id', $input['program_id'])->first() : null;
                    $collegeId = ! empty($input['college_id']) ? (int) $input['college_id'] : $program?->college_id;
                    if ($collegeId) {
                        $hte = Hte::where('hte_id', $value)->first();
                        if (! $hte || (int) $hte->college_id !== (int) $collegeId) {
                            $fail('The selected HTE does not belong to the selected college.');
                        }
                    }
                },
            ],

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

        return DB::transaction(function () use ($input, $resolvedCampusId) {
            $program = Program::find($input['program_id']);
            $collegeId = ! empty($input['college_id'])
                ? (int) $input['college_id']
                : $program?->college_id;

            $college = $collegeId ? College::find($collegeId) : null;

            // Resolve campus_id in full within the transaction so we have
            // access to the final $collegeId (program may have been just resolved).
            $campusId = $resolvedCampusId;
            if ($campusId === null && $college) {
                $campusId = $college->campus_id;
                if ($campusId === null && $college->campus) {
                    $campusId = Campus::where('name', $college->campus)
                        ->orWhere('code', $college->campus)
                        ->value('id');
                }
            }
            if ($campusId === null && ! empty($input['campus'])) {
                $campusId = Campus::where('name', $input['campus'])
                    ->orWhere('code', $input['campus'])
                    ->value('id');
            }

            // Align campus text with the resolved campus model to avoid divergence
            $campus = ! empty($input['campus'])
                ? $input['campus']
                : ($college?->campus ?? null);

            if ($campusId !== null) {
                $campusName = Campus::where('id', $campusId)->value('name');
                if ($campusName) {
                    $campus = $campusName;
                }
            }

            $user = User::create([
                'role' => User::ROLE_INTERN,
                'college_id' => $collegeId,
                'campus' => $campus,
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
            ]);

            $internProfile = InternProfile::create([
                'user_id' => $user->id,
                'id_number' => $input['id_number'],
                'contact_number' => $input['contact_number'] ?? null,
                'sex' => $input['sex'],
                'campus' => $campus,
                'campus_id' => $campusId,
                'hte_id' => $input['hte_id'],
                'program_id' => $input['program_id'],
                'status' => 'pending',
                'privacy_accepted_at' => now(),
                'registered_at' => now(),
            ]);

            // Send 6-digit email verification code to the new intern
            $user->sendEmailVerificationNotification();

            return $user;
        });
    }

    /**
     * Derive campus_id from the submitted input before full validation runs.
     * Checks (in priority order):
     *  1. campus name/code string directly in input → match Campus by name or code
     *  2. college_id → College::campus_id (FK)
     *  3. program_id → program.college → College::campus_id
     */
    private function resolveCampusId(array $input): ?int
    {
        if (! empty($input['campus'])) {
            $id = Campus::where('name', $input['campus'])
                ->orWhere('code', $input['campus'])
                ->value('id');
            if ($id) {
                return $id;
            }
        }

        $collegeId = ! empty($input['college_id']) ? (int) $input['college_id'] : null;

        if ($collegeId === null && ! empty($input['program_id'])) {
            $collegeId = Program::where('program_id', $input['program_id'])->value('college_id');
        }

        if ($collegeId) {
            $college = College::find($collegeId);
            if ($college?->campus_id) {
                return $college->campus_id;
            }
            if ($college?->campus) {
                return Campus::where('name', $college->campus)
                    ->orWhere('code', $college->campus)
                    ->value('id');
            }
        }

        return null;
    }
}
