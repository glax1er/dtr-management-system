<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class GrantHteSupervisorRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'hte_id' => ['required', 'exists:htes,hte_id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            /** @var \App\Models\SupervisorProfile $supervisorProfile */
            $supervisorProfile = $this->route('supervisorProfile');

            if ($supervisorProfile->isHteSupervisor()) {
                $validator->errors()->add('hte_id', 'This supervisor already has HTE Supervisor capability.');
            }
        });
    }
}