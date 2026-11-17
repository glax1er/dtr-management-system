<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\AuditLog;
use App\Models\InternProfile;
use App\Models\ResolutionTicket;
use App\Notifications\ResolutionTicketNotification;
use App\Services\Attendance\CheckHoursMilestones;
use App\Services\Attendance\DailyAttendanceCalculator;
use App\Services\Attendance\FirstScanLookup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ResolutionTicketController extends Controller
{
    public const DEFAULT_PER_PAGE = 20;

    public const MAX_PER_PAGE = 100;

    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
        private readonly FirstScanLookup $firstScanLookup,
    ) {}

    private function dateString(mixed $date): string
    {
        if ($date instanceof Carbon) {
            return $date->toDateString();
        }

        if ($date instanceof \DateTimeInterface) {
            return Carbon::instance($date)->toDateString();
        }

        return Carbon::parse($date)->toDateString();
    }

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

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:all,missing_time_in,open,no_record'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $type = $validated['type'] ?? 'all';
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $internUserIds = InternProfile::query()
            ->verified()
            ->where('status', 'approved')
            ->where('hte_id', $supervisorProfile->hte_id)
            ->pluck('user_id');

        $timezone = config('dtr.timezone');

        $baseQuery = ResolutionTicket::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->where('status', ResolutionTicket::STATUS_PENDING);

        $totalPending = (clone $baseQuery)->count();
        $totalResolved = ResolutionTicket::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->whereIn('status', [
                ResolutionTicket::STATUS_APPROVED,
                ResolutionTicket::STATUS_REJECTED,
                ResolutionTicket::STATUS_CANCELLED,
            ])
            ->count();
        $totalSnapshots = AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->whereNotNull('captured_photo_path')
            ->count();

        $query = (clone $baseQuery)->with(['intern.internProfile']);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereHas('intern', function ($internQuery) use ($search) {
                    $internQuery->where('name', 'like', "%{$search}%");
                })
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhere('date', 'like', "%{$search}%");
            });
        }

        if ($type !== 'all') {
            if ($type === 'no_record') {
                $query->whereNotNull('proposed_time_in')
                    ->whereNotNull('proposed_time_out');
            } elseif ($type === 'missing_time_in') {
                $query->whereNotNull('proposed_time_in')
                    ->whereNull('proposed_time_out');
            } elseif ($type === 'open') {
                $query->whereNull('proposed_time_in');
            }
        }

        $tickets = $query
            ->orderByDesc('date')
            ->orderByDesc('created_at');

        // Auto-navigate to the page containing the highlighted ticket if not specified.
        if ($request->filled('highlight') && ! $request->has('page')) {
            $highlightId = (int) $request->query('highlight');
            $allIds = (clone $tickets)->pluck('id')->all();
            $index = array_search($highlightId, $allIds, true);
            if ($index !== false) {
                $targetPage = (int) floor((int) $index / $perPage) + 1;
                if ($targetPage > 1) {
                    $validated['page'] = $targetPage;
                }
            }
        }

        $ticketsPaginated = $tickets
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString();

        $ticketsTransformed = $ticketsPaginated->through(function (ResolutionTicket $ticket) use ($timezone) {
            $dateString = $this->dateString($ticket->date);

            return [
                'id' => $ticket->id,
                'intern_user_id' => $ticket->intern_user_id,
                'intern_name' => $ticket->intern->name,
                'intern_id_number' => $ticket->intern->internProfile?->id_number,
                'intern_profile_photo_url' => $ticket->intern->profile_photo_url,
                'date' => $dateString,

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
            ];
        });

        return Inertia::render('supervisor/resolution-tickets', [
            'tickets' => $ticketsTransformed,
            'totalPending' => $totalPending,
            'totalResolved' => $totalResolved,
            'totalSnapshots' => $totalSnapshots,
            'filters' => [
                'search' => $search,
                'type' => $type,
                'per_page' => $perPage,
            ],
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

            $date = $this->dateString($ticket->date);

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
                    $date.' '.$timeString,
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
                    $date.' '.$timeString,
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
                    $date.' '.config('dtr.time_out_cutoff'),
                    $timezone
                );

                if ($finalTimeIn->gt($cutoff)) {
                    throw ValidationException::withMessages([
                        'final_time_in' => 'Time In must be before the '.
                            config('dtr.time_out_cutoff').
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
                        'final_time_in' => 'Time In must be earlier than Time Out.',
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
                        'final_time_out' => 'Time Out must be later than Time In.',
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

        AuditLog::record(
            action: 'resolution_ticket_approved',
            description: "Resolution ticket #{$resolutionTicket->id} approved by supervisor",
            auditable: $resolutionTicket,
            oldValues: ['status' => ResolutionTicket::STATUS_PENDING],
            newValues: [
                'status' => ResolutionTicket::STATUS_APPROVED,
                'final_time_in' => $ticket?->final_time_in?->toIso8601String(),
                'final_time_out' => $ticket?->final_time_out?->toIso8601String(),
                'resolved_by' => $request->user()->id,
            ],
            user: $request->user(),
        );

        if ($ticket?->intern && $ticket->intern->wantsNotification('ticket_updates')) {
            $ticket->intern->notify(
                new ResolutionTicketNotification(
                    $ticket,
                    ResolutionTicketNotification::REQUEST_APPROVED,
                )
            );
        }

        if ($ticket?->intern) {
            app(CheckHoursMilestones::class)->check($ticket->intern_user_id);
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

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ], [
            'rejection_reason.required' => 'Please provide a reason for rejecting this resolution request.',
            'rejection_reason.max' => 'The rejection reason may not exceed 1000 characters.',
        ]);

        DB::transaction(function () use (
            $request,
            $resolutionTicket,
            $validated
        ) {
            // Lock the row to prevent concurrent actions.
            $ticket = ResolutionTicket::query()
                ->whereKey($resolutionTicket->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $ticket->isPending()) {
                throw ValidationException::withMessages([
                    'status' => 'This ticket is no longer pending — it may have been cancelled or already resolved.',
                ]);
            }

            /*
             * Rejection does not create attendance logs.
             * The attendance day therefore remains unresolved.
             */
            $ticket->update([
                'status' => ResolutionTicket::STATUS_REJECTED,
                'rejection_reason' => $validated['rejection_reason'],
                'resolved_by' => $request->user()->id,
                'resolved_at' => Carbon::now(),
            ]);
        });

        AuditLog::record(
            action: 'resolution_ticket_rejected',
            description: "Resolution ticket #{$resolutionTicket->id} rejected by supervisor: {$validated['rejection_reason']}",
            auditable: $resolutionTicket,
            oldValues: ['status' => ResolutionTicket::STATUS_PENDING],
            newValues: [
                'status' => ResolutionTicket::STATUS_REJECTED,
                'rejection_reason' => $validated['rejection_reason'],
                'resolved_by' => $request->user()->id,
            ],
            user: $request->user(),
        );

        /*
         * Notify the intern after successful rejection.
         */
        $ticket = $resolutionTicket->fresh(['intern']);

        if ($ticket?->intern && $ticket->intern->wantsNotification('ticket_updates')) {
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

        $internProfile = $resolutionTicket
            ->intern
            ?->internProfile()
            ->withTrashed()
            ->first();

        if (! $internProfile || $internProfile->hte_id !== $supervisorProfile->hte_id) {
            abort(403);
        }
    }

    public function logs(Request $request): Response
    {
        $supervisorProfile = $request->user()->supervisorProfile;

        if ($supervisorProfile->isOjtSupervisor()) {
            abort(403, 'OJT Supervisors cannot resolve time conflicts.');
        }

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:all,approved,rejected,cancelled'],
            'type' => ['nullable', 'string', 'in:all,missing_time_in,open,no_record'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $status = $validated['status'] ?? 'all';
        $type = $validated['type'] ?? 'all';
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $internUserIds = InternProfile::query()
            ->verified()
            ->where('status', 'approved')
            ->where('hte_id', $supervisorProfile->hte_id)
            ->pluck('user_id');

        $timezone = config('dtr.timezone');

        $baseQuery = ResolutionTicket::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->whereIn('status', [
                ResolutionTicket::STATUS_APPROVED,
                ResolutionTicket::STATUS_REJECTED,
                ResolutionTicket::STATUS_CANCELLED,
            ]);

        $totalResolved = (clone $baseQuery)->count();
        $totalApproved = (clone $baseQuery)->where('status', ResolutionTicket::STATUS_APPROVED)->count();
        $totalRejected = (clone $baseQuery)->where('status', ResolutionTicket::STATUS_REJECTED)->count();
        $totalCancelled = (clone $baseQuery)->where('status', ResolutionTicket::STATUS_CANCELLED)->count();
        $totalPending = ResolutionTicket::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->where('status', ResolutionTicket::STATUS_PENDING)
            ->count();
        $totalSnapshots = AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->whereNotNull('captured_photo_path')
            ->count();

        $query = (clone $baseQuery)->with(['intern.internProfile', 'resolvedBy']);

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereHas('intern', function ($internQuery) use ($search) {
                    $internQuery->where('name', 'like', "%{$search}%")
                        ->orWhereHas('internProfile', fn ($pq) => $pq->where('id_number', 'like', "%{$search}%"));
                })
                    ->orWhereHas('resolvedBy', fn ($rq) => $rq->where('name', 'like', "%{$search}%"))
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhere('rejection_reason', 'like', "%{$search}%")
                    ->orWhere('date', 'like', "%{$search}%");
            });
        }

        if ($type !== 'all') {
            if ($type === 'no_record') {
                $query->whereNotNull('proposed_time_in')
                    ->whereNotNull('proposed_time_out');
            } elseif ($type === 'missing_time_in') {
                $query->whereNotNull('proposed_time_in')
                    ->whereNull('proposed_time_out');
            } elseif ($type === 'open') {
                $query->whereNull('proposed_time_in');
            }
        }

        $ticketsPaginated = $query
            ->orderByDesc('resolved_at')
            ->orderByDesc('updated_at')
            ->orderByDesc('date')
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString();

        $scanMap = $this->buildDayScansMap($ticketsPaginated->items(), $timezone);

        $tickets = $ticketsPaginated->through(function (ResolutionTicket $ticket) use ($timezone, $scanMap) {
            $dateString = $this->dateString($ticket->date);
            $key = $ticket->intern_user_id.'_'.$dateString;
            $dayScans = $scanMap[$key] ?? [
                'time_in_photo_url' => null,
                'time_in_scanned_at' => null,
                'time_out_photo_url' => null,
                'time_out_scanned_at' => null,
            ];
            $resolvedByName = $ticket->resolvedBy?->name;

            return [
                'id' => $ticket->id,
                'intern_user_id' => $ticket->intern_user_id,
                'intern_name' => $ticket->intern->name,
                'intern_id_number' => $ticket->intern->internProfile?->id_number,
                'intern_profile_photo_url' => $ticket->intern->profile_photo_url,
                'date' => $dateString,
                'type' => match (true) {
                    $ticket->proposed_time_in !== null && $ticket->proposed_time_out !== null => 'no_record',
                    $ticket->proposed_time_in !== null => 'missing_time_in',
                    default => 'open',
                },
                'status' => $ticket->status,
                'proposed_time_in' => $ticket->proposed_time_in?->clone()->setTimezone($timezone)->format('g:i A'),
                'proposed_time_out' => $ticket->proposed_time_out?->clone()->setTimezone($timezone)->format('g:i A'),
                'final_time_in' => $ticket->final_time_in?->clone()->setTimezone($timezone)->format('g:i A'),
                'final_time_out' => $ticket->final_time_out?->clone()->setTimezone($timezone)->format('g:i A'),
                'reason' => $ticket->reason,
                'rejection_reason' => $ticket->rejection_reason,
                'resolved_by_name' => $resolvedByName ?? ($ticket->status === ResolutionTicket::STATUS_CANCELLED ? 'Intern (Self-cancelled)' : 'System'),
                'resolved_at' => $ticket->resolved_at?->clone()->setTimezone($timezone)->format('M j, Y g:i A'),
                'resolved_at_relative' => $ticket->resolved_at?->diffForHumans(),
                'created_at' => $ticket->created_at?->clone()->setTimezone($timezone)->format('M j, Y g:i A'),
                'time_in_photo_url' => $dayScans['time_in_photo_url'],
                'time_in_scanned_at' => $dayScans['time_in_scanned_at'],
                'time_out_photo_url' => $dayScans['time_out_photo_url'],
                'time_out_scanned_at' => $dayScans['time_out_scanned_at'],
            ];
        });

        return Inertia::render('supervisor/resolution-tickets-logs', [
            'tickets' => $tickets,
            'totalResolved' => $totalResolved,
            'totalApproved' => $totalApproved,
            'totalRejected' => $totalRejected,
            'totalCancelled' => $totalCancelled,
            'totalPending' => $totalPending,
            'totalSnapshots' => $totalSnapshots,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'type' => $type,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function snapshots(Request $request): Response
    {
        $supervisorProfile = $request->user()->supervisorProfile;

        if ($supervisorProfile->isOjtSupervisor()) {
            abort(403, 'OJT Supervisors cannot view scan snapshots.');
        }

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'label' => ['nullable', 'string', 'in:all,time_in,time_out'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $date = $validated['date'] ?? null;
        $label = $validated['label'] ?? 'all';
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $internUserIds = InternProfile::query()
            ->verified()
            ->where('status', 'approved')
            ->where('hte_id', $supervisorProfile->hte_id)
            ->pluck('user_id');

        $timezone = config('dtr.timezone');

        $baseQuery = AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->whereNotNull('captured_photo_path');

        $totalSnapshots = (clone $baseQuery)->count();
        $ticketCounts = ResolutionTicket::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');
        $totalPending = (int) ($ticketCounts[ResolutionTicket::STATUS_PENDING] ?? 0);
        $totalResolved = (int) ($ticketCounts[ResolutionTicket::STATUS_APPROVED] ?? 0)
            + (int) ($ticketCounts[ResolutionTicket::STATUS_REJECTED] ?? 0)
            + (int) ($ticketCounts[ResolutionTicket::STATUS_CANCELLED] ?? 0);

        $query = (clone $baseQuery)
            ->select(['log_id', 'intern_user_id', 'kiosk_id', 'scan_timestamp', 'captured_photo_path'])
            ->with(['intern:id,name,profile_photo_path', 'intern.internProfile', 'kiosk']);

        if ($date !== null) {
            $dayStart = Carbon::parse($date, $timezone)->startOfDay();
            $dayEnd = Carbon::parse($date, $timezone)->endOfDay();
            $query->whereBetween('scan_timestamp', [$dayStart, $dayEnd]);
        }

        if ($search !== '') {
            $query->whereHas('intern', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('internProfile', fn ($pq) => $pq->where('id_number', 'like', "%{$search}%"));
            });
        }

        $snapshotsPaginated = $query
            ->orderByDesc('scan_timestamp')
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString();

        $firstScans = $this->firstScanLookup->forLogsByLocalDay(
            $snapshotsPaginated->getCollection(),
            $timezone,
        );

        $snapshots = $snapshotsPaginated->through(function (AttendanceLog $log) use ($timezone, $firstScans) {
            $localTime = $log->scan_timestamp->clone()->setTimezone($timezone);
            $cutoff = Carbon::parse($localTime->toDateString().' '.config('dtr.time_out_cutoff'), $timezone);
            $internName = $log->intern?->name;
            $kioskName = $log->kiosk?->name;

            $firstScanToday = $firstScans->get($log->intern_user_id.'_'.$localTime->toDateString());
            $isFirstScan = $firstScanToday?->log_id === $log->log_id;
            $isAfterCutoff = $firstScanToday && $firstScanToday->scan_timestamp->clone()->setTimezone($timezone)->gt($cutoff);

            $computedLabel = ($isFirstScan && ! $isAfterCutoff) ? 'time_in' : 'time_out';

            return [
                'id' => $log->log_id,
                'intern_user_id' => $log->intern_user_id,
                'intern_name' => $internName ?? 'Unknown Intern',
                'intern_id_number' => $log->intern?->internProfile?->id_number,
                'intern_profile_photo_url' => $log->intern?->profile_photo_url,
                'label' => $computedLabel,
                'captured_photo_url' => $log->captured_photo_url,
                'captured_photo_path' => $log->captured_photo_path,
                'kiosk_name' => $kioskName ?? 'Scanner Device',
                'storage_disk' => 'public',
                'storage_location' => 'attendance-snapshots (in storage/app/public/attendance-snapshots)',
                'date' => $localTime->toDateString(),
                'scanned_at' => $log->scan_timestamp->diffForHumans(),
                'scanned_at_full' => $localTime->format('M j, Y g:i A'),
            ];
        });

        return Inertia::render('supervisor/resolution-tickets-snapshots', [
            'snapshots' => $snapshots,
            'totalSnapshots' => $totalSnapshots,
            'totalPending' => $totalPending,
            'totalResolved' => $totalResolved,
            'filters' => [
                'search' => $search,
                'date' => $date,
                'label' => $label,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * @param  array<int, mixed>|Collection<int, mixed>  $tickets
     * @return array<string, array{time_in_photo_url: ?string, time_in_scanned_at: ?string, time_out_photo_url: ?string, time_out_scanned_at: ?string}>
     */
    private function buildDayScansMap(array|Collection $tickets, string $timezone): array
    {
        $ticketCollection = collect($tickets);
        if ($ticketCollection->isEmpty()) {
            return [];
        }

        $internUserIds = $ticketCollection->pluck('intern_user_id')->unique()->all();
        $minDate = Carbon::parse($this->dateString($ticketCollection->min('date')), $timezone)->startOfDay();
        $maxDate = Carbon::parse($this->dateString($ticketCollection->max('date')), $timezone)->endOfDay();

        $allScans = AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->whereBetween('scan_timestamp', [$minDate, $maxDate])
            ->whereNull('resolved_ticket_id')
            ->orderBy('scan_timestamp')
            ->get()
            ->groupBy(function (AttendanceLog $log) use ($timezone) {
                return $log->intern_user_id.'_'.$log->scan_timestamp->clone()->setTimezone($timezone)->toDateString();
            });

        $result = [];
        foreach ($ticketCollection as $ticket) {
            $dateStr = $ticket->date instanceof Carbon ? $ticket->date->toDateString() : Carbon::parse($ticket->date)->toDateString();
            $key = $ticket->intern_user_id.'_'.$dateStr;

            $scansForDay = $allScans->get($key, collect());

            $timeInPhotoUrl = null;
            $timeInScannedAt = null;
            $timeOutPhotoUrl = null;
            $timeOutScannedAt = null;

            if ($scansForDay->isNotEmpty()) {
                $cutoff = Carbon::parse($dateStr.' '.config('dtr.time_out_cutoff'), $timezone);
                $earliestScan = $scansForDay->first();
                $earliestScanLocal = $earliestScan->scan_timestamp->clone()->setTimezone($timezone);

                if ($earliestScanLocal->gt($cutoff)) {
                    $lastScan = $scansForDay->last();
                    $timeOutPhotoUrl = $lastScan->captured_photo_url;
                    $timeOutScannedAt = $lastScan->scan_timestamp->clone()->setTimezone($timezone)->format('g:i A');
                } else {
                    $timeInPhotoUrl = $earliestScan->captured_photo_url;
                    $timeInScannedAt = $earliestScanLocal->format('g:i A');

                    if ($scansForDay->count() > 1) {
                        $lastScan = $scansForDay->last();
                        $timeOutPhotoUrl = $lastScan->captured_photo_url;
                        $timeOutScannedAt = $lastScan->scan_timestamp->clone()->setTimezone($timezone)->format('g:i A');
                    }
                }
            }

            $result[$key] = [
                'time_in_photo_url' => $timeInPhotoUrl,
                'time_in_scanned_at' => $timeInScannedAt,
                'time_out_photo_url' => $timeOutPhotoUrl,
                'time_out_scanned_at' => $timeOutScannedAt,
            ];
        }

        return $result;
    }
}
