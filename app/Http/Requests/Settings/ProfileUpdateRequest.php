<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

        /**
     * Get the validation rules that apply to the request.
     *
     * Email is deliberately excluded here — it's permanent once an
     * account exists, so this form never validates or updates it, even
     * though the shared profileRules() trait (also used at registration,
     * where an email genuinely is required) still defines a rule for it.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = $this->profileRules($this->user()->id);
        unset($rules['email']);

        return $rules;
    }
}
