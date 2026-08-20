<?php

namespace App\Http\Controllers\Intern;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Models\InternDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $internProfile = $user->internProfile()->with(['hte', 'program'])->first();

        $uploadedDocs = InternDocument::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('document_type');

        // Fetch blank templates for this intern's academic program
        $templates = $internProfile?->program_id
            ? DocumentTemplate::query()
                ->where('program_id', $internProfile->program_id)
                ->get()
                ->keyBy('document_type')
            : collect();

        $checklist = [];
        $totalRequired = 0;
        $approvedRequired = 0;
        $totalSubmitted = 0;
        $totalApproved = 0;

        foreach (InternDocument::DOCUMENT_TYPES as $typeKey => $typeConfig) {
            $uploaded = $uploadedDocs->get($typeKey);
            $template = $templates->get($typeKey);
            $isRequired = $typeConfig['required'];

            if ($isRequired) {
                $totalRequired++;
                if ($uploaded && $uploaded->isApproved()) {
                    $approvedRequired++;
                }
            }

            if ($uploaded) {
                $totalSubmitted++;
                if ($uploaded->isApproved()) {
                    $totalApproved++;
                }
            }

            $checklist[] = [
                'document_type' => $typeKey,
                'name' => $typeConfig['name'],
                'category' => $typeConfig['category'],
                'description' => $typeConfig['description'],
                'required' => $isRequired,
                'status' => $uploaded ? $uploaded->status : 'missing',
                'id' => $uploaded?->id,
                'original_filename' => $uploaded?->original_filename,
                'file_size' => $uploaded?->formatted_file_size,
                'rejection_reason' => $uploaded?->rejection_reason,
                'submitted_at' => $uploaded?->submitted_at?->diffForHumans(),
                'submitted_at_date' => $uploaded?->submitted_at?->format('M d, Y g:i A'),
                'reviewed_at' => $uploaded?->reviewed_at?->format('M d, Y g:i A'),
                'preview_url' => $uploaded ? route('intern.documents.preview', $uploaded->id) : null,
                'download_url' => $uploaded ? route('intern.documents.download', $uploaded->id) : null,
                // Blank Template data
                'has_template' => $template !== null,
                'template_id' => $template?->id,
                'template_filename' => $template?->original_filename,
                'template_size' => $template?->formatted_file_size,
                'template_extension' => $template?->file_extension,
                'template_instructions' => $template?->instructions,
                'template_download_url' => $template ? route('intern.documents.template.download', $template->id) : null,
            ];
        }

        $progressPercentage = $totalRequired > 0
            ? (int) round(($approvedRequired / $totalRequired) * 100)
            : 0;

        return Inertia::render('intern/documents/index', [
            'checklist' => $checklist,
            'stats' => [
                'total_required' => $totalRequired,
                'approved_required' => $approvedRequired,
                'total_submitted' => $totalSubmitted,
                'total_approved' => $totalApproved,
                'progress_percentage' => $progressPercentage,
                'is_all_required_approved' => $approvedRequired >= $totalRequired && $totalRequired > 0,
            ],
            'profile' => [
                'name' => $user->name,
                'id_number' => $internProfile?->id_number,
                'hte_name' => $internProfile?->hte?->hte_name ?? 'Not Assigned',
                'program_name' => $internProfile?->program?->program_name ?? 'Not Assigned',
            ],
        ]);
    }

    public function downloadTemplate(Request $request, DocumentTemplate $documentTemplate): BinaryFileResponse
    {
        $user = $request->user();
        $internProfile = $user->internProfile;

        if (! $internProfile || $internProfile->program_id !== $documentTemplate->program_id) {
            abort(403, 'Unauthorized access to this template.');
        }

        if (! Storage::disk('local')->exists($documentTemplate->file_path)) {
            abort(404, 'Template file not found on server.');
        }

        $fullPath = Storage::disk('local')->path($documentTemplate->file_path);

        return response()->download($fullPath, $documentTemplate->original_filename);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'document_type' => ['required', 'string', Rule::in(array_keys(InternDocument::DOCUMENT_TYPES))],
            'file' => [
                'required',
                'file',
                'mimes:pdf',
                'mimetypes:application/pdf',
                'max:10240', // 10MB
            ],
        ], [
            'file.mimes' => 'The uploaded file must strictly be a PDF document (.pdf).',
            'file.mimetypes' => 'The uploaded file must strictly be a PDF document (.pdf).',
            'file.max' => 'The PDF document must not exceed 10 MB in file size.',
        ]);

        $user = $request->user();
        $file = $request->file('file');
        $documentType = $validated['document_type'];

        $existingDoc = InternDocument::query()
            ->where('user_id', $user->id)
            ->where('document_type', $documentType)
            ->first();

        // Remove old stored file if replacing
        if ($existingDoc && $existingDoc->file_path && Storage::disk('local')->exists($existingDoc->file_path)) {
            Storage::disk('local')->delete($existingDoc->file_path);
        }

        $path = $file->store("intern-documents/{$user->id}", 'local');

        InternDocument::updateOrCreate(
            [
                'user_id' => $user->id,
                'document_type' => $documentType,
            ],
            [
                'original_filename' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_size_bytes' => $file->getSize(),
                'mime_type' => 'application/pdf',
                'status' => InternDocument::STATUS_PENDING,
                'rejection_reason' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'submitted_at' => Carbon::now(),
            ]
        );

        $docConfig = InternDocument::getTypeConfig($documentType);
        $docName = $docConfig['name'] ?? 'Document';

        return back()->with('success', "{$docName} uploaded successfully and submitted for review.");
    }

    public function preview(Request $request, InternDocument $internDocument): BinaryFileResponse
    {
        if ($internDocument->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized access to this document.');
        }

        if (! Storage::disk('local')->exists($internDocument->file_path)) {
            abort(404, 'Document file not found.');
        }

        $fullPath = Storage::disk('local')->path($internDocument->file_path);

        return response()->file($fullPath, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . addslashes($internDocument->original_filename) . '"',
        ]);
    }

    public function download(Request $request, InternDocument $internDocument): BinaryFileResponse
    {
        if ($internDocument->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized access to this document.');
        }

        if (! Storage::disk('local')->exists($internDocument->file_path)) {
            abort(404, 'Document file not found.');
        }

        $fullPath = Storage::disk('local')->path($internDocument->file_path);

        return response()->download($fullPath, $internDocument->original_filename, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    public function destroy(Request $request, InternDocument $internDocument): RedirectResponse
    {
        if ($internDocument->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized action.');
        }

        if ($internDocument->file_path && Storage::disk('local')->exists($internDocument->file_path)) {
            Storage::disk('local')->delete($internDocument->file_path);
        }

        $docConfig = InternDocument::getTypeConfig($internDocument->document_type);
        $docName = $docConfig['name'] ?? 'Document';

        $internDocument->delete();

        return back()->with('success', "{$docName} removed.");
    }
}
