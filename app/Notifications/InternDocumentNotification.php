<?php

namespace App\Notifications;

use App\Models\InternDocument;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class InternDocumentNotification extends Notification
{
    use Queueable;

    public const DOCUMENT_SUBMITTED = 'document_submitted';
    public const DOCUMENT_APPROVED = 'document_approved';
    public const DOCUMENT_REJECTED = 'document_rejected';

    public function __construct(
        public InternDocument $internDocument,
        public string $event,
        public ?User $actor = null,
        public ?string $docName = null,
        public ?string $reason = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $docName = $this->docName ?? 'Document';
        $actorName = $this->actor?->name ?? 'Someone';

        return match ($this->event) {
            self::DOCUMENT_SUBMITTED => [
                'type' => 'document_submitted',
                'title' => "Document submitted: {$docName}",
                'message' => "{$actorName} submitted {$docName} for review.",
                'href' => "/documents/intern/{$this->internDocument->user_id}",
                'intern_document_id' => $this->internDocument->id,
                'intern_user_id' => $this->internDocument->user_id,
            ],
            self::DOCUMENT_APPROVED => [
                'type' => 'document_approved',
                'title' => "Document approved: {$docName}",
                'message' => "Your {$docName} has been approved.",
                'href' => '/intern/documents',
                'intern_document_id' => $this->internDocument->id,
                'intern_user_id' => $this->internDocument->user_id,
            ],
            self::DOCUMENT_REJECTED => [
                'type' => 'document_rejected',
                'title' => "Document needs revision: {$docName}",
                'message' => ! empty($this->reason)
                    ? "Your {$docName} needs revision: {$this->reason}"
                    : "Your {$docName} was rejected and needs revision.",
                'href' => '/intern/documents',
                'intern_document_id' => $this->internDocument->id,
                'intern_user_id' => $this->internDocument->user_id,
                'rejection_reason' => $this->reason,
            ],
            default => [
                'type' => 'document_update',
                'title' => "Document update: {$docName}",
                'message' => "Your {$docName} status was updated.",
                'href' => '/intern/documents',
                'intern_document_id' => $this->internDocument->id,
            ],
        };
    }
}
