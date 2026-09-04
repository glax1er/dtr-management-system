<?php

namespace App\Notifications;

use App\Models\ResolutionTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ResolutionTicketNotification extends Notification
{
    use Queueable;

    public const REQUEST_SUBMITTED = 'request_submitted';

    public const REQUEST_APPROVED = 'request_approved';

    public const REQUEST_REJECTED = 'request_rejected';

    public function __construct(
        public ResolutionTicket $ticket,
        public string $event,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $timezone = config('dtr.timezone');

        return match ($this->event) {
            self::REQUEST_SUBMITTED => [
                'type' => 'resolution_ticket',
                'event' => self::REQUEST_SUBMITTED,
                'title' => "Resolution request from {$this->ticket->intern->name}",
                'message' => "Request submitted for {$this->ticket->date->toDateString()}.",
                'href' => '/supervisor/resolution-tickets',
                'resolution_ticket_id' => $this->ticket->id,
                'date' => $this->ticket->date->toDateString(),
            ],
            self::REQUEST_APPROVED => [
                'type' => 'resolution_ticket',
                'event' => self::REQUEST_APPROVED,
                'title' => 'Your resolution request was approved',
                'message' => "Your request for {$this->ticket->date->toDateString()} was approved.",
                'href' => '/intern/dashboard',
                'resolution_ticket_id' => $this->ticket->id,
                'date' => $this->ticket->date->toDateString(),
                'status' => ResolutionTicket::STATUS_APPROVED,
            ],
            self::REQUEST_REJECTED => [
                'type' => 'resolution_ticket',
                'event' => self::REQUEST_REJECTED,
                'title' => 'Your resolution request was rejected',
                'message' => $this->ticket->rejection_reason
                    ? "Reason: {$this->ticket->rejection_reason}"
                    : "Your request for {$this->ticket->date->toDateString()} was rejected.",
                'href' => '/intern/dashboard',
                'resolution_ticket_id' => $this->ticket->id,
                'rejection_reason' => $this->ticket->rejection_reason,
                'date' => $this->ticket->date->toDateString(),
                'proposed_time_in' => $this->ticket->proposed_time_in
                    ?->clone()
                    ->setTimezone($timezone)
                    ->format('g:i A'),
                'proposed_time_out' => $this->ticket->proposed_time_out
                    ?->clone()
                    ->setTimezone($timezone)
                    ->format('g:i A'),
                'reason' => $this->ticket->reason,
                'rejected_by' => $this->ticket->resolvedBy?->name ?? 'Supervisor',
                'resolved_at' => $this->ticket->resolved_at?->toISOString() ?? now()->toISOString(),
                'status' => ResolutionTicket::STATUS_REJECTED,
            ],
            default => [
                'type' => 'resolution_ticket',
                'event' => $this->event,
                'title' => 'Resolution ticket update',
                'message' => "Your resolution ticket for {$this->ticket->date->toDateString()} was updated.",
                'href' => '/intern/dashboard',
                'resolution_ticket_id' => $this->ticket->id,
            ],
        };
    }
}
