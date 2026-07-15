<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends Model
{
    protected $primaryKey = 'program_id';

    // Only created_at exists on this table, no updated_at column.
    public $timestamps = false;

    protected $fillable = [
        'program_name',
        'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'created_at' => 'datetime',
    ];

    /**
     * All intern profiles enrolled under this program.
     */
    public function internProfiles(): HasMany
    {
        return $this->hasMany(InternProfile::class, 'program_id', 'program_id');
    }
}