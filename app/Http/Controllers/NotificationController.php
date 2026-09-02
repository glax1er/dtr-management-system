<?php

namespace App\Http\Controllers;

use App\Models\InternProfile;
use App\Models\ResolutionTicket;
use App\Models\SupervisorProfile;
use Illuminate\Http\JsonResponse;
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
                'read_at' => $notification->read_at?->toISOString(),
                'created_at' => $notification->created_at?->toISOString(),
            ])
            ->values()
            ->all();

        // For HTE supervisors and interns, merge in resolution-ticket notifications.
        $resolutionItems = $this->buildResolutionNotifications($user);

        $allItems = array_merge($resolutionItems, $dbNotifications);

        // Count: unread DB notifications + unread resolution items (before cleared_at).
        $unreadDb = $user->unreadNotifications()->count();
        $unreadResolution = count($resolutionItems);
        $totalCount = $unreadDb + $unreadResolution;

        return Inertia::render('notifications/index', [
            'notifications' => [
                'count' => $totalCount,
                'items' => $allItems,
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

    /**
     * Build resolution-ticket-based notification items for the current user.
     *
     * - HTE supervisors see pending resolution tickets from their HTE that were
     *   submitted after their notifications_cleared_at timestamp.
     * - Interns see approved/rejected tickets for themselves that were resolved
     *   after their notifications_cleared_at timestamp.
     * - All other roles (admin, OJT supervisor) receive no resolution notifications.
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildResolutionNotifications($user): array
    {
        if ($user->isAdmin()) {
            return [];
        }

        $clearedAt = $user->notifications_cleared_at;

        if ($user->isSupervisor()) {
            $profile = $user->supervisorProfile;

            // OJT supervisors do not handle resolution tickets.
            if (! $profile || $profile->isOjtSupervisor()) {
                return [];
            }

            // HTE supervisor — show pending tickets from their HTE.
            $internUserIds = InternProfile::query()
                ->where('hte_id', $profile->hte_id)
                ->pluck('user_id');

            $query = ResolutionTicket::query()
                ->whereIn('intern_user_id', $internUserIds)
                ->where('status', ResolutionTicket::STATUS_PENDING)
                ->with('intern')
                ->orderByDesc('created_at');

            if ($clearedAt) {
                $query->where('created_at', '>', $clearedAt);
            }

            return $query->get()
                ->map(fn (ResolutionTicket $ticket) => [
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
            // Intern — show approved/rejected tickets that the intern hasn't seen yet.
            $query = ResolutionTicket::query()
                ->where('intern_user_id', $user->id)
                ->whereIn('status', [
                    ResolutionTicket::STATUS_APPROVED,
                    ResolutionTicket::STATUS_REJECTED,
                ])
                ->orderByDesc('resolved_at');

            if ($clearedAt) {
                $query->where('resolved_at', '>', $clearedAt);
            }

            return $query->get()
                ->map(fn (ResolutionTicket $ticket) => [
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
