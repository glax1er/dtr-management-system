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
