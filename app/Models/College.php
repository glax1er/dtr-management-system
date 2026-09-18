<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $interns_count
 */
class College extends Model
{
    /** @use HasFactory<Factory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'campus',
        'campus_id',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'campus_id' => 'integer',
    ];

    /**
     * The campus where this college is situated.
     *
     * @return BelongsTo<Campus, $this>
     */
    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class, 'campus_id', 'id');
    }

    /**
     * All academic programs under this college.
     *
     * @return HasMany<Program, $this>
     */
    public function programs(): HasMany
    {
        return $this->hasMany(Program::class, 'college_id', 'id');
    }

    /**
     * All HTEs partnered under this college.
     *
     * @return HasMany<Hte, $this>
     */
    public function htes(): HasMany
    {
        return $this->hasMany(Hte::class, 'college_id', 'id');
    }

    /**
     * College administrators assigned to this college.
     *
     * @return HasMany<User, $this>
     */
    public function admins(): HasMany
    {
        return $this->hasMany(User::class, 'college_id', 'id')
            ->where(function ($q) {
                $q->where('role', User::ROLE_COLLEGE_ADMIN)
                    ->orWhere(fn ($sub) => $sub->where('role', User::ROLE_ADMIN)->whereNotNull('college_id'));
            });
    }

    /**
     * College administrator profile records under this college.
     *
     * @return HasMany<CollegeAdminProfile, $this>
     */
    public function collegeAdminProfiles(): HasMany
    {
        return $this->hasMany(CollegeAdminProfile::class, 'college_id', 'id');
    }

    /**
     * All intern profiles enrolled under any program of this college.
     *
     * @return HasManyThrough<InternProfile, Program, $this>
     */
    public function internProfiles(): HasManyThrough
    {
        return $this->hasManyThrough(
            InternProfile::class,
            Program::class,
            'college_id', // Foreign key on programs table...
            'program_id', // Foreign key on intern_profiles table...
            'id',         // Local key on colleges table...
            'program_id'  // Local key on programs table...
        );
    }

    /**
     * Schedule periods defined for this college (Tier 2).
     *
     * @return HasMany<SchedulePeriod, $this>
     */
    public function schedulePeriods(): HasMany
    {
        return $this->hasMany(SchedulePeriod::class, 'college_id', 'id');
    }
}
