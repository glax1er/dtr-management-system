<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Models\InternDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $supervisor = $user->supervisorProfile;

        if (! $supervisor || ! $supervisor->isOjtSupervisor()) {
            abort(403, 'Only OJT Program Supervisors can manage document templates.');
        }

        $program = $supervisor->program;
        $templates = DocumentTemplate::query()
            ->where('program_id', $supervisor->program_id)
            ->get()
            ->keyBy('document_type');

        $checklist = [];
        foreach (InternDocument::DOCUMENT_TYPES as $typeKey => $typeConfig) {
            $template = $templates->get($typeKey);

            $checklist[] = [
                'document_type' => $typeKey,
                'name' => $typeConfig['name'],
                'category' => $typeConfig['category'],
                'description' => $typeConfig['description'],
                'required' => $typeConfig['required'],
                'template_id' => $template?->id,
                'has_template' => $template !== null,
                'original_filename' => $template?->original_filename,
                'file_size' => $template?->formatted_file_size,
                'file_extension' => $template?->file_extension,
                'instructions' => $template?->instructions,
                'uploaded_at' => $template?->updated_at?->format('M d, Y g:i A'),
                'download_url' => $template ? route('supervisor.document-templates.download', $template->id) : null,
            ];
        }

        return Inertia::render('supervisor/document-templates', [
            'checklist' => $checklist,
            'program' => [
                'program_id' => $program?->program_id,
                'program_name' => $program?->program_name ?? 'My Program',
            ],
            'total_templates' => $templates->count(),
            'total_types' => count(InternDocument::DOCUMENT_TYPES),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $supervisor = $request->user()->supervisorProfile;

        if (! $supervisor || ! $supervisor->isOjtSupervisor()) {
            abort(403, 'Only OJT Program Supervisors can upload document templates.');
        }

        $validated = $request->validate([
            'document_type' => ['required', 'string', Rule::in(array_keys(InternDocument::DOCUMENT_TYPES))],
            'file' => [
                'required',
                'file',
                'mimes:pdf,docx,doc',
                'max:15360', // 15MB
            ],
            'instructions' => ['nullable', 'string', 'max:500'],
        ], [
            'file.mimes' => 'The template must be a PDF or Microsoft Word document (.pdf, .docx, .doc).',
            'file.max' => 'The template file size must not exceed 15 MB.',
        ]);

        $file = $request->file('file');
        $documentType = $validated['document_type'];
        $programId = $supervisor->program_id;

        $existing = DocumentTemplate::query()
            ->where('program_id', $programId)
            ->where('document_type', $documentType)
            ->first();

        if ($existing && $existing->file_path && Storage::disk('local')->exists($existing->file_path)) {
            Storage::disk('local')->delete($existing->file_path);
        }

        $path = $file->store("document-templates/{$programId}", 'local');

        DocumentTemplate::updateOrCreate(
            [
                'program_id' => $programId,
                'document_type' => $documentType,
            ],
            [
                'original_filename' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_size_bytes' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'uploaded_by' => $request->user()->id,
                'instructions' => $validated['instructions'] ?? null,
            ]
        );

        $docConfig = InternDocument::getTypeConfig($documentType);
        $docName = $docConfig['name'] ?? 'Document';

        return back()->with('success', "Blank template for {$docName} saved successfully.");
    }

    public function download(Request $request, DocumentTemplate $documentTemplate): BinaryFileResponse
    {
        $user = $request->user();

        if (! $user->isAdmin()) {
            if (! $user->isSupervisor()) {
                abort(403, 'Unauthorized access.');
            }
            $supervisor = $user->supervisorProfile;
            if (! $supervisor || $supervisor->program_id !== $documentTemplate->program_id) {
                abort(403, 'Unauthorized access to this program template.');
            }
        }

        if (! Storage::disk('local')->exists($documentTemplate->file_path)) {
            abort(404, 'Template file not found.');
        }

        $fullPath = Storage::disk('local')->path($documentTemplate->file_path);

        return response()->download($fullPath, $documentTemplate->original_filename);
    }

    public function destroy(Request $request, DocumentTemplate $documentTemplate): RedirectResponse
    {
        $user = $request->user();
        $supervisor = $user->supervisorProfile;

        if (! $user->isAdmin()) {
            if (! $supervisor || ! $supervisor->isOjtSupervisor() || $supervisor->program_id !== $documentTemplate->program_id) {
                abort(403, 'Unauthorized action.');
            }
        }

        if ($documentTemplate->file_path && Storage::disk('local')->exists($documentTemplate->file_path)) {
            Storage::disk('local')->delete($documentTemplate->file_path);
        }

        $docConfig = InternDocument::getTypeConfig($documentTemplate->document_type);
        $docName = $docConfig['name'] ?? 'Document';

        $documentTemplate->delete();

        return back()->with('success', "Blank template for {$docName} removed.");
    }
}
