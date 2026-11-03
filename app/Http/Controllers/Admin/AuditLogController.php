<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    private const DEFAULT_PER_PAGE = 20;

    private const MAX_PER_PAGE = 100;

    /**
     * Display a paginated list of immutable audit logs.
     */
    public function index(Request $request): Response|JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'action' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $action = $validated['action'] ?? null;
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $query = AuditLog::query()
            ->with('user:id,name,email,role,college_id')
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('user_name', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%");
            });
        }

        if ($action !== null && $action !== 'all') {
            $query->where('action', $action);
        }

        if ($from !== null) {
            $query->where('created_at', '>=', $from);
        }

        if ($to !== null) {
            $query->where('created_at', '<=', $to);
        }

        // College Admins can only view logs created by themselves or within their college scope
        $currentUser = $request->user();
        if ($currentUser->isCollegeAdmin()) {
            $collegeId = $currentUser->college_id;
            $query->where(function ($q) use ($currentUser, $collegeId) {
                $q->where('user_id', $currentUser->id)
                    ->orWhereHas('user', fn ($uq) => $uq->where('college_id', $collegeId));
            });
        }

        $auditLogs = $query->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1);

        if ($request->wantsJson()) {
            return response()->json($auditLogs);
        }

        return Inertia::render('admin/audit-logs/index', [
            'logs' => $auditLogs,
            'filters' => [
                'search' => $search,
                'action' => $action,
                'from' => $from,
                'to' => $to,
                'per_page' => $perPage,
            ],
        ]);
    }
}
