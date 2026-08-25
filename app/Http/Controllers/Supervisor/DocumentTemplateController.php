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
        $programId = $supervisor->program_id;

        // Active templates
        $templates = DocumentTemplate::query()
            ->where('program_id', $programId)
            ->get()
            ->keyBy('document_type');

        // Archived / soft-deleted templates
        $archivedTemplates = DocumentTemplate::onlyTrashed()
            ->where('program_id', $programId)
            ->with('uploader')
            ->orderBy('deleted_at', 'desc')
            ->get();

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

        // Distinct categories / folders metadata
        $categories = array_values(array_unique(array_column($checklist, 'category')));
        $folders = [];
        foreach ($categories as $categoryName) {
            $catItems = array_values(array_filter($checklist, fn ($item) => $item['category'] === $categoryName));
            $folders[] = [
                'name' => $categoryName,
                'total_items' => count($catItems),
                'templates_count' => count(array_filter($catItems, fn ($item) => $item['has_template'])),
                'required_count' => count(array_filter($catItems, fn ($item) => $item['required'])),
            ];
        }

        // Archived templates list for Trash/Archives view
        $archived = $archivedTemplates->map(fn (DocumentTemplate $t) => [
            'id' => $t->id,
            'document_type' => $t->document_type,
            'name' => InternDocument::getTypeConfig($t->document_type)['name'] ?? $t->document_type,
            'category' => InternDocument::getTypeConfig($t->document_type)['category'] ?? 'General',
            'original_filename' => $t->original_filename,
            'file_size' => $t->formatted_file_size,
            'file_extension' => $t->file_extension,
            'instructions' => $t->instructions,
            'deleted_at' => $t->deleted_at?->format('M d, Y g:i A'),
            'deleted_at_human' => $t->deleted_at?->diffForHumans(),
            'uploaded_by_name' => $t->uploader?->name ?? 'Supervisor',
        ])->values()->all();

        return Inertia::render('supervisor/document-templates', [
            'checklist' => $checklist,
            'folders' => $folders,
            'archived' => $archived,
            'program' => [
                'program_id' => $program?->program_id,
                'program_name' => $program?->program_name ?? 'My Program',
            ],
            'total_templates' => $templates->count(),
            'total_types' => count(InternDocument::DOCUMENT_TYPES),
            'total_archived' => $archivedTemplates->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $supervisor = $request->user()->supervisorProfile;

        if (! $supervisor || ! $supervisor->isOjtSupervisor()) {
            abort(403, 'Only OJT Program Supervisors can upload document templates.');
        }

        $programId = $supervisor->program_id;
        $documentType = $request->input('document_type');

        $existing = DocumentTemplate::withTrashed()
            ->where('program_id', $programId)
            ->where('document_type', $documentType)
            ->first();

        $isFileRequired = ! $existing || $existing->trashed();

        $validated = $request->validate([
            'document_type' => ['required', 'string', Rule::in(array_keys(InternDocument::DOCUMENT_TYPES))],
            'file' => [
                $isFileRequired ? 'required' : 'nullable',
                'file',
                'mimes:pdf,docx,doc',
                'max:15360', // 15MB
            ],
            'instructions' => ['nullable', 'string', 'max:500'],
        ], [
            'file.required' => 'Please select a template file to upload.',
            'file.mimes' => 'The template must be a PDF or Microsoft Word document (.pdf, .docx, .doc).',
            'file.max' => 'The template file size must not exceed 15 MB.',
        ]);

        $docConfig = InternDocument::getTypeConfig($documentType);
        $docName = $docConfig['name'] ?? 'Document';

        if ($request->hasFile('file')) {
            $file = $request->file('file');

            if ($existing && $existing->file_path && Storage::disk('local')->exists($existing->file_path)) {
                Storage::disk('local')->delete($existing->file_path);
            }

            $path = $file->store("document-templates/{$programId}", 'local');

            if ($existing) {
                $existing->original_filename = $file->getClientOriginalName();
                $existing->file_path = $path;
                $existing->file_size_bytes = $file->getSize();
                $existing->mime_type = $file->getMimeType();
                $existing->uploaded_by = $request->user()->id;
                $existing->instructions = $validated['instructions'] ?? null;

                if ($existing->trashed()) {
                    $existing->restore();
                }

                $existing->save();
            } else {
                DocumentTemplate::create([
                    'program_id' => $programId,
                    'document_type' => $documentType,
                    'original_filename' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_size_bytes' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'uploaded_by' => $request->user()->id,
                    'instructions' => $validated['instructions'] ?? null,
                ]);
            }
        } else {
            // Only updating instructions on active existing template
            if ($existing && ! $existing->trashed()) {
                $existing->instructions = $validated['instructions'] ?? null;
                $existing->save();
            }
        }

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

        $docConfig = InternDocument::getTypeConfig($documentTemplate->document_type);
        $docName = $docConfig['name'] ?? 'Document';

        // Soft delete moves template to archive/trash without deleting physical file
        $documentTemplate->delete();

        return back()->with('success', "Blank template for {$docName} moved to archive.");
    }

    public function restore(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        $supervisor = $user->supervisorProfile;

        $template = DocumentTemplate::onlyTrashed()->findOrFail($id);

        if (! $user->isAdmin()) {
            if (! $supervisor || ! $supervisor->isOjtSupervisor() || $supervisor->program_id !== $template->program_id) {
                abort(403, 'Unauthorized action.');
            }
        }

        $template->restore();

        $docConfig = InternDocument::getTypeConfig($template->document_type);
        $docName = $docConfig['name'] ?? 'Document';

        return back()->with('success', "Blank template for {$docName} restored successfully.");
    }

    public function forceDelete(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        $supervisor = $user->supervisorProfile;

        $template = DocumentTemplate::onlyTrashed()->findOrFail($id);

        if (! $user->isAdmin()) {
            if (! $supervisor || ! $supervisor->isOjtSupervisor() || $supervisor->program_id !== $template->program_id) {
                abort(403, 'Unauthorized action.');
            }
        }

        if ($template->file_path && Storage::disk('local')->exists($template->file_path)) {
            Storage::disk('local')->delete($template->file_path);
        }

        $docConfig = InternDocument::getTypeConfig($template->document_type);
        $docName = $docConfig['name'] ?? 'Document';

        $template->forceDelete();

        return back()->with('success', "Blank template for {$docName} permanently deleted.");
    }
}
