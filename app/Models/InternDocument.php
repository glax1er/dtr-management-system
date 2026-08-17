<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $document_type
 * @property string $original_filename
 * @property string $file_path
 * @property int|null $file_size_bytes
 * @property string $mime_type
 * @property string $status
 * @property string|null $rejection_reason
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $submitted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class InternDocument extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending_review';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const DOCUMENT_TYPES = [
        'parent_waiver' => [
            'name' => 'Parent / Guardian Consent & Waiver Form',
            'category' => 'Pre-Internship',
            'description' => 'Signed parent or guardian consent and waiver approving the internship placement.',
            'required' => true,
        ],
        'moa' => [
            'name' => 'Memorandum of Agreement (MOA)',
            'category' => 'Pre-Internship',
            'description' => 'Official agreement between your institution and the Host Training Establishment (HTE).',
            'required' => true,
        ],
        'endorsement_letter' => [
            'name' => 'Endorsement / Recommendation Letter',
            'category' => 'Pre-Internship',
            'description' => 'Official recommendation or endorsement letter from your department head/coordinator.',
            'required' => true,
        ],
        'medical_certificate' => [
            'name' => 'Medical Certificate (Fit to Work)',
            'category' => 'Pre-Internship',
            'description' => 'Medical health clearance certificate issued by an accredited clinic or physician.',
            'required' => true,
        ],
        'acceptance_letter' => [
            'name' => 'Acceptance Letter / Training Agreement',
            'category' => 'Pre-Internship',
            'description' => 'Official confirmation and acceptance letter issued by the Host Training Establishment.',
            'required' => true,
        ],
        'completion_certificate' => [
            'name' => 'Certificate of Completion',
            'category' => 'Exit / Post-Internship',
            'description' => 'Official certificate issued by the company upon completing required internship hours.',
            'required' => false,
        ],
    ];

    protected $fillable = [
        'user_id',
        'document_type',
        'original_filename',
        'file_path',
        'file_size_bytes',
        'mime_type',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
        'submitted_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'submitted_at' => 'datetime',
        'file_size_bytes' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by', 'id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public static function getTypeConfig(string $type): ?array
    {
        return self::DOCUMENT_TYPES[$type] ?? null;
    }

    public static function isValidType(string $type): bool
    {
        return array_key_exists($type, self::DOCUMENT_TYPES);
    }

    public function getFormattedFileSizeAttribute(): string
    {
        if (! $this->file_size_bytes) {
            return '0 B';
        }

        $units = ['B', 'KB', 'MB', 'GB'];
        $power = $this->file_size_bytes > 0 ? floor(log($this->file_size_bytes, 1024)) : 0;
        $power = min($power, count($units) - 1);

        return number_format($this->file_size_bytes / (1024 ** $power), 1) . ' ' . $units[$power];
    }
}
