<?php

use App\Models\AuditLog;
use App\Models\College;
use App\Models\TwoFactorResetRequest;
use App\Models\User;
use App\Notifications\TwoFactorResetApprovedNotification;
use App\Notifications\TwoFactorResetConfirmationNotification;
use App\Notifications\TwoFactorResetRejectedNotification;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('non-admin users cannot access admin 2fa reset endpoints', function () {
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);

    $this->actingAs($intern)
        ->get(route('admin.two-factor-resets.index'))
        ->assertForbidden();
});

test('super admin can view 2fa reset requests', function () {
    $superAdmin = User::factory()->withTwoFactor()->create(['role' => User::ROLE_SUPER_ADMIN]);

    $targetUser = User::factory()->withTwoFactor()->create();
    [$resetRequest, $token] = TwoFactorResetRequest::createForUser($targetUser, 'Lost codes');
    $resetRequest->confirmByUser($token);

    $this->actingAs($superAdmin)
        ->get(route('admin.two-factor-resets.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/two-factor-resets/index')
            ->has('requests.data', 1)
        );
});

test('college admin only views requests from their college', function () {
    $college1 = College::create(['name' => 'College 1', 'code' => 'C1']);
    $college2 = College::create(['name' => 'College 2', 'code' => 'C2']);

    $collegeAdmin = User::factory()->withTwoFactor()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $college1->id,
    ]);

    $userCollege1 = User::factory()->withTwoFactor()->create([
        'role' => User::ROLE_INTERN,
        'college_id' => $college1->id,
    ]);
    [$req1, $t1] = TwoFactorResetRequest::createForUser($userCollege1, 'Reason 1');
    $req1->confirmByUser($t1);

    $userCollege2 = User::factory()->withTwoFactor()->create([
        'role' => User::ROLE_INTERN,
        'college_id' => $college2->id,
    ]);
    [$req2, $t2] = TwoFactorResetRequest::createForUser($userCollege2, 'Reason 2');
    $req2->confirmByUser($t2);

    $this->actingAs($collegeAdmin)
        ->get(route('admin.two-factor-resets.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/two-factor-resets/index')
            ->has('requests.data', 1)
            ->where('requests.data.0.user.id', $userCollege1->id)
        );
});

test('admin cannot approve a request that is still pending user confirmation', function () {
    $superAdmin = User::factory()->withTwoFactor()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $targetUser = User::factory()->withTwoFactor()->create();

    // Create request but do NOT confirm by user
    [$resetRequest, $token] = TwoFactorResetRequest::createForUser($targetUser, 'Lost device');

    $response = $this->actingAs($superAdmin)
        ->post(route('admin.two-factor-resets.approve', $resetRequest));

    $response->assertSessionHas('error');
    $resetRequest->refresh();
    expect($resetRequest->status)->toBe(TwoFactorResetRequest::STATUS_PENDING_USER_CONFIRMATION);
    expect($targetUser->fresh()->two_factor_secret)->not->toBeNull();
});

test('admin cannot approve their own 2fa reset request', function () {
    $superAdmin = User::factory()->withTwoFactor()->create(['role' => User::ROLE_SUPER_ADMIN]);
    [$resetRequest, $token] = TwoFactorResetRequest::createForUser($superAdmin, 'Self reset attempt');
    $resetRequest->confirmByUser($token);

    $this->actingAs($superAdmin)
        ->post(route('admin.two-factor-resets.approve', $resetRequest))
        ->assertForbidden();

    expect($superAdmin->fresh()->two_factor_secret)->not->toBeNull();
});

test('college admin cannot approve a super admin request', function () {
    $college = College::create(['name' => 'College Super', 'code' => 'CS']);
    $collegeAdmin = User::factory()->withTwoFactor()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $college->id,
    ]);

    $superAdmin = User::factory()->withTwoFactor()->create(['role' => User::ROLE_SUPER_ADMIN]);
    [$resetRequest, $token] = TwoFactorResetRequest::createForUser($superAdmin, 'Reset');
    $resetRequest->confirmByUser($token);

    $this->actingAs($collegeAdmin)
        ->post(route('admin.two-factor-resets.approve', $resetRequest))
        ->assertForbidden();
});

test('approving 2fa reset clears 2fa fields, cycles remember token, records audit log, and notifies user', function () {
    Notification::fake();

    $superAdmin = User::factory()->withTwoFactor()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $targetUser = User::factory()->withTwoFactor()->create();
    $originalRemember = $targetUser->remember_token;

    [$resetRequest, $token] = TwoFactorResetRequest::createForUser($targetUser, 'Lost phone');
    $resetRequest->confirmByUser($token);

    $response = $this->actingAs($superAdmin)
        ->post(route('admin.two-factor-resets.approve', $resetRequest));

    $response->assertSessionHas('success');

    $targetUser->refresh();
    expect($targetUser->two_factor_secret)->toBeNull()
        ->and($targetUser->two_factor_recovery_codes)->toBeNull()
        ->and($targetUser->two_factor_confirmed_at)->toBeNull()
        ->and($targetUser->remember_token)->not->toBe($originalRemember);

    $resetRequest->refresh();
    expect($resetRequest->status)->toBe(TwoFactorResetRequest::STATUS_APPROVED)
        ->and($resetRequest->admin_id)->toBe($superAdmin->id);

    Notification::assertSentTo($targetUser, TwoFactorResetApprovedNotification::class);

    $auditLog = AuditLog::where('action', 'two_factor_reset.approved')->first();
    expect($auditLog)->not->toBeNull()
        ->and($auditLog->user_id)->toBe($superAdmin->id);
});

test('rejecting 2fa reset updates status, records reason and audit log, and notifies user', function () {
    Notification::fake();

    $superAdmin = User::factory()->withTwoFactor()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $targetUser = User::factory()->withTwoFactor()->create();

    [$resetRequest, $token] = TwoFactorResetRequest::createForUser($targetUser, 'Lost phone');
    $resetRequest->confirmByUser($token);

    $response = $this->actingAs($superAdmin)
        ->post(route('admin.two-factor-resets.reject', $resetRequest), [
            'rejection_reason' => 'Identity verification failed via call.',
        ]);

    $response->assertSessionHas('success');

    $resetRequest->refresh();
    expect($resetRequest->status)->toBe(TwoFactorResetRequest::STATUS_REJECTED)
        ->and($resetRequest->rejection_reason)->toBe('Identity verification failed via call.')
        ->and($resetRequest->admin_id)->toBe($superAdmin->id);

    expect($targetUser->fresh()->two_factor_secret)->not->toBeNull();

    Notification::assertSentTo($targetUser, TwoFactorResetRejectedNotification::class);

    $auditLog = AuditLog::where('action', 'two_factor_reset.rejected')->first();
    expect($auditLog)->not->toBeNull();
});

test('admin can initiate a reset which requests confirmation from user', function () {
    Notification::fake();

    $superAdmin = User::factory()->withTwoFactor()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $targetUser = User::factory()->withTwoFactor()->create();

    $response = $this->actingAs($superAdmin)
        ->post(route('admin.two-factor-resets.initiate', $targetUser), [
            'reason' => 'User contacted help desk in person',
        ]);

    $response->assertSessionHas('success');

    $resetRequest = TwoFactorResetRequest::where('user_id', $targetUser->id)->first();
    expect($resetRequest)->not->toBeNull()
        ->and($resetRequest->status)->toBe(TwoFactorResetRequest::STATUS_PENDING_USER_CONFIRMATION)
        ->and($resetRequest->requested_by_user_id)->toBe($superAdmin->id);

    // 2FA must NOT be cleared yet!
    expect($targetUser->fresh()->two_factor_secret)->not->toBeNull();

    Notification::assertSentTo($targetUser, TwoFactorResetConfirmationNotification::class);
});
