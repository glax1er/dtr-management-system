<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use RuntimeException;

class AuditLog extends Model
{
    use HasFactory;

    // Audit logs are append-only. Only created_at exists.
    public $timestamps = false;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'user_name',
        'user_role',
        'action',
        'auditable_type',
        'auditable_id',
        'description',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Enforce immutability: audit logs can NEVER be updated or deleted once created.
     */
    protected static function booted(): void
    {
        static::creating(function (AuditLog $log) {
            if (! $log->created_at) {
                $log->created_at = now();
            }
        });

        static::updating(function () {
            throw new RuntimeException('Audit logs are immutable and cannot be updated.');
        });

        static::deleting(function () {
            throw new RuntimeException('Audit logs are immutable and cannot be deleted.');
        });
    }

    /**
     * Convenient helper to record an immutable audit log entry.
     */
    public static function record(
        string $action,
        ?string $description = null,
        ?Model $auditable = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?User $user = null,
    ): self {
        $actor = $user ?? auth()->user();

        return static::create([
            'user_id' => $actor?->id,
            'user_name' => $actor?->name,
            'user_role' => $actor?->role,
            'action' => $action,
            'auditable_type' => $auditable?->getMorphClass(),
            'auditable_id' => $auditable?->getKey(),
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'created_at' => now(),
        ]);
    }

    /**
     * The user / actor who performed the action.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The subject of the audit record (polymorphic).
     */
    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }
}
