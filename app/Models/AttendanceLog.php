<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    protected $primaryKey = 'log_id';

    // Only created_at exists, no updated_at column.
    public $timestamps = false;

    protected $fillable = [
        'intern_user_id',
        'supervisor_user_id',
        'scan_timestamp',
    ];

    protected $casts = [
        'scan_timestamp' => 'datetime',
        'created_at'     => 'datetime',
    ];

    /**
     * The intern who was scanned (a User with role = intern).
     *
     * @return BelongsTo<User, $this>
     */
    public function intern(): BelongsTo
    {
        return $this->belongsTo(User::class, 'intern_user_id', 'id');
    }

    /**
     * That intern's profile fields directly (id_number, hte, program, etc.),
     * useful when you need those without also loading the User relation.
     *
     * @return BelongsTo<InternProfile, $this>
     */
    public function internProfile(): BelongsTo
    {
        return $this->belongsTo(InternProfile::class, 'intern_user_id', 'user_id');
    }

    /**
     * The supervisor whose scanner recorded this entry (a User with
     * role = supervisor) — FR-28.
     *
     * @return BelongsTo<User, $this>
     */
    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_user_id', 'id');
    }
}
