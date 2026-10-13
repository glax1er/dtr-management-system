<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchedulePeriod extends Model
{
    protected $fillable = [
        'name',
        'college_id',
        'hte_id',
        'start_date',
        'end_date',
        'day_schedule',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'day_schedule' => 'array',
    ];

    /**
     * Null = university-wide global default (or HTE override).
     * Non-null = college-specific schedule (Tier 2).
     *
     * @return BelongsTo<College, $this>
     */
    public function college(): BelongsTo
    {
        return $this->belongsTo(College::class, 'college_id', 'id');
    }

    /**
     * Null = global/college default. Non-null = HTE-specific
     * override (Tier 3 supervisor-managed).
     *
     * @return BelongsTo<Hte, $this>
     */
    public function hte(): BelongsTo
    {
        return $this->belongsTo(Hte::class, 'hte_id', 'hte_id');
    }

    public function isGlobal(): bool
    {
        return $this->hte_id === null && $this->college_id === null;
    }

    public function isCollege(): bool
    {
        return $this->hte_id === null && $this->college_id !== null;
    }

    public function isHte(): bool
    {
        return $this->hte_id !== null;
    }

    public function getTier(): string
    {
        if ($this->hte_id !== null) {
            return 'hte';
        }

        if ($this->college_id !== null) {
            return 'college';
        }

        return 'global';
    }

    /**
     * 3-Tier expected start time resolution:
     * 1. HTE-specific override (Tier 3, supervisor-managed)
     * 2. College-specific schedule (Tier 2, set by college admin or for college)
     * 3. University-wide global default (Tier 1, super admin-managed)
     * 4. Hardcoded fallback (08:00 on weekdays, null on weekends).
     */
    public static function expectedStartTimeFor(CarbonInterface $date, ?int $hteId = null, ?int $collegeId = null): ?string
    {
        $dayName = strtolower($date->englishDayOfWeek);
        $dateStr = $date->toDateString();

        // 1. Tier 3: HTE-specific override
        if ($hteId !== null) {
            $hteOverride = static::where('hte_id', $hteId)
                ->whereDate('start_date', '<=', $dateStr)
                ->whereDate('end_date', '>=', $dateStr)
                ->first();

            if ($hteOverride) {
                return $hteOverride->day_schedule[$dayName] ?? null;
            }

            if ($collegeId === null) {
                $collegeId = Hte::where('hte_id', $hteId)->value('college_id');
            }
        }

        // 2. Tier 2: College-specific schedule
        if ($collegeId !== null) {
            $collegeSchedule = static::where('college_id', $collegeId)
                ->whereNull('hte_id')
                ->whereDate('start_date', '<=', $dateStr)
                ->whereDate('end_date', '>=', $dateStr)
                ->first();

            if ($collegeSchedule) {
                return $collegeSchedule->day_schedule[$dayName] ?? null;
            }
        }

        // 3. Tier 1: University-wide global default
        $global = static::whereNull('college_id')
            ->whereNull('hte_id')
            ->whereDate('start_date', '<=', $dateStr)
            ->whereDate('end_date', '>=', $dateStr)
            ->first();

        if ($global) {
            return $global->day_schedule[$dayName] ?? null;
        }

        if ($date->isWeekend()) {
            return null;
        }

        return config('dtr.expected_start_time', '08:00');
    }
}
