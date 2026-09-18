<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Campus extends Model
{
    /** @use HasFactory<\Database\Factories\CampusFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'address',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * All colleges situated in or assigned to this campus.
     *
     * @return HasMany<College, $this>
     */
    public function colleges(): HasMany
    {
        return $this->hasMany(College::class, 'campus_id', 'id');
    }

    /**
     * All college administrators stationed at this campus.
     *
     * @return HasMany<CollegeAdminProfile, $this>
     */
    public function collegeAdminProfiles(): HasMany
    {
        return $this->hasMany(CollegeAdminProfile::class, 'campus_id', 'id');
    }
}
