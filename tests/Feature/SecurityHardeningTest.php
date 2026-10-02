<?php

use App\Models\Hte;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
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

    $fakePdfContent = "%PDF-1.4 test content";
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
