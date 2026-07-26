<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ProfileValidationRules;
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
            ...$this->profileRules(),
            'program_id' => ['required', 'integer', Rule::exists('programs', 'program_id')],
        ];
    }

    public function messages(): array
    {
        return [
            'program_id.required' => 'The program is required.',
            'program_id.exists' => 'The selected program does not exist.',
        ];
    }
}
