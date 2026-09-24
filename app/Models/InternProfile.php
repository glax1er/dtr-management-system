<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Database\Eloquent\SoftDeletes;
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
        'status',
        'qr_code_value',
        'profile_photo_path',
        'registered_at',
        'approved_at',
        'privacy_accepted_at',
    ];

    protected $casts = [
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
     * Scope a query to only include intern profiles belonging to a given campus (via campus string, user campus, or program college campus).
     *
     * @param  Builder<static>  $query
     * @param  Campus|string|int  $campus
     * @return Builder<static>
     */
    public function scopeForCampus($query, Campus|string|int $campus)
    {
        $campusModel = $campus instanceof Campus ? $campus : null;
        $name = $campusModel ? $campusModel->name : (is_string($campus) ? $campus : null);
        $id = $campusModel ? $campusModel->id : (is_int($campus) ? $campus : null);

        return $query->where(function ($q) use ($name, $id) {
            $q->where(function ($sub) use ($name, $id) {
                if ($name !== null) {
                    $sub->where('campus', $name)
                        ->orWhereHas('user', fn ($uq) => $uq->where('campus', $name));
                }
                $sub->orWhereHas('program.college', function (Builder $cq) use ($name, $id) {
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
        });
    }
}
