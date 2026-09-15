<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Campus;
use App\Models\College;
use App\Models\CollegeAdminProfile;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AdminManagementController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'college_id' => ['nullable', 'integer', 'exists:colleges,id'],
            'campus_id' => ['nullable', 'integer', 'exists:campuses,id'],
            'status' => ['nullable', 'in:active,inactive'],
            'role' => ['nullable', 'in:all,super_admin,college_admin'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $collegeId = $validated['college_id'] ?? null;
        $campusId = $validated['campus_id'] ?? null;
        $status = $validated['status'] ?? null;
        $roleFilter = $validated['role'] ?? 'all';
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $query = User::query()
            ->whereIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_COLLEGE_ADMIN, User::ROLE_ADMIN])
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

        if ($roleFilter === 'super_admin') {
            $query->where(function ($q) {
                $q->where('role', User::ROLE_SUPER_ADMIN)
                    ->orWhere(fn ($sub) => $sub->where('role', User::ROLE_ADMIN)->whereNull('college_id'));
            });
        } elseif ($roleFilter === 'college_admin') {
            $query->where(function ($q) {
                $q->where('role', User::ROLE_COLLEGE_ADMIN)
                    ->orWhere(fn ($sub) => $sub->where('role', User::ROLE_ADMIN)->whereNotNull('college_id'));
            });
        }

        $admins = $query
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString()
            ->through(function (User $admin) {
                $isSuper = $admin->role === User::ROLE_SUPER_ADMIN || ($admin->role === User::ROLE_ADMIN && is_null($admin->college_id));
                $profile = $admin->collegeAdminProfile;

                $campusName = $isSuper
                    ? ($admin->campus ?? 'All Campuses')
                    : ($profile?->campus?->name ?? $admin->college?->campus ?? $admin->campus ?? null);

                return [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'role' => $isSuper ? 'super_admin' : 'college_admin',
                    'college_id' => $admin->college_id,
                    'campus_id' => $profile?->campus_id ?? $admin->college?->campus_id,
                    'campus' => $campusName,
                    'employee_id' => $profile?->employee_id,
                    'position' => $profile?->position,
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

        return Inertia::render('admin/admins/index', [
            'admins' => $admins,
            'colleges' => $colleges,
            'campuses' => $campuses,
            'filters' => [
                'search' => $search,
                'college_id' => $collegeId ? (int) $collegeId : null,
                'campus_id' => $campusId ? (int) $campusId : null,
                'status' => $status,
                'role' => $roleFilter,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $role = $request->input('role', 'college_admin');

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'role' => ['nullable', 'in:super_admin,college_admin'],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ];

        if ($role === 'college_admin') {
            $rules['college_id'] = ['required', 'integer', 'exists:colleges,id'];
            $rules['campus_id'] = ['nullable', 'integer', 'exists:campuses,id'];
            $rules['employee_id'] = ['nullable', 'string', 'max:100'];
            $rules['position'] = ['nullable', 'string', 'max:150'];
        } else {
            $rules['college_id'] = ['nullable', 'integer'];
            $rules['campus_id'] = ['nullable', 'integer'];
            $rules['campus'] = ['nullable', 'string', 'max:100'];
        }

        $validated = $request->validate($rules);

        if ($role === 'super_admin') {
            User::create([
                'role' => User::ROLE_SUPER_ADMIN,
                'college_id' => null,
                'campus' => $validated['campus'] ?? 'All Campuses',
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            return back()->with('toast', [
                'type' => 'success',
                'message' => 'Super administrator account created successfully.',
            ]);
        }

        $college = College::find($validated['college_id']);
        $campusId = $validated['campus_id'] ?? $college?->campus_id;
        $campusName = null;
        if ($campusId) {
            $campusName = Campus::find($campusId)?->name;
        }
        if (! $campusName && $college) {
            $campusName = $college->campus;
        }

        DB::transaction(function () use ($validated, $campusId, $campusName) {
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

            CollegeAdminProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'college_id' => $validated['college_id'],
                    'campus_id' => $campusId,
                    'employee_id' => $validated['employee_id'] ?? null,
                    'position' => $validated['position'] ?? null,
                ]
            );
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'College administrator account created successfully.',
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isAdmin(), 404);

        $isCollege = $user->isCollegeAdmin();

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'string', Password::defaults(), 'confirmed'],
            'is_active' => ['nullable', 'boolean'],
        ];

        if ($isCollege) {
            $rules['college_id'] = ['required', 'integer', 'exists:colleges,id'];
            $rules['campus_id'] = ['nullable', 'integer', 'exists:campuses,id'];
            $rules['employee_id'] = ['nullable', 'string', 'max:100'];
            $rules['position'] = ['nullable', 'string', 'max:150'];
        } else {
            $rules['campus'] = ['nullable', 'string', 'max:100'];
        }

        $validated = $request->validate($rules);

        if (array_key_exists('is_active', $validated) && $user->id === $request->user()->id && ! $validated['is_active']) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'You cannot deactivate your own account.',
            ]);
        }

        DB::transaction(function () use ($validated, $user, $isCollege) {
            $userData = [
                'name' => $validated['name'],
                'email' => $validated['email'],
            ];

            if (! empty($validated['password'])) {
                $userData['password'] = Hash::make($validated['password']);
            }

            if (array_key_exists('is_active', $validated)) {
                $userData['is_active'] = $validated['is_active'];
            }

            if ($isCollege) {
                $college = College::find($validated['college_id']);
                $campusId = $validated['campus_id'] ?? $college?->campus_id;
                $campusName = null;
                if ($campusId) {
                    $campusName = Campus::find($campusId)?->name;
                }
                if (! $campusName && $college) {
                    $campusName = $college->campus;
                }

                $userData['college_id'] = $validated['college_id'];
                $userData['campus'] = $campusName;

                CollegeAdminProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'college_id' => $validated['college_id'],
                        'campus_id' => $campusId,
                        'employee_id' => $validated['employee_id'] ?? null,
                        'position' => $validated['position'] ?? null,
                    ]
                );
            } elseif (array_key_exists('campus', $validated)) {
                $userData['campus'] = $validated['campus'];
            }

            $user->update($userData);
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Administrator account updated successfully.',
        ]);
    }

    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isAdmin(), 404);

        if ($user->id === $request->user()->id) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'You cannot change your own active status.',
            ]);
        }

        $user->update(['is_active' => ! $user->is_active]);

        $statusText = $user->is_active ? 'activated' : 'deactivated';

        return back()->with('toast', [
            'type' => 'success',
            'message' => "Admin {$user->name} has been {$statusText}.",
        ]);
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isAdmin(), 404);

        if ($user->id === $request->user()->id) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'You cannot delete your own account.',
            ]);
        }

        DB::transaction(function () use ($user) {
            $user->collegeAdminProfile?->delete();
            $user->delete();
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Administrator account deleted successfully.',
        ]);
    }
}
