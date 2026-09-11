<?php

use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

test('admin can upload an ID card background image when creating an HTE', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $file = UploadedFile::fake()->image('hte-bg.jpg', 800, 500);

    $response = $this->actingAs($admin)->post(route('admin.htes.store'), [
        'hte_name' => 'Tech Corp',
        'address' => 'Davao City',
        'contact_number' => '09123456789',
        'id_bg' => $file,
    ]);

    $response->assertRedirect();

    $hte = Hte::where('hte_name', 'Tech Corp')->first();
    expect($hte)->not->toBeNull();
    expect($hte->id_bg_path)->not->toBeNull();
    Storage::disk('public')->assertExists($hte->id_bg_path);
    expect($hte->id_bg_url)->toBe(Storage::disk('public')->url($hte->id_bg_path));
});

test('admin can replace and remove an HTE ID card background image', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $file1 = UploadedFile::fake()->image('first-bg.jpg');
    $path1 = $file1->store('hte-backgrounds', 'public');

    $hte = Hte::create([
        'hte_name' => 'Original Corp',
        'address' => 'Davao City',
        'id_bg_path' => $path1,
    ]);

    Storage::disk('public')->assertExists($path1);

    // 1. Replace with new image
    $file2 = UploadedFile::fake()->image('second-bg.jpg');
    $response = $this->actingAs($admin)->patch(route('admin.htes.update', $hte), [
        'hte_name' => 'Original Corp Updated',
        'address' => 'Davao City',
        'id_bg' => $file2,
    ]);

    $response->assertRedirect();
    $hte->refresh();

    Storage::disk('public')->assertMissing($path1);
    Storage::disk('public')->assertExists($hte->id_bg_path);

    $path2 = $hte->id_bg_path;

    // 2. Remove background
    $response = $this->actingAs($admin)->patch(route('admin.htes.update', $hte), [
        'hte_name' => 'Original Corp Updated',
        'address' => 'Davao City',
        'remove_id_bg' => true,
    ]);

    $response->assertRedirect();
    $hte->refresh();

    expect($hte->id_bg_path)->toBeNull();
    expect($hte->id_bg_url)->toBeNull();
    Storage::disk('public')->assertMissing($path2);
});

test('intern ID card reflects assigned HTE background URL', function () {
    $file = UploadedFile::fake()->image('hte-card-bg.jpg');
    $path = $file->store('hte-backgrounds', 'public');

    $hte = Hte::create([
        'hte_name' => 'Acme Labs',
        'address' => 'Bajada, Davao City',
        'id_bg_path' => $path,
    ]);

    $program = Program::create(['program_name' => 'BS Information Technology']);

    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'email_verified_at' => now(),
    ]);

    InternProfile::create([
        'user_id' => $internUser->id,
        'id_number' => '2026-00001',
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    $expectedUrl = Storage::disk('public')->url($path);

    $this->actingAs($internUser)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->where('idCard.bg_url', $expectedUrl)
        );
});

test('intern ID card falls back to default image when HTE has no custom background', function () {
    $hte = Hte::create([
        'hte_name' => 'Acme Default',
        'address' => 'Davao City',
        'id_bg_path' => null,
    ]);

    $program = Program::create(['program_name' => 'BS Information Systems']);

    $internUser = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'email_verified_at' => now(),
    ]);

    InternProfile::create([
        'user_id' => $internUser->id,
        'id_number' => '2026-00002',
        'sex' => 'female',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    $this->actingAs($internUser)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->where('idCard.bg_url', '/images/cic-bg.jpg')
        );
});

test('HTE supervisor ID card reflects assigned HTE background URL', function () {
    $file = UploadedFile::fake()->image('hte-supervisor-card-bg.jpg');
    $path = $file->store('hte-backgrounds', 'public');

    $hte = Hte::create([
        'hte_name' => 'Acme Tech Hub',
        'address' => 'Davao City',
        'id_bg_path' => $path,
    ]);

    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'hte',
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    $expectedUrl = Storage::disk('public')->url($path);

    $this->actingAs($supervisor)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->where('idCard.bg_url', $expectedUrl)
        );
});

test('HTE supervisor ID card falls back to default image when HTE has no custom background', function () {
    $hte = Hte::create([
        'hte_name' => 'Acme Standard',
        'address' => 'Davao City',
        'id_bg_path' => null,
    ]);

    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'hte',
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    $this->actingAs($supervisor)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->where('idCard.bg_url', '/images/cic-bg.jpg')
        );
});

test('OJT supervisor and admin ID cards keep the default background', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $this->actingAs($admin)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->where('idCard.bg_url', '/images/cic-bg.jpg')
        );

    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'ojt',
        'status' => 'active',
    ]);

    $this->actingAs($supervisor)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->where('idCard.bg_url', '/images/cic-bg.jpg')
        );
});
