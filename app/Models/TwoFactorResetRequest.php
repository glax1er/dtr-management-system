<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $requested_by_user_id
 * @property string|null $token_hash
 * @property string $status
 * @property string|null $reason
 * @property string|null $rejection_reason
 * @property string|null $user_ip
 * @property string|null $user_agent
 * @property Carbon|null $user_confirmed_at
 * @property int|null $admin_id
 * @property Carbon|null $admin_action_at
 * @property Carbon $expires_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read User|null $requestedBy
 * @property-read User|null $admin
 */
class TwoFactorResetRequest extends Model
{
    use HasFactory;

    public const STATUS_PENDING_USER_CONFIRMATION = 'pending_user_confirmation';

    public const STATUS_PENDING_ADMIN_APPROVAL = 'pending_admin_approval';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    /**
     * Confirmation window for the user to grant permission via email (15 minutes).
     */
    public const USER_CONFIRMATION_EXPIRY_MINUTES = 15;

    /**
     * Retention window for pending admin review once confirmed by user (48 hours).
     */
    public const ADMIN_REVIEW_EXPIRY_HOURS = 48;

    protected $fillable = [
        'user_id',
        'requested_by_user_id',
        'token_hash',
        'status',
        'reason',
        'rejection_reason',
        'user_ip',
        'user_agent',
        'user_confirmed_at',
        'admin_id',
        'admin_action_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'user_confirmed_at' => 'datetime',
            'admin_action_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * The target user whose 2FA is to be reset.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The actor who initiated the reset request (null if self-initiated by user).
     *
     * @return BelongsTo<User, $this>
     */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    /**
     * The administrator who approved or rejected the request.
     *
     * @return BelongsTo<User, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * Check if the confirmation token or request has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Create a new 2FA reset request for the specified user, invalidating any previous pending requests.
     * Returns a tuple of [$request, $plainToken].
     *
     * @return array{0: self, 1: string}
     */
    public static function createForUser(
        User $user,
        ?string $reason = null,
        ?User $requestedBy = null,
        ?string $ip = null,
        ?string $userAgent = null,
    ): array {
        // Invalidate any existing pending requests for this user
        static::where('user_id', $user->id)
            ->whereIn('status', [
                self::STATUS_PENDING_USER_CONFIRMATION,
                self::STATUS_PENDING_ADMIN_APPROVAL,
            ])
            ->update([
                'status' => self::STATUS_CANCELLED,
                'token_hash' => null,
            ]);

        $plainToken = Str::random(64);
        $tokenHash = hash('sha256', $plainToken);

        $request = static::create([
            'user_id' => $user->id,
            'requested_by_user_id' => $requestedBy?->id,
            'token_hash' => $tokenHash,
            'status' => self::STATUS_PENDING_USER_CONFIRMATION,
            'reason' => $reason,
            'user_ip' => $ip,
            'user_agent' => $userAgent,
            'expires_at' => now()->addMinutes(self::USER_CONFIRMATION_EXPIRY_MINUTES),
        ]);

        return [$request, $plainToken];
    }

    /**
     * Attempt to confirm user permission using the provided plain token.
     */
    public function confirmByUser(string $plainToken): bool
    {
        if ($this->status !== self::STATUS_PENDING_USER_CONFIRMATION) {
            return false;
        }

        if ($this->isExpired()) {
            return false;
        }

        if (! hash_equals($this->token_hash ?? '', hash('sha256', $plainToken))) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_PENDING_ADMIN_APPROVAL,
            'user_confirmed_at' => now(),
            'token_hash' => null, // Invalidate token so it cannot be used again
            'expires_at' => now()->addHours(self::ADMIN_REVIEW_EXPIRY_HOURS),
        ]);

        return true;
    }

    /**
     * Determine if an administrator has permission to approve/reject this request.
     */
    public function canBeManagedBy(User $admin): bool
    {
        if (! $admin->isAdmin()) {
            return false;
        }

        // An administrator cannot approve/reject their own reset request
        if ($admin->id === $this->user_id) {
            return false;
        }

        $targetUser = $this->user;
        if (! $targetUser) {
            return false;
        }

        // Super Admin can manage all requests (except their own)
        if ($admin->isSuperAdmin()) {
            return true;
        }

        // College Admin can ONLY manage supervisors and interns within their college
        if ($admin->isCollegeAdmin()) {
            if ($targetUser->isAdmin()) {
                return false;
            }

            return $targetUser->college_id !== null && $targetUser->college_id === $admin->college_id;
        }

        return false;
    }
}
