<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\HteController;
use App\Http\Controllers\Admin\InternApprovalController;
use App\Http\Controllers\Admin\SupervisorController;
use App\Http\Controllers\Intern\QrCodeImageController;
use App\Http\Controllers\Intern\DashboardController as InternDashboardController;
use App\Http\Controllers\Intern\DtrReportController;
use App\Http\Controllers\Supervisor\ScanController;
use App\Http\Controllers\Supervisor\InternsController;
use App\Http\Controllers\Admin\KioskController;
use App\Http\Controllers\Kiosk\ScanController as KioskScanController;
use App\Models\User;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('dashboard', function () {
        return redirect()->route(match (auth()->user()->role) {
            User::ROLE_ADMIN => 'admin.dashboard',
            User::ROLE_SUPERVISOR => 'supervisor.dashboard',
            User::ROLE_INTERN => 'intern.dashboard',
            default => throw new \UnexpectedValueException('Invalid user role.'), // fallback route if role is not recognized
        });
    })->name('dashboard');

    Route::middleware('role:' . User::ROLE_ADMIN)->prefix('admin')->name('admin.')->group(function () {
        Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

        Route::post('interns/{internProfile}/approve', [InternApprovalController::class, 'approve'])
            ->name('interns.approve');
        Route::post('interns/{internProfile}/reject', [InternApprovalController::class, 'reject'])
            ->name('interns.reject');

        Route::get('supervisors', [SupervisorController::class, 'index'])->name('supervisors.index');
        Route::post('supervisors', [SupervisorController::class, 'store'])->name('supervisors.store');
        Route::post('supervisors/ojt', [SupervisorController::class, 'storeOjtSupervisor'])->name('supervisors.store-ojt');

        Route::patch('supervisors/{supervisorProfile}/status', [SupervisorController::class, 'updateStatus'])
            ->name('supervisors.updateStatus');

        // ADDED — HTE management routes
        Route::get('htes', [HteController::class, 'index'])->name('htes.index');
        Route::post('htes', [HteController::class, 'store'])->name('htes.store');
        Route::patch('htes/{hte}', [HteController::class, 'update'])->name('htes.update');
        Route::patch('htes/{hte}/status', [HteController::class, 'updateStatus'])->name('htes.updateStatus');

        Route::get('kiosk', [KioskController::class, 'show'])->name('kiosk.show');
        Route::post('kiosk/{kiosk}/regenerate', [KioskController::class, 'regenerate'])->name('kiosk.regenerate');
        Route::post('kiosk/{kiosk}/toggle', [KioskController::class, 'toggleActive'])->name('kiosk.toggle');
    });

    Route::middleware('role:' . User::ROLE_SUPERVISOR)->prefix('supervisor')->name('supervisor.')->group(function () {
        Route::get('dashboard', [\App\Http\Controllers\Supervisor\DashboardController::class, 'index'])->name('dashboard');
        Route::get('interns', [InternsController::class, 'index'])->name('interns.index');
    });

    Route::middleware('role:' . User::ROLE_INTERN)->prefix('intern')->name('intern.')->group(function () {
        Route::get('dashboard', [InternDashboardController::class, 'index'])->name('dashboard');
        Route::get('dtr-report', [DtrReportController::class, 'download'])->name('dtr-report.download');
        Route::get('qr-code', [QrCodeImageController::class, 'show'])->name('qr-code.show');
    });

});

Route::get('kiosk/{token}', [KioskScanController::class, 'show'])->name('kiosk.scan.show');
Route::post('kiosk/{token}/scan', [KioskScanController::class, 'store'])->name('kiosk.scan.store');

require __DIR__ . '/settings.php';
