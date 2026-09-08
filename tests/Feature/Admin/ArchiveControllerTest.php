<?php

use App\Models\Hte;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

test('force deleting an intern deletes profile photo and document files in storage', function () {
    Storage::fake('public');
    Storage::fake('local');

    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $hte = Hte::create(['hte_name' => 'Acme Corp', 'status' => 'active']);
    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);

    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);
    $photoPath = "profile-photos/{$intern->id}/avatar.jpg";
    Storage::disk('public')->put($photoPath, 'fake-photo-content');

    $profile = InternProfile::create([
        'user_id' => $intern->id,
        'id_number' => '2026-'.$intern->id,
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'profile_photo_path' => $photoPath,
        'privacy_accepted_at' => now(),
    ]);

    $docPath = "intern-documents/{$intern->id}/endorsement.pdf";
    Storage::disk('local')->put($docPath, 'fake-pdf-content');

    InternDocument::create([
        'user_id' => $intern->id,
        'document_type' => 'endorsement_letter',
        'original_filename' => 'endorsement.pdf',
        'file_path' => $docPath,
        'status' => InternDocument::STATUS_APPROVED,
    ]);

    $profile->delete();

    Storage::disk('public')->assertExists($photoPath);
    Storage::disk('local')->assertExists($docPath);

    $response = $this->actingAs($admin)->delete(route('admin.archives.forceDelete', [
        'type' => 'interns',
        'id' => $profile->user_id,
    ]));

    $response->assertRedirect();

    Storage::disk('public')->assertMissing($photoPath);
    Storage::disk('local')->assertMissing($docPath);
    expect(Storage::disk('local')->files("intern-documents/{$intern->id}"))->toBeEmpty();
});
