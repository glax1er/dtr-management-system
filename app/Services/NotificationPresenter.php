<?php

namespace App\Services;

use App\Models\ResolutionTicket;
use Illuminate\Support\Collection;

class NotificationPresenter
{
    /**
     * Format a collection of database notifications into a consistent structure for Inertia.
     *
     * @param Collection<\Illuminate\Notifications\DatabaseNotification> $notifications
     * @return array<int, array<string, mixed>>
     */
    public static function formatCollection(Collection $notifications): array
    {
        $ticketIds = $notifications
            ->map(fn ($n) => $n->data['resolution_ticket_id'] ?? null)
            ->filter()
            ->unique()
            ->values();

        $tickets = $ticketIds->isNotEmpty()
            ? ResolutionTicket::query()
                ->whereIn('id', $ticketIds)
                ->with('resolvedBy')
                ->get()
                ->keyBy('id')
            : collect();

        $timezone = config('dtr.timezone');

        return $notifications->map(function ($notification) use ($tickets, $timezone) {
            $data = $notification->data ?? [];
            $ticketId = $data['resolution_ticket_id'] ?? null;
            $ticket = $ticketId ? $tickets->get($ticketId) : null;

            if ($ticket) {
                $data['resolution_ticket_id'] = $data['resolution_ticket_id'] ?? $ticket->id;
                $data['date'] = $data['date'] ?? $ticket->date?->toDateString();
                $data['proposed_time_in'] = $data['proposed_time_in'] ?? $ticket->proposed_time_in?->clone()->setTimezone($timezone)->format('g:i A');
                $data['proposed_time_out'] = $data['proposed_time_out'] ?? $ticket->proposed_time_out?->clone()->setTimezone($timezone)->format('g:i A');
                $data['reason'] = $data['reason'] ?? $ticket->reason;
                $data['rejection_reason'] = $data['rejection_reason'] ?? $ticket->rejection_reason;
                $data['rejected_by'] = $data['rejected_by'] ?? $ticket->resolvedBy?->name ?? 'Supervisor';
                $data['resolved_at'] = $data['resolved_at'] ?? $ticket->resolved_at?->toISOString();
                $data['status'] = $data['status'] ?? $ticket->status;
            }

            return [
                'id' => $notification->id,
                'type' => $data['type'] ?? 'general',
                'title' => $data['title'] ?? 'Notification',
                'message' => $data['message'] ?? '',
                'href' => $data['href'] ?? '/dashboard',
                'read_at' => $notification->read_at?->toISOString(),
                'created_at' => $notification->created_at?->toISOString(),
                'data' => $data,
            ];
        })->values()->all();
    }
}
