<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateInternRequest;
use App\Models\AuditLog;
use App\Models\Campus;
use App\Models\College;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InternController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:all,pending,approved,rejected'],
            'search' => ['nullable', 'string', 'max:255'],
            'college_id' => ['nullable', 'integer', 'exists:colleges,id'],
            'campus_id' => ['nullable', 'integer', 'exists:campuses,id'],
            'program_id' => ['nullable', 'integer', 'exists:programs,program_id'],
            'hte_id' => ['nullable', 'integer', 'exists:htes,hte_id'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $status = $validated['status'] ?? 'all';
        $search = trim($validated['search'] ?? '');
        $collegeFilter = isset($validated['college_id']) ? (int) $validated['college_id'] : null;
        $campusFilter = isset($validated['campus_id']) ? (int) $validated['campus_id'] : null;
        $programFilter = isset($validated['program_id']) ? (int) $validated['program_id'] : null;
        $hteFilter = isset($validated['hte_id']) ? (int) $validated['hte_id'] : null;
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $collegeId = $request->user()->isCollegeAdmin() ? $request->user()->college_id : null;

        $query = InternProfile::query()
            ->verified()
            ->with([
                'user:id,name,email,college_id,campus',
                'user.college:id,name,code',
                'hte:hte_id,hte_name',
                'program:program_id,program_name,college_id',
                'program.college:id,name,code',
            ])
            ->orderBy('registered_at', 'desc');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($collegeId !== null) {
            $query->forCollege($collegeId);
        } elseif ($collegeFilter !== null) {
            $query->forCollege($collegeFilter);
        }

        if ($campusFilter !== null) {
            $campus = Campus::find($campusFilter);
            if ($campus) {
                $query->forCampus($campus);
            }
        }

        if ($programFilter !== null) {
            $query->where('program_id', $programFilter);
        }

        if ($hteFilter !== null) {
            $query->where('hte_id', $hteFilter);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"))
                    ->orWhere('id_number', 'like', "%{$search}%");
            });
        }

        $interns = $query
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString()
            ->through(fn (InternProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'email' => $profile->user->email,
                'id_number' => $profile->id_number,
                'hte_name' => $profile->hte?->hte_name ?? 'Not Assigned',
                'program_name' => $profile->program?->program_name ?? 'Not Assigned',
                'college_code' => $profile->program?->college?->code ?? $profile->user?->college?->code ?? null,
                'campus' => $profile->campus ?? $profile->user?->campus ?? null,
                'status' => $profile->status,
                'registered_at' => $profile->registered_at->diffForHumans(),
            ]);

        return Inertia::render('admin/interns/index', [
            'interns' => $interns,
            'currentStatus' => $status,
            'filters' => [
                'search' => $search,
                'college_id' => $collegeFilter,
                'campus_id' => $campusFilter,
                'program_id' => $programFilter,
                'hte_id' => $hteFilter,
                'per_page' => $perPage,
            ],
            'colleges' => College::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'campuses' => Campus::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'htes' => Hte::where('status', 'active')
                ->when($collegeId !== null, fn ($q) => $q->where('college_id', $collegeId))
                ->when($collegeId === null && $collegeFilter !== null, fn ($q) => $q->where('college_id', $collegeFilter))
                ->orderBy('hte_name')
                ->get(['hte_id', 'hte_name', 'college_id']),
            'programs' => Program::where('is_active', true)
                ->when($collegeId !== null, fn ($q) => $q->where('college_id', $collegeId))
                ->when($collegeId === null && $collegeFilter !== null, fn ($q) => $q->where('college_id', $collegeFilter))
                ->orderBy('program_name')
                ->get(['program_id', 'program_name', 'college_id']),
        ]);
    }

    public function update(UpdateInternRequest $request, InternProfile $internProfile): RedirectResponse
    {
        $collegeId = $request->user()->isCollegeAdmin() ? $request->user()->college_id : null;
        if ($collegeId !== null) {
            $program = $internProfile->program;
            $profileUser = $internProfile->user;
            $internCollegeId = ($program !== null ? $program->college_id : null)
                ?? ($profileUser !== null ? $profileUser->college_id : null);
            abort_if($internCollegeId !== $collegeId, 403, 'Unauthorized action.');
            abort_if(Program::where('program_id', $request->validated('program_id'))->where('college_id', $collegeId)->doesntExist(), 422, 'Selected program does not belong to your college.');
            abort_if(Hte::where('hte_id', $request->validated('hte_id'))->where('college_id', $collegeId)->doesntExist(), 422, 'Selected HTE does not belong to your college.');
        }

        $oldValues = [
            'name' => $internProfile->user?->name,
            'email' => $internProfile->user?->email,
            'id_number' => $internProfile->id_number,
            'contact_number' => $internProfile->contact_number,
            'sex' => $internProfile->sex,
            'hte_id' => $internProfile->hte_id,
            'program_id' => $internProfile->program_id,
        ];

        DB::transaction(function () use ($request, $internProfile) {
            $internProfile->user->update([
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
            ]);

            $internProfile->update([
                'id_number' => $request->validated('id_number'),
                'contact_number' => $request->validated('contact_number'),
                'sex' => $request->validated('sex'),
                'hte_id' => $request->validated('hte_id'),
                'program_id' => $request->validated('program_id'),
            ]);
        });

        AuditLog::record(
            action: 'intern_profile_updated',
            description: "Intern profile for {$internProfile->user?->name} updated by administrator",
            auditable: $internProfile,
            oldValues: $oldValues,
            newValues: $request->validated(),
            user: $request->user(),
        );

        return back()->with('success', 'Intern updated.');
    }
}
