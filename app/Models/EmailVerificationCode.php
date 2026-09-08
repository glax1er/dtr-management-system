<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $email
 * @property string $code
 * @property Carbon $expires_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class EmailVerificationCode extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'email_verification_codes';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'email',
        'code',
        'expires_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    /**
     * Generate a new 6-digit verification code for the given email,
     * invalidating any previously issued codes.
     */
    public static function generateFor(string $email): string
    {
        $normalizedEmail = strtolower(trim($email));

        // Invalidate any older codes for this email
        static::where('email', $normalizedEmail)->delete();

        $code = sprintf('%06d', random_int(100000, 999999));

        static::create([
            'email' => $normalizedEmail,
            'code' => $code,
            'expires_at' => now()->addMinutes(15),
        ]);

        return $code;
    }

    /**
     * Verify whether the provided code is valid and not expired for the given email.
     * If valid, the code is consumed/deleted.
     */
    public static function verify(string $email, string $code): bool
    {
        $normalizedEmail = strtolower(trim($email));
        $trimmedCode = trim($code);

        $record = static::where('email', $normalizedEmail)
            ->where('code', $trimmedCode)
            ->where('expires_at', '>', now())
            ->first();

        if (! $record) {
            return false;
        }

        // Consume the code so it cannot be reused
        $record->delete();

        return true;
    }
}
