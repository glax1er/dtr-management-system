<?php

namespace App\Http\Controllers\Intern;

use App\Http\Controllers\Controller;
use App\Models\ResolutionTicket;
use App\Models\User;
use App\Notifications\ResolutionTicketNotification;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ResolutionTicketController extends Controller
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $profile = $user->internProfile()->firstOrFail();
        $timezone = config('dtr.timezone');

        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'proposed_time_in' => ['nullable', 'date_format:H:i'],
            'proposed_time_out' => ['nullable', 'date_format:H:i'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $date = Carbon::createFromFormat('Y-m-d', $validated['date'], $timezone)->startOfDay();

        if ($date->isAfter(Carbon::now($timezone)->startOfDay())) {
            throw ValidationException::withMessages([
                'date' => 'Cannot request a resolution for a future date.',
            ]);
        }

        // Ask the same calculator the dashboard uses what this day actually
        // looks like right now — never trust the client's idea of the
        // day's status.
        $day = $this->calculator
            ->forIntern($user->id, $profile->hte_id, from: $date, to: $date, approvedAt: $profile->approved_at)
            ->first();

        if ($day === null || (! $day->isFullyMissing() && ! $day->isMissingTimeIn() && ! $day->isOpen())) {
            throw ValidationException::withMessages([
                'date' => 'This date has nothing missing to resolve.',
            ]);
        }

        $existingPending = ResolutionTicket::query()
            ->where('intern_user_id', $user->id)
            ->where('date', $validated['date'])
            ->where('status', ResolutionTicket::STATUS_PENDING)
            ->exists();

        if ($existingPending) {
            throw ValidationException::withMessages([
                'date' => 'A resolution request is already pending for this date.',
            ]);
        }

        // Which field(s) are actually askable depends on what's missing —
        // an "open" day can only ask for Time Out, a "missing_time_in" day
        // only for Time In, a fully "no_record" day for both.
        $needsTimeIn = $day->isFullyMissing() || $day->isMissingTimeIn();
        $needsTimeOut = $day->isFullyMissing() || $day->isOpen();

        if ($needsTimeIn && empty($validated['proposed_time_in'])) {
            throw ValidationException::withMessages([
                'proposed_time_in' => 'Time In is required for this date.',
            ]);
        }

        if ($needsTimeOut && empty($validated['proposed_time_out'])) {
            throw ValidationException::withMessages([
                'proposed_time_out' => 'Time Out is required for this date.',
            ]);
        }

        $proposedTimeIn = $needsTimeIn
            ? Carbon::createFromFormat('Y-m-d H:i', $validated['date'].' '.$validated['proposed_time_in'], $timezone)
            : null;

        $proposedTimeOut = $needsTimeOut
            ? Carbon::createFromFormat('Y-m-d H:i', $validated['date'].' '.$validated['proposed_time_out'], $timezone)
            : null;

        // Fail fast here for UX — the authoritative check still happens
        // again in Supervisor\ResolutionTicketController::approve(), since
        // a supervisor can edit the time before approving.
        if ($proposedTimeIn !== null) {
            $cutoff = Carbon::createFromFormat('Y-m-d H:i', $validated['date'].' '.config('dtr.time_out_cutoff'), $timezone);

            if ($proposedTimeIn->gt($cutoff)) {
                throw ValidationException::withMessages([
                    'proposed_time_in' => 'Time In must be before the '.config('dtr.time_out_cutoff').' cutoff, or it will be recorded as a Time Out instead.',
                ]);
            }
        }

        // Time In must come before Time Out — checked against whichever
        // side is already real for this day, not just the two proposed
        // values against each other.
        $effectiveTimeIn = $proposedTimeIn ?? $day->timeIn?->clone()->setTimezone($timezone);
        $effectiveTimeOut = $proposedTimeOut ?? $day->timeOut?->clone()->setTimezone($timezone);

        if ($effectiveTimeIn !== null && $effectiveTimeOut !== null && ! $effectiveTimeIn->lt($effectiveTimeOut)) {
            throw ValidationException::withMessages([
                'proposed_time_in' => 'Time In must be earlier than Time Out.',
            ]);
        }

        $ticket = ResolutionTicket::create([
            'intern_user_id' => $user->id,
            'date' => $validated['date'],
            'proposed_time_in' => $proposedTimeIn,
            'proposed_time_out' => $proposedTimeOut,
            'reason' => $validated['reason'],
            'status' => ResolutionTicket::STATUS_PENDING,
        ]);

        $ticket->load('intern');

        User::query()
            ->where('role', User::ROLE_SUPERVISOR)
            ->whereHas('supervisorProfile', function ($query) use ($profile) {
                $query
                    ->where('supervisor_type', 'hte')
                    ->where('hte_id', $profile->hte_id);
            })
            ->get()
            ->filter(fn (User $supervisor) => $supervisor->wantsNotification('ticket_requests'))
            ->each(function (User $supervisor) use ($ticket) {
                $supervisor->notify(
                    new ResolutionTicketNotification(
                        $ticket,
                        ResolutionTicketNotification::REQUEST_SUBMITTED,
                    )
                );
            });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resolution request submitted for supervisor review.']);

        return back();
    }

    public function cancel(Request $request, ResolutionTicket $resolutionTicket): RedirectResponse
    {
        $user = $request->user();

        if ($resolutionTicket->intern_user_id !== $user->id) {
            abort(403);
        }

        if (! $resolutionTicket->isPending()) {
            throw ValidationException::withMessages([
                'status' => 'Only a pending request can be cancelled.',
            ]);
        }

        $resolutionTicket->update(['status' => ResolutionTicket::STATUS_CANCELLED]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resolution request cancelled.']);

        return back();
    }
}
