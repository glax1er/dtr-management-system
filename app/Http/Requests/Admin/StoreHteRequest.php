<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreHteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'hte_name' => ['required', 'string', 'max:150', 'unique:htes,hte_name'],
            'address' => ['required', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
        ];
    }
}