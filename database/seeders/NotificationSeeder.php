<?php

namespace Database\Seeders;

use App\Models\College;
use App\Models\User;
use App\Notifications\CollegeAdminAccountNotification;
use App\Notifications\HoursMilestoneNotification;
use App\Notifications\InternDocumentNotification;
use App\Notifications\MissedTimeOutNotification;
use App\Notifications\NewInternRegistrationNotification;
use App\Notifications\ResolutionTicketNotification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NotificationSeeder extends Seeder
{
    /**
     * Seed diverse notifications for Super Admins, College Admins, Supervisors, and Interns.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@dtr.test')->first();
        $cicAdmin = User::where('email', 'admin.cic@dtr.test')->first();
        $ojtIt = User::where('email', 'ojt.it@dtr.test')->first();
        $accentureSupervisor = User::where('email', 'supervisor.accenture@dtr.test')->first();

        $alex = User::where('email', 'intern.alex@dtr.test')->first();
        $beatrice = User::where('email', 'intern.beatrice@dtr.test')->first();
        $carlo = User::where('email', 'intern.pending@dtr.test')->first();
        $eduardo = User::where('email', 'intern.completed@dtr.test')->first();
        $fiona = User::where('email', 'intern.revision@dtr.test')->first();

        $cic = College::where('code', 'CIC')->first();

        // 1. Super Admin Notifications
        if ($admin && $cicAdmin) {
            $this->createNotification(
                user: $admin,
                type: CollegeAdminAccountNotification::class,
                data: [
                    'type' => 'college_admin_account',
                    'event' => 'created',
                    'title' => 'College Admin Account Created',
                    'message' => 'System administrator created a new college admin account for Dr. Evelyn Tan (CIC).',
                    'href' => '/admin/college-admins',
                    'college_id' => $cic?->id,
                    'college_admin_user_id' => $cicAdmin->id,
                ],
                read: false,
                hoursAgo: 4
            );
        }

        if ($admin && $carlo) {
            $this->createNotification(
                user: $admin,
                type: NewInternRegistrationNotification::class,
                data: [
                    'type' => 'intern_registration',
                    'title' => 'New intern sign-up: Carlo Mendoza',
                    'message' => 'Carlo Mendoza (2023-00103 • BSCS • DICT RO11) registered and is pending approval.',
                    'href' => "/admin/interns?highlight={$carlo->id}",
                    'intern_user_id' => $carlo->id,
                    'id_number' => '2023-00103',
                ],
                read: false,
                hoursAgo: 3
            );
        }

        // 2. College Admin Notifications
        if ($cicAdmin && $carlo) {
            $this->createNotification(
                user: $cicAdmin,
                type: NewInternRegistrationNotification::class,
                data: [
                    'type' => 'intern_registration',
                    'title' => 'New intern sign-up: Carlo Mendoza',
                    'message' => 'Carlo Mendoza (2023-00103 • BSCS • DICT RO11) registered under your college programs and is pending approval.',
                    'href' => "/admin/interns?highlight={$carlo->id}",
                    'intern_user_id' => $carlo->id,
                    'id_number' => '2023-00103',
                ],
                read: false,
                hoursAgo: 3
            );
        }

        if ($cicAdmin && $eduardo) {
            $this->createNotification(
                user: $cicAdmin,
                type: HoursMilestoneNotification::class,
                data: [
                    'type' => 'college_admin_intern_completed',
                    'title' => 'Intern completed 100% required hours!',
                    'message' => 'Eduardo Ramos has completed 486 of 486 required training hours.',
                    'href' => "/admin/interns?highlight={$eduardo->id}",
                    'intern_user_id' => $eduardo->id,
                ],
                read: true,
                hoursAgo: 24
            );
        }

        // 3. OJT Supervisor Notifications
        if ($ojtIt && $alex) {
            $this->createNotification(
                user: $ojtIt,
                type: InternDocumentNotification::class,
                data: [
                    'type' => 'document_submitted',
                    'title' => 'Document submitted: Weekly Accomplishment Report',
                    'message' => 'Alex Rivera submitted Weekly Accomplishment Report for review.',
                    'href' => "/supervisor/interns?doc_intern={$alex->id}&highlight_doc=weekly_progress_report",
                    'intern_user_id' => $alex->id,
                ],
                read: false,
                hoursAgo: 18
            );
        }

        if ($ojtIt && $eduardo) {
            $this->createNotification(
                user: $ojtIt,
                type: HoursMilestoneNotification::class,
                data: [
                    'type' => 'supervisor_intern_completed',
                    'title' => 'Intern completed 100% required hours!',
                    'message' => 'Eduardo Ramos has completed 486 required training hours and all required documentation.',
                    'href' => "/supervisor/interns/{$eduardo->id}/completion-summary",
                    'intern_user_id' => $eduardo->id,
                ],
                read: true,
                hoursAgo: 48
            );
        }

        // 4. HTE Supervisor Notifications
        if ($accentureSupervisor && $alex) {
            $this->createNotification(
                user: $accentureSupervisor,
                type: ResolutionTicketNotification::class,
                data: [
                    'type' => 'resolution_ticket',
                    'event' => 'request_submitted',
                    'title' => 'Resolution request from Alex Rivera',
                    'message' => 'Request submitted for 2026-09-25.',
                    'href' => '/supervisor/resolution-tickets',
                    'date' => '2026-09-25',
                ],
                read: false,
                hoursAgo: 20
            );
        }

        if ($accentureSupervisor && $beatrice) {
            $this->createNotification(
                user: $accentureSupervisor,
                type: ResolutionTicketNotification::class,
                data: [
                    'type' => 'resolution_ticket',
                    'event' => 'request_submitted',
                    'title' => 'Resolution request from Beatrice Santos',
                    'message' => 'Request submitted for 2026-09-29.',
                    'href' => '/supervisor/resolution-tickets',
                    'date' => '2026-09-29',
                ],
                read: false,
                hoursAgo: 2
            );
        }

        // 5. Intern Notifications
        if ($alex) {
            $this->createNotification(
                user: $alex,
                type: HoursMilestoneNotification::class,
                data: [
                    'type' => 'hours_milestone_50',
                    'title' => 'Halfway there! 50% OJT Hours Completed',
                    'message' => 'Great job! You have rendered 250 of 486 required hours (50%).',
                    'href' => '/intern/dashboard?highlight_hours=1',
                    'total_hours' => 250,
                    'required_hours' => 486,
                ],
                read: true,
                hoursAgo: 72
            );

            $this->createNotification(
                user: $alex,
                type: InternDocumentNotification::class,
                data: [
                    'type' => 'document_approved',
                    'title' => "Document approved: Parent's Consent",
                    'message' => "Your Parent's Consent has been approved by your OJT Coordinator.",
                    'href' => '/intern/documents?highlight=parents_consent',
                    'intern_user_id' => $alex->id,
                ],
                read: true,
                hoursAgo: 120
            );

            $this->createNotification(
                user: $alex,
                type: ResolutionTicketNotification::class,
                data: [
                    'type' => 'resolution_ticket',
                    'event' => 'request_approved',
                    'title' => 'Your resolution request was approved',
                    'message' => 'Your request for 2026-09-16 was approved.',
                    'href' => '/intern/dashboard',
                    'date' => '2026-09-16',
                    'status' => 'approved',
                ],
                read: true,
                hoursAgo: 96
            );
        }

        if ($beatrice) {
            $this->createNotification(
                user: $beatrice,
                type: MissedTimeOutNotification::class,
                data: [
                    'type' => 'missed_timeout',
                    'title' => 'Missing Time-Out for 2026-09-29',
                    'message' => 'You clocked in on 2026-09-29 (8:02 AM) but did not record a Time-Out. Please submit a Resolution Ticket if needed.',
                    'href' => '/intern/dashboard?month=2026-09&highlight_date=2026-09-29',
                    'date' => '2026-09-29',
                ],
                read: false,
                hoursAgo: 14
            );
        }

        if ($fiona) {
            $this->createNotification(
                user: $fiona,
                type: InternDocumentNotification::class,
                data: [
                    'type' => 'document_rejected',
                    'title' => "Document needs revision: Parent's Consent",
                    'message' => 'Your Parent\'s Consent needs revision: Missing parent/guardian signature on page 2. Please have your parent sign and re-upload.',
                    'href' => '/intern/documents?highlight=parents_consent',
                    'intern_user_id' => $fiona->id,
                ],
                read: false,
                hoursAgo: 36
            );
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createNotification(User $user, string $type, array $data, bool $read, int $hoursAgo): void
    {
        $timestamp = now()->subHours($hoursAgo);

        DB::table('notifications')->updateOrInsert(
            [
                'notifiable_type' => User::class,
                'notifiable_id' => $user->id,
                'type' => $type,
                'data' => json_encode($data),
            ],
            [
                'id' => (string) Str::uuid(),
                'read_at' => $read ? $timestamp->copy()->addMinutes(15) : null,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]
        );
    }
}
