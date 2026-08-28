<?php

use App\Models\Hte;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use App\Notifications\InternDocumentNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
});

function createTestInternProfile(): array
{
    $hte = Hte::create(['hte_name' => 'Tech Corp', 'status' => 'active']);
    $program = Program::create(['program_name' => 'BS Information Tech']);
    $user = User::factory()->create(['role' => User::ROLE_INTERN]);

    $profile = InternProfile::create([
        'user_id' => $user->id,
        'id_number' => 'IT-2026-' . rand(100, 999),
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    return [$user, $profile, $hte, $program];
}

test('user can view notifications list', function () {
    [$user] = createTestInternProfile();

    $response = $this->actingAs($user)->get(route('notifications.index'));

    $response->assertOk();
});

test('user can mark a single notification as read', function () {
    [$user] = createTestInternProfile();

    $internDoc = InternDocument::create([
        'user_id' => $user->id,
        'document_type' => 'endorsement_letter',
        'original_filename' => 'doc.pdf',
        'file_path' => 'intern-documents/1/doc.pdf',
        'file_size_bytes' => 1024,
        'mime_type' => 'application/pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);

    $user->notify(new InternDocumentNotification(
        internDocument: $internDoc,
        event: InternDocumentNotification::DOCUMENT_APPROVED,
        docName: 'Endorsement Letter'
    ));

    $notification = $user->unreadNotifications()->first();
    expect($notification)->not->toBeNull();

    $response = $this->actingAs($user)->post(route('notifications.markRead', $notification->id));
    $response->assertRedirect();

    expect($user->fresh()->unreadNotifications()->count())->toBe(0);
});

test('user can mark all notifications as read', function () {
    [$user] = createTestInternProfile();

    $internDoc = InternDocument::create([
        'user_id' => $user->id,
        'document_type' => 'endorsement_letter',
        'original_filename' => 'doc.pdf',
        'file_path' => 'intern-documents/1/doc.pdf',
        'file_size_bytes' => 1024,
        'mime_type' => 'application/pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);

    $user->notify(new InternDocumentNotification($internDoc, InternDocumentNotification::DOCUMENT_APPROVED, docName: 'Doc 1'));
    $user->notify(new InternDocumentNotification($internDoc, InternDocumentNotification::DOCUMENT_APPROVED, docName: 'Doc 2'));

    expect($user->unreadNotifications()->count())->toBe(2);

    $response = $this->actingAs($user)->post(route('notifications.markAllRead'));
    $response->assertRedirect();

    expect($user->fresh()->unreadNotifications()->count())->toBe(0);
    expect($user->fresh()->notifications()->count())->toBe(2);
});

test('user can delete an individual notification', function () {
    [$user] = createTestInternProfile();

    $internDoc = InternDocument::create([
        'user_id' => $user->id,
        'document_type' => 'endorsement_letter',
        'original_filename' => 'doc.pdf',
        'file_path' => 'intern-documents/1/doc.pdf',
        'file_size_bytes' => 1024,
        'mime_type' => 'application/pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);

    $user->notify(new InternDocumentNotification($internDoc, InternDocumentNotification::DOCUMENT_APPROVED, docName: 'Doc 1'));
    $user->notify(new InternDocumentNotification($internDoc, InternDocumentNotification::DOCUMENT_APPROVED, docName: 'Doc 2'));

    $notificationToDelete = $user->notifications()->first();

    $response = $this->actingAs($user)->delete(route('notifications.destroy', $notificationToDelete->id));
    $response->assertRedirect();

    expect($user->fresh()->notifications()->count())->toBe(1);
});

test('user can clear all notifications', function () {
    [$user] = createTestInternProfile();

    $internDoc = InternDocument::create([
        'user_id' => $user->id,
        'document_type' => 'endorsement_letter',
        'original_filename' => 'doc.pdf',
        'file_path' => 'intern-documents/1/doc.pdf',
        'file_size_bytes' => 1024,
        'mime_type' => 'application/pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);

    $user->notify(new InternDocumentNotification($internDoc, InternDocumentNotification::DOCUMENT_APPROVED, docName: 'Doc 1'));
    $user->notify(new InternDocumentNotification($internDoc, InternDocumentNotification::DOCUMENT_APPROVED, docName: 'Doc 2'));

    $response = $this->actingAs($user)->delete(route('notifications.clear'));
    $response->assertRedirect();

    expect($user->fresh()->notifications()->count())->toBe(0);
});

test('intern uploading document dispatches notification to assigned supervisor', function () {
    Notification::fake();

    [$internUser, $internProfile, $hte, $program] = createTestInternProfile();

    $supervisorUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisorUser->id,
        'supervisor_type' => 'hte',
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    $file = UploadedFile::fake()->create('parents_consent.pdf', 500, 'application/pdf');

    $response = $this->actingAs($internUser)->post(route('intern.documents.store'), [
        'document_type' => 'parents_consent',
        'file' => $file,
    ]);

    $response->assertRedirect();

    Notification::assertSentTo(
        $supervisorUser,
        InternDocumentNotification::class,
        function (InternDocumentNotification $notification) {
            return $notification->event === InternDocumentNotification::DOCUMENT_SUBMITTED;
        }
    );
});

test('supervisor approving or rejecting document notifies intern', function () {
    Notification::fake();

    [$internUser, $internProfile, $hte, $program] = createTestInternProfile();

    $supervisorUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisorUser->id,
        'supervisor_type' => 'hte',
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    $internDoc = InternDocument::create([
        'user_id' => $internUser->id,
        'document_type' => 'parents_consent',
        'original_filename' => 'parents_consent.pdf',
        'file_path' => 'intern-documents/1/parents_consent.pdf',
        'file_size_bytes' => 1024,
        'mime_type' => 'application/pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);

    // Approve
    $response = $this->actingAs($supervisorUser)->post(route('documents.review.approve', $internDoc->id));
    $response->assertRedirect();

    Notification::assertSentTo(
        $internUser,
        InternDocumentNotification::class,
        function (InternDocumentNotification $notification) {
            return $notification->event === InternDocumentNotification::DOCUMENT_APPROVED;
        }
    );

    // Reject
    $response = $this->actingAs($supervisorUser)->post(route('documents.review.reject', $internDoc->id), [
        'rejection_reason' => 'Please provide clear scan of doctor signature.',
    ]);
    $response->assertRedirect();

    Notification::assertSentTo(
        $internUser,
        InternDocumentNotification::class,
        function (InternDocumentNotification $notification) {
            return $notification->event === InternDocumentNotification::DOCUMENT_REJECTED
                && $notification->reason === 'Please provide clear scan of doctor signature.';
        }
    );
});

test('check hours milestones dispatches notification when intern reaches milestones', function () {
    Notification::fake();

    [$internUser, $internProfile, $hte, $program] = createTestInternProfile();
    $program->update(['required_hours' => 10]);

    $supervisorUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisorUser->id,
        'supervisor_type' => 'hte',
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    // Render 5 hours net (6 hrs minus 1 hr lunch deduction = 5 hrs = 50% of 10 hrs)
    \App\Models\AttendanceLog::create([
        'intern_user_id' => $internUser->id,
        'scan_timestamp' => \Carbon\Carbon::parse('2026-08-01 08:00:00', config('dtr.timezone')),
    ]);
    \App\Models\AttendanceLog::create([
        'intern_user_id' => $internUser->id,
        'scan_timestamp' => \Carbon\Carbon::parse('2026-08-01 14:00:00', config('dtr.timezone')),
    ]);

    app(\App\Services\Attendance\CheckHoursMilestones::class)->check($internProfile);

    Notification::assertSentTo(
        $internUser,
        \App\Notifications\HoursMilestoneNotification::class,
        function (\App\Notifications\HoursMilestoneNotification $notification) {
            return $notification->milestone === \App\Notifications\HoursMilestoneNotification::MILESTONE_50;
        }
    );
});

test('console command dtr:check-missed-timeouts detects and notifies interns with missing timeout', function () {
    Notification::fake();

    [$internUser, $internProfile, $hte, $program] = createTestInternProfile();

    $targetDate = '2026-08-05';

    // Only time-in recorded, no time-out
    \App\Models\AttendanceLog::create([
        'intern_user_id' => $internUser->id,
        'scan_timestamp' => \Carbon\Carbon::parse("{$targetDate} 08:00:00", config('dtr.timezone')),
    ]);

    $this->artisan("dtr:check-missed-timeouts --date={$targetDate}")
        ->assertSuccessful();

    Notification::assertSentTo(
        $internUser,
        \App\Notifications\MissedTimeOutNotification::class,
        function (\App\Notifications\MissedTimeOutNotification $notification) use ($targetDate) {
            return $notification->date === $targetDate;
        }
    );
});

test('user can view notification preferences page', function () {
    [$user] = createTestInternProfile();

    $response = $this->actingAs($user)->get(route('notifications.edit'));

    $response->assertOk();
});

test('user can update notification preferences', function () {
    [$user] = createTestInternProfile();

    $response = $this->actingAs($user)->patch(route('notifications.update'), [
        'document_updates' => false,
        'milestone_alerts' => false,
        'attendance_alerts' => true,
        'ticket_updates' => true,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    expect($user->fresh()->wantsNotification('document_updates'))->toBeFalse();
    expect($user->fresh()->wantsNotification('milestone_alerts'))->toBeFalse();
    expect($user->fresh()->wantsNotification('attendance_alerts'))->toBeTrue();
});

test('opted out user does not receive disabled notifications', function () {
    Notification::fake();

    [$internUser, $internProfile, $hte, $program] = createTestInternProfile();
    $program->update(['required_hours' => 10]);

    // Opt out of milestone alerts
    $internUser->update([
        'notification_preferences' => [
            'document_updates' => true,
            'milestone_alerts' => false,
            'attendance_alerts' => true,
            'ticket_updates' => true,
        ],
    ]);

    // Render 5 hours
    \App\Models\AttendanceLog::create([
        'intern_user_id' => $internUser->id,
        'scan_timestamp' => \Carbon\Carbon::parse('2026-08-01 08:00:00', config('dtr.timezone')),
    ]);
    \App\Models\AttendanceLog::create([
        'intern_user_id' => $internUser->id,
        'scan_timestamp' => \Carbon\Carbon::parse('2026-08-01 14:00:00', config('dtr.timezone')),
    ]);

    app(\App\Services\Attendance\CheckHoursMilestones::class)->check($internProfile);

    Notification::assertNotSentTo(
        $internUser,
        \App\Notifications\HoursMilestoneNotification::class
    );
});

test('supervisor can view and update role-specific notification preferences', function () {
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    $response = $this->actingAs($supervisor)->get(route('notifications.edit'));
    $response->assertOk();

    $response = $this->actingAs($supervisor)->patch(route('notifications.update'), [
        'ticket_requests' => false,
        'document_submissions' => true,
        'intern_completions' => false,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    expect($supervisor->fresh()->wantsNotification('ticket_requests'))->toBeFalse();
    expect($supervisor->fresh()->wantsNotification('document_submissions'))->toBeTrue();
    expect($supervisor->fresh()->wantsNotification('intern_completions'))->toBeFalse();
});

test('admin can view and update role-specific notification preferences', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $response = $this->actingAs($admin)->get(route('notifications.edit'));
    $response->assertOk();

    $response = $this->actingAs($admin)->patch(route('notifications.update'), [
        'intern_registrations' => false,
        'document_submissions' => true,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    expect($admin->fresh()->wantsNotification('intern_registrations'))->toBeFalse();
    expect($admin->fresh()->wantsNotification('document_submissions'))->toBeTrue();
});

test('opted out supervisor does not receive document submission notification', function () {
    Notification::fake();

    [$internUser, $internProfile, $hte] = createTestInternProfile();

    $supervisorUser = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'notification_preferences' => [
            'document_submissions' => false,
            'ticket_requests' => true,
            'intern_completions' => true,
        ],
    ]);
    SupervisorProfile::create([
        'user_id' => $supervisorUser->id,
        'supervisor_type' => 'hte',
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    $file = UploadedFile::fake()->create('parents_consent.pdf', 500, 'application/pdf');

    $response = $this->actingAs($internUser)->post(route('intern.documents.store'), [
        'document_type' => 'parents_consent',
        'file' => $file,
    ]);

    $response->assertRedirect();

    Notification::assertNotSentTo(
        $supervisorUser,
        InternDocumentNotification::class
    );
});
