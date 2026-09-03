<?php
// app/Http/Requests/Admin/UpdateSupervisorRequest.php
namespace App\Http\Requests\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class UpdateSupervisorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var \App\Models\SupervisorProfile $supervisorProfile */
        $supervisorProfile = $this->route('supervisorProfile');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email:rfc,filter',
                'max:255',
                Rule::unique('users', 'email')->ignore($supervisorProfile->user_id, 'id'),
            ],
            'hte_id' => [
                Rule::requiredIf($supervisorProfile->supervisor_type === 'hte'),
                'nullable',
                'exists:htes,hte_id',
            ],
            'program_id' => [
                Rule::requiredIf($supervisorProfile->supervisor_type === 'ojt'),
                'nullable',
                'exists:programs,program_id',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'The email address is required.',
            'email.email' => 'The email must be a valid email address.',
            'email.unique' => 'This email is already registered.',
        ];
    }
}