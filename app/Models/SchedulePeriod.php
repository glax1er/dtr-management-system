<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class SchedulePeriod extends Model
{
    protected $fillable = [
        'name',
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
     * Null = global default (admin-managed). Non-null = HTE-specific
     * override (supervisor-managed).
     *
     * @return BelongsTo<Hte, $this>
     */
    public function hte(): BelongsTo
    {
        return $this->belongsTo(Hte::class, 'hte_id', 'hte_id');
    }

    public function isGlobal(): bool
    {
        return $this->hte_id === null;
    }

    /**
     * The expected start time for a given date and HTE, checking an
     * HTE-specific override first, then falling back to the global
     * default, then a hardcoded fallback if nothing is configured yet.
     * Returns null if that day is explicitly marked "no work expected."
     */
    public static function expectedStartTimeFor(CarbonInterface $date, int $hteId): ?string
    {
        $dayName = strtolower($date->englishDayOfWeek);
        $dateStr = $date->toDateString();

        $override = static::where('hte_id', $hteId)
            ->whereDate('start_date', '<=', $dateStr)
            ->whereDate('end_date', '>=', $dateStr)
            ->first();

        if ($override) {
            return $override->day_schedule[$dayName] ?? null;
        }

        $global = static::whereNull('hte_id')
            ->whereDate('start_date', '<=', $dateStr)
            ->whereDate('end_date', '>=', $dateStr)
            ->first();

        if ($global) {
            return $global->day_schedule[$dayName] ?? null;
        }

        return config('dtr.expected_start_time', '08:00');
    }
}