<?php

namespace App\Http\Requests\Admin;

use App\Models\Campus;
use App\Models\InternProfile;
use App\Models\Program;
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

        // Scope the id_number uniqueness to the campus that will be associated with the
        // intern AFTER the update — i.e. the campus of the INCOMING program_id.
        // This prevents a duplicate id_number from slipping through when an admin
        // moves an intern to a program that belongs to a different campus.
        // Falls back to the intern's existing campus when the incoming program has no
        // campus linkage, and finally to a global unique for legacy records.
        $campusId = $this->resolveCampusIdFromInput() ?? $internProfile->campus_id;

        if ($campusId === null && $internProfile->campus) {
            $campusId = Campus::where('name', $internProfile->campus)
                ->orWhere('code', $internProfile->campus)
                ->value('id');
        }

        $idNumberRule = $campusId !== null
            ? Rule::unique('intern_profiles', 'id_number')
                ->where('campus_id', $campusId)
                ->ignore($internProfile->user_id, 'user_id')
            : Rule::unique('intern_profiles', 'id_number')
                ->ignore($internProfile->user_id, 'user_id');

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
                $idNumberRule,
            ],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'sex' => ['required', 'in:male,female'],
            'hte_id' => ['required', 'exists:htes,hte_id'],
            'program_id' => ['required', 'exists:programs,program_id'],
        ];
    }

    /**
     * Derive campus_id from the incoming program_id submitted in the request.
     * Returns null when the program has no college/campus linkage.
     */
    private function resolveCampusIdFromInput(): ?int
    {
        $programId = $this->input('program_id');
        if (! $programId) {
            return null;
        }

        $program = Program::where('program_id', $programId)->with('college')->first();
        if (! $program || ! $program->college) {
            return null;
        }

        if ($program->college->campus_id) {
            return $program->college->campus_id;
        }

        if ($program->college->campus) {
            return Campus::where('name', $program->college->campus)
                ->orWhere('code', $program->college->campus)
                ->value('id');
        }

        return null;
    }
}
