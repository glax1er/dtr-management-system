<?php

use App\Models\DocumentTemplate;
use App\Models\Hte;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function createTestOjtSupervisor(): array
{
    $program = Program::create(['program_name' => 'BS Information Tech']);
    $user = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    $profile = SupervisorProfile::create([
        'user_id' => $user->id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'ojt',
        'status' => 'active',
    ]);

    return [$user, $profile, $program];
}

test('OJT supervisor can view document templates with folders and statistics', function () {
    [$supervisor, $profile, $program] = createTestOjtSupervisor();

    $response = $this->actingAs($supervisor)->get(route('supervisor.document-templates.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('supervisor/document-templates')
        ->has('checklist', 12)
        ->has('folders', 3)
        ->where('total_types', 12)
        ->where('total_templates', 0)
        ->where('total_archived', 0)
    );
});

test('non-OJT supervisor or intern cannot access document templates management', function () {
    $program = Program::create(['program_name' => 'BS Computer Science']);
    $hte = Hte::create(['hte_name' => 'Acme Inc', 'status' => 'active']);

    // HTE supervisor
    $hteSupervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $hteSupervisor->id,
        'hte_id' => $hte->hte_id,
        'supervisor_type' => 'hte',
        'status' => 'active',
    ]);

    $this->actingAs($hteSupervisor)
        ->get(route('supervisor.document-templates.index'))
        ->assertForbidden();

    // Intern
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);
    $this->actingAs($intern)
        ->get(route('supervisor.document-templates.index'))
        ->assertForbidden();
});

test('OJT supervisor can upload, update, soft delete, restore, and force delete templates', function () {
    Storage::fake('local');
    [$supervisor, $profile, $program] = createTestOjtSupervisor();

    // 1. Upload new template
    $pdfFile = UploadedFile::fake()->create('parents_consent_form.pdf', 1024, 'application/pdf');

    $this->actingAs($supervisor)
        ->post(route('supervisor.document-templates.store'), [
            'document_type' => 'parents_consent',
            'file' => $pdfFile,
            'instructions' => 'Sign in blue ink and submit with guardian ID.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertDatabaseHas('document_templates', [
        'program_id' => $program->program_id,
        'document_type' => 'parents_consent',
        'original_filename' => 'parents_consent_form.pdf',
        'instructions' => 'Sign in blue ink and submit with guardian ID.',
    ]);

    $template = DocumentTemplate::where('document_type', 'parents_consent')->firstOrFail();

    // 2. Download template
    $this->actingAs($supervisor)
        ->get(route('supervisor.document-templates.download', $template->id))
        ->assertOk();

    // 3. Update instructions only without re-uploading file
    $this->actingAs($supervisor)
        ->post(route('supervisor.document-templates.store'), [
            'document_type' => 'parents_consent',
            'instructions' => 'Updated instruction for parents consent.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $template->refresh();
    expect($template->instructions)->toBe('Updated instruction for parents consent.');

    // 4. Soft delete / Archive template
    $this->actingAs($supervisor)
        ->delete(route('supervisor.document-templates.destroy', $template->id))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertSoftDeleted('document_templates', ['id' => $template->id]);

    // View index page - total_templates should be 0, total_archived should be 1
    $this->actingAs($supervisor)
        ->get(route('supervisor.document-templates.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('total_templates', 0)
            ->where('total_archived', 1)
            ->has('archived', 1)
        );

    // 5. Restore template
    $this->actingAs($supervisor)
        ->post(route('supervisor.document-templates.restore', $template->id))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertDatabaseHas('document_templates', [
        'id' => $template->id,
        'deleted_at' => null,
    ]);

    // 6. Force delete template
    $this->actingAs($supervisor)
        ->delete(route('supervisor.document-templates.destroy', $template->id));

    $this->actingAs($supervisor)
        ->delete(route('supervisor.document-templates.forceDelete', $template->id))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertDatabaseMissing('document_templates', ['id' => $template->id]);
});

test('OJT supervisor can add a new custom document requirement with optional template and edit it', function () {
    Storage::fake('local');
    [$supervisor, $profile, $program] = createTestOjtSupervisor();

    // 1. Add new custom document requirement
    $this->actingAs($supervisor)
        ->post(route('supervisor.document-templates.store'), [
            'name' => 'Certificate of Good Moral',
            'category' => 'Pre Deployment',
            'description' => 'Official certificate from dean office.',
            'required' => true,
            'instructions' => 'Must have university dry seal.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertDatabaseHas('document_templates', [
        'program_id' => $program->program_id,
        'name' => 'Certificate of Good Moral',
        'category' => 'Pre Deployment',
        'is_custom' => true,
        'required' => true,
        'file_path' => null,
    ]);

    $customDoc = DocumentTemplate::where('name', 'Certificate of Good Moral')->firstOrFail();

    // 2. Edit the custom document and attach a blank template
    $templateFile = UploadedFile::fake()->create('good_moral_template.docx', 500, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    $this->actingAs($supervisor)
        ->post(route('supervisor.document-templates.update', $customDoc->document_type), [
            'name' => 'Certificate of Good Moral Character (Updated)',
            'category' => 'Pre Deployment',
            'description' => 'Updated description.',
            'required' => false,
            'instructions' => 'Updated instruction.',
            'file' => $templateFile,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $customDoc->refresh();
    expect($customDoc->name)->toBe('Certificate of Good Moral Character (Updated)');
    expect($customDoc->required)->toBeFalse();
    expect($customDoc->original_filename)->toBe('good_moral_template.docx');
    expect($customDoc->hasFile())->toBeTrue();

    // 3. View templates index - should include 12 predefined + 1 custom = 13 items
    $this->actingAs($supervisor)
        ->get(route('supervisor.document-templates.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('checklist', 13)
            ->where('total_types', 13)
            ->where('total_templates', 1)
        );

    // 4. Archive custom document
    $this->actingAs($supervisor)
        ->delete(route('supervisor.document-templates.destroy', $customDoc->document_type))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertSoftDeleted('document_templates', ['id' => $customDoc->id]);

    // 5. Restore custom document
    $this->actingAs($supervisor)
        ->post(route('supervisor.document-templates.restore', $customDoc->id))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $customDoc->refresh();
    expect($customDoc->deleted_at)->toBeNull();
});

test('OJT supervisor can archive a predefined document requirement that has no previous DB record', function () {
    [$supervisor, $profile, $program] = createTestOjtSupervisor();

    // Archive 'outside_hte_nda'
    $this->actingAs($supervisor)
        ->delete(route('supervisor.document-templates.destroy', 'outside_hte_nda'))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertSoftDeleted('document_templates', [
        'program_id' => $program->program_id,
        'document_type' => 'outside_hte_nda',
    ]);

    // Total types should now be 11 (12 - 1 archived)
    $this->actingAs($supervisor)
        ->get(route('supervisor.document-templates.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('checklist', 11)
            ->where('total_types', 11)
            ->where('total_archived', 1)
        );
});
