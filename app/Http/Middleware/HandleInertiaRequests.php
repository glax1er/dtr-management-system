<?php

namespace App\Http\Middleware;

use App\Models\InternProfile;
use App\Models\ResolutionTicket;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $notifications = [
            'count' => 0,
            'items' => [],
        ];
 
        $notificationsClearedAt = $user?->notifications_cleared_at ?? $request->session()->get('notifications_cleared_at');
 
        if ($user && $user->isSupervisor() && $user->supervisorProfile?->isHteSupervisor()) {
            $internUserIds = InternProfile::query()
                ->where('hte_id', $user->supervisorProfile->hte_id)
                ->pluck('user_id');

            $pendingTickets = ResolutionTicket::query()
                ->where('status', ResolutionTicket::STATUS_PENDING)
                ->whereIn('intern_user_id', $internUserIds)
                ->when($notificationsClearedAt, fn ($query) => $query->where('updated_at', '>', $notificationsClearedAt));

            $notifications = [
                'count' => $pendingTickets->count(),
                'items' => $pendingTickets
                    ->with('intern')
                    ->orderBy('date')
                    ->limit(5)
                    ->get()
                    ->map(fn (ResolutionTicket $ticket) => [
                        'id' => $ticket->id,
                        'type' => 'resolution_ticket',
                        'title' => "Resolution request from {$ticket->intern->name}",
                        'message' => $ticket->date->toDateString(),
                        'href' => '/supervisor/resolution-tickets',
                    ])
                    ->toArray(),
            ];
        } elseif ($user && $user->isIntern()) {
            $resolvedTickets = ResolutionTicket::query()
                ->where('intern_user_id', $user->id)
                ->whereIn('status', [
                    ResolutionTicket::STATUS_APPROVED,
                    ResolutionTicket::STATUS_REJECTED,
                ])
                ->whereNotNull('resolved_at')
                ->where('resolved_at', '>=', now()->subDays(14))
                ->when($notificationsClearedAt, fn ($query) => $query->where('resolved_at', '>', $notificationsClearedAt))
                ->with('resolvedBy')
                ->orderByDesc('resolved_at')
                ->limit(5)
                ->get();

            $notifications = [
                'count' => $resolvedTickets->count(),
                'items' => $resolvedTickets
                    ->map(fn (ResolutionTicket $ticket) => [
                        'id' => $ticket->id,
                        'type' => 'resolution_ticket',
                        'title' => $ticket->status === ResolutionTicket::STATUS_APPROVED
                            ? "Your resolution request on {$ticket->date->toDateString()} was approved"
                            : "Your resolution request on {$ticket->date->toDateString()} was rejected",
                        'message' => $ticket->resolvedBy
                            ? "Reviewed by {$ticket->resolvedBy->name}"
                            : 'Reviewed',
                        'href' => '/intern/dashboard',
                    ])
                    ->toArray(),
            ];
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    ...$user->toArray(),
                    // Only meaningful for supervisors — lets the UI (e.g.
                    // the sidebar) hide resolution-ticket actions for OJT
                    // Supervisors without needing a per-page prop.
                    'supervisor_type' => $user->isSupervisor()
                        ? $user->supervisorProfile?->supervisor_type
                        : null,
                    'avatar' => $user->isIntern()
                        ? $user->internProfile?->profile_photo_url
                        : null,
                ] : null,
            ],
            'notifications' => $notifications,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
                'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
