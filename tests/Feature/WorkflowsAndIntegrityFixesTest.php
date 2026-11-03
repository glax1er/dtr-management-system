<?php

use App\Models\AttendanceLog;
use App\Models\DocumentTemplate;
use App\Models\Hte;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\Kiosk;
use App\Models\SupervisorProfile;
use App\Models\User;
use App\Notifications\HoursMilestoneNotification;
use App\Services\Attendance\CheckHoursMilestones;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

// 1. Account & Administrative Workflows
// Test Case 1.1: Admin Blocked from Rejecting Unverified Spam/Fake Registrations (Deadlock)
test('an admin can reject an applicant even if their email address is not yet verified', function () {
    $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $user = User::factory()->create(['role' => User::ROLE_INTERN, 'email_verified_at' => null]);
    $hte = makeHte();
    $program = makeProgram();
    $profile = InternProfile::create([
        'user_id' => $user->id,
        'id_number' => '2026-99999',
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'pending',
        'privacy_accepted_at' => now(),
    ]);

    $response = $this->actingAs($admin)->post(route('admin.interns.reject', $profile));

    $response->assertSessionHasNoErrors();
    expect($profile->fresh()->status)->toBe('rejected');
});

// Test Case 1.2: Deactivating a Supervisor Fails to Revoke Their User Login
test('deactivating a supervisor profile also deactivates their user login account', function () {
    $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $user = User::factory()->create(['role' => User::ROLE_SUPERVISOR, 'is_active' => true]);
    $profile = SupervisorProfile::create([
        'user_id' => $user->id,
        'supervisor_type' => 'ojt',
        'status' => 'active',
    ]);

    $this->actingAs($admin)->patch(route('admin.supervisors.updateStatus', $profile), [
        'status' => 'inactive',
    ]);

    expect($profile->fresh()->status)->toBe('inactive')
        ->and($user->fresh()->is_active)->toBeFalse();
});

// 2. Manual Attendance & Kiosk Scan Integrity
// Test Case 2.1: Duplicate Dates in Manual Attendance Silently Clobbers Prior Entries
test('manual attendance rejects duplicate dates in a single submission', function () {
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    $hte = makeHte();
    SupervisorProfile::create(['user_id' => $supervisor->id, 'hte_id' => $hte->hte_id, 'supervisor_type' => 'hte', 'status' => 'active']);
    $intern = makeIntern($hte);

    $response = $this->actingAs($supervisor)->post(route('supervisor.manual-attendance.store'), [
        'intern_user_id' => $intern->id,
        'entries' => [
            ['date' => '2026-07-20', 'time_in' => '08:00', 'time_out' => '12:00'],
            ['date' => '2026-07-20', 'time_in' => '13:00', 'time_out' => '17:00'],
        ],
    ]);

    $response->assertSessionHasErrors(['entries.0.date', 'entries.1.date']);
});

// Test Case 2.2: Supplying Only time_out in Manual Attendance Wipes Legitimate Kiosk Scans
test('manual attendance with only time_out does not delete existing morning kiosk scan', function () {
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    $hte = makeHte();
    SupervisorProfile::create(['user_id' => $supervisor->id, 'hte_id' => $hte->hte_id, 'supervisor_type' => 'hte', 'status' => 'active']);
    $intern = makeIntern($hte);
    $kiosk = makeKiosk();

    // Legitimate morning kiosk scan
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'kiosk_id' => $kiosk->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 08:00:00', 'Asia/Manila'),
    ]);

    // Supervisor supplies missing checkout only
    $this->actingAs($supervisor)->post(route('supervisor.manual-attendance.store'), [
        'intern_user_id' => $intern->id,
        'entries' => [
            ['date' => '2026-07-20', 'time_in' => null, 'time_out' => '17:00'],
        ],
    ]);

    $day = (new DailyAttendanceCalculator)->forIntern($intern->id, $hte->hte_id)->first();

    expect($day->timeIn)->not->toBeNull()
        ->and($day->timeIn->format('H:i'))->toBe('08:00');
});

// 3. Resolution Tickets & Midday Accidental Scans
// Test Case 3.1: Accidental Midday Scan Permanently Locks Intern Out of Requesting Resolution
test('an intern can submit a resolution ticket when an accidental midday scan truncated their shift', function () {
    $hte = makeHte();
    $intern = makeIntern($hte);
    $kiosk = makeKiosk();

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'kiosk_id' => $kiosk->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 08:00:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'kiosk_id' => $kiosk->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 11:30:00', 'Asia/Manila'),
    ]);

    $response = $this->actingAs($intern)->post(route('intern.resolution-tickets.store'), [
        'date' => '2026-07-20',
        'proposed_time_out' => '17:00',
        'reason' => 'Midday scan was accidental; stayed until 5:00 PM',
    ]);

    $response->assertSessionHasNoErrors();
});

// Test Case 3.2: In-Progress Resolution Ticket Submitted for Current Day with Future Checkout
test('an intern cannot request a future time out for the current in-progress date', function () {
    $hte = makeHte();
    $intern = makeIntern($hte);

    // Current day at 09:00 AM
    Carbon::setTestNow(Carbon::parse('2026-07-20 09:00:00', 'Asia/Manila'));

    $response = $this->actingAs($intern)->post(route('intern.resolution-tickets.store'), [
        'date' => '2026-07-20',
        'proposed_time_in' => '08:00',
        'proposed_time_out' => '17:00',
        'reason' => 'Forgot badge this morning',
    ]);

    $response->assertSessionHasErrors(['proposed_time_out']);
});

// 4. Document Review & Template Management
// Test Case 4.1: Intern Unilaterally Replacing or Deleting an Already Approved Document
test('an intern cannot delete or replace an already approved document', function () {
    $hte = makeHte();
    $intern = makeIntern($hte);

    $doc = InternDocument::create([
        'user_id' => $intern->id,
        'document_type' => 'parents_consent',
        'original_filename' => 'signed_consent.pdf',
        'file_path' => 'intern-documents/test.pdf',
        'status' => InternDocument::STATUS_APPROVED,
        'reviewed_by' => 1,
        'reviewed_at' => now(),
    ]);

    $deleteResponse = $this->actingAs($intern)->delete(route('intern.documents.destroy', $doc));
    $deleteResponse->assertForbidden();

    $uploadResponse = $this->actingAs($intern)->post(route('intern.documents.store'), [
        'document_type' => 'parents_consent',
        'file' => UploadedFile::fake()->create('tampered.pdf', 100, 'application/pdf'),
    ]);
    $uploadResponse->assertForbidden();
});

// Test Case 4.2: Super Admin 500 Null Pointer Exception in DocumentTemplateController::destroy
test('super admin deleting a document template does not throw a 500 error on null supervisor', function () {
    $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $template = DocumentTemplate::create([
        'program_id' => makeProgram()->program_id,
        'document_type' => 'custom_doc',
        'name' => 'Custom Requirement',
        'category' => 'Pre Deployment',
        'required' => true,
        'is_custom' => true,
        'uploaded_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)->delete(route('supervisor.document-templates.destroy', $template->document_type));

    $response->assertStatus(302);
    $response->assertSessionHasNoErrors();
});

// 5. Archival & PDF Export Inconsistencies
// Test Case 5.1: Archiving an Inactive HTE Crashes Assigned Interns' DTR PDF Generation
test('generating DTR report does not crash when the assigned HTE has been archived', function () {
    $hte = makeHte();
    $intern = makeIntern($hte);

    // HTE gets archived
    $hte->delete();

    $response = $this->actingAs($intern)->get(route('intern.dtr-report.download', [
        'start' => Carbon::now()->startOfWeek()->toDateString(),
        'end' => Carbon::now()->endOfWeek()->toDateString(),
    ]));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/pdf');
});

// Test Case 5.2: Batch Hour Credit Bypasses Earlier Milestone Notifications
test('batch hour credit jumping from 40% to 85% notifies both 50% and 80% milestones', function () {
    Notification::fake();
    $hte = makeHte();
    $intern = makeIntern($hte);
    $intern->internProfile->program->update(['required_hours' => 100]);

    // Jump straight from 0 to 85 hours via manual logs
    // 10 days of 8 hours (8:00 to 17:00 with 1 hour lunch = 8h each day, 10 days = 80h)
    // + 1 day of 5 hours (8:00 to 14:00 with 1 hour lunch = 5h)
    // Total = 85h
    for ($i = 0; $i < 10; $i++) {
        $date = Carbon::parse('2026-07-01')->addDays($i)->toDateString();
        AttendanceLog::create([
            'intern_user_id' => $intern->id,
            'scan_timestamp' => Carbon::parse($date.' 08:00:00', 'Asia/Manila'),
        ]);
        AttendanceLog::create([
            'intern_user_id' => $intern->id,
            'scan_timestamp' => Carbon::parse($date.' 17:00:00', 'Asia/Manila'),
        ]);
    }

    $extraDate = Carbon::parse('2026-07-01')->addDays(10)->toDateString();
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'scan_timestamp' => Carbon::parse($extraDate.' 08:00:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'scan_timestamp' => Carbon::parse($extraDate.' 14:00:00', 'Asia/Manila'),
    ]);

    app(CheckHoursMilestones::class)->check($intern->internProfile);

    Notification::assertSentTo($intern, HoursMilestoneNotification::class, function ($n) {
        return $n->milestone === HoursMilestoneNotification::MILESTONE_50;
    });

    Notification::assertSentTo($intern, HoursMilestoneNotification::class, function ($n) {
        return $n->milestone === HoursMilestoneNotification::MILESTONE_80;
    });
});
