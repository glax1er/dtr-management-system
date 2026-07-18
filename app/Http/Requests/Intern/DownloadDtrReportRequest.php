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
            // 'YYYY-MM', defaults to the current month if omitted
            'month' => ['nullable', 'date_format:Y-m'],
        ];
    }
}
