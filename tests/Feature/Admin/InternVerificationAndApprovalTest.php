<?php

use App\Models\College;
use App\Models\EmailVerificationCode;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use App\Notifications\NewInternRegistrationNotification;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->collegeA = College::create([
        'name' => 'College of Arts and Sciences',
        'code' => 'CAS',
        'is_active' => true,
    ]);

    $this->collegeB = College::create([
        'name' => 'College of Engineering',
        'code' => 'COE',
        'is_active' => true,
    ]);

    $this->collegeAdminA = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $this->collegeA->id,
        'is_active' => true,
    ]);

    $this->collegeAdminB = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $this->collegeB->id,
        'is_active' => true,
    ]);

    $this->superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'is_active' => true,
    ]);

    $this->programA = Program::create([
        'college_id' => $this->collegeA->id,
        'program_name' => 'BS in Information Technology',
        'required_hours' => 300,
        'is_active' => true,
    ]);

    $this->hteA = Hte::create([
        'college_id' => $this->collegeA->id,
        'hte_name' => 'Tech Solutions Inc',
        'status' => 'active',
    ]);

    $this->supervisorUser = User::factory()->create([
        'role' => User::ROLE_SUPERVISOR,
        'is_active' => true,
    ]);

    $this->supervisorProfile = SupervisorProfile::create([
        'user_id' => $this->supervisorUser->id,
        'supervisor_type' => 'hte',
        'hte_id' => $this->hteA->hte_id,
        'status' => 'active',
        'created_at' => now(),
    ]);
});

test('unverified intern does not appear in admin pending approval records or dashboard', function () {
    $unverifiedUser = User::factory()->unverified()->create([
        'role' => User::ROLE_INTERN,
        'name' => 'Unverified Student',
        'email' => 'unverified@example.com',
    ]);

    $unverifiedProfile = InternProfile::create([
        'user_id' => $unverifiedUser->id,
        'program_id' => $this->programA->program_id,
        'hte_id' => $this->hteA->hte_id,
        'id_number' => '2026-11111',
        'sex' => 'male',
        'status' => 'pending',
        'privacy_accepted_at' => now(),
    ]);

    // Check college admin interns index
    $response = $this->actingAs($this->collegeAdminA)->get(route('admin.interns.index', ['status' => 'pending']));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('interns.data', fn ($data) => collect($data)->pluck('user_id')->doesntContain($unverifiedUser->id))
    );

    // Check admin dashboard
    $dashResponse = $this->actingAs($this->collegeAdminA)->get(route('admin.dashboard'));
    $dashResponse->assertOk();
    $dashResponse->assertInertia(fn ($page) => $page
        ->component('admin/dashboard')
        ->where('pendingApprovals', 0)
        ->where('recentRegistrations.data', fn ($data) => collect($data)->pluck('user_id')->doesntContain($unverifiedUser->id))
    );
});

test('unverified intern cannot be approved by admin', function () {
    $unverifiedUser = User::factory()->unverified()->create([
        'role' => User::ROLE_INTERN,
        'name' => 'Unverified Student',
    ]);

    $unverifiedProfile = InternProfile::create([
        'user_id' => $unverifiedUser->id,
        'program_id' => $this->programA->program_id,
        'hte_id' => $this->hteA->hte_id,
        'id_number' => '2026-22222',
        'sex' => 'female',
        'status' => 'pending',
        'privacy_accepted_at' => now(),
    ]);

    $response = $this->actingAs($this->collegeAdminA)->post(route('admin.interns.approve', $unverifiedProfile));
    $response->assertRedirect();

    expect($unverifiedProfile->fresh()->status)->toBe('pending');
});

test('verified intern appears on its college admin approval and notifies college admin', function () {
    Notification::fake();

    $internUser = User::factory()->unverified()->create([
        'role' => User::ROLE_INTERN,
        'name' => 'Verified Student',
        'email' => 'verified.student@example.com',
    ]);

    $internProfile = InternProfile::create([
        'user_id' => $internUser->id,
        'program_id' => $this->programA->program_id,
        'hte_id' => $this->hteA->hte_id,
        'id_number' => '2026-33333',
        'sex' => 'male',
        'status' => 'pending',
        'privacy_accepted_at' => now(),
    ]);

    $code = EmailVerificationCode::generateFor($internUser->email);

    // Verify email using code
    $this->post(route('verification.verify-code'), [
        'code' => $code,
        'email' => $internUser->email,
    ]);

    expect($internUser->fresh()->hasVerifiedEmail())->toBeTrue();

    // Admins for college A should be notified
    Notification::assertSentTo($this->collegeAdminA, NewInternRegistrationNotification::class);
    // College admin B should not be notified
    Notification::assertNotSentTo($this->collegeAdminB, NewInternRegistrationNotification::class);
    // Super Admin should not be notified by default (prevents spam)
    Notification::assertNotSentTo($this->superAdmin, NewInternRegistrationNotification::class);

    // Should appear in college A's pending approval list
    $responseA = $this->actingAs($this->collegeAdminA)->get(route('admin.interns.index', ['status' => 'pending']));
    $responseA->assertOk();
    $responseA->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('interns.data', fn ($data) => collect($data)->pluck('user_id')->contains($internUser->id))
    );

    // Should NOT appear in college B's pending approval list
    $responseB = $this->actingAs($this->collegeAdminB)->get(route('admin.interns.index', ['status' => 'pending']));
    $responseB->assertOk();
    $responseB->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('interns.data', fn ($data) => collect($data)->pluck('user_id')->doesntContain($internUser->id))
    );

    // Should NOT yet appear in supervisor records before being approved
    $supResponse = $this->actingAs($this->supervisorUser)->get(route('supervisor.interns.index'));
    $supResponse->assertOk();
    $supResponse->assertInertia(fn ($page) => $page
        ->where('logs.data', fn ($data) => collect($data)->pluck('intern_user_id')->doesntContain($internUser->id))
    );
});

test('accepted intern appears on other records including supervisor and approved records', function () {
    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'name' => 'Accepted Student',
        'email_verified_at' => now(),
    ]);

    $internProfile = InternProfile::create([
        'user_id' => $internUser->id,
        'program_id' => $this->programA->program_id,
        'hte_id' => $this->hteA->hte_id,
        'id_number' => '2026-44444',
        'sex' => 'female',
        'status' => 'pending',
        'privacy_accepted_at' => now(),
    ]);

    // College admin approves the verified intern
    $approveResponse = $this->actingAs($this->collegeAdminA)->post(route('admin.interns.approve', $internProfile));
    $approveResponse->assertRedirect();

    expect($internProfile->fresh()->status)->toBe('approved');
    expect($internProfile->fresh()->qr_code_value)->not->toBeNull();

    // Now appears in admin approved records
    $adminApproveResponse = $this->actingAs($this->collegeAdminA)->get(route('admin.interns.index', ['status' => 'approved']));
    $adminApproveResponse->assertOk();
    $adminApproveResponse->assertInertia(fn ($page) => $page
        ->component('admin/interns/index')
        ->where('interns.data', fn ($data) => collect($data)->pluck('user_id')->contains($internUser->id))
    );

    // Now appears in supervisor records
    $supResponse = $this->actingAs($this->supervisorUser)->get(route('supervisor.interns.index'));
    $supResponse->assertOk();
    $supResponse->assertInertia(fn ($page) => $page
        ->where('internCount', 1)
        ->where('accumulatedHours', fn ($data) => collect($data)->pluck('intern_user_id')->contains($internUser->id))
    );

    // Appears on supervisor manual attendance lookup
    $manualAttResponse = $this->actingAs($this->supervisorUser)->get(route('supervisor.manual-attendance.create'));
    $manualAttResponse->assertOk();
    $manualAttResponse->assertInertia(fn ($page) => $page
        ->where('interns', fn ($data) => collect($data)->pluck('user_id')->contains($internUser->id))
    );
});

test('super admin receives registration notification when explicitly opted in', function () {
    Notification::fake();

    $this->superAdmin->update([
        'notification_preferences' => ['all_intern_registrations' => true],
    ]);

    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'email_verified_at' => null,
    ]);

    InternProfile::create([
        'user_id' => $internUser->id,
        'program_id' => $this->programA->program_id,
        'hte_id' => $this->hteA->hte_id,
        'id_number' => '2026-99999',
        'sex' => 'male',
        'status' => 'pending',
        'privacy_accepted_at' => now(),
    ]);

    $code = EmailVerificationCode::generateFor($internUser->email);

    $this->post(route('verification.verify-code'), [
        'code' => $code,
        'email' => $internUser->email,
    ]);

    // Both the matching college admin and the opted-in super admin are notified
    Notification::assertSentTo($this->collegeAdminA, NewInternRegistrationNotification::class);
    Notification::assertSentTo($this->superAdmin, NewInternRegistrationNotification::class);
    Notification::assertNotSentTo($this->collegeAdminB, NewInternRegistrationNotification::class);
});

test('super admin and college admin have distinct notification preferences', function () {
    // Super admin options
    $superAdminResponse = $this->actingAs($this->superAdmin)->get(route('notifications.edit'));
    $superAdminResponse->assertOk();
    $superAdminResponse->assertInertia(fn ($page) => $page
        ->component('settings/notifications')
        ->where('role', 'Super Administrator')
        ->has('options', 3)
        ->where('options.0.key', 'system_alerts')
        ->where('options.1.key', 'admin_management')
        ->where('options.2.key', 'all_intern_registrations')
    );

    // College admin options
    $collegeAdminResponse = $this->actingAs($this->collegeAdminA)->get(route('notifications.edit'));
    $collegeAdminResponse->assertOk();
    $collegeAdminResponse->assertInertia(fn ($page) => $page
        ->component('settings/notifications')
        ->where('role', 'College Administrator')
        ->has('options', 3)
        ->where('options.0.key', 'intern_registrations')
        ->where('options.1.key', 'intern_completions')
        ->where('options.2.key', 'supervisor_updates')
    );

    // Super admin can update preferences
    $updateResponse = $this->actingAs($this->superAdmin)->patch(route('notifications.update'), [
        'system_alerts' => true,
        'admin_management' => false,
        'all_intern_registrations' => true,
    ]);
    $updateResponse->assertRedirect();

    expect($this->superAdmin->fresh()->wantsNotification('all_intern_registrations'))->toBeTrue();
    expect($this->superAdmin->fresh()->wantsNotification('admin_management'))->toBeFalse();
});

