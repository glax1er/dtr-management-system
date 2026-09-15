<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Campus;
use App\Models\College;
use App\Models\CollegeAdminProfile;
use App\Models\EmailVerificationCode;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\ResolutionTicket;
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
            'type' => ['nullable', 'in:htes,supervisors,interns,programs,colleges,campuses'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $type = $validated['type'] ?? 'interns';
        $page = $validated['page'] ?? 1;
        $collegeId = $request->user()->isCollegeAdmin() ? $request->user()->college_id : null;

        if (in_array($type, ['colleges', 'campuses']) && $request->user()->isCollegeAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        $records = match ($type) {
            'interns' => InternProfile::onlyTrashed()
                ->with('user:id,name,email')
                ->when($collegeId !== null, fn ($q) => $q->where(function ($iq) use ($collegeId) {
                    $iq->whereHas('user', fn ($uq) => $uq->where('college_id', $collegeId))
                        ->orWhereHas('program', fn ($pq) => $pq->where('college_id', $collegeId));
                }))
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
                ->when($collegeId !== null, fn ($q) => $q->where(function ($sq) use ($collegeId) {
                    $sq->where(function ($hq) use ($collegeId) {
                        $hq->where('supervisor_type', 'hte')
                            ->whereHas('hte', fn ($sub) => $sub->withTrashed()->where('college_id', $collegeId));
                    })->orWhere(function ($pq) use ($collegeId) {
                        $pq->where('supervisor_type', 'ojt')
                            ->whereHas('program', fn ($sub) => $sub->withTrashed()->where('college_id', $collegeId));
                    });
                }))
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (SupervisorProfile $profile) => [
                    'id' => $profile->user_id,
                    'name' => $profile->user?->name ?? 'Deleted User',
                    'detail' => $profile->user?->email ?? 'No email',
                    'deleted_at' => $profile->deleted_at->format('M d, Y h:i A'),
                ]),
            'htes' => Hte::onlyTrashed()
                ->when($collegeId !== null, fn ($q) => $q->where('college_id', $collegeId))
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (Hte $hte) => [
                    'id' => $hte->hte_id,
                    'name' => $hte->hte_name,
                    'detail' => $hte->address ?? 'No address',
                    'deleted_at' => $hte->deleted_at->format('M d, Y h:i A'),
                ]),
            'programs' => Program::onlyTrashed()
                ->when($collegeId !== null, fn ($q) => $q->where('college_id', $collegeId))
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (Program $program) => [
                    'id' => $program->program_id,
                    'name' => $program->program_name,
                    'detail' => $program->required_hours ? "{$program->required_hours} hrs" : 'No hours set',
                    'deleted_at' => $program->deleted_at->format('M d, Y h:i A'),
                ]),
            'colleges' => College::onlyTrashed()
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (College $college) => [
                    'id' => $college->id,
                    'name' => $college->name,
                    'detail' => $college->code,
                    'deleted_at' => $college->deleted_at->format('M d, Y h:i A'),
                ]),
            'campuses' => Campus::onlyTrashed()
                ->orderBy('deleted_at', 'desc')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page)
                ->through(fn (Campus $campus) => [
                    'id' => $campus->id,
                    'name' => $campus->name,
                    'detail' => $campus->code,
                    'deleted_at' => $campus->deleted_at->format('M d, Y h:i A'),
                ]),
            // Unreachable today — the validation above already restricts
            // $type to these 4 values — but kept as a safety net so a
            // future change to the validation rule (e.g. adding a type
            // here without a matching arm) fails loudly with a clear 404
            // instead of a raw UnhandledMatchError.
            default => abort(404, "Unknown archive type: {$type}"),
        };

        return Inertia::render('admin/archives/index', [
            'records' => $records,
            'currentType' => $type,
        ]);
    }

    public function restore(Request $request, string $type, int $id): RedirectResponse
    {
        $record = $this->modelFor($type)::onlyTrashed()->findOrFail($id);

        if (in_array($type, ['colleges', 'campuses']) && ! $request->user()->isSuperAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        if ($request->user()->isCollegeAdmin()) {
            $collegeId = $request->user()->college_id;
            if ($type === 'htes' && $record->college_id !== $collegeId) {
                abort(403, 'Unauthorized action.');
            }
            if ($type === 'interns') {
                $internCollegeId = $record->program?->college_id ?? $record->user?->college_id;
                if ($internCollegeId !== $collegeId) {
                    abort(403, 'Unauthorized action.');
                }
            }
            if ($type === 'supervisors') {
                if ($record->isOjtSupervisor() && $record->program?->college_id !== $collegeId) {
                    abort(403, 'Unauthorized action.');
                }
                if ($record->isHteSupervisor() && $record->hte?->college_id !== $collegeId) {
                    abort(403, 'Unauthorized action.');
                }
            }
            if ($type === 'programs' && $record->college_id !== $collegeId) {
                abort(403, 'Unauthorized action.');
            }
        }

        $record->restore();

        return back()->with('success', 'Record restored.');
    }

    public function forceDelete(Request $request, string $type, int $id): RedirectResponse
    {
        $record = $this->modelFor($type)::onlyTrashed()->findOrFail($id);

        if (in_array($type, ['colleges', 'campuses']) && ! $request->user()->isSuperAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        if ($request->user()->isCollegeAdmin()) {
            $collegeId = $request->user()->college_id;
            if ($type === 'htes' && $record->college_id !== $collegeId) {
                abort(403, 'Unauthorized action.');
            }
            if ($type === 'interns') {
                $internCollegeId = $record->program?->college_id ?? $record->user?->college_id;
                if ($internCollegeId !== $collegeId) {
                    abort(403, 'Unauthorized action.');
                }
            }
            if ($type === 'supervisors') {
                if ($record->isOjtSupervisor() && $record->program?->college_id !== $collegeId) {
                    abort(403, 'Unauthorized action.');
                }
                if ($record->isHteSupervisor() && $record->hte?->college_id !== $collegeId) {
                    abort(403, 'Unauthorized action.');
                }
            }
            if ($type === 'programs' && $record->college_id !== $collegeId) {
                abort(403, 'Unauthorized action.');
            }
        }

        try {
            DB::transaction(function () use ($type, $id, $record) {
                if ($type === 'interns') {
                    $profile = $record;

                    // 1. Delete associated profile photo if exists
                    if ($profile->profile_photo_path) {
                        Storage::disk('public')->delete($profile->profile_photo_path);
                    }
                    if ($profile->user?->profile_photo_path) {
                        Storage::disk('public')->delete($profile->user->profile_photo_path);
                    }

                    // 1b. Delete uploaded requirement documents from storage
                    Storage::disk('local')->deleteDirectory("intern-documents/{$profile->user_id}");

                    // 2. Delete linked attendance logs to satisfy foreign key constraints.
                    // Must run before step 2b: attendance_logs.resolved_ticket_id
                    // restricts deleting a resolution ticket while a written-back
                    // log still points to it.
                    AttendanceLog::where('intern_user_id', $profile->user_id)->delete();

                    // 2b. Delete this intern's resolution tickets — also guarded by
                    // a restrictOnDelete FK (resolution_tickets.intern_user_id),
                    // otherwise the User delete below fails and the whole
                    // transaction rolls back with no visible explanation.
                    ResolutionTicket::where('intern_user_id', $profile->user_id)->delete();

                    // 3. Permanently remove profile and parent User account
                    $userId = $profile->user_id;
                    $userEmail = $profile->user?->email;
                    $profile->forceDelete();
                    User::where('id', $userId)->delete();

                    // 4. email_verification_codes has no FK to users (it's keyed
                    // by email), so it never blocks the delete above — but it
                    // was also never cleaned up, leaving orphaned rows behind.
                    if ($userEmail) {
                        EmailVerificationCode::where('email', strtolower(trim($userEmail)))->delete();
                    }

                } elseif ($type === 'supervisors') {
                    $profile = SupervisorProfile::onlyTrashed()->findOrFail($id);
                    $userId = $profile->user_id;
                    $userEmail = $profile->user?->email;

                    // Note: attendance_logs.supervisor_user_id is nullOnDelete
                    // (see 2026_08_27_000001 migration), so those interns'
                    // attendance history is preserved — it's just detached
                    // from this supervisor rather than deleted.
                    $profile->forceDelete();
                    User::where('id', $userId)->delete();

                    if ($userEmail) {
                        EmailVerificationCode::where('email', strtolower(trim($userEmail)))->delete();
                    }

                } elseif ($type === 'htes') {
                    $hte = Hte::onlyTrashed()->findOrFail($id);
                    if ($hte->id_bg_path) {
                        Storage::disk('public')->delete($hte->id_bg_path);
                    }
                    $hte->forceDelete();
                } elseif ($type === 'colleges') {
                    $college = College::onlyTrashed()->findOrFail($id);
                    // Null out foreign keys to allow clean deletion
                    Program::where('college_id', $college->id)->update(['college_id' => null]);
                    User::where('college_id', $college->id)->update(['college_id' => null]);
                    $college->forceDelete();
                } elseif ($type === 'campuses') {
                    $campus = Campus::onlyTrashed()->findOrFail($id);
                    // Null out foreign keys to allow clean deletion
                    College::where('campus_id', $campus->id)->update(['campus_id' => null]);
                    CollegeAdminProfile::where('campus_id', $campus->id)->update(['campus_id' => null]);
                    $campus->forceDelete();
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
            'colleges' => College::class,
            'campuses' => Campus::class,
            default => abort(404),
        };
    }
}
