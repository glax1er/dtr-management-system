<?php

use App\Models\Hte;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\Program;
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
        ->has('checklist', 6)
        ->where('stats.total_required', 5)
        ->where('stats.total_submitted', 0)
        ->where('stats.progress_percentage', 0)
    );
});

test('intern can upload a valid PDF document', function () {
    Storage::fake('local');
    [$intern] = createTestIntern();

    $pdfFile = UploadedFile::fake()->create('parent_waiver.pdf', 1024, 'application/pdf');

    $response = $this->actingAs($intern)->post(route('intern.documents.store'), [
        'document_type' => 'parent_waiver',
        'file' => $pdfFile,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $this->assertDatabaseHas('intern_documents', [
        'user_id' => $intern->id,
        'document_type' => 'parent_waiver',
        'original_filename' => 'parent_waiver.pdf',
        'status' => InternDocument::STATUS_PENDING,
    ]);
});

test('uploading a non-PDF document is rejected', function () {
    Storage::fake('local');
    [$intern] = createTestIntern();

    $pngFile = UploadedFile::fake()->image('waiver.png');

    $response = $this->actingAs($intern)->post(route('intern.documents.store'), [
        'document_type' => 'parent_waiver',
        'file' => $pngFile,
    ]);

    $response->assertSessionHasErrors(['file']);
});

test('admin can review, approve, and reject intern documents', function () {
    Storage::fake('local');
    [$intern] = createTestIntern();
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $pdfFile = UploadedFile::fake()->create('endorsement.pdf', 500, 'application/pdf');

    $this->actingAs($intern)->post(route('intern.documents.store'), [
        'document_type' => 'endorsement_letter',
        'file' => $pdfFile,
    ]);

    $document = InternDocument::where('user_id', $intern->id)->firstOrFail();

    // Admin approves
    $this->actingAs($admin)->post(route('documents.review.approve', $document->id))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $document->refresh();
    expect($document->status)->toBe(InternDocument::STATUS_APPROVED);
    expect($document->reviewed_by)->toBe($admin->id);

    // Admin rejects with reason
    $this->actingAs($admin)->post(route('documents.review.reject', $document->id), [
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
    \App\Models\SupervisorProfile::create([
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
            ->has('checklist', 6)
        );

    // OJT Supervisor uploads a blank template for parent waiver
    $templateFile = UploadedFile::fake()->create('waiver_official_template.docx', 500, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    $this->actingAs($ojtSupervisorUser)
        ->post(route('supervisor.document-templates.store'), [
            'document_type' => 'parent_waiver',
            'file' => $templateFile,
            'instructions' => 'Please sign with blue ink and attach 2x2 ID picture.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->assertDatabaseHas('document_templates', [
        'program_id' => $program->program_id,
        'document_type' => 'parent_waiver',
        'original_filename' => 'waiver_official_template.docx',
    ]);

    $template = \App\Models\DocumentTemplate::where('document_type', 'parent_waiver')->firstOrFail();

    // Intern views their checklist and sees the blank template available
    $this->actingAs($intern)
        ->get(route('intern.documents.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('checklist.0.has_template', true)
            ->where('checklist.0.template_filename', 'waiver_official_template.docx')
            ->where('checklist.0.template_instructions', 'Please sign with blue ink and attach 2x2 ID picture.')
        );

    // Intern downloads the template
    $this->actingAs($intern)
        ->get(route('intern.documents.template.download', $template->id))
        ->assertOk();
});
