<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Storage;

class InternProfile extends Model
{
    use SoftDeletes;

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
        'campus',
        'campus_id',
        'status',
        'qr_code_value',
        'profile_photo_path',
        'registered_at',
        'approved_at',
        'privacy_accepted_at',
    ];

    protected $hidden = [
        'qr_code_value',
    ];

    protected $casts = [
        'campus_id' => 'integer',
        'contact_number' => 'encrypted',
        'registered_at' => 'datetime',
        'approved_at' => 'datetime',
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
        return $this->belongsTo(Hte::class, 'hte_id', 'hte_id')->withTrashed();
    }

    /**
     * @return BelongsTo<Program, $this>
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id', 'program_id')->withTrashed();
    }

    /**
     * The campus this intern belongs to.
     * Populated at registration time and used as the FK scope for id_number uniqueness.
     *
     * @return BelongsTo<Campus, $this>
     */
    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class, 'campus_id', 'id');
    }

    /**
     * Public URL for the profile photo, or null if the intern hasn't
     * uploaded one — the frontend falls back to a generic icon in that case.
     */
    public function getProfilePhotoUrlAttribute(): ?string
    {
        if ($this->profile_photo_path) {
            return Storage::disk('public')->url($this->profile_photo_path);
        }

        return $this->user?->profile_photo_url;
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

    /**
     * @return HasMany<InternDocument, $this>
     */
    public function internDocuments(): HasMany
    {
        return $this->hasMany(InternDocument::class, 'user_id', 'user_id');
    }

    /**
     * Scope a query to only include intern profiles whose user account has verified their email.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeVerified(Builder $query): Builder
    {
        return $query->whereHas('user', fn ($q) => $q->whereNotNull('email_verified_at'));
    }

    /**
     * Scope a query to only include intern profiles belonging to a given college (via program or user fallback).
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeForCollege(Builder $query, int $collegeId): Builder
    {
        return $query->where(function ($q) use ($collegeId) {
            $q->whereHas('program', fn ($pq) => $pq->where('college_id', $collegeId))
                ->orWhereHas('user', fn ($uq) => $uq->where('college_id', $collegeId));
        });
    }

    /**
     * Scope a query to only include intern profiles belonging to a given campus.
     *
     * Prefers the direct campus_id FK when available. Falls back to the legacy
     * campus string column, the user's campus string, and the program → college
     * campus link so that older records without a campus_id still resolve.
     *
     * @param  Builder<static>  $query
     * @param  Campus|string|int  $campus  Campus model, campus name string, or campus ID integer
     * @return Builder<static>
     */
    public function scopeForCampus($query, Campus|string|int $campus)
    {
        // When only a campus ID (integer) is supplied, load the model so we also have the
        // campus name. Without the name, the legacy campus-string fallback paths
        // (orWhere('campus', ...) and the user.campus path) would be silently skipped,
        // causing old records that were never backfilled with campus_id to be missed.
        if (is_int($campus)) {
            $campus = Campus::find($campus) ?? $campus; // keep the int if campus not found
        }

        $campusModel = $campus instanceof Campus ? $campus : null;
        $name = $campusModel ? $campusModel->name : (is_string($campus) ? $campus : null);
        $id   = $campusModel ? $campusModel->id   : (is_int($campus) ? $campus : null);

        return $query->where(function ($q) use ($name, $id) {
            // Primary path: intern has the campus_id FK set (new records)
            if ($id !== null) {
                $q->where('campus_id', $id);
            }

            // Legacy / fallback paths for records without campus_id
            if ($name !== null) {
                $q->orWhere('campus', $name)
                    ->orWhereHas('user', fn ($uq) => $uq->where('campus', $name));
            }

            // Derive campus via program -> college (both old and new college linkage)
            $q->orWhereHas('program.college', function (Builder $cq) use ($name, $id) {
                $cq->withoutGlobalScope(SoftDeletingScope::class)->where(function ($csub) use ($name, $id) {
                    if ($id !== null) {
                        $csub->where('campus_id', $id);
                    }
                    if ($name !== null) {
                        $csub->orWhere('campus', $name);
                    }
                });
            });
        });
    }
}
