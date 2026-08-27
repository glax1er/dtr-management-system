<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\InternProfile;
use App\Models\ResolutionTicket;
use App\Notifications\ResolutionTicketNotification;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ResolutionTicketController extends Controller
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    public function index(Request $request): Response
    {
        // Same HTE-based scoping used by the other supervisor features.
        // A supervisor only sees resolution tickets from interns
        // assigned to their HTE.
        $supervisorProfile = $request->user()->supervisorProfile;

        // Defense in depth: OJT Supervisors cannot resolve tickets.
        if ($supervisorProfile->isOjtSupervisor()) {
            abort(403, 'OJT Supervisors cannot resolve time conflicts.');
        }

        $internUserIds = InternProfile::query()
            ->where('hte_id', $supervisorProfile->hte_id)
            ->pluck('user_id');

        $timezone = config('dtr.timezone');

        $tickets = ResolutionTicket::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->where('status', ResolutionTicket::STATUS_PENDING)
            ->with('intern')
            ->orderBy('date')
            ->get()
            ->map(fn (ResolutionTicket $ticket) => [
                'id' => $ticket->id,
                'intern_name' => $ticket->intern->name,
                'date' => $ticket->date->toDateString(),

                // Determine which time fields the request contains.
                'type' => match (true) {
                    $ticket->proposed_time_in !== null &&
                    $ticket->proposed_time_out !== null => 'no_record',

                    $ticket->proposed_time_in !== null => 'missing_time_in',

                    default => 'open',
                },

                'proposed_time_in' => $ticket->proposed_time_in
                    ?->clone()
                    ->setTimezone($timezone)
                    ->format('g:i A'),

                'proposed_time_out' => $ticket->proposed_time_out
                    ?->clone()
                    ->setTimezone($timezone)
                    ->format('g:i A'),

                'reason' => $ticket->reason,
            ]);

        return Inertia::render('supervisor/resolution-tickets', [
            'tickets' => $tickets,
        ]);
    }

    public function approve(
        Request $request,
        ResolutionTicket $resolutionTicket
    ): RedirectResponse {
        $this->authorizeAccess($request, $resolutionTicket);

        $timezone = config('dtr.timezone');

        $validated = $request->validate([
            // Optional overrides. If omitted, the original proposed
            // time from the intern is used.
            'final_time_in' => ['nullable', 'date_format:H:i'],
            'final_time_out' => ['nullable', 'date_format:H:i'],
        ]);

        DB::transaction(function () use (
            $request,
            $resolutionTicket,
            $validated,
            $timezone
        ) {
            // Lock the ticket to prevent concurrent approve/reject actions.
            $ticket = ResolutionTicket::query()
                ->whereKey($resolutionTicket->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $ticket->isPending()) {
                throw ValidationException::withMessages([
                    'status' => 'This ticket is no longer pending — it may have been cancelled or already resolved.',
                ]);
            }

            $date = $ticket->date->toDateString();

            /*
             * Resolve Time In.
             *
             * Only create a final Time In when the ticket originally
             * proposed one. Otherwise the existing attendance record
             * remains the source of truth.
             */
            $finalTimeIn = null;

            if ($ticket->proposed_time_in !== null) {
                $timeString = $validated['final_time_in']
                    ?? $ticket->proposed_time_in
                        ->clone()
                        ->setTimezone($timezone)
                        ->format('H:i');

                $finalTimeIn = Carbon::createFromFormat(
                    'Y-m-d H:i',
                    $date . ' ' . $timeString,
                    $timezone
                );
            }

            /*
             * Resolve Time Out.
             */
            $finalTimeOut = null;

            if ($ticket->proposed_time_out !== null) {
                $timeString = $validated['final_time_out']
                    ?? $ticket->proposed_time_out
                        ->clone()
                        ->setTimezone($timezone)
                        ->format('H:i');

                $finalTimeOut = Carbon::createFromFormat(
                    'Y-m-d H:i',
                    $date . ' ' . $timeString,
                    $timezone
                );
            }

            /*
             * Retrieve the intern's HTE.
             */
            $hteId = InternProfile::query()
                ->where('user_id', $ticket->intern_user_id)
                ->value('hte_id');

            /*
             * Get the current calculated state of the day.
             *
             * This matters when the ticket only resolves one side,
             * e.g. Time Out is missing but Time In already exists.
             */
            $existingDay = $this->calculator
                ->forIntern(
                    $ticket->intern_user_id,
                    $hteId,
                    from: Carbon::instance($ticket->date),
                    to: Carbon::instance($ticket->date)
                )
                ->first();

            /*
             * Validate Time In.
             */
            if ($finalTimeIn !== null) {
                $cutoff = Carbon::createFromFormat(
                    'Y-m-d H:i',
                    $date . ' ' . config('dtr.time_out_cutoff'),
                    $timezone
                );

                if ($finalTimeIn->gt($cutoff)) {
                    throw ValidationException::withMessages([
                        'final_time_in' =>
                            'Time In must be before the ' .
                            config('dtr.time_out_cutoff') .
                            ' cutoff, or the day will still look missing after approval.',
                    ]);
                }

                // If Time Out is part of the same ticket, use that.
                // Otherwise use the actual Time Out already recorded.
                $compareTimeOut =
                    $finalTimeOut
                    ?? $existingDay?->timeOut
                        ?->clone()
                        ->setTimezone($timezone);

                if (
                    $compareTimeOut !== null &&
                    ! $finalTimeIn->lt($compareTimeOut)
                ) {
                    throw ValidationException::withMessages([
                        'final_time_in' =>
                            'Time In must be earlier than Time Out.',
                    ]);
                }
            }

            /*
             * Validate Time Out.
             */
            if ($finalTimeOut !== null) {
                // If Time In is part of this ticket, use that.
                // Otherwise use the real Time In already recorded.
                $compareTimeIn =
                    $finalTimeIn
                    ?? $existingDay?->timeIn
                        ?->clone()
                        ->setTimezone($timezone);

                if (
                    $compareTimeIn !== null &&
                    ! $finalTimeOut->gt($compareTimeIn)
                ) {
                    throw ValidationException::withMessages([
                        'final_time_out' =>
                            'Time Out must be later than Time In.',
                    ]);
                }
            }

            /*
             * Record the resolved attendance logs.
             */
            $supervisorId = $request->user()->id;

            foreach (array_filter([
                $finalTimeIn,
                $finalTimeOut,
            ]) as $timestamp) {
                AttendanceLog::create([
                    'intern_user_id' => $ticket->intern_user_id,
                    'supervisor_user_id' => $supervisorId,
                    'scan_timestamp' => $timestamp,
                    'resolved_ticket_id' => $ticket->id,
                ]);
            }

            /*
             * Mark ticket as approved.
             */
            $ticket->update([
                'status' => ResolutionTicket::STATUS_APPROVED,
                'final_time_in' => $finalTimeIn,
                'final_time_out' => $finalTimeOut,
                'resolved_by' => $supervisorId,
                'resolved_at' => Carbon::now(),
            ]);
        });

        /*
         * Notify the intern after successful approval.
         *
         * This happens AFTER the transaction succeeds, so an intern
         * won't receive an approval notification when the transaction
         * itself failed.
         */
        $ticket = $resolutionTicket->fresh(['intern']);

        if ($ticket?->intern) {
            $ticket->intern->notify(
                new ResolutionTicketNotification(
                    $ticket,
                    ResolutionTicketNotification::REQUEST_APPROVED,
                )
            );

            app(\App\Services\Attendance\CheckHoursMilestones::class)->check($ticket->intern_user_id);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Resolution request approved.',
        ]);

        return back();
    }

    public function reject(
        Request $request,
        ResolutionTicket $resolutionTicket
    ): RedirectResponse {
        $this->authorizeAccess($request, $resolutionTicket);

        DB::transaction(function () use (
            $request,
            $resolutionTicket
        ) {
            // Lock the row to prevent concurrent actions.
            $ticket = ResolutionTicket::query()
                ->whereKey($resolutionTicket->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $ticket->isPending()) {
                throw ValidationException::withMessages([
                    'status' =>
                        'This ticket is no longer pending — it may have been cancelled or already resolved.',
                ]);
            }

            /*
             * Rejection does not create attendance logs.
             * The attendance day therefore remains unresolved.
             */
            $ticket->update([
                'status' => ResolutionTicket::STATUS_REJECTED,
                'resolved_by' => $request->user()->id,
                'resolved_at' => Carbon::now(),
            ]);
        });

        /*
         * Notify the intern after successful rejection.
         */
        $ticket = $resolutionTicket->fresh(['intern']);

        if ($ticket?->intern) {
            $ticket->intern->notify(
                new ResolutionTicketNotification(
                    $ticket,
                    ResolutionTicketNotification::REQUEST_REJECTED,
                )
            );
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Resolution request rejected.',
        ]);

        return back();
    }

    /**
     * A supervisor can only act on tickets from interns assigned
     * to the supervisor's own HTE.
     *
     * OJT Supervisors are never allowed to resolve tickets.
     */
    private function authorizeAccess(
        Request $request,
        ResolutionTicket $resolutionTicket
    ): void {
        $supervisorProfile = $request->user()->supervisorProfile;

        if ($supervisorProfile->isOjtSupervisor()) {
            abort(
                403,
                'OJT Supervisors cannot resolve time conflicts.'
            );
        }

        $internHteId = $resolutionTicket
            ->intern
            ->internProfile
            ->hte_id;

        if ($internHteId !== $supervisorProfile->hte_id) {
            abort(403);
        }
    }
}