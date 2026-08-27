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
