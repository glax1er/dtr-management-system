<?php

namespace App\Http\Controllers;

use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\User;
use App\Notifications\InternDocumentNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentReviewController extends Controller
{
    public function showInternDocuments(Request $request, int $internUserId): JsonResponse
    {
        $user = $request->user();
        $internProfile = InternProfile::with(['user', 'hte', 'program'])->where('user_id', $internUserId)->firstOrFail();

        if (! $user->isSupervisor()) {
            abort(403, 'Unauthorized. Only supervisors can review intern documents.');
        }
        $supervisor = $user->supervisorProfile;
        if (! $supervisor) {
            abort(403, 'Supervisor profile not found.');
        }
        if ($supervisor->isOjtSupervisor()) {
            if ($internProfile->program_id !== $supervisor->program_id) {
                abort(403, 'Intern is not under your program.');
            }
        } else {
            if ($internProfile->hte_id !== $supervisor->hte_id) {
                abort(403, 'Intern is not under your HTE.');
            }
        }

        $uploadedDocs = InternDocument::query()
            ->where('user_id', $internUserId)
            ->get()
            ->keyBy('document_type');

        $documentTypes = InternDocument::getDocumentTypesForProgram($internProfile->program_id);
        $checklist = [];
        foreach ($documentTypes as $typeKey => $typeConfig) {
            $uploaded = $uploadedDocs->get($typeKey);
            $checklist[] = [
                'document_type' => $typeKey,
                'name' => $typeConfig['name'],
                'category' => $typeConfig['category'],
                'description' => $typeConfig['description'],
                'required' => $typeConfig['required'],
                'status' => $uploaded ? $uploaded->status : 'missing',
                'id' => $uploaded?->id,
                'original_filename' => $uploaded?->original_filename,
                'file_size' => $uploaded?->formatted_file_size,
                'rejection_reason' => $uploaded?->rejection_reason,
                'submitted_at' => $uploaded?->submitted_at?->diffForHumans(),
                'submitted_at_date' => $uploaded?->submitted_at?->format('M d, Y g:i A'),
                'reviewed_at' => $uploaded?->reviewed_at?->format('M d, Y g:i A'),
                'preview_url' => $uploaded ? route('documents.review.preview', $uploaded->id) : null,
                'download_url' => $uploaded ? route('documents.review.download', $uploaded->id) : null,
            ];
        }

        return response()->json([
            'intern' => [
                'user_id' => $internProfile->user_id,
                'name' => $internProfile->user->name,
                'id_number' => $internProfile->id_number,
                'program' => $internProfile->program?->program_name ?? 'N/A',
                'hte' => $internProfile->hte?->hte_name ?? 'N/A',
            ],
            'checklist' => $checklist,
        ]);
    }

    private function canAccessDocument(User $user, InternDocument $internDocument): bool
    {
        if ($user->isSupervisor()) {
            $supervisorProfile = $user->supervisorProfile;
            if (! $supervisorProfile) {
                return false;
            }

            $internProfile = InternProfile::where('user_id', $internDocument->user_id)->first();
            if (! $internProfile) {
                return false;
            }

            if ($supervisorProfile->isOjtSupervisor()) {
                return $internProfile->program_id === $supervisorProfile->program_id;
            }

            return $internProfile->hte_id === $supervisorProfile->hte_id;
        }

        return $user->id === $internDocument->user_id;
    }

    public function preview(Request $request, InternDocument $internDocument): BinaryFileResponse
    {
        if (! $this->canAccessDocument($request->user(), $internDocument)) {
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
        if (! $this->canAccessDocument($request->user(), $internDocument)) {
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

    public function approve(Request $request, InternDocument $internDocument): RedirectResponse
    {
        $user = $request->user();

        if (! $user->isSupervisor()) {
            abort(403, 'Only supervisors can approve documents.');
        }

        if (! $this->canAccessDocument($user, $internDocument)) {
            abort(403, 'Unauthorized access to this document.');
        }

        $internDocument->update([
            'status' => InternDocument::STATUS_APPROVED,
            'rejection_reason' => null,
            'reviewed_by' => $user->id,
            'reviewed_at' => Carbon::now(),
        ]);

        $docConfig = InternDocument::getTypeConfig($internDocument->document_type);
        $docName = $docConfig['name'] ?? 'Document';

        // Notify intern of approval
        if ($internDocument->user?->wantsNotification('document_updates')) {
            $internDocument->user->notify(
                new InternDocumentNotification(
                    internDocument: $internDocument,
                    event: InternDocumentNotification::DOCUMENT_APPROVED,
                    actor: $user,
                    docName: $docName,
                )
            );
        }

        return back()->with('success', "{$docName} approved successfully.");
    }

    public function reject(Request $request, InternDocument $internDocument): RedirectResponse
    {
        $user = $request->user();

        if (! $user->isSupervisor()) {
            abort(403, 'Only supervisors can reject documents.');
        }

        if (! $this->canAccessDocument($user, $internDocument)) {
            abort(403, 'Unauthorized access to this document.');
        }

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500'],
        ], [
            'rejection_reason.required' => 'Please provide a reason or remarks for rejection so the intern can correct it.',
        ]);

        $internDocument->update([
            'status' => InternDocument::STATUS_REJECTED,
            'rejection_reason' => trim($validated['rejection_reason']),
            'reviewed_by' => $user->id,
            'reviewed_at' => Carbon::now(),
        ]);

        $docConfig = InternDocument::getTypeConfig($internDocument->document_type);
        $docName = $docConfig['name'] ?? 'Document';

        // Notify intern of rejection / revision needed
        if ($internDocument->user?->wantsNotification('document_updates')) {
            $internDocument->user->notify(
                new InternDocumentNotification(
                    internDocument: $internDocument,
                    event: InternDocumentNotification::DOCUMENT_REJECTED,
                    actor: $user,
                    docName: $docName,
                    reason: trim($validated['rejection_reason']),
                )
            );
        }

        return back()->with('success', "{$docName} marked as needs revision.");
    }
}
