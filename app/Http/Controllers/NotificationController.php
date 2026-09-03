<?php

namespace App\Http\Controllers;

use App\Services\NotificationPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $notifications = NotificationPresenter::formatCollection(
            $user->notifications()->latest()->get()
        );

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
