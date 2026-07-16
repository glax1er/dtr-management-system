<?php

use App\Http\Controllers\Intern\DashboardController;
use App\Http\Controllers\Intern\DtrReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'role:intern'])
    ->prefix('intern')
    ->name('intern.')
    ->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('dtr-report', [DtrReportController::class, 'download'])->name('dtr-report.download');
    });
