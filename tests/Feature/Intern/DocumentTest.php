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

function createTestIntern(): array
{
    $hte = Hte::create(['hte_name' => 'Tech Corp', 'status' => 'active']);
    $program = Program::create(['program_name' => 'BS Information Tech']);
    $user = User::factory()->create(['role' => User::ROLE_INTERN]);

    $profile = InternProfile::create([
        'user_id' => $user->id,
        'id_number' => 'IT-2026-001',
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    return [$user, $profile, $hte, $program];
}

test('intern can view their document checklist page', function () {
    [$intern] = createTestIntern();

    $response = $this->actingAs($intern)->get(route('intern.documents.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('intern/documents/index')
        ->has('checklist', 12)
        ->where('stats.total_required', 12)
        ->where('stats.total_submitted', 0)
        ->where('stats.progress_percentage', 0)
    );
});

test('intern can upload a valid PDF document', function () {
    Storage::fake('local');
    [$intern] = createTestIntern();

    $pdfFile = UploadedFile::fake()->create('parents_consent.pdf', 1024, 'application/pdf');

    $response = $this->actingAs($intern)->post(route('intern.documents.store'), [
        'document_type' => 'parents_consent',
        'file' => $pdfFile,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $this->assertDatabaseHas('intern_documents', [
        'user_id' => $intern->id,
        'document_type' => 'parents_consent',
        'original_filename' => 'parents_consent.pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);
});

test('uploading a non-PDF document is rejected', function () {
    Storage::fake('local');
    [$intern] = createTestIntern();

    $pngFile = UploadedFile::fake()->image('waiver.png');

    $response = $this->actingAs($intern)->post(route('intern.documents.store'), [
        'document_type' => 'parents_consent',
        'file' => $pngFile,
    ]);

    $response->assertSessionHasErrors(['file']);
});

test('supervisor can review, approve, and reject intern documents, while admin cannot', function () {
    Storage::fake('local');
    [$intern, $profile, $hte, $program] = createTestIntern();
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $supervisorUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisorUser->id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'ojt',
        'status' => 'active',
    ]);

    $pdfFile = UploadedFile::fake()->create('endorsement.pdf', 500, 'application/pdf');

    $this->actingAs($intern)->post(route('intern.documents.store'), [
        'document_type' => 'usep_hte_nda',
        'file' => $pdfFile,
    ]);

    $document = InternDocument::where('user_id', $intern->id)->firstOrFail();

    // Admin cannot approve
    $this->actingAs($admin)->post(route('documents.review.approve', $document->id))
        ->assertForbidden();

    // Supervisor approves
    $this->actingAs($supervisorUser)->post(route('documents.review.approve', $document->id))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $document->refresh();
    expect($document->status)->toBe(InternDocument::STATUS_APPROVED);
    expect($document->reviewed_by)->toBe($supervisorUser->id);

    // Supervisor rejects with reason
    $this->actingAs($supervisorUser)->post(route('documents.review.reject', $document->id), [
        'rejection_reason' => 'Signatures are missing on page 2.',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $document->refresh();
    expect($document->status)->toBe(InternDocument::STATUS_REJECTED);
    expect($document->rejection_reason)->toBe('Signatures are missing on page 2.');
});

test('OJT supervisor can upload blank template formats and interns can download them', function () {
    Storage::fake('local');
    [$intern, $profile, $hte, $program] = createTestIntern();

    // Create OJT Supervisor for this program
    $ojtSupervisorUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $ojtSupervisorUser->id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'ojt',
        'status' => 'active',
    ]);

    // OJT Supervisor views templates page
    $this->actingAs($ojtSupervisorUser)
        ->get(route('supervisor.document-templates.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('supervisor/document-templates')
            ->has('checklist', 12)
        );

    // OJT Supervisor uploads a blank template for parent's consent
    $templateFile = UploadedFile::fake()->create('consent_official_template.docx', 500, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    $this->actingAs($ojtSupervisorUser)
        ->post(route('supervisor.document-templates.store'), [
            'document_type' => 'parents_consent',
            'file' => $templateFile,
            'instructions' => 'Please sign with blue ink and attach 2x2 ID picture.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertDatabaseHas('document_templates', [
        'program_id' => $program->program_id,
        'document_type' => 'parents_consent',
        'original_filename' => 'consent_official_template.docx',
    ]);

    $template = DocumentTemplate::where('document_type', 'parents_consent')->firstOrFail();

    // Intern views their checklist and sees the blank template available
    $this->actingAs($intern)
        ->get(route('intern.documents.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('checklist.0.has_template', true)
            ->where('checklist.0.template_filename', 'consent_official_template.docx')
            ->where('checklist.0.template_instructions', 'Please sign with blue ink and attach 2x2 ID picture.')
        );

    // Intern downloads the template
    $this->actingAs($intern)
        ->get(route('intern.documents.template.download', $template->id))
        ->assertOk();

    // OJT Supervisor soft deletes (archives) the template
    $this->actingAs($ojtSupervisorUser)
        ->delete(route('supervisor.document-templates.destroy', $template->id))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertSoftDeleted('document_templates', [
        'id' => $template->id,
    ]);

    // Intern should no longer see the template when it's archived
    $this->actingAs($intern)
        ->get(route('intern.documents.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('checklist.0.has_template', false)
        );

    // OJT Supervisor restores the template from archive
    $this->actingAs($ojtSupervisorUser)
        ->post(route('supervisor.document-templates.restore', $template->id))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertDatabaseHas('document_templates', [
        'id' => $template->id,
        'deleted_at' => null,
    ]);

    // OJT Supervisor permanently deletes (force deletes) the template
    $this->actingAs($ojtSupervisorUser)
        ->delete(route('supervisor.document-templates.destroy', $template->id));

    $this->actingAs($ojtSupervisorUser)
        ->delete(route('supervisor.document-templates.forceDelete', $template->id))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertDatabaseMissing('document_templates', [
        'id' => $template->id,
    ]);
});

test('intern can see custom document requirements and upload PDF documents for them', function () {
    Storage::fake('local');
    [$intern, $profile, $hte, $program] = createTestIntern();

    // Create custom document requirement for the intern's program
    $supervisorUser = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisorUser->id,
        'program_id' => $program->program_id,
        'supervisor_type' => 'ojt',
        'status' => 'active',
    ]);

    $this->actingAs($supervisorUser)->post(route('supervisor.document-templates.store'), [
        'name' => 'Vaccination Record',
        'category' => 'Pre Deployment',
        'description' => 'Proof of vaccination.',
        'required' => true,
    ])->assertSessionHasNoErrors();

    $customTemplate = DocumentTemplate::where('name', 'Vaccination Record')->firstOrFail();

    // Intern checklist should have 13 items
    $this->actingAs($intern)
        ->get(route('intern.documents.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('checklist', 13)
            ->where('stats.total_required', 13)
        );

    // Intern uploads PDF for custom document
    $pdfFile = UploadedFile::fake()->create('vaccination_card.pdf', 500, 'application/pdf');

    $this->actingAs($intern)
        ->post(route('intern.documents.store'), [
            'document_type' => $customTemplate->document_type,
            'file' => $pdfFile,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertDatabaseHas('intern_documents', [
        'user_id' => $intern->id,
        'document_type' => $customTemplate->document_type,
        'original_filename' => 'vaccination_card.pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);
});
