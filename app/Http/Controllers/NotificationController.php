<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class NotificationController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $user = $request->user();

        $dbNotifications = $user->notifications()
            ->latest()
            ->get()
            ->map(fn ($notification) => [
                'id' => $notification->id,
                'type' => $notification->data['type'] ?? 'general',
                'title' => $notification->data['title'] ?? 'Notification',
                'message' => $notification->data['message'] ?? '',
                'href' => $notification->data['href'] ?? '/dashboard',
                'data' => $notification->data,
                'read_at' => $notification->read_at?->toISOString(),
                'created_at' => $notification->created_at?->toISOString(),
            ])
            ->values()
            ->all();

        $unreadCount = $user->unreadNotifications()->count();

        return Inertia::render('notifications/index', [
            'notifications' => [
                'count' => $unreadCount,
                'items' => $dbNotifications,
            ],
        ]);
    }

    /**
     * Mark a single DB notification as read (returns redirect).
     */
    public function markSingleRead(Request $request, string $notification): RedirectResponse
    {
        $model = $request->user()
            ->notifications()
            ->whereKey($notification)
            ->firstOrFail();

        $model->markAsRead();

        return back();
    }

    /**
     * Batch mark-read: updates notifications_cleared_at on the user so that
     * resolution-ticket-based notifications created before this timestamp are
     * hidden. Returns 204 No Content (used by the resolution-ticket UI).
     */
    public function markBulkRead(Request $request): Response
    {
        $request->user()->update([
            'notifications_cleared_at' => now(),
        ]);

        return response()->noContent();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return back();
    }

    public function destroy(Request $request, string $notification): RedirectResponse
    {
        $request->user()
            ->notifications()
            ->whereKey($notification)
            ->firstOrFail()
            ->delete();

        return back();
    }

    /**
     * Clear notifications. Handles both:
     *  - DELETE: removes all DB notifications (legacy/DB-backed notification system)
     *  - POST:   sets notifications_cleared_at so resolution-ticket notifications
     *            created before this moment stop appearing in the bell
     */
    public function clear(Request $request): RedirectResponse
    {
        if ($request->isMethod('delete')) {
            $request->user()->notifications()->delete();
        } else {
            // POST — set the cleared-at timestamp for resolution-ticket notifications.
            $request->user()->update([
                'notifications_cleared_at' => now(),
            ]);
        }

        return back();
    }
}
