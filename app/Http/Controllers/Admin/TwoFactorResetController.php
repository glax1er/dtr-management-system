<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\TwoFactorResetRequest;
use App\Models\User;
use App\Notifications\TwoFactorResetApprovedNotification;
use App\Notifications\TwoFactorResetConfirmationNotification;
use App\Notifications\TwoFactorResetRejectedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorResetController extends Controller
{
    private const DEFAULT_PER_PAGE = 15;

    private const MAX_PER_PAGE = 100;

    /**
     * Display a paginated list of 2FA reset requests with role scoping.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:all,pending,pending_user_confirmation,pending_admin_approval,approved,rejected'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $status = $validated['status'] ?? 'pending';
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $currentUser = $request->user();

        $query = TwoFactorResetRequest::query()
            ->with([
                'user:id,name,email,role,college_id',
                'user.college:id,name,code',
                'admin:id,name,email',
                'requestedBy:id,name,email',
            ])
            ->orderByDesc('created_at');

        // Scope to user's college if college admin
        if ($currentUser->isCollegeAdmin()) {
            $collegeId = $currentUser->college_id;
            $query->whereHas('user', function ($uq) use ($collegeId) {
                $uq->where('college_id', $collegeId)
                    ->whereNotIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_COLLEGE_ADMIN, User::ROLE_ADMIN]);
            });
        }

        // If highlighting a specific request and no status filter was explicitly requested, match the request's status
        if ($request->filled('highlight') && ! $request->has('status')) {
            $highlightedRequest = TwoFactorResetRequest::query()->find($request->query('highlight'));
            if ($highlightedRequest instanceof TwoFactorResetRequest) {
                $status = ($highlightedRequest->status === TwoFactorResetRequest::STATUS_PENDING_ADMIN_APPROVAL)
                    ? 'pending'
                    : $highlightedRequest->status;
            }
        }

        // Filter by status
        if ($status === 'pending') {
            $query->where('status', TwoFactorResetRequest::STATUS_PENDING_ADMIN_APPROVAL);
        } elseif ($status !== 'all') {
            $query->where('status', $status);
        }

        // Search filter
        if ($search !== '') {
            $query->whereHas('user', function ($uq) use ($search) {
                $uq->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Auto-navigate to the page containing the highlighted request if not specified
        if ($request->filled('highlight') && ! $request->has('page')) {
            $highlightId = (int) $request->query('highlight');
            $allIds = (clone $query)->pluck('id')->all();
            $index = array_search($highlightId, $allIds, true);
            if ($index !== false) {
                $targetPage = (int) floor((int) $index / $perPage) + 1;
                if ($targetPage > 1) {
                    $validated['page'] = $targetPage;
                }
            }
        }

        $requests = $query->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1);

        // Count pending approval requests for header badge
        $pendingCountQuery = TwoFactorResetRequest::query()
            ->where('status', TwoFactorResetRequest::STATUS_PENDING_ADMIN_APPROVAL);
        if ($currentUser->isCollegeAdmin()) {
            $collegeId = $currentUser->college_id;
            $pendingCountQuery->whereHas('user', fn ($uq) => $uq->where('college_id', $collegeId)->whereNotIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_COLLEGE_ADMIN, User::ROLE_ADMIN]));
        }
        $pendingCount = $pendingCountQuery->count();

        return Inertia::render('admin/two-factor-resets/index', [
            'requests' => $requests,
            'pendingCount' => $pendingCount,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Approve a 2FA reset request that has been verified by the user.
     */
    public function approve(Request $request, TwoFactorResetRequest $twoFactorResetRequest): RedirectResponse
    {
        $admin = $request->user();

        if (! $twoFactorResetRequest->canBeManagedBy($admin)) {
            abort(403, 'You do not have permission to manage this 2FA reset request.');
        }

        if ($twoFactorResetRequest->status !== TwoFactorResetRequest::STATUS_PENDING_ADMIN_APPROVAL) {
            return back()->with('error', 'This request cannot be approved because the user has not granted permission via email yet, or it is already closed.');
        }

        $targetUser = $twoFactorResetRequest->user;

        DB::transaction(function () use ($twoFactorResetRequest, $targetUser, $admin) {
            $previousConfirmedAt = $targetUser->two_factor_confirmed_at;

            // Clear all 2FA fields and cycle remember token to invalidate active sessions
            $targetUser->forceFill([
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'remember_token' => Str::random(60),
            ])->save();

            $twoFactorResetRequest->update([
                'status' => TwoFactorResetRequest::STATUS_APPROVED,
                'admin_id' => $admin->id,
                'admin_action_at' => now(),
            ]);

            AuditLog::record(
                action: 'two_factor_reset.approved',
                description: "Approved 2FA reset for {$targetUser->name} ({$targetUser->email}) after confirmed user email consent.",
                auditable: $targetUser,
                oldValues: ['two_factor_confirmed_at' => $previousConfirmedAt?->toIso8601String()],
                newValues: ['two_factor_confirmed_at' => null],
                user: $admin,
            );
        });

        // Send high-priority security alert notification to user
        $targetUser->notify(new TwoFactorResetApprovedNotification($twoFactorResetRequest, $admin));

        return back()->with('success', "Two-factor authentication has been successfully reset for {$targetUser->name}.");
    }

    /**
     * Reject a 2FA reset request.
     */
    public function reject(Request $request, TwoFactorResetRequest $twoFactorResetRequest): RedirectResponse
    {
        $admin = $request->user();

        if (! $twoFactorResetRequest->canBeManagedBy($admin)) {
            abort(403, 'You do not have permission to manage this 2FA reset request.');
        }

        if (! in_array($twoFactorResetRequest->status, [
            TwoFactorResetRequest::STATUS_PENDING_ADMIN_APPROVAL,
            TwoFactorResetRequest::STATUS_PENDING_USER_CONFIRMATION,
        ], true)) {
            return back()->with('error', 'This request has already been processed.');
        }

        $validated = $request->validate([
            'rejection_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $targetUser = $twoFactorResetRequest->user;

        DB::transaction(function () use ($twoFactorResetRequest, $targetUser, $admin, $validated) {
            $twoFactorResetRequest->update([
                'status' => TwoFactorResetRequest::STATUS_REJECTED,
                'rejection_reason' => $validated['rejection_reason'] ?? null,
                'admin_id' => $admin->id,
                'admin_action_at' => now(),
            ]);

            AuditLog::record(
                action: 'two_factor_reset.rejected',
                description: 'Rejected 2FA reset request for '.$targetUser->name.' ('.$targetUser->email.'). Reason: '.($validated['rejection_reason'] ?? 'None provided'),
                auditable: $twoFactorResetRequest,
                user: $admin,
            );
        });

        $targetUser->notify(new TwoFactorResetRejectedNotification(
            $twoFactorResetRequest,
            $admin,
            $validated['rejection_reason'] ?? null
        ));

        return back()->with('success', 'The 2FA reset request has been rejected.');
    }

    /**
     * Admin initiates a 2FA reset for a user.
     * Note: The 2FA is NOT immediately cleared! An authorization email is sent to the user,
     * requiring the user's explicit consent before it can be approved.
     */
    public function initiate(Request $request, User $user): RedirectResponse
    {
        $admin = $request->user();

        if ($admin->id === $user->id) {
            return back()->with('error', 'You cannot initiate a 2FA reset for your own account.');
        }

        if ($admin->isCollegeAdmin()) {
            if ($user->isAdmin() || $user->college_id !== $admin->college_id) {
                abort(403, 'You can only initiate 2FA resets for users within your assigned college.');
            }
        } elseif (! $admin->isSuperAdmin()) {
            abort(403, 'Unauthorized.');
        }

        if (! $user->hasEnabledTwoFactorAuthentication()) {
            return back()->with('error', "{$user->name} does not have two-factor authentication enabled.");
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        [$resetRequest, $plainToken] = TwoFactorResetRequest::createForUser(
            user: $user,
            reason: $validated['reason'] ?? 'Initiated by administrator '.$admin->name,
            requestedBy: $admin,
            ip: $request->ip(),
            userAgent: $request->userAgent(),
        );

        $user->notify(new TwoFactorResetConfirmationNotification($resetRequest, $plainToken));

        AuditLog::record(
            action: 'two_factor_reset.initiated_by_admin',
            description: "Admin {$admin->name} initiated a 2FA reset for {$user->name} ({$user->email}). Awaiting user email authorization.",
            auditable: $resetRequest,
            user: $admin,
        );

        return back()->with(
            'success',
            "An authorization request email was sent to {$user->email}. For security, 2FA will only be reset after the user clicks the link to grant permission."
        );
    }
}
