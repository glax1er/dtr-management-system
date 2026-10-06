<?php

use App\Models\AttendanceLog;
use App\Models\AuditLog;
use App\Models\CollegeAdminProfile;
use App\Models\Hte;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\ResolutionTicket;
use App\Models\SchedulePeriod;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    RateLimiter::clearResolvedInstances();
});

function createSecurityIntern(array $profileAttributes = []): array
{
    $hte = Hte::create(['hte_name' => 'Sec HTE '.uniqid(), 'status' => 'active']);
    $program = Program::create(['program_name' => 'BS IT Sec '.uniqid()]);
    $user = User::factory()->create(['role' => User::ROLE_INTERN]);

    $profile = InternProfile::create(array_merge([
        'user_id' => $user->id,
        'id_number' => 'SEC-'.uniqid(),
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ], $profileAttributes));

    return [$user, $profile, $hte, $program];
}

test('intern is forbidden from accessing supervisor document review endpoints', function () {
    [$user] = createSecurityIntern();

    // Intern cannot access intern review checklist route
    $this->actingAs($user)->get(route('documents.review.intern', $user->id))
        ->assertForbidden();

    // Create a dummy document
    $doc = InternDocument::create([
        'user_id' => $user->id,
        'document_type' => 'parents_consent',
        'original_filename' => 'consent.pdf',
        'file_path' => 'intern-documents/test.pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);

    // Intern cannot access supervisor review preview or download routes
    $this->actingAs($user)->get(route('documents.review.preview', $doc->id))
        ->assertForbidden();

    $this->actingAs($user)->get(route('documents.review.download', $doc->id))
        ->assertForbidden();

    // Intern cannot approve or reject documents
    $this->actingAs($user)->post(route('documents.review.approve', $doc->id))
        ->assertForbidden();

    $this->actingAs($user)->post(route('documents.review.reject', $doc->id), [
        'rejection_reason' => 'Should be rejected',
    ])->assertForbidden();
});

test('admin cannot approve or reject intern documents', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    [$intern] = createSecurityIntern();

    $doc = InternDocument::create([
        'user_id' => $intern->id,
        'document_type' => 'parents_consent',
        'original_filename' => 'consent.pdf',
        'file_path' => 'intern-documents/test.pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);

    $this->actingAs($admin)->post(route('documents.review.approve', $doc->id))
        ->assertForbidden();

    $this->actingAs($admin)->post(route('documents.review.reject', $doc->id), [
        'rejection_reason' => 'Cannot approve as admin',
    ])->assertForbidden();
});

test('document preview returns sandboxing csp headers and nosniff', function () {
    Storage::fake('local');

    [$intern] = createSecurityIntern();

    $fakePdfContent = '%PDF-1.4 test content';
    Storage::disk('local')->put("intern-documents/{$intern->id}/doc.pdf", $fakePdfContent);

    $doc = InternDocument::create([
        'user_id' => $intern->id,
        'document_type' => 'parents_consent',
        'original_filename' => 'doc.pdf',
        'file_path' => "intern-documents/{$intern->id}/doc.pdf",
        'status' => InternDocument::STATUS_PENDING,
    ]);

    $response = $this->actingAs($intern)->get(route('intern.documents.preview', $doc->id));

    $response->assertOk();
    $response->assertHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    $response->assertHeader('X-Content-Type-Options', 'nosniff');
});

test('document preview and download reject path traversal attempts', function () {
    Storage::fake('local');

    [$intern] = createSecurityIntern();

    $doc = InternDocument::create([
        'user_id' => $intern->id,
        'document_type' => 'parents_consent',
        'original_filename' => 'traversal.pdf',
        'file_path' => '../sensitive_file.txt',
        'status' => InternDocument::STATUS_PENDING,
    ]);

    $this->actingAs($intern)->get(route('intern.documents.preview', $doc->id))
        ->assertStatus(400);

    $this->actingAs($intern)->get(route('intern.documents.download', $doc->id))
        ->assertStatus(400);
});

test('intern profile qr_code_value is hidden from serialization', function () {
    [$intern, $profile] = createSecurityIntern(['qr_code_value' => 'SECRET-QR-CODE-12345']);

    $serialized = $profile->toArray();
    expect(array_key_exists('qr_code_value', $serialized))->toBeFalse();
    // Direct property access remains available for authorization/QR processing
    expect($profile->qr_code_value)->toBe('SECRET-QR-CODE-12345');
});

test('user model hides two_factor_confirmed_at and notification settings from serialization', function () {
    $user = User::factory()->create([
        'notification_preferences' => ['document_updates' => true],
        'notifications_cleared_at' => now(),
        'two_factor_confirmed_at' => now(),
    ]);

    $serialized = $user->toArray();
    expect(array_key_exists('two_factor_confirmed_at', $serialized))->toBeFalse();
    expect(array_key_exists('notification_preferences', $serialized))->toBeFalse();
    expect(array_key_exists('notifications_cleared_at', $serialized))->toBeFalse();
});

test('profile photo upload rejects non-image mime types disguised with image extensions', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    // Create a fake text/script file disguised as .jpg
    $fakeScript = UploadedFile::fake()->create('malicious.jpg', 100, 'text/x-php');

    $response = $this->actingAs($user)->post(route('settings.profile-photo.store'), [
        'photo' => $fakeScript,
    ]);

    $response->assertSessionHasErrors('photo');
});

test('profile photo uploads are rate limited to 10 requests per minute', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $validPhoto = UploadedFile::fake()->image('avatar.jpg');

    for ($i = 0; $i < 10; $i++) {
        $response = $this->actingAs($user)->post(route('settings.profile-photo.store'), [
            'photo' => $validPhoto,
        ]);
        $response->assertSessionHasNoErrors();
    }

    // 11th request exceeds throttle
    $this->actingAs($user)->post(route('settings.profile-photo.store'), [
        'photo' => $validPhoto,
    ])->assertStatus(429);
});

test('registration is rate limited to 5 attempts per minute', function () {
    $hte = Hte::create(['hte_name' => 'Sec Rate HTE', 'status' => 'active']);
    $program = Program::create(['program_name' => 'BS IT Rate']);

    for ($i = 0; $i < 5; $i++) {
        $this->post(route('register.store'), [
            'name' => "User {$i}",
            'email' => "user{$i}@usep.edu.ph",
            'id_number' => "2026-0000{$i}",
            'sex' => 'male',
            'hte_id' => $hte->hte_id,
            'program_id' => $program->program_id,
            'privacy_accepted' => true,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);
    }

    // 6th attempt should be rate limited with 429
    $this->post(route('register.store'), [
        'name' => 'Blocked User',
        'email' => 'blocked@usep.edu.ph',
        'id_number' => '2026-99999',
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertStatus(429);
});

test('session is automatically invalidated across devices when user password changes', function () {
    $user = User::factory()->create([
        'password' => Hash::make('OldPassword123!'),
    ]);

    // Initial request stores password_hash in session and succeeds
    $this->actingAs($user)->get(route('dashboard'))
        ->assertRedirect();

    // Password is changed (e.g. from another device or password reset)
    $user->update([
        'password' => Hash::make('NewPassword123!'),
    ]);

    // Subsequent request with the stale session is immediately terminated by AuthenticateSession
    $this->get(route('dashboard'))
        ->assertRedirect(route('login'));

    expect(auth()->check())->toBeFalse();
});

test('admin without 2fa is redirected to security settings when accessing admin panel', function () {
    config(['auth.test_enforce_admin_2fa' => true]);

    $admin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'two_factor_secret' => null,
        'two_factor_confirmed_at' => null,
    ]);

    $response = $this->actingAs($admin)->get(route('admin.dashboard'));

    $response->assertRedirect(route('security.edit'));
    $response->assertSessionHas('error');
});

test('admin with 2fa enabled can access admin dashboard', function () {
    config(['auth.test_enforce_admin_2fa' => true]);

    $admin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'two_factor_secret' => 'encrypted-secret',
        'two_factor_confirmed_at' => now(),
    ]);

    $response = $this->actingAs($admin)->get(route('admin.dashboard'));

    $response->assertOk();
});

test('sensitive administrative actions require password confirmation when not confirmed', function () {
    config(['auth.test_enforce_password_confirm' => true]);

    $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $targetAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

    // Attempting to destroy an admin without password confirmation in session redirects to password.confirm
    $response = $this->actingAs($admin)->delete(route('admin.admins.destroy', $targetAdmin));

    $response->assertRedirect(route('password.confirm'));
});

test('sensitive administrative actions succeed when password has been confirmed in session', function () {
    config(['auth.test_enforce_password_confirm' => true]);

    $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $targetAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

    // With confirmed password in session, the action proceeds
    $response = $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->delete(route('admin.admins.destroy', $targetAdmin));

    $response->assertRedirect();
    $this->assertDatabaseMissing('users', ['id' => $targetAdmin->id]);
});

test('intern dtr pdf report route is rate limited against dos attacks', function () {
    [$intern] = createSecurityIntern();

    for ($i = 0; $i < 10; $i++) {
        $response = $this->actingAs($intern)->get(route('intern.dtr-report.download'));
        $response->assertOk();
    }

    $this->actingAs($intern)->get(route('intern.dtr-report.download'))
        ->assertStatus(429);
});

test('supervisor completion summary report route is rate limited against dos attacks', function () {
    [$intern, $profile, $hte, $program] = createSecurityIntern();
    $supUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supUser->id,
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    for ($i = 0; $i < 30; $i++) {
        $response = $this->actingAs($supUser)->get(route('supervisor.interns.completion-summary', $intern->id));
        $response->assertOk();
    }

    $this->actingAs($supUser)->get(route('supervisor.interns.completion-summary', $intern->id))
        ->assertStatus(429);
});

test('document downloads are rate limited against dos attacks', function () {
    Storage::fake('local');
    [$intern] = createSecurityIntern();

    $fakePdfContent = '%PDF-1.4 test document content';
    Storage::disk('local')->put("intern-documents/{$intern->id}/doc.pdf", $fakePdfContent);

    $doc = InternDocument::create([
        'user_id' => $intern->id,
        'document_type' => 'parents_consent',
        'original_filename' => 'doc.pdf',
        'file_path' => "intern-documents/{$intern->id}/doc.pdf",
        'status' => InternDocument::STATUS_PENDING,
    ]);

    for ($i = 0; $i < 20; $i++) {
        $response = $this->actingAs($intern)->get(route('intern.documents.download', $doc->id));
        $response->assertOk();
    }

    $this->actingAs($intern)->get(route('intern.documents.download', $doc->id))
        ->assertStatus(429);
});

/*
|--------------------------------------------------------------------------
| Step C: Data Security & Traceability Tests
|--------------------------------------------------------------------------
*/

test('audit logs are immutable and reject updates or deletions at runtime', function () {
    $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

    $log = AuditLog::record(
        action: 'test_action',
        description: 'Initial log entry',
        user: $admin,
        oldValues: ['status' => 'pending'],
        newValues: ['status' => 'approved'],
    );

    expect($log->id)->not->toBeNull()
        ->and($log->action)->toBe('test_action')
        ->and($log->created_at)->not->toBeNull();

    // 1. Attempting to update throws RuntimeException
    expect(fn () => $log->update(['action' => 'tampered_action']))
        ->toThrow(RuntimeException::class, 'Audit logs are immutable and cannot be updated.');

    // 2. Attempting to save after mutating attributes throws RuntimeException
    $log->description = 'Tampered description';
    expect(fn () => $log->save())
        ->toThrow(RuntimeException::class, 'Audit logs are immutable and cannot be updated.');

    // 3. Attempting to delete throws RuntimeException
    expect(fn () => $log->delete())
        ->toThrow(RuntimeException::class, 'Audit logs are immutable and cannot be deleted.');

    // 4. Verify log in database is completely intact and untouched
    $fresh = AuditLog::findOrFail($log->id);
    expect($fresh->action)->toBe('test_action')
        ->and($fresh->description)->toBe('Initial log entry');
});

test('supervisor manual attendance override creates an immutable audit log', function () {
    [$intern, $profile, $hte, $program] = createSecurityIntern();
    $supUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supUser->id,
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    // Initial log that will be overridden
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supUser->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 08:30:00', 'Asia/Manila'),
    ]);

    $response = $this->actingAs($supUser)->post(route('supervisor.manual-attendance.store'), [
        'intern_user_id' => $intern->id,
        'entries' => [
            [
                'date' => '2026-07-20',
                'time_in' => '08:00',
                'time_out' => '17:00',
            ],
        ],
    ]);

    $response->assertRedirect();

    $auditLog = AuditLog::where('action', 'manual_attendance_override')
        ->where('auditable_id', $intern->id)
        ->latest('id')
        ->first();

    expect($auditLog)->not->toBeNull()
        ->and($auditLog->user_id)->toBe($supUser->id)
        ->and($auditLog->new_values['entries'][0]['time_in'])->toBe('08:00')
        ->and($auditLog->new_values['entries'][0]['time_out'])->toBe('17:00');
});

test('supervisor resolution ticket approval and rejection record audit logs', function () {
    [$intern, $profile, $hte, $program] = createSecurityIntern();
    $supUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supUser->id,
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    $ticketApprove = ResolutionTicket::create([
        'intern_user_id' => $intern->id,
        'date' => '2026-07-21',
        'proposed_time_in' => Carbon::parse('2026-07-21 08:00:00', 'Asia/Manila'),
        'proposed_time_out' => Carbon::parse('2026-07-21 17:00:00', 'Asia/Manila'),
        'reason' => 'Forgot to scan out',
        'status' => ResolutionTicket::STATUS_PENDING,
    ]);

    $this->actingAs($supUser)->patch(route('supervisor.resolution-tickets.approve', $ticketApprove));

    $approveLog = AuditLog::where('action', 'resolution_ticket_approved')
        ->where('auditable_id', $ticketApprove->id)
        ->first();

    expect($approveLog)->not->toBeNull()
        ->and($approveLog->user_id)->toBe($supUser->id)
        ->and($approveLog->new_values['status'])->toBe(ResolutionTicket::STATUS_APPROVED);

    $ticketReject = ResolutionTicket::create([
        'intern_user_id' => $intern->id,
        'date' => '2026-07-22',
        'proposed_time_in' => Carbon::parse('2026-07-22 08:00:00', 'Asia/Manila'),
        'proposed_time_out' => Carbon::parse('2026-07-22 17:00:00', 'Asia/Manila'),
        'reason' => 'System offline',
        'status' => ResolutionTicket::STATUS_PENDING,
    ]);

    $this->actingAs($supUser)->patch(route('supervisor.resolution-tickets.reject', $ticketReject), [
        'rejection_reason' => 'Unverified claim',
    ]);

    $rejectLog = AuditLog::where('action', 'resolution_ticket_rejected')
        ->where('auditable_id', $ticketReject->id)
        ->first();

    expect($rejectLog)->not->toBeNull()
        ->and($rejectLog->user_id)->toBe($supUser->id)
        ->and($rejectLog->new_values['rejection_reason'])->toBe('Unverified claim');
});

test('supervisor and admin schedule overrides record immutable audit logs', function () {
    $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

    // Admin creates schedule period
    $this->actingAs($admin)->post(route('admin.schedule.store'), [
        'name' => 'University Baseline Fall 2026',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'day_schedule' => [
            'monday' => '08:00',
            'tuesday' => '08:00',
            'wednesday' => '08:00',
            'thursday' => '08:00',
            'friday' => '08:00',
            'saturday' => null,
            'sunday' => null,
        ],
    ]);

    $adminLog = AuditLog::where('action', 'schedule_override_created')
        ->where('description', 'like', '%University Baseline Fall 2026%')
        ->first();

    expect($adminLog)->not->toBeNull()
        ->and($adminLog->user_id)->toBe($admin->id);

    // Supervisor creates HTE schedule override
    $hte = Hte::create(['hte_name' => 'Tech Corp', 'status' => 'active']);
    $program = Program::create(['program_name' => 'BSCS']);
    $supUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supUser->id,
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    $this->actingAs($supUser)->post(route('supervisor.schedule.store'), [
        'name' => 'Tech Corp Shift Override',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'day_schedule' => [
            'monday' => '09:00',
            'tuesday' => '09:00',
            'wednesday' => '09:00',
            'thursday' => '09:00',
            'friday' => '09:00',
            'saturday' => null,
            'sunday' => null,
        ],
    ]);

    $supLog = AuditLog::where('action', 'schedule_override_created')
        ->where('description', 'like', '%Tech Corp Shift Override%')
        ->first();

    expect($supLog)->not->toBeNull()
        ->and($supLog->user_id)->toBe($supUser->id);
});

test('admin intern approval overrides record audit logs', function () {
    $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    [$intern, $profile] = createSecurityIntern(['status' => 'pending']);
    $intern->update(['email_verified_at' => now()]);

    // Admin approves
    $this->actingAs($admin)->post(route('admin.interns.approve', $profile));
    $approveLog = AuditLog::where('action', 'intern_status_approved')
        ->where('auditable_id', $profile->user_id)
        ->first();
    expect($approveLog)->not->toBeNull();

    // Admin reverts to pending
    $this->actingAs($admin)->post(route('admin.interns.undo', $profile));
    $undoLog = AuditLog::where('action', 'intern_status_reverted')
        ->where('auditable_id', $profile->user_id)
        ->first();
    expect($undoLog)->not->toBeNull();

    // Admin rejects
    $this->actingAs($admin)->post(route('admin.interns.reject', $profile));
    $rejectLog = AuditLog::where('action', 'intern_status_rejected')
        ->where('auditable_id', $profile->user_id)
        ->first();
    expect($rejectLog)->not->toBeNull();
});

test('student contact information is encrypted at rest in the database', function () {
    $plainContactNumber = '0917-888-9999';

    [$user, $profile] = createSecurityIntern([
        'contact_number' => $plainContactNumber,
    ]);

    // Direct raw database query
    $rawDbValue = DB::table('intern_profiles')
        ->where('user_id', $profile->user_id)
        ->value('contact_number');

    // The raw stored value in the database MUST NOT equal the plain-text phone number
    expect($rawDbValue)->not->toBe($plainContactNumber)
        ->and(strlen($rawDbValue))->toBeGreaterThan(40);

    // Crypt::decryptString on the raw column must cleanly recover the plain contact number
    expect(Crypt::decryptString($rawDbValue))->toBe($plainContactNumber);

    // Eloquent attribute access automatically decrypts transparently
    expect($profile->fresh()->contact_number)->toBe($plainContactNumber);
});

test('staff and company contact information is encrypted at rest in the database', function () {
    $plainHtePhone = '0928-111-2222';
    $plainContactPerson = 'Prof. Supervisor Smith';
    $plainSupPhone = '0939-333-4444';
    $plainAdminPhone = '0949-555-6666';

    // 1. HTE contact number & person
    $hte = Hte::create([
        'hte_name' => 'Secure Org',
        'contact_number' => $plainHtePhone,
        'contact_person' => $plainContactPerson,
        'status' => 'active',
    ]);

    $rawHtePhone = DB::table('htes')->where('hte_id', $hte->hte_id)->value('contact_number');
    $rawContactPerson = DB::table('htes')->where('hte_id', $hte->hte_id)->value('contact_person');

    expect($rawHtePhone)->not->toBe($plainHtePhone)
        ->and(Crypt::decryptString($rawHtePhone))->toBe($plainHtePhone)
        ->and($hte->fresh()->contact_number)->toBe($plainHtePhone);

    expect($rawContactPerson)->not->toBe($plainContactPerson)
        ->and(Crypt::decryptString($rawContactPerson))->toBe($plainContactPerson)
        ->and($hte->fresh()->contact_person)->toBe($plainContactPerson);

    // 2. SupervisorProfile contact number
    $supUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    $supProfile = SupervisorProfile::create([
        'user_id' => $supUser->id,
        'hte_id' => $hte->hte_id,
        'supervisor_type' => 'hte',
        'status' => 'active',
        'contact_number' => $plainSupPhone,
    ]);

    $rawSupPhone = DB::table('supervisor_profiles')->where('user_id', $supUser->id)->value('contact_number');
    expect($rawSupPhone)->not->toBe($plainSupPhone)
        ->and(Crypt::decryptString($rawSupPhone))->toBe($plainSupPhone)
        ->and($supProfile->fresh()->contact_number)->toBe($plainSupPhone);

    // 3. CollegeAdminProfile contact number
    $adminUser = User::factory()->create(['role' => User::ROLE_COLLEGE_ADMIN]);
    $adminProfile = CollegeAdminProfile::create([
        'user_id' => $adminUser->id,
        'contact_number' => $plainAdminPhone,
    ]);

    $rawAdminPhone = DB::table('college_admin_profiles')->where('user_id', $adminUser->id)->value('contact_number');
    expect($rawAdminPhone)->not->toBe($plainAdminPhone)
        ->and(Crypt::decryptString($rawAdminPhone))->toBe($plainAdminPhone)
        ->and($adminProfile->fresh()->contact_number)->toBe($plainAdminPhone);
});

test('audit logs route is accessible only to administrators', function () {
    $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);

    AuditLog::record(
        action: 'system_event',
        description: 'Audit log event for testing',
        user: $admin,
    );

    // Intern is forbidden
    $this->actingAs($intern)->get(route('admin.audit-logs.index'))
        ->assertForbidden();

    // Admin can access and query JSON data
    $response = $this->actingAs($admin)
        ->getJson(route('admin.audit-logs.index'));

    $response->assertOk()
        ->assertJsonFragment(['action' => 'system_event']);
});
