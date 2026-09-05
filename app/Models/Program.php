<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Program extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'program_id';

    // Only created_at exists on this table. Eloquent will populate it on create
    // and {@see UPDATED_AT} is disabled since this table has no updated_at.
    public $timestamps = true;

    public const UPDATED_AT = null;

    protected $fillable = [
        'program_name',
        'is_active',
        'required_hours',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'required_hours' => 'integer',
        'created_at' => 'datetime',
    ];

    /**
     * All intern profiles enrolled under this program.
     *
     * @return HasMany<InternProfile, $this>
     */
    public function internProfiles(): HasMany
    {
        return $this->hasMany(InternProfile::class, 'program_id', 'program_id');
    }

    /**
     * All OJT supervisors assigned to this program.
     * These supervisors have read access to all interns in the program
     * across all HTEs.
     *
     * @return HasMany<SupervisorProfile, $this>
     */
    public function ojtSupervisors(): HasMany
    {
        return $this->hasMany(SupervisorProfile::class, 'program_id', 'program_id')
            ->where('supervisor_type', 'ojt');
    }
}
