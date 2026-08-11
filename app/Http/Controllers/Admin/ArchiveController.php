<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\SupervisorProfile;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArchiveController extends Controller
{
    private const PER_PAGE = 10;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'type' => ['nullable', 'in:htes,supervisors,interns'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $type = $validated['type'] ?? 'htes';
        $page = $validated['page'] ?? 1;

        $records = match ($type) {
            'htes' => Hte::onlyTrashed()
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (Hte $hte) => [
                    'id' => $hte->hte_id,
                    'name' => $hte->hte_name,
                    'detail' => $hte->address ?? 'No address',
                    'deleted_at' => $hte->deleted_at->format('M d, Y h:i A'),
                ]),
            'supervisors' => SupervisorProfile::onlyTrashed()
                ->with('user:id,name,email')
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (SupervisorProfile $profile) => [
                    'id' => $profile->user_id,
                    'name' => $profile->user->name,
                    'detail' => $profile->user->email,
                    'deleted_at' => $profile->deleted_at->format('M d, Y h:i A'),
                ]),
            'interns' => InternProfile::onlyTrashed()
                ->with('user:id,name,email')
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (InternProfile $profile) => [
                    'id' => $profile->user_id,
                    'name' => $profile->user->name,
                    'detail' => $profile->id_number,
                    'deleted_at' => $profile->deleted_at->format('M d, Y h:i A'),
                ]),
        };

        return Inertia::render('admin/archives/index', [
            'records' => $records,
            'currentType' => $type,
        ]);
    }

    public function restore(string $type, int $id): RedirectResponse
    {
        $this->modelFor($type)::onlyTrashed()->findOrFail($id)->restore();

        return back()->with('success', 'Record restored.');
    }

    public function forceDelete(string $type, int $id): RedirectResponse
    {
        try {
            $this->modelFor($type)::onlyTrashed()->findOrFail($id)->forceDelete();
        } catch (QueryException $e) {
            // SQLite/MySQL foreign key constraint violation — some other
            // record (e.g. an intern or supervisor still tied to this HTE)
            // references this row, so the database refuses the delete
            // rather than leaving orphaned references behind.
            return back()->with(
                'error',
                'This record can\'t be permanently deleted because other records still reference it. Remove or reassign those first.'
            );
        }

        return back()->with('success', 'Record permanently deleted.');
    }

    private function modelFor(string $type): string
    {
        return match ($type) {
            'htes' => Hte::class,
            'supervisors' => SupervisorProfile::class,
            'interns' => InternProfile::class,
            default => abort(404),
        };
    }
}