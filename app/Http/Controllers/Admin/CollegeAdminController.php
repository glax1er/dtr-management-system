<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\NotifiesSuperAdmins;
use App\Http\Controllers\Controller;
use App\Models\Campus;
use App\Models\College;
use App\Models\CollegeAdminProfile;
use App\Models\User;
use App\Notifications\CollegeAdminAccountNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class CollegeAdminController extends Controller
{
    use NotifiesSuperAdmins;

    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'college_id' => ['nullable', 'integer', 'exists:colleges,id'],
            'campus_id' => ['nullable', 'integer', 'exists:campuses,id'],
            'status' => ['nullable', 'in:active,inactive'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $collegeId = $validated['college_id'] ?? null;
        $campusId = $validated['campus_id'] ?? null;
        $status = $validated['status'] ?? null;
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $query = User::query()
            ->where(function ($q) {
                $q->where('role', User::ROLE_COLLEGE_ADMIN)
                    ->orWhere(fn ($sub) => $sub->where('role', User::ROLE_ADMIN)->whereNotNull('college_id'));
            })
            ->with([
                'college:id,name,code,campus,campus_id',
                'collegeAdminProfile.campus:id,name,code',
            ])
            ->orderBy('created_at', 'desc');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('collegeAdminProfile', function ($pq) use ($search) {
                        $pq->where('employee_id', 'like', "%{$search}%")
                            ->orWhere('position', 'like', "%{$search}%");
                    });
            });
        }

        if ($collegeId !== null) {
            $query->where('college_id', $collegeId);
        }

        if ($campusId !== null) {
            $query->where(function ($q) use ($campusId) {
                $q->whereHas('collegeAdminProfile', fn ($pq) => $pq->where('campus_id', $campusId))
                    ->orWhereHas('college', fn ($cq) => $cq->where('campus_id', $campusId));
            });
        }

        if ($status !== null) {
            $query->where('is_active', $status === 'active');
        }

        $collegeAdmins = $query
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString()
            ->through(function (User $admin) {
                $profile = $admin->collegeAdminProfile;
                $campusName = $profile?->campus?->name
                    ?? $admin->college?->campus
                    ?? $admin->campus;

                return [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'employee_id' => $profile?->employee_id,
                    'position' => $profile?->position,
                    'college_id' => $admin->college_id,
                    'campus_id' => $profile?->campus_id ?? $admin->college?->campus_id,
                    'campus' => $campusName,
                    'college' => $admin->college ? [
                        'id' => $admin->college->id,
                        'name' => $admin->college->name,
                        'code' => $admin->college->code,
                        'campus' => $admin->college->campus,
                    ] : null,
                    'is_active' => (bool) $admin->is_active,
                    'created_at' => $admin->created_at?->format('M d, Y'),
                ];
            });

        $colleges = College::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'campus', 'campus_id']);

        $campuses = Campus::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('admin/college-admins/index', [
            'collegeAdmins' => $collegeAdmins,
            'colleges' => $colleges,
            'campuses' => $campuses,
            'filters' => [
                'search' => $search,
                'college_id' => $collegeId ? (int) $collegeId : null,
                'campus_id' => $campusId ? (int) $campusId : null,
                'status' => $status,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'college_id' => ['required', 'integer', 'exists:colleges,id'],
            'campus_id' => ['nullable', 'integer', 'exists:campuses,id'],
            'employee_id' => ['nullable', 'string', 'max:100'],
            'position' => ['nullable', 'string', 'max:150'],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ]);

        $college = College::find($validated['college_id']);
        $campusId = $validated['campus_id'] ?? $college?->campus_id;
        $campusName = null;
        if ($campusId) {
            $campusName = Campus::find($campusId)?->name;
        }
        if (! $campusName && $college) {
            $campusName = $college->campus;
        }

        $createdUser = DB::transaction(function () use ($validated, $campusId, $campusName) {
            $user = User::create([
                'role' => User::ROLE_COLLEGE_ADMIN,
                'college_id' => $validated['college_id'],
                'campus' => $campusName,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            CollegeAdminProfile::create([
                'user_id' => $user->id,
                'college_id' => $validated['college_id'],
                'campus_id' => $campusId,
                'employee_id' => $validated['employee_id'] ?? null,
                'position' => $validated['position'] ?? null,
            ]);

            return $user;
        });

        $this->notifySuperAdminsOfAdminChange(
            CollegeAdminAccountNotification::EVENT_CREATED,
            $createdUser,
            $request->user(),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'College administrator account created successfully.',
        ]);

        return back();
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isCollegeAdmin(), 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'college_id' => ['required', 'integer', 'exists:colleges,id'],
            'campus_id' => ['nullable', 'integer', 'exists:campuses,id'],
            'employee_id' => ['nullable', 'string', 'max:100'],
            'position' => ['nullable', 'string', 'max:150'],
            'password' => ['nullable', 'string', Password::defaults(), 'confirmed'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $college = College::find($validated['college_id']);
        $campusId = $validated['campus_id'] ?? $college?->campus_id;
        $campusName = null;
        if ($campusId) {
            $campusName = Campus::find($campusId)?->name;
        }
        if (! $campusName && $college) {
            $campusName = $college->campus;
        }

        if (array_key_exists('is_active', $validated) && $user->id === $request->user()->id && ! $validated['is_active']) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'You cannot deactivate your own account.',
            ]);
        }

        DB::transaction(function () use ($validated, $user, $campusId, $campusName) {
            $userData = [
                'name' => $validated['name'],
                'email' => $validated['email'],
                'college_id' => $validated['college_id'],
                'campus' => $campusName,
            ];

            if (! empty($validated['password'])) {
                $userData['password'] = Hash::make($validated['password']);
            }

            if (array_key_exists('is_active', $validated)) {
                $userData['is_active'] = $validated['is_active'];
            }

            $user->update($userData);

            CollegeAdminProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'college_id' => $validated['college_id'],
                    'campus_id' => $campusId,
                    'employee_id' => $validated['employee_id'] ?? null,
                    'position' => $validated['position'] ?? null,
                ]
            );
        });

        $this->notifySuperAdminsOfAdminChange(
            CollegeAdminAccountNotification::EVENT_UPDATED,
            $user->fresh()->loadMissing('college'),
            $request->user(),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'College administrator updated successfully.',
        ]);

        return back();
    }

    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isCollegeAdmin(), 404);

        if ($user->id === $request->user()->id) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'You cannot change your own active status.',
            ]);
        }

        $user->update(['is_active' => ! $user->is_active]);

        $statusText = $user->is_active ? 'activated' : 'deactivated';

        $event = $user->is_active
            ? CollegeAdminAccountNotification::EVENT_ACTIVATED
            : CollegeAdminAccountNotification::EVENT_DEACTIVATED;

        $this->notifySuperAdminsOfAdminChange($event, $user->loadMissing('college'), $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "College Admin {$user->name} has been {$statusText}.",
        ]);

        return back();
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isCollegeAdmin(), 404);

        if ($user->id === $request->user()->id) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'You cannot delete your own account.',
            ]);
        }

        // Snapshot before deletion so the notification still has name/college data
        $deletedAdmin = $user->loadMissing('college');
        $actor = $request->user();

        DB::transaction(function () use ($user) {
            $user->collegeAdminProfile?->delete();
            $user->delete();
        });

        $this->notifySuperAdminsOfAdminChange(
            CollegeAdminAccountNotification::EVENT_DELETED,
            $deletedAdmin,
            $actor,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'College administrator deleted successfully.',
        ]);

        return back();
    }
}
