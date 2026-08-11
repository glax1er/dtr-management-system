<?php

namespace App\Http\Requests\Intern;

use Illuminate\Foundation\Http\FormRequest;

class DownloadDtrReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isIntern() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Legacy: 'YYYY-MM' — accepted for backward compatibility
            'month' => ['nullable', 'date_format:Y-m'],
            // New: explicit start/end date range in 'YYYY-MM-DD'
            'start' => ['nullable', 'date_format:Y-m-d'],
            'end' => ['nullable', 'date_format:Y-m-d'],
            // Single date (the week containing this date will be used)
            'date' => ['nullable', 'date_format:Y-m-d'],
        ];
    }
}
