<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Interns get routed straight to their own dashboard (Intern/dashboard.tsx).
    // Everyone else (supervisor/admin, or an intern whose profile hasn't been
    // provisioned yet) falls back to the generic placeholder dashboard below,
    // which the supervisor/admin dashboards will replace independently.
    Route::get('dashboard', function (Request $request) {
        $user = $request->user();

        if ($user->isIntern() && $user->internProfile) {
            return redirect()->route('intern.dashboard');
        }

        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/intern.php';
