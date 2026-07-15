<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupervisorProfile extends Model
{
    // user_id is the primary key here (one-to-one with users) —
    // same reasoning as InternProfile.
    protected $primaryKey = 'user_id';
    public $incrementing = false;

    // Only created_at exists, no updated_at column.
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'hte_id',
        'status',
    ];

    /**
     * The shared auth record (name, email, password, role) for this supervisor.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function hte(): BelongsTo
    {
        return $this->belongsTo(Hte::class, 'hte_id', 'hte_id');
    }

    /**
     * Every attendance log this supervisor's scanner has recorded
     * (across all interns, not just their own HTE's — though in
     * practice a supervisor only ever scans their own HTE's interns).
     */
    public function scannedLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class, 'supervisor_user_id', 'user_id');
    }
}
