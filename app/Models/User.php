<?php

namespace App\Models;

use App\Notifications\EmailVerificationCodeNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $role
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['role', 'name', 'email', 'password', 'notification_preferences', 'notifications_cleared_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'role',
        'name',
        'email',
        'password',
        'notification_preferences',
        'notifications_cleared_at',
    ];

    // Role constants so the rest of the app never has to type the
    // raw strings 'admin' / 'supervisor' / 'intern' directly.
    public const ROLE_ADMIN = 'admin';

    public const ROLE_SUPERVISOR = 'supervisor';

    public const ROLE_INTERN = 'intern';

    /**
     * Notification preference definitions and defaults per role.
     */
    public const ROLE_NOTIFICATION_PREFERENCES = [
        self::ROLE_INTERN => [
            'attendance_alerts' => [
                'key' => 'attendance_alerts',
                'label' => 'Attendance & Missed Time-Out Alerts',
                'description' => 'Receive reminders when a Time-In was logged without a corresponding Time-Out.',
                'default' => true,
            ],
            'milestone_alerts' => [
                'key' => 'milestone_alerts',
                'label' => 'OJT Hours Milestone Alerts',
                'description' => 'Get notified when reaching 50%, 80%, and 100% of required training hours.',
                'default' => true,
            ],
            'schedule_alerts' => [
                'key' => 'schedule_alerts',
                'label' => 'Schedule & Shift Updates',
                'description' => 'Receive alerts when global training schedules or HTE schedule overrides are updated.',
                'default' => true,
            ],
            'document_updates' => [
                'key' => 'document_updates',
                'label' => 'Document Review Updates',
                'description' => 'Receive alerts when your submitted requirement documents are approved or require revision.',
                'default' => true,
            ],
            'ticket_updates' => [
                'key' => 'ticket_updates',
                'label' => 'Resolution Ticket Updates',
                'description' => 'Get notified when your attendance resolution tickets are approved or rejected.',
                'default' => true,
            ],
        ],
        'supervisor_ojt' => [
            'document_submissions' => [
                'key' => 'document_submissions',
                'label' => 'Intern Document Submissions',
                'description' => 'Receive alerts when interns in your program submit requirement documents for review.',
                'default' => true,
            ],
            'intern_completions' => [
                'key' => 'intern_completions',
                'label' => 'Intern Hours Completion Alerts',
                'description' => 'Get notified when an assigned intern completes 100% of their required training hours.',
                'default' => true,
            ],
        ],
        'supervisor_hte' => [
            'ticket_requests' => [
                'key' => 'ticket_requests',
                'label' => 'Resolution Ticket Requests',
                'description' => 'Receive alerts when interns submit attendance resolution requests requiring your review.',
                'default' => true,
            ],
            'schedule_alerts' => [
                'key' => 'schedule_alerts',
                'label' => 'Schedule Updates',
                'description' => 'Receive alerts when administrators update official training schedules.',
                'default' => true,
            ],
            'intern_completions' => [
                'key' => 'intern_completions',
                'label' => 'Intern Hours Completion Alerts',
                'description' => 'Get notified when an assigned intern completes 100% of their required training hours.',
                'default' => true,
            ],
        ],
        self::ROLE_SUPERVISOR => [
            'ticket_requests' => [
                'key' => 'ticket_requests',
                'label' => 'Resolution Ticket Requests',
                'description' => 'Receive alerts when interns submit attendance resolution requests requiring your review.',
                'default' => true,
            ],
            'schedule_alerts' => [
                'key' => 'schedule_alerts',
                'label' => 'Schedule Updates',
                'description' => 'Receive alerts when administrators update official training schedules.',
                'default' => true,
            ],
            'intern_completions' => [
                'key' => 'intern_completions',
                'label' => 'Intern Hours Completion Alerts',
                'description' => 'Get notified when an assigned intern completes 100% of their required training hours.',
                'default' => true,
            ],
        ],
        self::ROLE_ADMIN => [
            'intern_registrations' => [
                'key' => 'intern_registrations',
                'label' => 'New Intern Registrations',
                'description' => 'Receive alerts when new interns register and require account approval.',
                'default' => true,
            ],
        ],
    ];

    /**
     * Default notification preferences (fallback for legacy or intern role).
     */
    public const DEFAULT_NOTIFICATION_PREFERENCES = [
        'document_updates' => true,
        'milestone_alerts' => true,
        'attendance_alerts' => true,
        'schedule_alerts' => true,
        'ticket_updates' => true,
    ];

    /**
     * Get available notification configuration options for this user's role.
     *
     * @return array<string, array<string, mixed>>
     */
    public function getAvailableNotificationOptions(): array
    {
        if ($this->role === self::ROLE_SUPERVISOR) {
            if ($this->supervisorProfile?->isOjtSupervisor()) {
                return self::ROLE_NOTIFICATION_PREFERENCES['supervisor_ojt'];
            }
            if ($this->supervisorProfile?->isHteSupervisor()) {
                return self::ROLE_NOTIFICATION_PREFERENCES['supervisor_hte'];
            }

            return self::ROLE_NOTIFICATION_PREFERENCES[self::ROLE_SUPERVISOR];
        }

        return self::ROLE_NOTIFICATION_PREFERENCES[$this->role] ?? self::ROLE_NOTIFICATION_PREFERENCES[self::ROLE_INTERN];
    }

    /**
     * Get default notification preferences for this user's role.
     *
     * @return array<string, bool>
     */
    public function getDefaultNotificationPreferences(): array
    {
        $options = $this->getAvailableNotificationOptions();
        $defaults = [];

        foreach ($options as $key => $option) {
            $defaults[$key] = (bool) ($option['default'] ?? true);
        }

        return $defaults;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'notification_preferences' => 'array',
            'notifications_cleared_at' => 'datetime',
        ];
    }

    /**
     * Get user notification preferences merged with defaults.
     *
     * @return array<string, bool>
     */
    public function getNotificationPreferences(): array
    {
        return array_merge(
            $this->getDefaultNotificationPreferences(),
            $this->notification_preferences ?? []
        );
    }

    /**
     * Check if user has opted into a specific notification type.
     */
    public function wantsNotification(string $key): bool
    {
        $prefs = $this->getNotificationPreferences();

        return (bool) ($prefs[$key] ?? true);
    }

    /**
     * The intern-specific fields for this user, if role = intern.
     * Null for admin/supervisor accounts.
     *
     * @return HasOne<InternProfile, $this>
     */
    public function internProfile(): HasOne
    {
        return $this->hasOne(InternProfile::class, 'user_id', 'id');
    }

    /**
     * The supervisor-specific fields for this user, if role = supervisor.
     * Null for admin/intern accounts.
     *
     * @return HasOne<SupervisorProfile, $this>
     */
    public function supervisorProfile(): HasOne
    {
        return $this->hasOne(SupervisorProfile::class, 'user_id', 'id');
    }

    /**
     * Uploaded requirement documents for this user (if role = intern).
     *
     * @return HasMany<InternDocument, $this>
     */
    public function internDocuments(): HasMany
    {
        return $this->hasMany(InternDocument::class, 'user_id', 'id');
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isSupervisor(): bool
    {
        return $this->role === self::ROLE_SUPERVISOR;
    }

    public function isIntern(): bool
    {
        return $this->role === self::ROLE_INTERN;
    }

    /**
     * Determine if the user has verified their email address.
     * Email verification is intern-only: admins are hard-coded/seeded
     * and exempt, and HTE/OJT supervisors are provisioned directly by
     * admins, so neither role is required to verify.
     */
    public function hasVerifiedEmail(): bool
    {
        if ($this->isAdmin() || $this->isSupervisor()) {
            return true;
        }

        return ! is_null($this->email_verified_at);
    }

    /**
     * Send the email verification 6-digit code notification.
     */
    public function sendEmailVerificationNotification(): void
    {
        $code = EmailVerificationCode::generateFor($this->email);
        $this->notify(new EmailVerificationCodeNotification($code));
    }

    /**
     * The named route this user should land on after login, or when
     * hitting the generic /dashboard redirect.
     *
     * OJT Supervisors don't get a dashboard of their own — they only
     * view/monitor their program's roster — so they land straight on
     * "My Students" instead of the (HTE-only) supervisor dashboard.
     */
    public function homeRouteName(): string
    {
        return match (true) {
            $this->isAdmin() => 'admin.dashboard',
            $this->isSupervisor() && $this->supervisorProfile?->isOjtSupervisor() => 'supervisor.interns.index',
            $this->isSupervisor() => 'supervisor.dashboard',
            $this->isIntern() => 'intern.dashboard',
            default => throw new \UnexpectedValueException('Invalid user role.'),
        };
    }
}
