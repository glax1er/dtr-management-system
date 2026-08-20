<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $notifications = $user->notifications()
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

        return Inertia::render('notifications/index', [
            'notifications' => [
                'count' => $user->unreadNotifications()->count(),
                'items' => $notifications,
            ],
        ]);
    }

    public function markRead(Request $request, string $notification): RedirectResponse
    {
        $model = $request->user()
            ->notifications()
            ->whereKey($notification)
            ->firstOrFail();

        $model->markAsRead();

        return back();
    }

    public function clear(Request $request): RedirectResponse
    {
        $request->user()->notifications()->delete();

        return back();
    }
}
