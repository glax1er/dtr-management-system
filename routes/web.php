<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\InternApprovalController;
use App\Models\User;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('dashboard', function () {
        return redirect()->route(match (auth()->user()->role) {
            User::ROLE_ADMIN => 'admin.dashboard',
            User::ROLE_SUPERVISOR => 'supervisor.dashboard',
            User::ROLE_INTERN => 'intern.dashboard',
        });
    })->name('dashboard');

    Route::middleware('role:'.User::ROLE_ADMIN)->prefix('admin')->name('admin.')->group(function () {
        Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

        Route::post('interns/{internProfile}/approve', [InternApprovalController::class, 'approve'])
            ->name('interns.approve');
        Route::post('interns/{internProfile}/reject', [InternApprovalController::class, 'reject'])
            ->name('interns.reject');
    });

    Route::middleware('role:'.User::ROLE_SUPERVISOR)->prefix('supervisor')->name('supervisor.')->group(function () {
        Route::inertia('dashboard', 'supervisor/dashboard')->name('dashboard');
    });

    Route::middleware('role:'.User::ROLE_INTERN)->prefix('intern')->name('intern.')->group(function () {
        Route::inertia('dashboard', 'intern/dashboard')->name('dashboard');
    });
});

require __DIR__.'/settings.php';