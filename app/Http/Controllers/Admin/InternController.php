<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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
                'hte_name' => $profile->hte->hte_name,
                'program_name' => $profile->program->program_name,
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
        ]);
    }
}
