<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class GrantOjtSupervisorRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'program_id' => ['required', 'exists:programs,program_id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            /** @var \App\Models\SupervisorProfile $supervisorProfile */
            $supervisorProfile = $this->route('supervisorProfile');

            if ($supervisorProfile->isOjtSupervisor()) {
                $validator->errors()->add('program_id', 'This supervisor already has OJT Supervisor capability.');
            }
        });
    }
}