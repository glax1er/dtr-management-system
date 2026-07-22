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
     *
     * @return HasMany<InternProfile, $this>
     */
    public function internProfiles(): HasMany
    {
        return $this->hasMany(InternProfile::class, 'hte_id', 'hte_id');
    }

    /**
     * All supervisors assigned to this HTE.
     * (An HTE Supervisor's dashboard is scoped to just these interns — FR-17.)
     *
     * @return HasMany<SupervisorProfile, $this>
     */
    public function supervisorProfiles(): HasMany
    {
        return $this->hasMany(SupervisorProfile::class, 'hte_id', 'hte_id');
    }

    /**
     * Recomputes and saves `contact_person` from the names of this HTE's
     * currently active supervisors, joined by comma if there's more than
     * one. Called whenever a supervisor is assigned or their status
     * changes, so the stored column always reflects who's actually
     * reachable — never a stale or manually-typed name.
     */
    public function refreshContactPerson(): void
    {
        $names = $this->supervisorProfiles()
            ->where('status', 'active')
            ->with('user:id,name')
            ->get()
            ->pluck('user.name')
            ->filter()
            ->join(', ');

        $this->update(['contact_person' => $names ?: null]);
    }
}