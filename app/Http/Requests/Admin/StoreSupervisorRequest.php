<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ProfileValidationRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupervisorRequest extends FormRequest
{
    use ProfileValidationRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // HTE supervisors are provisioned by admins and are not
            // restricted to official @usep.edu.ph email addresses.
            ...$this->profileRules(restrictToUsepDomain: false),
            'hte_id' => ['required', 'integer', Rule::exists('htes', 'hte_id')],
        ];
    }
}