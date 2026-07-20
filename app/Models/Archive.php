<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Archive extends Model
{
    protected $fillable = [
        'archivable_type',
        'archivable_id',
        'data',
        'archived_at',
        'restored_at',
    ];

    protected $casts = [
        'data' => 'array',
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function archivable(): MorphTo
    {
        return $this->morphTo();
    }
}