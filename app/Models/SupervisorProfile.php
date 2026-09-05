<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupervisorProfile extends Model
{
    use SoftDeletes;

    // user_id is the primary key here (one-to-one with users) —
    // same reasoning as InternProfile.
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    // Only created_at exists on this table. Eloquent will populate it on create
    // and {@see UPDATED_AT} is disabled since this table has no updated_at.
    public $timestamps = true;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'hte_id',
        'program_id',
        'supervisor_type',
        'status',
        'created_at',
    ];

    /**
     * The shared auth record (name, email, password, role) for this supervisor.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * The HTE this supervisor is assigned to (only for HTE supervisors).
     * For OJT supervisors, this will be null.
     *
     * @return BelongsTo<Hte, $this>
     */
    public function hte(): BelongsTo
    {
        return $this->belongsTo(Hte::class, 'hte_id', 'hte_id');
    }

    /**
     * The program this OJT supervisor oversees (only for OJT supervisors).
     * For HTE supervisors, this will be null.
     *
     * @return BelongsTo<Program, $this>
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id', 'program_id');
    }

    /**
     * Every attendance log this supervisor's scanner has recorded
     * (across all interns, not just their own HTE's — though in
     * practice a supervisor only ever scans their own HTE's interns).
     *
     * @return HasMany<AttendanceLog, $this>
     */
    public function scannedLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class, 'supervisor_user_id', 'user_id');
    }

    /**
     * Check if this is an HTE Supervisor.
     */
    public function isHteSupervisor(): bool
    {
        return $this->supervisor_type === 'hte';
    }

    /**
     * Check if this is an OJT Supervisor.
     */
    public function isOjtSupervisor(): bool
    {
        return $this->supervisor_type === 'ojt';
    }

    /**
     * Get all assigned interns for this supervisor (works for both HTE and OJT).
     * For HTE supervisors: returns interns from their assigned HTE.
     * For OJT supervisors: returns all interns from their assigned program.
     */
    public function getAssignedInterns(): mixed
    {
        if ($this->isHteSupervisor()) {
            return $this->hte?->internProfiles() ?? InternProfile::whereRaw('1 = 0');
        }

        return $this->program?->internProfiles() ?? InternProfile::whereRaw('1 = 0');
    }

    /**
     * Get the scope of this supervisor (either HTE or Program).
     * Useful for polymorphic queries and logic.
     *
     * @return Hte|Program|null
     */
    public function getScope()
    {
        return $this->isHteSupervisor() ? $this->hte : $this->program;
    }

    /**
     * Get the scope name for display/reference purposes.
     * HTE supervisors return their HTE name, OJT supervisors return their program name.
     */
    public function getScopeName(): string
    {
        return $this->isHteSupervisor()
            ? ($this->hte?->hte_name ?? 'Unknown HTE')
            : ($this->program?->program_name ?? 'Unknown Program');
    }
}
