<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupervisorRequest extends FormRequest
{
    use ProfileValidationRules;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        return [
            // HTE supervisors are provisioned by admins and are not
            // restricted to official @usep.edu.ph email addresses.
            ...$this->profileRules(restrictToUsepDomain: false),
            'hte_id' => ['required', 'integer', Rule::exists('htes', 'hte_id')],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'The email address is required.',
            'email.email' => 'The email must be a valid email address.',
            'email.unique' => 'This email is already registered.',
            'hte_id.required' => 'The host training establishment is required.',
            'hte_id.exists' => 'The selected host training establishment does not exist.',
        ];
    }
}
