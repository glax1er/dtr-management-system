<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResolutionTicket extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'intern_user_id',
        'date',
        'proposed_time_in',
        'proposed_time_out',
        'reason',
        'status',
        'final_time_in',
        'final_time_out',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'date' => 'date',
        'proposed_time_in' => 'datetime',
        'proposed_time_out' => 'datetime',
        'final_time_in' => 'datetime',
        'final_time_out' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    /**
     * The intern who opened this ticket.
     *
     * @return BelongsTo<User, $this>
     */
    public function intern(): BelongsTo
    {
        return $this->belongsTo(User::class, 'intern_user_id', 'id');
    }

    /**
     * The supervisor who approved/rejected this ticket. Null while pending.
     *
     * @return BelongsTo<User, $this>
     */
    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by', 'id');
    }

    /**
     * The attendance_logs row(s) written back on approval — 0 rows while
     * pending/rejected/cancelled, 1 row for a missing_time_in or open
     * ticket, 2 rows for a no_record ticket (see
     * ResolutionTicketController::approve()).
     *
     * @return HasMany<AttendanceLog, $this>
     */
    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class, 'resolved_ticket_id', 'id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}