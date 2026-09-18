<?php

namespace App\Http\Requests\Admin;

use App\Models\Hte;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $hte = $this->route('hte');
        $hte = $hte instanceof Hte ? $hte : null;
        $collegeId = $this->user()?->isCollegeAdmin() ? $this->user()->college_id : ($this->input('college_id') ?? $hte?->college_id);

        return [
            'hte_name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('htes', 'hte_name')
                    ->ignore($hte?->hte_id, 'hte_id')
                    ->where(fn ($q) => $q->where('college_id', $collegeId)),
            ],
            'college_id' => ['nullable', 'integer', 'exists:colleges,id'],
            'address' => ['required', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'id_bg' => ['nullable', 'image', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
            'remove_id_bg' => ['nullable', 'boolean'],
        ];
    }
}
