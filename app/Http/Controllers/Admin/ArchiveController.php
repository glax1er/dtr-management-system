<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\DocumentTemplate;
use App\Models\Hte;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ArchiveController extends Controller
{
    private const PER_PAGE = 10;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'type' => ['nullable', 'in:htes,supervisors,interns,programs,templates'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $type = $validated['type'] ?? 'interns';
        $page = $validated['page'] ?? 1;

        $records = match ($type) {
            'interns' => InternProfile::onlyTrashed()
                ->with('user:id,name,email')
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (InternProfile $profile) => [
                    'id' => $profile->user_id,
                    'name' => $profile->user?->name ?? 'Deleted User',
                    'detail' => $profile->id_number,
                    'deleted_at' => $profile->deleted_at->format('M d, Y h:i A'),
                ]),
            'supervisors' => SupervisorProfile::onlyTrashed()
                ->with('user:id,name,email')
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (SupervisorProfile $profile) => [
                    'id' => $profile->user_id,
                    'name' => $profile->user?->name ?? 'Deleted User',
                    'detail' => $profile->user?->email ?? 'No email',
                    'deleted_at' => $profile->deleted_at->format('M d, Y h:i A'),
                ]),
            'htes' => Hte::onlyTrashed()
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (Hte $hte) => [
                    'id' => $hte->hte_id,
                    'name' => $hte->hte_name,
                    'detail' => $hte->address ?? 'No address',
                    'deleted_at' => $hte->deleted_at->format('M d, Y h:i A'),
                ]),
            'programs' => Program::onlyTrashed()
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (Program $program) => [
                    'id' => $program->program_id,
                    'name' => $program->program_name,
                    'detail' => $program->required_hours ? "{$program->required_hours} hrs" : 'No hours set',
                    'deleted_at' => $program->deleted_at->format('M d, Y h:i A'),
                ]),
            'templates' => DocumentTemplate::onlyTrashed()
                ->with(['program', 'uploader'])
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (DocumentTemplate $template) => [
                    'id' => $template->id,
                    'name' => InternDocument::getTypeConfig($template->document_type)['name'] ?? $template->document_type,
                    'detail' => ($template->program?->program_name ?? 'Program') . ' • ' . $template->original_filename,
                    'deleted_at' => $template->deleted_at->format('M d, Y h:i A'),
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
            DB::transaction(function () use ($type, $id) {
                if ($type === 'interns') {
                    $profile = InternProfile::onlyTrashed()->findOrFail($id);

                    // 1. Delete associated profile photo if exists
                    if ($profile->profile_photo_path) {
                        Storage::disk('public')->delete($profile->profile_photo_path);
                    }

                    // 2. Delete linked attendance logs to satisfy foreign key constraints
                    AttendanceLog::where('intern_user_id', $profile->user_id)->delete();

                    // 3. Permanently remove profile and parent User account
                    $userId = $profile->user_id;
                    $profile->forceDelete();
                    User::where('id', $userId)->delete();

                } elseif ($type === 'supervisors') {
                    $profile = SupervisorProfile::onlyTrashed()->findOrFail($id);
                    $userId = $profile->user_id;

                    $profile->forceDelete();
                    User::where('id', $userId)->delete();

                } elseif ($type === 'templates') {
                    $template = DocumentTemplate::onlyTrashed()->findOrFail($id);
                    if ($template->file_path && Storage::disk('local')->exists($template->file_path)) {
                        Storage::disk('local')->delete($template->file_path);
                    }
                    $template->forceDelete();

                } else {
                    $this->modelFor($type)::onlyTrashed()->findOrFail($id)->forceDelete();
                }
            });
        } catch (QueryException $e) {
            return back()->with(
                'error',
                'This record cannot be permanently deleted because other active records still reference it.'
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
            'programs' => Program::class,
            'templates' => DocumentTemplate::class,
            default => abort(404),
        };
    }
}