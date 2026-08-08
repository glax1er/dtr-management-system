<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\InternProfile;
use App\Models\ResolutionTicket;
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
        // Same HTE-based scoping InternsController uses — a supervisor
        // only sees tickets from interns under their own HTE.
        $supervisorProfile = $request->user()->supervisorProfile;

        // Defense in depth: the 'hte-supervisor' route middleware already
        // blocks OJT Supervisors from reaching this controller at all, but
        // this guard keeps the controller safe on its own too.
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
                // Which field(s) this ticket is actually asking for — a
                // "no_record" day has both, missing_time_in/open only
                // has the one that's actually missing.
                'type' => match (true) {
                    $ticket->proposed_time_in !== null && $ticket->proposed_time_out !== null => 'no_record',
                    $ticket->proposed_time_in !== null => 'missing_time_in',
                    default => 'open',
                },
                'proposed_time_in' => $ticket->proposed_time_in?->clone()->setTimezone($timezone)->format('g:i A'),
                'proposed_time_out' => $ticket->proposed_time_out?->clone()->setTimezone($timezone)->format('g:i A'),
                'reason' => $ticket->reason,
            ]);

        return Inertia::render('supervisor/resolution-tickets', [
            'tickets' => $tickets,
        ]);
    }

    public function approve(Request $request, ResolutionTicket $resolutionTicket): RedirectResponse
    {
        $this->authorizeAccess($request, $resolutionTicket);
        $timezone = config('dtr.timezone');

        $validated = $request->validate([
            // Optional overrides — only meaningful if the ticket actually
            // proposed that field in the first place. Lets a supervisor
            // approve with a different time than what was submitted, based
            // on whatever was agreed face-to-face.
            'final_time_in' => ['nullable', 'date_format:H:i'],
            'final_time_out' => ['nullable', 'date_format:H:i'],
        ]);

        DB::transaction(function () use ($request, $resolutionTicket, $validated, $timezone) {
            // Lock the row so a second concurrent approve/reject can't act
            // on the same ticket while this one is in flight.
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

            $finalTimeIn = null;
            if ($ticket->proposed_time_in !== null) {
                $timeString = $validated['final_time_in']
                    ?? $ticket->proposed_time_in->clone()->setTimezone($timezone)->format('H:i');
                $finalTimeIn = Carbon::createFromFormat('Y-m-d H:i', $date.' '.$timeString, $timezone);
            }

            $finalTimeOut = null;
            if ($ticket->proposed_time_out !== null) {
                $timeString = $validated['final_time_out']
                    ?? $ticket->proposed_time_out->clone()->setTimezone($timezone)->format('H:i');
                $finalTimeOut = Carbon::createFromFormat('Y-m-d H:i', $date.' '.$timeString, $timezone);
            }

            // Whatever's still real for this date — only relevant when the
            // ticket proposed just one side, since the other side already
            // exists as a genuine scan and isn't being touched here.
            $existingDay = $this->calculator
                ->forIntern($ticket->intern_user_id, $ticket->intern->internProfile->hte_id, from: Carbon::instance($ticket->date), to: Carbon::instance($ticket->date))
                ->first();

            if ($finalTimeIn !== null) {
                $cutoff = Carbon::createFromFormat('Y-m-d H:i', $date.' '.config('dtr.time_out_cutoff'), $timezone);

                if ($finalTimeIn->gt($cutoff)) {
                    throw ValidationException::withMessages([
                        'final_time_in' => 'Time In must be before the '.config('dtr.time_out_cutoff').' cutoff, or the day will still look missing after approval.',
                    ]);
                }

                $compareTimeOut = $finalTimeOut ?? $existingDay?->timeOut?->clone()->setTimezone($timezone);

                if ($compareTimeOut !== null && ! $finalTimeIn->lt($compareTimeOut)) {
                    throw ValidationException::withMessages([
                        'final_time_in' => 'Time In must be earlier than Time Out.',
                    ]);
                }
            }

            if ($finalTimeOut !== null) {
                $compareTimeIn = $finalTimeIn ?? $existingDay?->timeIn?->clone()->setTimezone($timezone);

                if ($compareTimeIn !== null && ! $finalTimeOut->gt($compareTimeIn)) {
                    throw ValidationException::withMessages([
                        'final_time_out' => 'Time Out must be later than Time In.',
                    ]);
                }
            }

            $supervisorId = $request->user()->id;

            foreach (array_filter([$finalTimeIn, $finalTimeOut]) as $timestamp) {
                AttendanceLog::create([
                    'intern_user_id' => $ticket->intern_user_id,
                    'supervisor_user_id' => $supervisorId,
                    'scan_timestamp' => $timestamp,
                    'resolved_ticket_id' => $ticket->id,
                ]);
            }

            $ticket->update([
                'status' => ResolutionTicket::STATUS_APPROVED,
                'final_time_in' => $finalTimeIn,
                'final_time_out' => $finalTimeOut,
                'resolved_by' => $supervisorId,
                'resolved_at' => Carbon::now(),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resolution request approved.']);

        return back();
    }

    public function reject(Request $request, ResolutionTicket $resolutionTicket): RedirectResponse
    {
        $this->authorizeAccess($request, $resolutionTicket);

        DB::transaction(function () use ($request, $resolutionTicket) {
            $ticket = ResolutionTicket::query()
                ->whereKey($resolutionTicket->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $ticket->isPending()) {
                throw ValidationException::withMessages([
                    'status' => 'This ticket is no longer pending — it may have been cancelled or already resolved.',
                ]);
            }

            // Nothing gets written to attendance_logs — the day just goes
            // back to looking exactly as missing as it did before.
            $ticket->update([
                'status' => ResolutionTicket::STATUS_REJECTED,
                'resolved_by' => $request->user()->id,
                'resolved_at' => Carbon::now(),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resolution request rejected.']);

        return back();
    }

    /**
     * A supervisor can only act on tickets from interns under their own
     * HTE — same scoping InternsController uses for the attendance log.
     * OJT Supervisors never resolve tickets at all (also enforced by the
     * 'hte-supervisor' route middleware).
     */
    private function authorizeAccess(Request $request, ResolutionTicket $resolutionTicket): void
    {
        $supervisorProfile = $request->user()->supervisorProfile;

        if ($supervisorProfile->isOjtSupervisor()) {
            abort(403, 'OJT Supervisors cannot resolve time conflicts.');
        }

        $internHteId = $resolutionTicket->intern->internProfile->hte_id;

        if ($internHteId !== $supervisorProfile->hte_id) {
            abort(403);
        }
    }
}