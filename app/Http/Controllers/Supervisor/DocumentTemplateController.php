<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Models\InternDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

        // Active templates in database
        $templates = DocumentTemplate::query()
            ->where('program_id', $programId)
            ->get()
            ->keyBy('document_type');

        // Archived / soft-deleted templates in database
        $archivedTemplates = DocumentTemplate::onlyTrashed()
            ->where('program_id', $programId)
            ->with('uploader')
            ->orderBy('deleted_at', 'desc')
            ->get();

        $trashedKeys = $archivedTemplates->pluck('document_type')->all();

        $checklist = [];

        // 1. Predefined types (unless archived)
        foreach (InternDocument::DOCUMENT_TYPES as $typeKey => $typeConfig) {
            if (in_array($typeKey, $trashedKeys, true)) {
                continue;
            }

            $template = $templates->get($typeKey);

            $checklist[] = [
                'document_type' => $typeKey,
                'name' => $template?->name ?: $typeConfig['name'],
                'category' => $template?->category ?: $typeConfig['category'],
                'description' => $template?->description ?: $typeConfig['description'],
                'required' => $template ? (bool) $template->required : (bool) $typeConfig['required'],
                'is_custom' => false,
                'template_id' => $template?->id,
                'has_template' => $template !== null && ! empty($template->file_path),
                'original_filename' => $template?->original_filename,
                'file_size' => $template?->formatted_file_size,
                'file_extension' => $template?->file_extension,
                'instructions' => $template?->instructions,
                'uploaded_at' => $template?->updated_at?->format('M d, Y g:i A'),
                'download_url' => $template && ! empty($template->file_path) ? route('supervisor.document-templates.download', $template->id) : null,
            ];
        }

        // 2. Custom active types
        foreach ($templates as $typeKey => $template) {
            if ($template->is_custom) {
                $checklist[] = [
                    'document_type' => $typeKey,
                    'name' => $template->display_name,
                    'category' => $template->display_category,
                    'description' => $template->display_description,
                    'required' => (bool) $template->required,
                    'is_custom' => true,
                    'template_id' => $template->id,
                    'has_template' => ! empty($template->file_path),
                    'original_filename' => $template->original_filename,
                    'file_size' => $template->formatted_file_size,
                    'file_extension' => $template->file_extension,
                    'instructions' => $template->instructions,
                    'uploaded_at' => $template->updated_at?->format('M d, Y g:i A'),
                    'download_url' => ! empty($template->file_path) ? route('supervisor.document-templates.download', $template->id) : null,
                ];
            }
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

        // Archived list for Trash/Archives view
        $archived = $archivedTemplates->map(function (DocumentTemplate $t) {
            $preConfig = InternDocument::DOCUMENT_TYPES[$t->document_type] ?? null;

            return [
                'id' => $t->id,
                'document_type' => $t->document_type,
                'name' => $t->name ?: ($preConfig['name'] ?? $t->document_type),
                'category' => $t->category ?: ($preConfig['category'] ?? 'General'),
                'description' => $t->description ?: ($preConfig['description'] ?? ''),
                'required' => (bool) ($t->required ?? ($preConfig['required'] ?? true)),
                'is_custom' => (bool) $t->is_custom,
                'has_template' => ! empty($t->file_path),
                'original_filename' => $t->original_filename,
                'file_size' => $t->formatted_file_size,
                'file_extension' => $t->file_extension,
                'instructions' => $t->instructions,
                'deleted_at' => $t->deleted_at?->format('M d, Y g:i A'),
                'deleted_at_human' => $t->deleted_at?->diffForHumans(),
                'uploaded_by_name' => $t->uploader?->name ?? 'Supervisor',
            ];
        })->values()->all();

        return Inertia::render('supervisor/document-templates', [
            'checklist' => $checklist,
            'folders' => $folders,
            'archived' => $archived,
            'categories' => $categories,
            'program' => [
                'program_id' => $program?->program_id,
                'program_name' => $program?->program_name ?? 'My Program',
            ],
            'total_templates' => count(array_filter($checklist, fn ($item) => $item['has_template'])),
            'total_types' => count($checklist),
            'total_archived' => count($archived),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $supervisor = $request->user()->supervisorProfile;

        if (! $supervisor || ! $supervisor->isOjtSupervisor()) {
            abort(403, 'Only OJT Program Supervisors can manage document requirements.');
        }

        $programId = $supervisor->program_id;
        $documentType = $request->input('document_type');

        // Check if this is a template upload for an existing predefined or custom type
        if ($documentType && (array_key_exists($documentType, InternDocument::DOCUMENT_TYPES) || DocumentTemplate::where('program_id', $programId)->where('document_type', $documentType)->exists())) {
            $existing = DocumentTemplate::withTrashed()
                ->where('program_id', $programId)
                ->where('document_type', $documentType)
                ->first();

            $validated = $request->validate([
                'document_type' => ['required', 'string'],
                'file' => [
                    'nullable',
                    'file',
                    'mimes:pdf,docx,doc',
                    'max:15360', // 15MB
                ],
                'instructions' => ['nullable', 'string', 'max:1000'],
                'name' => ['nullable', 'string', 'max:150'],
                'category' => ['nullable', 'string', 'max:100'],
                'description' => ['nullable', 'string', 'max:500'],
                'required' => ['nullable', 'boolean'],
            ], [
                'file.mimes' => 'The template must be a PDF or Microsoft Word document (.pdf, .docx, .doc).',
                'file.max' => 'The template file size must not exceed 15 MB.',
            ]);

            $docConfig = InternDocument::getTypeConfig($documentType, $programId);
            $docName = $validated['name'] ?? ($docConfig['name'] ?? 'Document');

            if ($request->hasFile('file')) {
                $file = $request->file('file');

                // Store the new file and confirm it actually saved before
                // touching the old one — store() returns false on failure
                // rather than throwing, and doing this the other way
                // around (delete-old-then-store-new) would leave the
                // template with no file at all if the new upload failed.
                $path = $file->store("document-templates/{$programId}", 'local');

                if ($path === false) {
                    return back()->withErrors([
                        'file' => 'The file could not be saved. Please try again.',
                    ]);
                }

                if ($existing && $existing->file_path && Storage::disk('local')->exists($existing->file_path)) {
                    Storage::disk('local')->delete($existing->file_path);
                }

                if ($existing) {
                    $existing->original_filename = $file->getClientOriginalName();
                    $existing->file_path = $path;
                    $existing->file_size_bytes = $file->getSize();
                    $existing->mime_type = $file->getMimeType();
                    $existing->uploaded_by = $request->user()->id;
                    if (isset($validated['instructions'])) {
                        $existing->instructions = $validated['instructions'];
                    }
                    if (! empty($validated['name'])) {
                        $existing->name = $validated['name'];
                    }
                    if (! empty($validated['category'])) {
                        $existing->category = $validated['category'];
                    }
                    if (isset($validated['description'])) {
                        $existing->description = $validated['description'];
                    }
                    if (isset($validated['required'])) {
                        $existing->required = $request->boolean('required', true);
                    }

                    if ($existing->trashed()) {
                        $existing->restore();
                    }

                    $existing->save();
                } else {
                    $isPredefined = array_key_exists($documentType, InternDocument::DOCUMENT_TYPES);
                    DocumentTemplate::create([
                        'program_id' => $programId,
                        'document_type' => $documentType,
                        'name' => $validated['name'] ?? ($docConfig['name'] ?? null),
                        'category' => $validated['category'] ?? ($docConfig['category'] ?? null),
                        'description' => $validated['description'] ?? ($docConfig['description'] ?? null),
                        'required' => isset($validated['required']) ? $request->boolean('required', true) : ($docConfig['required'] ?? true),
                        'is_custom' => ! $isPredefined,
                        'original_filename' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_size_bytes' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                        'uploaded_by' => $request->user()->id,
                        'instructions' => $validated['instructions'] ?? null,
                    ]);
                }
            } else {
                // Updating metadata or instructions
                if ($existing && ! $existing->trashed()) {
                    if (isset($validated['instructions'])) {
                        $existing->instructions = $validated['instructions'];
                    }
                    if (! empty($validated['name'])) {
                        $existing->name = $validated['name'];
                    }
                    if (! empty($validated['category'])) {
                        $existing->category = $validated['category'];
                    }
                    if (isset($validated['description'])) {
                        $existing->description = $validated['description'];
                    }
                    if (isset($validated['required'])) {
                        $existing->required = $request->boolean('required', true);
                    }
                    $existing->save();
                }
            }

            return back()->with('success', "Document requirement for {$docName} saved successfully.");
        }

        // Creating a brand new document requirement (custom)
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'required' => ['nullable', 'boolean'],
            'instructions' => ['nullable', 'string', 'max:1000'],
            'file' => [
                'nullable',
                'file',
                'mimes:pdf,docx,doc',
                'max:15360', // 15MB
            ],
        ], [
            'name.required' => 'Please enter a document title.',
            'category.required' => 'Please select or enter a category.',
            'file.mimes' => 'The blank template must be a PDF or Microsoft Word document (.pdf, .docx, .doc).',
            'file.max' => 'The template file size must not exceed 15 MB.',
        ]);

        $baseSlug = Str::slug($validated['name'], '_');
        $slug = $baseSlug ?: 'custom_doc';
        $uniqueDocType = $slug;
        $counter = 1;

        while (
            array_key_exists($uniqueDocType, InternDocument::DOCUMENT_TYPES) ||
            DocumentTemplate::withTrashed()->where('program_id', $programId)->where('document_type', $uniqueDocType)->exists()
        ) {
            $uniqueDocType = "{$slug}_{$counter}";
            $counter++;
        }

        $filePath = null;
        $originalFilename = null;
        $fileSizeBytes = null;
        $mimeType = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filePath = $file->store("document-templates/{$programId}", 'local');

            if ($filePath === false) {
                return back()->withErrors([
                    'file' => 'The file could not be saved. Please try again.',
                ]);
            }

            $originalFilename = $file->getClientOriginalName();
            $fileSizeBytes = $file->getSize();
            $mimeType = $file->getMimeType();
        }

        DocumentTemplate::create([
            'program_id' => $programId,
            'document_type' => $uniqueDocType,
            'name' => $validated['name'],
            'category' => $validated['category'],
            'description' => $validated['description'] ?? null,
            'required' => $request->boolean('required', true),
            'is_custom' => true,
            'original_filename' => $originalFilename,
            'file_path' => $filePath,
            'file_size_bytes' => $fileSizeBytes,
            'mime_type' => $mimeType,
            'uploaded_by' => $request->user()->id,
            'instructions' => $validated['instructions'] ?? null,
        ]);

        return back()->with('success', "Document requirement \"{$validated['name']}\" created successfully.");
    }

    public function update(Request $request, string $documentType): RedirectResponse
    {
        $supervisor = $request->user()->supervisorProfile;

        if (! $supervisor || ! $supervisor->isOjtSupervisor()) {
            abort(403, 'Only OJT Program Supervisors can manage document requirements.');
        }

        $programId = $supervisor->program_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'required' => ['nullable', 'boolean'],
            'instructions' => ['nullable', 'string', 'max:1000'],
            'file' => [
                'nullable',
                'file',
                'mimes:pdf,docx,doc',
                'max:15360', // 15MB
            ],
            'remove_template' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'Please enter a document title.',
            'category.required' => 'Please select or enter a category.',
            'file.mimes' => 'The blank template must be a PDF or Microsoft Word document (.pdf, .docx, .doc).',
            'file.max' => 'The template file size must not exceed 15 MB.',
        ]);

        $template = DocumentTemplate::where('program_id', $programId)
            ->where('document_type', $documentType)
            ->first();

        $isPredefined = array_key_exists($documentType, InternDocument::DOCUMENT_TYPES);

        if (! $template) {
            $template = new DocumentTemplate([
                'program_id' => $programId,
                'document_type' => $documentType,
                'is_custom' => ! $isPredefined,
            ]);
        }

        $template->name = $validated['name'];
        $template->category = $validated['category'];
        $template->description = $validated['description'] ?? null;
        $template->required = $request->boolean('required', true);
        $template->instructions = $validated['instructions'] ?? null;
        $template->uploaded_by = $request->user()->id;

        if ($request->hasFile('file')) {
            $file = $request->file('file');

            $path = $file->store("document-templates/{$programId}", 'local');

            if ($path === false) {
                return back()->withErrors([
                    'file' => 'The file could not be saved. Please try again.',
                ]);
            }

            if ($template->file_path && Storage::disk('local')->exists($template->file_path)) {
                Storage::disk('local')->delete($template->file_path);
            }
            $template->file_path = $path;
            $template->original_filename = $file->getClientOriginalName();
            $template->file_size_bytes = $file->getSize();
            $template->mime_type = $file->getMimeType();
        } elseif ($request->boolean('remove_template')) {
            if ($template->file_path && Storage::disk('local')->exists($template->file_path)) {
                Storage::disk('local')->delete($template->file_path);
            }
            $template->file_path = null;
            $template->original_filename = null;
            $template->file_size_bytes = null;
            $template->mime_type = null;
        }

        $template->save();

        return back()->with('success', "Document requirement \"{$validated['name']}\" updated successfully.");
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

        if (! $documentTemplate->file_path || ! Storage::disk('local')->exists($documentTemplate->file_path)) {
            abort(404, 'Template file not found.');
        }

        $fullPath = Storage::disk('local')->path($documentTemplate->file_path);

        return response()->download($fullPath, $documentTemplate->original_filename);
    }

    public function destroy(Request $request, string $documentType): RedirectResponse
    {
        $user = $request->user();
        $supervisor = $user->supervisorProfile;

        if (! $user->isAdmin()) {
            if (! $supervisor || ! $supervisor->isOjtSupervisor()) {
                abort(403, 'Unauthorized action.');
            }
        }

        $programId = $supervisor->program_id;

        // Check if $documentType is numeric ID or string key
        $template = is_numeric($documentType)
            ? DocumentTemplate::where('program_id', $programId)->find((int) $documentType)
            : DocumentTemplate::where('program_id', $programId)->where('document_type', $documentType)->first();

        if (! $template) {
            $typeKey = is_numeric($documentType) ? null : $documentType;
            if ($typeKey && array_key_exists($typeKey, InternDocument::DOCUMENT_TYPES)) {
                $config = InternDocument::DOCUMENT_TYPES[$typeKey];
                $template = DocumentTemplate::create([
                    'program_id' => $programId,
                    'document_type' => $typeKey,
                    'name' => $config['name'],
                    'category' => $config['category'],
                    'description' => $config['description'],
                    'required' => $config['required'],
                    'is_custom' => false,
                    'uploaded_by' => $user->id,
                ]);
                $template->delete();
                $docName = $config['name'];

                return back()->with('success', "Document requirement \"{$docName}\" moved to archive.");
            }

            abort(404, 'Document requirement not found.');
        }

        $docName = $template->display_name;
        $template->delete();

        return back()->with('success', "Document requirement \"{$docName}\" moved to archive.");
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

        $docName = $template->display_name;

        return back()->with('success', "Document requirement \"{$docName}\" restored successfully.");
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

        $docName = $template->display_name;
        $template->forceDelete();

        return back()->with('success', "Document requirement \"{$docName}\" permanently deleted.");
    }
}
