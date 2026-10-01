<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CollegeAdminProfile extends Model
{
    /** @use HasFactory<Factory> */
    use HasFactory, SoftDeletes;

    // user_id is the primary key (one-to-one with users table)
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'college_id',
        'campus_id',
        'employee_id',
        'position',
    ];

    /**
     * The underlying User account.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * The college assigned to this college administrator.
     *
     * @return BelongsTo<College, $this>
     */
    public function college(): BelongsTo
    {
        return $this->belongsTo(College::class, 'college_id', 'id');
    }

    /**
     * The campus where this college administrator is located.
     *
     * @return BelongsTo<Campus, $this>
     */
    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class, 'campus_id', 'id');
    }
}
