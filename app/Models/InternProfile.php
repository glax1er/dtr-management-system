<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InternProfile extends Model
{
    // user_id is the primary key here (one-to-one with users) —
    // it's not an auto-incrementing column of its own, it just
    // borrows the id assigned by the users table.
    protected $primaryKey = 'user_id';
    public $incrementing = false;

    // Only created_at (registered_at) exists, no updated_at column.
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'id_number',
        'contact_number',
        'sex',
        'hte_id',
        'program_id',
        'status',
        'qr_code_value',
        'registered_at',
        'approved_at',
        'privacy_accepted_at',
    ];

    protected $casts = [
        'registered_at' => 'datetime',
        'approved_at'   => 'datetime',
        'privacy_accepted_at' => 'datetime',
    ];

    /**
     * The shared auth record (name, email, password, role) for this intern.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * @return BelongsTo<Hte, $this>
     */
    public function hte(): BelongsTo
    {
        return $this->belongsTo(Hte::class, 'hte_id', 'hte_id');
    }

    /**
     * @return BelongsTo<Program, $this>
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id', 'program_id');
    }

    /**
     * Raw scan history for this intern (every Time In / Time Out scan).
     * Joins through users.id since attendance_logs references the
     * shared users table, not this profile table directly.
     *
     * @return HasMany<AttendanceLog, $this>
     */
    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class, 'intern_user_id', 'user_id');
    }
}
