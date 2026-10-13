<?php

use App\Models\TwoFactorResetRequest;
use App\Models\User;
use App\Notifications\TwoFactorResetConfirmationNotification;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('two factor reset request page can be rendered', function () {
    $response = $this->get(route('two-factor.reset.create'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('auth/two-factor-reset'));
});

test('submitting reset request with non-existent email returns generic response without sending email', function () {
    Notification::fake();

    $response = $this->post(route('two-factor.reset.store'), [
        'email' => 'nonexistent@example.com',
    ]);

    $response->assertRedirect(route('two-factor.reset.create'))
        ->assertSessionHas('status');

    Notification::assertNothingSent();
    expect(TwoFactorResetRequest::count())->toBe(0);
});

test('submitting reset request for user without two factor returns generic response without sending email', function () {
    Notification::fake();

    $user = User::factory()->create(['email' => 'no2fa@example.com']);

    $response = $this->post(route('two-factor.reset.store'), [
        'email' => $user->email,
    ]);

    $response->assertRedirect(route('two-factor.reset.create'))
        ->assertSessionHas('status');

    Notification::assertNothingSent();
    expect(TwoFactorResetRequest::count())->toBe(0);
});

test('submitting reset request for user with two factor creates hashed token and dispatches notification', function () {
    Notification::fake();

    $user = User::factory()->withTwoFactor()->create(['email' => 'user2fa@example.com']);

    $response = $this->post(route('two-factor.reset.store'), [
        'email' => $user->email,
        'reason' => 'Lost my authenticator phone',
    ]);

    $response->assertRedirect(route('two-factor.reset.create'))
        ->assertSessionHas('status');

    Notification::assertSentTo($user, TwoFactorResetConfirmationNotification::class);

    $resetRequest = TwoFactorResetRequest::where('user_id', $user->id)->first();
    expect($resetRequest)->not->toBeNull()
        ->and($resetRequest->status)->toBe(TwoFactorResetRequest::STATUS_PENDING_USER_CONFIRMATION)
        ->and($resetRequest->token_hash)->not->toBeNull()
        ->and($resetRequest->reason)->toBe('Lost my authenticator phone');
});

test('confirmation page shows error for invalid or expired token', function () {
    $response = $this->get(route('two-factor.reset.confirm.view', ['token' => 'invalid-token-here']));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/two-factor-reset-confirm')
            ->where('isValid', false),
        );
});

test('user can confirm permission via valid email token', function () {
    $user = User::factory()->withTwoFactor()->create();
    [$resetRequest, $plainToken] = TwoFactorResetRequest::createForUser($user, 'Lost phone');

    $this->get(route('two-factor.reset.confirm.view', ['token' => $plainToken]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/two-factor-reset-confirm')
            ->where('isValid', true)
            ->where('userName', $user->name),
        );

    $response = $this->post(route('two-factor.reset.confirm.submit', ['token' => $plainToken]));

    $response->assertRedirect(route('login'))
        ->assertSessionHas('status');

    $resetRequest->refresh();
    expect($resetRequest->status)->toBe(TwoFactorResetRequest::STATUS_PENDING_ADMIN_APPROVAL)
        ->and($resetRequest->user_confirmed_at)->not->toBeNull()
        ->and($resetRequest->token_hash)->toBeNull(); // Token cleared for replay prevention
});

test('token cannot be reused after confirmation', function () {
    $user = User::factory()->withTwoFactor()->create();
    [$resetRequest, $plainToken] = TwoFactorResetRequest::createForUser($user, 'Lost phone');

    // First confirmation succeeds
    $this->post(route('two-factor.reset.confirm.submit', ['token' => $plainToken]))
        ->assertRedirect(route('login'));

    // Second confirmation fails
    $response = $this->post(route('two-factor.reset.confirm.submit', ['token' => $plainToken]));
    $response->assertSessionHasErrors(['token']);
});
