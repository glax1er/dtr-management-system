<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\HteController;
use App\Http\Controllers\Admin\InternController;
use App\Http\Controllers\Admin\InternApprovalController;
use App\Http\Controllers\Admin\SupervisorController;
use App\Http\Controllers\Admin\KioskController;
use App\Http\Controllers\Admin\ProgramController;
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
use App\Http\Controllers\NotificationController;
use App\Models\InternProfile;
use App\Models\ResolutionTicket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Admin\ArchiveController;
use App\Http\Controllers\Intern\DocumentController as InternDocumentController;
use App\Http\Controllers\Supervisor\DocumentTemplateController as SupervisorDocumentTemplateController;
use App\Http\Controllers\DocumentReviewController;

Route::redirect('/', '/login')->name('home');
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('notifications', [NotificationController::class, 'index'])
    ->name('notifications.index');

    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])
        ->name('notifications.markRead');

    Route::delete('notifications', [NotificationController::class, 'clear'])
        ->name('notifications.clear');
 
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

        Route::get('programs', [ProgramController::class, 'index'])->name('programs.index');
        Route::post('programs', [ProgramController::class, 'store'])->name('programs.store');
        Route::patch('programs/{program}', [ProgramController::class, 'update'])->name('programs.update');
        Route::patch('programs/{program}/status', [ProgramController::class, 'updateStatus'])->name('programs.updateStatus');
        Route::delete('programs/{program}', [ProgramController::class, 'destroy'])->name('programs.destroy');
    });

    Route::middleware('role:' . User::ROLE_SUPERVISOR)->prefix('supervisor')->name('supervisor.')->group(function () {
<<<<<<< HEAD
    // Shared between both supervisor types
    Route::get('interns', [InternsController::class, 'index'])->name('interns.index');
=======
        Route::get('dashboard', [\App\Http\Controllers\Supervisor\DashboardController::class, 'index'])->name('dashboard');
        Route::get('interns', [InternsController::class, 'index'])->name('interns.index');
        Route::get('interns/{internUserId}/completion-summary', [InternsController::class, 'completionSummary'])->name('interns.completion-summary');
        Route::get('interns/{internUserId}/dtr-report', [InternsController::class, 'downloadInternDtr'])->name('interns.dtr-report');

        // Only an OJT Supervisor oversees a whole program across every
        // HTE, so only they get a roster of HTEs and Document Templates to manage.
        Route::middleware('ojt-supervisor')->group(function () {
            Route::get('htes', [SupervisorHtesController::class, 'index'])->name('htes.index');
            Route::get('document-templates', [SupervisorDocumentTemplateController::class, 'index'])->name('document-templates.index');
            Route::post('document-templates', [SupervisorDocumentTemplateController::class, 'store'])->name('document-templates.store');
            Route::post('document-templates/{documentType}/update', [SupervisorDocumentTemplateController::class, 'update'])->name('document-templates.update');
            Route::get('document-templates/{documentTemplate}/download', [SupervisorDocumentTemplateController::class, 'download'])->name('document-templates.download');
            Route::delete('document-templates/{documentTemplate}', [SupervisorDocumentTemplateController::class, 'destroy'])->name('document-templates.destroy');
            Route::post('document-templates/{id}/restore', [SupervisorDocumentTemplateController::class, 'restore'])->name('document-templates.restore');
            Route::delete('document-templates/{id}/force', [SupervisorDocumentTemplateController::class, 'forceDelete'])->name('document-templates.forceDelete');
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
>>>>>>> origin

    // Only OJT Supervisors
    Route::middleware('ojt-supervisor')->group(function () {
        Route::get('htes', [SupervisorHtesController::class, 'index'])->name('htes.index');
    });

    // Only HTE Supervisors
    Route::middleware('hte-supervisor')->group(function () {
        Route::get('dashboard', [SupervisorDashboardController::class, 'index'])->name('dashboard');

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

        Route::get('documents', [InternDocumentController::class, 'index'])->name('documents.index');
        Route::post('documents', [InternDocumentController::class, 'store'])->name('documents.store');
        Route::get('documents/{internDocument}/preview', [InternDocumentController::class, 'preview'])->name('documents.preview');
        Route::get('documents/{internDocument}/download', [InternDocumentController::class, 'download'])->name('documents.download');
        Route::delete('documents/{internDocument}', [InternDocumentController::class, 'destroy'])->name('documents.destroy');
        Route::get('documents/templates/{documentTemplate}/download', [InternDocumentController::class, 'downloadTemplate'])->name('documents.template.download');
    });

    Route::prefix('documents')->name('documents.')->group(function () {
        Route::get('intern/{internUserId}', [DocumentReviewController::class, 'showInternDocuments'])->name('review.intern');
        Route::get('{internDocument}/preview', [DocumentReviewController::class, 'preview'])->name('review.preview');
        Route::get('{internDocument}/download', [DocumentReviewController::class, 'download'])->name('review.download');
        Route::post('{internDocument}/approve', [DocumentReviewController::class, 'approve'])->name('review.approve');
        Route::post('{internDocument}/reject', [DocumentReviewController::class, 'reject'])->name('review.reject');
    });

});

Route::get('kiosk/{token}', [KioskScanController::class, 'show'])->name('kiosk.scan.show');
Route::post('kiosk/{token}/scan', [KioskScanController::class, 'store'])->name('kiosk.scan.store');
require __DIR__ . '/settings.php';