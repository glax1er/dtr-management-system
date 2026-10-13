<?php

namespace App\Services;

use App\Models\ResolutionTicket;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;

class NotificationPresenter
{
    /**
     * Ensure the notification's href URL includes a highlight query parameter.
     *
     * @param  array<string, mixed>  $data
     */
    public static function resolveHref(array $data): string
    {
        $href = $data['href'] ?? '/dashboard';
        $type = $data['type'] ?? '';

        // If href already has a highlight parameter, return as-is
        if (str_contains($href, 'highlight')) {
            return $href;
        }

        // 1. Resolution ticket notifications
        if ($type === 'resolution_ticket' || isset($data['resolution_ticket_id'])) {
            $ticketId = $data['resolution_ticket_id'] ?? null;
            $date = $data['date'] ?? null;

            if (! $date && $ticketId !== null) {
                $ticket = ResolutionTicket::query()->find($ticketId);
                if ($ticket instanceof ResolutionTicket) {
                    $date = $ticket->date?->toDateString();
                }
            }

            if (str_contains($href, '/supervisor/resolution-tickets') && $ticketId) {
                return "/supervisor/resolution-tickets?highlight={$ticketId}";
            }

            if (str_contains($href, '/intern/dashboard') && $date) {
                $month = substr($date, 0, 7);
                $params = ['month' => $month, 'highlight_date' => $date];
                if ($ticketId) {
                    $params['highlight_ticket'] = $ticketId;
                }

                return '/intern/dashboard?'.http_build_query($params);
            }
        }

        // 2. Two-factor reset request notifications
        if (($type === 'two_factor_reset' || str_contains($href, '/admin/two-factor-resets')) && ! empty($data['reset_request_id'])) {
            return "/admin/two-factor-resets?highlight={$data['reset_request_id']}";
        }

        // 3. College admin account notifications
        if (($type === 'college_admin_account' || str_contains($href, '/admin/college-admins')) && ! empty($data['target_admin_id'])) {
            $event = $data['event'] ?? '';
            if ($event !== 'deleted') {
                return "/admin/college-admins?highlight={$data['target_admin_id']}";
            }
        }

        // 4. Intern registration notifications
        if (($type === 'intern_registration' || str_contains($href, '/admin/interns')) && ! empty($data['intern_user_id'])) {
            return "/admin/interns?highlight={$data['intern_user_id']}";
        }

        // 5. College admin completed hours milestone
        if ($type === 'college_admin_intern_completed' && ! empty($data['intern_user_id'])) {
            return "/admin/interns?highlight={$data['intern_user_id']}";
        }

        // 6. Intern Document (supervisor view)
        if ($type === 'document_submitted' && ! empty($data['intern_user_id'])) {
            $docType = $data['document_type'] ?? null;
            if ($docType) {
                return "/supervisor/interns?highlight={$data['intern_user_id']}&doc_intern={$data['intern_user_id']}&highlight_doc={$docType}";
            }

            return "/supervisor/interns?highlight={$data['intern_user_id']}&doc_intern={$data['intern_user_id']}";
        }

        // 7. Intern account approval
        if ($type === 'intern_approval') {
            return '/intern/dashboard?highlight_qr=1';
        }

        // 8. Supervisor intern completed hours
        if ($type === 'intern_completed_hours' && ! empty($data['intern_user_id'])) {
            return "/supervisor/interns?highlight={$data['intern_user_id']}&doc_intern={$data['intern_user_id']}&open_summary=1";
        }

        // 9. Hours milestone for intern
        if (str_starts_with($type, 'hours_milestone') || $type === 'hours_milestone') {
            return '/intern/dashboard?highlight_hours=1';
        }

        // 10. Intern document approved/rejected/updated
        if (in_array($type, ['document_approved', 'document_rejected', 'document_update']) && ! empty($data['document_type'])) {
            return "/intern/documents?highlight={$data['document_type']}";
        }

        // 11. Missed timeout
        if ($type === 'missed_timeout' && ! empty($data['date'])) {
            $month = substr($data['date'], 0, 7);

            return "/intern/dashboard?month={$month}&highlight_date={$data['date']}";
        }

        return $href;
    }

    /**
     * Format a single database notification into a consistent structure for Inertia.
     *
     * @return array<string, mixed>
     */
    public static function formatNotification(DatabaseNotification $notification): array
    {
        $data = $notification->data ?? [];
        $href = self::resolveHref($data);

        return [
            'id' => $notification->id,
            'type' => $data['type'] ?? 'general',
            'title' => $data['title'] ?? 'Notification',
            'message' => $data['message'] ?? '',
            'href' => $href,
            'data' => $data,
            'read_at' => $notification->read_at?->toISOString(),
            'created_at' => $notification->created_at?->toISOString(),
        ];
    }

    /**
     * Format a collection of database notifications into a consistent structure for Inertia.
     *
     * @param  Collection<DatabaseNotification>  $notifications
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
                $resolvedBy = $ticket->resolvedBy;
                $data['rejected_by'] = $data['rejected_by'] ?? ($resolvedBy !== null && $resolvedBy->name !== '' ? $resolvedBy->name : 'Supervisor');
                $data['resolved_at'] = $data['resolved_at'] ?? $ticket->resolved_at?->toISOString();
                $data['status'] = $data['status'] ?? $ticket->status;
            }

            return [
                'id' => $notification->id,
                'type' => $data['type'] ?? 'general',
                'title' => $data['title'] ?? 'Notification',
                'message' => $data['message'] ?? '',
                'href' => self::resolveHref($data),
                'read_at' => $notification->read_at?->toISOString(),
                'created_at' => $notification->created_at?->toISOString(),
                'data' => $data,
            ];
        })->values()->all();
    }
}
