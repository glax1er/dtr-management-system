<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateInternRequest;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\Admin\UpdateSupervisorRequest;

class InternController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,approved,rejected'],
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:' . self::MAX_PER_PAGE],
        ]);

        $status = $validated['status'] ?? 'pending';
        $search = trim($validated['search'] ?? '');
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $query = InternProfile::query()
            ->where('status', $status)
            ->with(['user:id,name,email', 'hte:hte_id,hte_name', 'program:program_id,program_name'])
            ->orderBy('registered_at', 'desc');

        if ($search !== '') {
            $query->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        $interns = $query
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString()
            ->through(fn (InternProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'email' => $profile->user->email,
                'id_number' => $profile->id_number,
                'hte_name' => $profile->hte?->hte_name ?? 'Deleted HTE',
                'program_name' => $profile->program?->program_name ?? 'Deleted Program',
                'status' => $profile->status,
                'registered_at' => $profile->registered_at->diffForHumans(),
            ]);

        return Inertia::render('admin/interns/index', [
            'interns' => $interns,
            'currentStatus' => $status,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
            'htes' => Hte::where('status', 'active')->orderBy('hte_name')->get(['hte_id', 'hte_name']),
            'programs' => Program::where('is_active', true)->orderBy('program_name')->get(['program_id', 'program_name']),
        ]);
    }

    public function update(UpdateInternRequest $request, InternProfile $internProfile): RedirectResponse
    {
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

        return back()->with('success', 'Intern updated.');
    }
}