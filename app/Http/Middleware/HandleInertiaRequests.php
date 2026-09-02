<?php

namespace App\Http\Middleware;

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

        // DB-backed notification items (always included for all roles).
        $dbItems = $user
            ? $user->unreadNotifications()
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn ($notification) => [
                    'id' => $notification->id,
                    'type' => $notification->data['type'] ?? 'general',
                    'title' => $notification->data['title'] ?? 'Notification',
                    'message' => $notification->data['message'] ?? '',
                    'href' => $notification->data['href'] ?? '/dashboard',
                    'read_at' => $notification->read_at?->toISOString(),
                    'created_at' => $notification->created_at?->toISOString(),
                ])
                ->values()
                ->all()
            : [];

        // Resolution-ticket-based notification items:
        //  - HTE supervisors: pending tickets from their HTE (after cleared_at)
        //  - Interns: approved/rejected tickets for them (after cleared_at)
        //  - Admin / OJT supervisor: none
        $resolutionItems = $this->buildResolutionNotifications($user);

        $allItems = array_merge($resolutionItems, $dbItems);

        $notifications = [
            'count' => count($resolutionItems) + ($user?->unreadNotifications()->count() ?? 0),
            'items' => $allItems,
        ];

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
                'toast' => fn () => $request->session()->get('toast'),
            ],
            'toast' => fn () => $request->session()->get('toast'),
        ];
    }

    /**
     * Build resolution-ticket notification items for the shared prop.
     * Mirrors the logic in NotificationController::buildResolutionNotifications().
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildResolutionNotifications($user): array
    {
        if (! $user || $user->isAdmin()) {
            return [];
        }

        $clearedAt = $user->notifications_cleared_at;

        if ($user->isSupervisor()) {
            $profile = $user->supervisorProfile;

            if (! $profile || $profile->isOjtSupervisor()) {
                return [];
            }

            // HTE supervisor — pending tickets from their HTE after cleared_at.
            $internUserIds = \App\Models\InternProfile::query()
                ->where('hte_id', $profile->hte_id)
                ->pluck('user_id');

            $query = \App\Models\ResolutionTicket::query()
                ->whereIn('intern_user_id', $internUserIds)
                ->where('status', \App\Models\ResolutionTicket::STATUS_PENDING)
                ->with('intern')
                ->orderByDesc('created_at')
                ->limit(5);

            if ($clearedAt) {
                $query->where('created_at', '>', $clearedAt);
            }

            return $query->get()
                ->map(fn (\App\Models\ResolutionTicket $ticket) => [
                    'id' => 'ticket-' . $ticket->id,
                    'type' => 'resolution_ticket',
                    'title' => 'Resolution request from ' . ($ticket->intern?->name ?? 'Unknown'),
                    'message' => 'Submitted on ' . $ticket->date->toDateString(),
                    'href' => '/supervisor/resolution-tickets',
                    'read_at' => null,
                    'created_at' => $ticket->created_at?->toISOString(),
                ])
                ->values()
                ->all();
        }

        if ($user->isIntern()) {
            $query = \App\Models\ResolutionTicket::query()
                ->where('intern_user_id', $user->id)
                ->whereIn('status', [
                    \App\Models\ResolutionTicket::STATUS_APPROVED,
                    \App\Models\ResolutionTicket::STATUS_REJECTED,
                ])
                ->orderByDesc('resolved_at')
                ->limit(5);

            if ($clearedAt) {
                $query->where('resolved_at', '>', $clearedAt);
            }

            return $query->get()
                ->map(fn (\App\Models\ResolutionTicket $ticket) => [
                    'id' => 'ticket-' . $ticket->id,
                    'type' => 'resolution_ticket',
                    'title' => 'Your resolution request on ' . $ticket->date->toDateString() . ' was ' . $ticket->status,
                    'message' => 'Your request was ' . $ticket->status . '.',
                    'href' => '/intern/dashboard',
                    'read_at' => null,
                    'created_at' => $ticket->resolved_at?->toISOString(),
                ])
                ->values()
                ->all();
        }

        return [];
    }
}