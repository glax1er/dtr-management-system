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
        
        $notifications = [
            'count' => $user?->unreadNotifications()->count() ?? 0,

            'items' => $user
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
                : [],
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
}
