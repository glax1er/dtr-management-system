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
        $dateStr = $this->ticket->date->toDateString();
        $monthStr = substr($dateStr, 0, 7);

        return match ($this->event) {
            self::REQUEST_SUBMITTED => [
                'type' => 'resolution_ticket',
                'title' => "Resolution request from {$this->ticket->intern->name}",
                'message' => "Request submitted for {$dateStr}.",
                'href' => "/supervisor/resolution-tickets?highlight={$this->ticket->id}",
                'resolution_ticket_id' => $this->ticket->id,
            ],
            self::REQUEST_APPROVED => [
                'type' => 'resolution_ticket',
                'title' => 'Your resolution request was approved',
                'message' => "Your request for {$dateStr} was approved.",
                'href' => "/intern/dashboard?month={$monthStr}&highlight_date={$dateStr}&highlight_ticket={$this->ticket->id}",
                'resolution_ticket_id' => $this->ticket->id,
            ],
            self::REQUEST_REJECTED => [
                'type' => 'resolution_ticket',
                'title' => 'Your resolution request was rejected',
                'message' => "Your request for {$dateStr} was rejected.",
                'href' => "/intern/dashboard?month={$monthStr}&highlight_date={$dateStr}&highlight_ticket={$this->ticket->id}",
                'resolution_ticket_id' => $this->ticket->id,
            ],
            default => [
                'type' => 'resolution_ticket',
                'title' => 'Resolution ticket update',
                'message' => "Your resolution ticket for {$dateStr} was updated.",
                'href' => "/intern/dashboard?month={$monthStr}&highlight_date={$dateStr}&highlight_ticket={$this->ticket->id}",
                'resolution_ticket_id' => $this->ticket->id,
            ],
        };
    }
}
