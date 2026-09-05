<?php

namespace App\Console\Commands;

use App\Models\InternProfile;
use App\Notifications\MissedTimeOutNotification;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CheckMissedTimeOutsCommand extends Command
{
    protected $signature = 'dtr:check-missed-timeouts {--date= : Specific date to check in YYYY-MM-DD format (defaults to yesterday)}';

    protected $description = 'Detects interns with a recorded Time-In but missing Time-Out on a given date and notifies them';

    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $timezone = config('dtr.timezone');
        $dateParam = $this->option('date');

        $date = $dateParam
            ? Carbon::createFromFormat('Y-m-d', $dateParam, $timezone)->startOfDay()
            : Carbon::now($timezone)->subDay()->startOfDay();

        $dateString = $date->toDateString();
        $this->info("Checking for missed time-outs on: {$dateString}");

        $interns = InternProfile::query()
            ->with(['user', 'hte', 'program'])
            ->where('status', 'approved')
            ->whereNotNull('hte_id')
            ->get();

        $notifiedCount = 0;

        foreach ($interns as $intern) {
            $user = $intern->user;
            if (! $user) {
                continue;
            }

            $dayEntry = $this->calculator->forIntern(
                $intern->user_id,
                $intern->hte_id,
                from: $date->clone()->startOfDay(),
                to: $date->clone()->endOfDay(),
                approvedAt: $intern->approved_at,
            )->first();

            // Check if day has a time_in but missing time_out
            if ($dayEntry && $dayEntry->isOpen() && $user->wantsNotification('attendance_alerts')) {
                $alreadyNotified = $user->notifications()
                    ->where('data->type', 'missed_timeout')
                    ->where('data->date', $dateString)
                    ->exists();

                if (! $alreadyNotified) {
                    $timeInFormatted = $dayEntry->timeIn
                        ? $dayEntry->timeIn->clone()->setTimezone($timezone)->format('g:i A')
                        : null;

                    $user->notify(new MissedTimeOutNotification(
                        date: $dateString,
                        timeIn: $timeInFormatted,
                    ));

                    $notifiedCount++;
                    $this->line("Notified {$user->name} ({$intern->id_number}) for missed time-out on {$dateString}.");
                }
            }
        }

        $this->info("Complete! Total interns notified: {$notifiedCount}");

        return self::SUCCESS;
    }
}
