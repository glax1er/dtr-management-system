<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Hte extends Model
{
    protected $primaryKey = 'hte_id';

    // Only created_at exists on this table, no updated_at column.
    public $timestamps = false;

    protected $fillable = [
        'hte_name',
        'address',
        'contact_person',
        'contact_number',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    /**
     * All interns assigned to this HTE.
     */
    public function internProfiles(): HasMany
    {
        return $this->hasMany(InternProfile::class, 'hte_id', 'hte_id');
    }

    /**
     * All supervisors assigned to this HTE.
     * (An HTE Supervisor's dashboard is scoped to just these interns — FR-17.)
     */
    public function supervisorProfiles(): HasMany
    {
        return $this->hasMany(SupervisorProfile::class, 'hte_id', 'hte_id');
    }
}