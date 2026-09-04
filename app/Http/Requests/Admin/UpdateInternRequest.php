<?php

namespace App\Http\Requests\Admin;

use App\Models\InternProfile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInternRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var InternProfile $internProfile */
        $internProfile = $this->route('internProfile');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($internProfile->user_id, 'id'),
            ],
            'id_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('intern_profiles', 'id_number')->ignore($internProfile->user_id, 'user_id'),
            ],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'sex' => ['required', 'in:male,female'],
            'hte_id' => ['required', 'exists:htes,hte_id'],
            'program_id' => ['required', 'exists:programs,program_id'],
        ];
    }
}
