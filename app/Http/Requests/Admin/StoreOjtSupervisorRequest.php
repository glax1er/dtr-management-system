<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOjtSupervisorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class, 'email')],
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
