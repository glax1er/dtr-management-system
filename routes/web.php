<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\HteController;
use App\Http\Controllers\Admin\InternController;
use App\Http\Controllers\Admin\InternApprovalController;
use App\Http\Controllers\Admin\SupervisorController;
use App\Http\Controllers\Admin\KioskController;
use App\Http\Controllers\Admin\SchedulePeriodController as AdminScheduleController;
use App\Http\Controllers\Intern\QrCodeImageController;
use App\Http\Controllers\Intern\DashboardController as InternDashboardController;
use App\Http\Controllers\Intern\DtrReportController;
use App\Http\Controllers\Intern\ProfilePhotoController;
use App\Http\Controllers\Supervisor\DashboardController as SupervisorDashboardController;
use App\Http\Controllers\Supervisor\HtesController as SupervisorHtesController;
use App\Http\Controllers\Supervisor\InternsController;
use App\Http\Controllers\Supervisor\ManualAttendanceController;
use App\Http\Controllers\Supervisor\SchedulePeriodController as SupervisorScheduleController;
use App\Http\Controllers\Kiosk\ScanController as KioskScanController;
use App\Http\Controllers\Intern\ResolutionTicketController as InternResolutionTicketController;
use App\Http\Controllers\Supervisor\ResolutionTicketController as SupervisorResolutionTicketController;
use App\Models\InternProfile;
use App\Models\ResolutionTicket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Admin\ArchiveController;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
 
    Route::post('notifications/clear', function (Request $request) {
        $user = $request->user();

        if ($user) {
            $user->update(['notifications_cleared_at' => now()]);
        }

        $request->session()->put('notifications_cleared_at', now());
 
        return back();
    })->name('notifications.clear');

    Route::get('notifications', function (Request $request) {
        $user = $request->user();
        $notifications = [
            'count' => 0,
            'items' => [],
        ];

        $notificationsClearedAt = $user?->notifications_cleared_at ?? $request->session()->get('notifications_cleared_at');

        if ($user && $user->isSupervisor() && $user->supervisorProfile?->isHteSupervisor()) {
            $internUserIds = InternProfile::query()
                ->where('hte_id', $user->supervisorProfile->hte_id)
                ->pluck('user_id');

            $pendingTickets = ResolutionTicket::query()
                ->where('status', ResolutionTicket::STATUS_PENDING)
                ->whereIn('intern_user_id', $internUserIds)
                ->when($notificationsClearedAt, fn ($query) => $query->where('updated_at', '>', $notificationsClearedAt));

            $notifications = [
                'count' => $pendingTickets->count(),
                'items' => $pendingTickets
                    ->with('intern')
                    ->orderBy('date')
                    ->get()
                    ->map(fn (ResolutionTicket $ticket) => [
                        'id' => $ticket->id,
                        'type' => 'resolution_ticket',
                        'title' => "Resolution request from {$ticket->intern->name}",
                        'message' => $ticket->date->toDateString(),
                        'href' => '/supervisor/resolution-tickets',
                    ])
                    ->toArray(),
            ];
        } elseif ($user && $user->isIntern()) {
            $resolvedTickets = ResolutionTicket::query()
                ->where('intern_user_id', $user->id)
                ->whereIn('status', [
                    ResolutionTicket::STATUS_APPROVED,
                    ResolutionTicket::STATUS_REJECTED,
                ])
                ->whereNotNull('resolved_at')
                ->where('resolved_at', '>=', now()->subDays(14))
                ->when($notificationsClearedAt, fn ($query) => $query->where('resolved_at', '>', $notificationsClearedAt))
                ->with('resolvedBy')
                ->orderByDesc('resolved_at')
                ->get();

            $notifications = [
                'count' => $resolvedTickets->count(),
                'items' => $resolvedTickets
                    ->map(fn (ResolutionTicket $ticket) => [
                        'id' => $ticket->id,
                        'type' => 'resolution_ticket',
                        'title' => $ticket->status === ResolutionTicket::STATUS_APPROVED
                            ? "Your resolution request on {$ticket->date->toDateString()} was approved"
                            : "Your resolution request on {$ticket->date->toDateString()} was rejected",
                        'message' => $ticket->resolvedBy
                            ? "Reviewed by {$ticket->resolvedBy->name}"
                            : 'Reviewed',
                        'href' => '/intern/dashboard',
                    ])
                    ->toArray(),
            ];
        }

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
        ]);
    })->name('notifications.index');
 
    Route::get('dashboard', function () {
        return redirect()->route(auth()->user()->homeRouteName());
    })->name('dashboard');

    Route::middleware('role:' . User::ROLE_ADMIN)->prefix('admin')->name('admin.')->group(function () {
        Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

        Route::post('interns/{internProfile}/approve', [InternApprovalController::class, 'approve'])
            ->name('interns.approve');
        Route::post('interns/{internProfile}/reject', [InternApprovalController::class, 'reject'])
            ->name('interns.reject');
        Route::get('interns', [InternController::class, 'index'])->name('interns.index');

        Route::get('supervisors', [SupervisorController::class, 'index'])->name('supervisors.index');
        Route::post('supervisors', [SupervisorController::class, 'store'])->name('supervisors.store');
        Route::post('supervisors/ojt', [SupervisorController::class, 'storeOjtSupervisor'])->name('supervisors.store-ojt');

        Route::patch('supervisors/{supervisorProfile}/status', [SupervisorController::class, 'updateStatus'])
            ->name('supervisors.updateStatus');

        Route::get('htes', [HteController::class, 'index'])->name('htes.index');
        Route::post('htes', [HteController::class, 'store'])->name('htes.store');
        Route::patch('htes/{hte}', [HteController::class, 'update'])->name('htes.update');
        Route::patch('htes/{hte}/status', [HteController::class, 'updateStatus'])->name('htes.updateStatus');

        Route::get('kiosk', [KioskController::class, 'show'])->name('kiosk.show');
        Route::post('kiosk/{kiosk}/regenerate', [KioskController::class, 'regenerate'])->name('kiosk.regenerate');
        Route::post('kiosk/{kiosk}/toggle', [KioskController::class, 'toggleActive'])->name('kiosk.toggle');

        Route::post('interns/{internProfile}/undo', [InternApprovalController::class, 'undo'])
            ->name('interns.undo');

        Route::get('schedule', [AdminScheduleController::class, 'index'])->name('schedule.index');
        Route::post('schedule', [AdminScheduleController::class, 'store'])->name('schedule.store');
        Route::delete('schedule/{schedulePeriod}', [AdminScheduleController::class, 'destroy'])->name('schedule.destroy');
        Route::patch('schedule/{schedulePeriod}', [AdminScheduleController::class, 'update'])->name('schedule.update');

        Route::get('archives', [ArchiveController::class, 'index'])->name('archives.index');
        Route::post('archives/{type}/{id}/restore', [ArchiveController::class, 'restore'])->name('archives.restore');
        Route::delete('archives/{type}/{id}', [ArchiveController::class, 'forceDelete'])->name('archives.forceDelete');

        Route::patch('supervisors/{supervisorProfile}', [SupervisorController::class, 'update'])->name('supervisors.update');
        Route::delete('supervisors/{supervisorProfile}', [SupervisorController::class, 'destroy'])->name('supervisors.destroy');
        Route::patch('interns/{internProfile}', [InternController::class, 'update'])->name('interns.update');
        Route::delete('interns/{internProfile}', [InternApprovalController::class, 'destroy'])->name('interns.destroy');
        Route::delete('htes/{hte}', [HteController::class, 'destroy'])->name('htes.destroy');
    });

    Route::middleware('role:' . User::ROLE_SUPERVISOR)->prefix('supervisor')->name('supervisor.')->group(function () {
        Route::get('dashboard', [\App\Http\Controllers\Supervisor\DashboardController::class, 'index'])->name('dashboard');
        Route::get('interns', [InternsController::class, 'index'])->name('interns.index');

        // Only an OJT Supervisor oversees a whole program across every
        // HTE, so only they get a roster of HTEs to look at.
        Route::middleware('ojt-supervisor')->group(function () {
            Route::get('htes', [SupervisorHtesController::class, 'index'])->name('htes.index');
        });

        // OJT Supervisors can view/monitor the same as an HTE Supervisor,
        // but only an HTE Supervisor resolves time conflicts or records
        // manual attendance — both are on-site, single-HTE actions.
        Route::middleware('hte-supervisor')->group(function () {
            Route::get('resolution-tickets', [SupervisorResolutionTicketController::class, 'index'])
                ->name('resolution-tickets.index');
            Route::patch('resolution-tickets/{resolutionTicket}/approve', [SupervisorResolutionTicketController::class, 'approve'])
                ->name('resolution-tickets.approve');
            Route::patch('resolution-tickets/{resolutionTicket}/reject', [SupervisorResolutionTicketController::class, 'reject'])
                ->name('resolution-tickets.reject');

            Route::get('manual-attendance', [ManualAttendanceController::class, 'create'])->name('manual-attendance.create');
            Route::post('manual-attendance/check', [ManualAttendanceController::class, 'checkConflicts'])->name('manual-attendance.check');
            Route::post('manual-attendance/lookup', [ManualAttendanceController::class, 'lookup'])->name('manual-attendance.lookup');
            Route::post('manual-attendance', [ManualAttendanceController::class, 'store'])->name('manual-attendance.store');

            Route::get('schedule', [SupervisorScheduleController::class, 'index'])->name('schedule.index');
            Route::post('schedule', [SupervisorScheduleController::class, 'store'])->name('schedule.store');
            Route::delete('schedule/{schedulePeriod}', [SupervisorScheduleController::class, 'destroy'])->name('schedule.destroy');
            Route::patch('schedule/{schedulePeriod}', [SupervisorScheduleController::class, 'update'])->name('schedule.update');
        });

    });

    Route::middleware('role:' . User::ROLE_INTERN)->prefix('intern')->name('intern.')->group(function () {
        Route::get('dashboard', [InternDashboardController::class, 'index'])->name('dashboard');
        Route::get('dtr-report', [DtrReportController::class, 'download'])->name('dtr-report.download');
        Route::get('qr-code', [QrCodeImageController::class, 'show'])->name('qr-code.show');

        Route::post('profile-photo', [ProfilePhotoController::class, 'store'])->name('profile-photo.store');
        Route::delete('profile-photo', [ProfilePhotoController::class, 'destroy'])->name('profile-photo.destroy');

        Route::post('resolution-tickets', [InternResolutionTicketController::class, 'store'])
            ->name('resolution-tickets.store');
        Route::patch('resolution-tickets/{resolutionTicket}/cancel', [InternResolutionTicketController::class, 'cancel'])
            ->name('resolution-tickets.cancel');
    });

});

Route::get('kiosk/{token}', [KioskScanController::class, 'show'])->name('kiosk.scan.show');
Route::post('kiosk/{token}/scan', [KioskScanController::class, 'store'])->name('kiosk.scan.store');

require __DIR__ . '/settings.php';