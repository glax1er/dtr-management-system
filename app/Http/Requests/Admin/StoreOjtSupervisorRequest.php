<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOjtSupervisorRequest extends FormRequest
{
    use ProfileValidationRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // OJT supervisors are provisioned by admins and are not
            // restricted to official @usep.edu.ph email addresses.
            ...$this->profileRules(restrictToUsepDomain: false),
            'program_id' => ['required', 'integer', Rule::exists('programs', 'program_id')],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'The email address is required.',
            'email.email' => 'The email must be a valid email address.',
            'email.unique' => 'This email is already registered.',
            'program_id.required' => 'The program is required.',
            'program_id.exists' => 'The selected program does not exist.',
        ];
    }
}
