<?php

namespace Database\Seeders;

use App\Models\AttendanceLog;
use App\Models\InternProfile;
use App\Models\Kiosk;
use App\Models\ResolutionTicket;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AttendanceSeeder extends Seeder
{
    /**
     * Seed realistic attendance history, today's live activity, and resolution tickets.
     */
    public function run(): void
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone);

        $accentureKiosk = Kiosk::where('device_token', 'kiosk-accenture-token')->first();
        $cicKiosk = Kiosk::where('device_token', 'kiosk-cic-lobby-token')->first();
        $dictKiosk = Kiosk::where('device_token', 'kiosk-dict-ro11-token')->first();

        $accentureSupervisor = User::where('email', 'supervisor.accenture@dtr.test')->first();
        $dictSupervisor = User::where('email', 'supervisor.dict@dtr.test')->first();

        $alex = User::where('email', 'intern.alex@dtr.test')->first();
        $beatrice = User::where('email', 'intern.beatrice@dtr.test')->first();
        $eduardo = User::where('email', 'intern.completed@dtr.test')->first();
        $fiona = User::where('email', 'intern.revision@dtr.test')->first();

        // ── 1. Attendance for Alex Rivera (~250 rendered hours, milestone 50) ────
        if ($alex) {
            $this->seedInternAttendance(
                user: $alex,
                daysToBackfill: 36,
                startHour: 7,
                startMinute: 50,
                endHour: 17,
                endMinute: 15,
                kiosk: $accentureKiosk,
                supervisor: $accentureSupervisor,
                skipDaysAgo: [14, 5], // skip 2 days for resolution tickets
                todayAction: 'clock_in_only' // currently clocked in today!
            );
        }

        // ── 2. Attendance for Beatrice Santos (Missed time-out yesterday) ─────────
        if ($beatrice) {
            $this->seedInternAttendance(
                user: $beatrice,
                daysToBackfill: 25,
                startHour: 8,
                startMinute: 0,
                endHour: 17,
                endMinute: 0,
                kiosk: $accentureKiosk,
                supervisor: $accentureSupervisor,
                skipDaysAgo: [1], // yesterday has custom handling below
                todayAction: 'absent'
            );

            // Yesterday (2026-09-29): Time-in at 8:02 AM, NO time-out!
            $yesterday = $today->clone()->subDay();
            if (! $yesterday->isWeekend()) {
                AttendanceLog::create([
                    'intern_user_id' => $beatrice->id,
                    'kiosk_id' => $accentureKiosk?->id,
                    'scan_timestamp' => $yesterday->copy()->setTime(8, 2, 0),
                ]);
            }
        }

        // ── 3. Attendance for Eduardo Ramos (100% completed, >486 hours) ────────
        if ($eduardo) {
            $this->seedInternAttendance(
                user: $eduardo,
                daysToBackfill: 65,
                startHour: 7,
                startMinute: 45,
                endHour: 17,
                endMinute: 30,
                kiosk: $cicKiosk,
                supervisor: null,
                skipDaysAgo: [],
                todayAction: 'absent'
            );
        }

        // ── 4. Attendance for Fiona Lim ──────────────────────────────────────────
        if ($fiona) {
            $this->seedInternAttendance(
                user: $fiona,
                daysToBackfill: 18,
                startHour: 8,
                startMinute: 10,
                endHour: 17,
                endMinute: 5,
                kiosk: $dictKiosk,
                supervisor: $dictSupervisor,
                skipDaysAgo: [],
                todayAction: 'full_day'
            );
        }

        // ── 5. Seed Attendance for other pool interns ────────────────────────────
        $otherInterns = InternProfile::query()
            ->verified()
            ->where('status', 'approved')
            ->whereNotIn('user_id', array_filter([$alex?->id, $beatrice?->id, $eduardo?->id, $fiona?->id]))
            ->take(12)
            ->get();

        foreach ($otherInterns as $idx => $profile) {
            $user = $profile->user;
            if (! $user) {
                continue;
            }

            $kiosk = match ($profile->campus) {
                'Tagum' => null,
                default => ($idx % 2 === 0 ? $cicKiosk : $accentureKiosk),
            };

            $todayMode = match ($idx % 4) {
                0 => 'clock_in_only',
                1 => 'full_day',
                default => 'absent',
            };

            $this->seedInternAttendance(
                user: $user,
                daysToBackfill: 15 + ($idx * 2),
                startHour: 7,
                startMinute: 45 + ($idx % 30),
                endHour: 17,
                endMinute: ($idx % 40),
                kiosk: $kiosk,
                supervisor: $accentureSupervisor,
                skipDaysAgo: [],
                todayAction: $todayMode
            );
        }

        // ── 6. Resolution Tickets ────────────────────────────────────────────────
        if ($alex && $accentureSupervisor) {
            // Ticket 1: Approved ticket (field deployment) from 2 weeks ago
            $ticket1Date = $today->clone()->subDays(14)->startOfDay();
            if ($ticket1Date->isWeekend()) {
                $ticket1Date->subDays(2);
            }

            $timeIn = $ticket1Date->copy()->setTime(8, 0, 0);
            $timeOut = $ticket1Date->copy()->setTime(17, 0, 0);

            $ticket1 = ResolutionTicket::updateOrCreate(
                [
                    'intern_user_id' => $alex->id,
                    'date' => $ticket1Date->toDateString(),
                ],
                [
                    'proposed_time_in' => $timeIn,
                    'proposed_time_out' => $timeOut,
                    'final_time_in' => $timeIn,
                    'final_time_out' => $timeOut,
                    'reason' => 'Off-site technical deployment at client data center without biometric kiosk access.',
                    'status' => ResolutionTicket::STATUS_APPROVED,
                    'resolved_by' => $accentureSupervisor->id,
                    'resolved_at' => $ticket1Date->copy()->addDay()->setTime(9, 30, 0),
                ]
            );

            // Write back attendance log rows for approved ticket
            AttendanceLog::updateOrCreate(
                ['resolved_ticket_id' => $ticket1->id, 'scan_timestamp' => $timeIn],
                ['intern_user_id' => $alex->id, 'supervisor_user_id' => $accentureSupervisor->id]
            );
            AttendanceLog::updateOrCreate(
                ['resolved_ticket_id' => $ticket1->id, 'scan_timestamp' => $timeOut],
                ['intern_user_id' => $alex->id, 'supervisor_user_id' => $accentureSupervisor->id]
            );

            // Ticket 2: Pending ticket (missing time-out due to outage) from 5 days ago
            $ticket2Date = $today->clone()->subDays(5)->startOfDay();
            if ($ticket2Date->isWeekend()) {
                $ticket2Date->subDays(2);
            }

            ResolutionTicket::updateOrCreate(
                [
                    'intern_user_id' => $alex->id,
                    'date' => $ticket2Date->toDateString(),
                ],
                [
                    'proposed_time_in' => null,
                    'proposed_time_out' => $ticket2Date->copy()->setTime(17, 15, 0),
                    'reason' => 'Building facility network interruption prevented digital time-out scan at 5:15 PM.',
                    'status' => ResolutionTicket::STATUS_PENDING,
                    'resolved_by' => null,
                    'resolved_at' => null,
                ]
            );
        }

        // Ticket 3: Pending ticket for Beatrice Santos (yesterday)
        if ($beatrice) {
            $yesterday = $today->clone()->subDay()->startOfDay();
            if ($yesterday->isWeekend()) {
                $yesterday->subDays(2);
            }

            ResolutionTicket::updateOrCreate(
                [
                    'intern_user_id' => $beatrice->id,
                    'date' => $yesterday->toDateString(),
                ],
                [
                    'proposed_time_in' => null,
                    'proposed_time_out' => $yesterday->copy()->setTime(17, 10, 0),
                    'reason' => 'Kiosk terminal was rebooting for routine update during dismissal time.',
                    'status' => ResolutionTicket::STATUS_PENDING,
                    'resolved_by' => null,
                    'resolved_at' => null,
                ]
            );
        }

        // Ticket 4: Rejected ticket for another intern
        $rejectedIntern = User::where('email', 'intern.kevin-dale-perez@dtr.test')->first() ?? $fiona;
        if ($rejectedIntern && $dictSupervisor) {
            $rejDate = $today->clone()->subDays(8)->startOfDay();
            if ($rejDate->isWeekend()) {
                $rejDate->subDays(2);
            }

            ResolutionTicket::updateOrCreate(
                [
                    'intern_user_id' => $rejectedIntern->id,
                    'date' => $rejDate->toDateString(),
                ],
                [
                    'proposed_time_in' => $rejDate->copy()->setTime(7, 30, 0),
                    'proposed_time_out' => $rejDate->copy()->setTime(16, 30, 0),
                    'reason' => 'Forgot physical QR badge at home; request manual entry for full day.',
                    'status' => ResolutionTicket::STATUS_REJECTED,
                    'rejection_reason' => 'Security visitor log records arrival at 10:15 AM, conflicting with proposed 7:30 AM arrival.',
                    'resolved_by' => $dictSupervisor->id,
                    'resolved_at' => $rejDate->copy()->addDay()->setTime(11, 0, 0),
                ]
            );
        }
    }

    /**
     * @param list<int> $skipDaysAgo
     */
    private function seedInternAttendance(
        User $user,
        int $daysToBackfill,
        int $startHour,
        int $startMinute,
        int $endHour,
        int $endMinute,
        ?Kiosk $kiosk,
        ?User $supervisor,
        array $skipDaysAgo = [],
        string $todayAction = 'absent'
    ): void {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone);

        for ($daysAgo = $daysToBackfill; $daysAgo >= 1; $daysAgo--) {
            if (in_array($daysAgo, $skipDaysAgo, true)) {
                continue;
            }

            $date = $today->clone()->subDays($daysAgo);
            if ($date->isWeekend()) {
                continue;
            }

            // Slight variation in arrival and departure
            $varianceIn = ($daysAgo % 7) - 3;
            $varianceOut = ($daysAgo % 5) - 2;

            $timeIn = $date->copy()->setTime($startHour, max(0, $startMinute + $varianceIn), 0);
            $timeOut = $date->copy()->setTime($endHour, max(0, $endMinute + $varianceOut), 0);

            // Time in scan
            AttendanceLog::create([
                'intern_user_id' => $user->id,
                'kiosk_id' => $kiosk?->id,
                'supervisor_user_id' => $kiosk ? null : $supervisor?->id,
                'scan_timestamp' => $timeIn,
            ]);

            // Time out scan
            AttendanceLog::create([
                'intern_user_id' => $user->id,
                'kiosk_id' => $kiosk?->id,
                'supervisor_user_id' => $kiosk ? null : $supervisor?->id,
                'scan_timestamp' => $timeOut,
            ]);
        }

        // Today's action
        if ($todayAction === 'clock_in_only') {
            AttendanceLog::create([
                'intern_user_id' => $user->id,
                'kiosk_id' => $kiosk?->id,
                'supervisor_user_id' => $kiosk ? null : $supervisor?->id,
                'scan_timestamp' => $today->copy()->setTime(7, 52, 0),
            ]);
        } elseif ($todayAction === 'full_day') {
            AttendanceLog::create([
                'intern_user_id' => $user->id,
                'kiosk_id' => $kiosk?->id,
                'supervisor_user_id' => $kiosk ? null : $supervisor?->id,
                'scan_timestamp' => $today->copy()->setTime(7, 45, 0),
            ]);
            AttendanceLog::create([
                'intern_user_id' => $user->id,
                'kiosk_id' => $kiosk?->id,
                'supervisor_user_id' => $kiosk ? null : $supervisor?->id,
                'scan_timestamp' => $today->copy()->setTime(17, 10, 0),
            ]);
        }
    }
}
