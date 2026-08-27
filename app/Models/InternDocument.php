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
        // ── Pre Deployment ──────────────────────────────────────────────────
        'parents_consent' => [
            'name' => "Parent's Consent",
            'category' => 'Pre Deployment',
            'description' => 'Signed consent from parent or guardian allowing you to proceed with the internship deployment.',
            'required' => true,
        ],
        'usep_hte_nda' => [
            'name' => 'For USeP-HTE NDA',
            'category' => 'Pre Deployment',
            'description' => 'Non-Disclosure Agreement between USeP and the Host Training Establishment (for USeP-affiliated companies).',
            'required' => true,
        ],
        'outside_hte_nda' => [
            'name' => 'For Outside Companies-HTE NDA',
            'category' => 'Pre Deployment',
            'description' => 'Non-Disclosure Agreement between the intern and the Host Training Establishment (for outside/non-USeP companies).',
            'required' => true,
        ],
        'pre_deployment_cert' => [
            'name' => 'Pre-Deployment Enrollment Orientation Certificate',
            'category' => 'Pre Deployment',
            'description' => 'Certificate of completion for the mandatory pre-deployment enrollment orientation.',
            'required' => true,
        ],
        'waiver_of_claim' => [
            'name' => 'Waiver of Claim',
            'category' => 'Pre Deployment',
            'description' => 'Signed waiver releasing USeP from liability during the internship deployment period.',
            'required' => true,
        ],

        // ── During Deployment ────────────────────────────────────────────────
        'dtr' => [
            'name' => 'DTR (Daily Time Record)',
            'category' => 'During Deployment',
            'description' => 'Official daily time record documenting your attendance and hours rendered during deployment.',
            'required' => true,
        ],
        'weekly_progress_report' => [
            'name' => 'Weekly Progress Report',
            'category' => 'During Deployment',
            'description' => 'Weekly summary report of tasks accomplished and progress made during deployment.',
            'required' => true,
        ],
        'competency_tech_support' => [
            'name' => 'Assessment of Competency Form – Tech Support',
            'category' => 'During Deployment',
            'description' => 'Competency assessment form evaluating technical support skills demonstrated during deployment.',
            'required' => true,
        ],
        'competency_tech_documentation' => [
            'name' => 'Assessment of Competency Form – Tech Documentation',
            'category' => 'During Deployment',
            'description' => 'Competency assessment form evaluating technical documentation skills demonstrated during deployment.',
            'required' => true,
        ],
        'competency_soft_design' => [
            'name' => 'Assessment of Competency Form – Soft Design and Development',
            'category' => 'During Deployment',
            'description' => 'Competency assessment form evaluating software design and development skills demonstrated during deployment.',
            'required' => true,
        ],

        // ── Evaluation Forms ─────────────────────────────────────────────────
        'hte_evaluation_1' => [
            'name' => 'HTE Evaluation 1 – Certificate of Completion',
            'category' => 'Evaluation Forms',
            'description' => 'First HTE evaluation form combined with the official Certificate of Completion issued by the company.',
            'required' => true,
        ],
        'hte_evaluation_2' => [
            'name' => 'HTE Evaluation 2',
            'category' => 'Evaluation Forms',
            'description' => 'Second evaluation form completed by the Host Training Establishment assessing overall internship performance.',
            'required' => true,
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

    public static function getTypeConfig(string $type, ?int $programId = null): ?array
    {
        $base = self::DOCUMENT_TYPES[$type] ?? null;

        $query = DocumentTemplate::withTrashed()->where('document_type', $type);
        if ($programId) {
            $query->where('program_id', $programId);
        }
        $template = $query->first();

        if ($template) {
            return [
                'name' => $template->name ?: ($base['name'] ?? $type),
                'category' => $template->category ?: ($base['category'] ?? 'General'),
                'description' => $template->description ?: ($base['description'] ?? ''),
                'required' => $template->required ?? ($base['required'] ?? true),
                'is_custom' => (bool) $template->is_custom,
            ];
        }

        return $base;
    }

    public static function isValidType(string $type, ?int $programId = null): bool
    {
        if (array_key_exists($type, self::DOCUMENT_TYPES)) {
            return true;
        }

        if ($programId) {
            return DocumentTemplate::where('program_id', $programId)
                ->where('document_type', $type)
                ->exists();
        }

        return DocumentTemplate::where('document_type', $type)->exists();
    }

    public static function getDocumentTypesForProgram(?int $programId): array
    {
        $types = self::DOCUMENT_TYPES;

        if (! $programId) {
            return $types;
        }

        $templates = DocumentTemplate::where('program_id', $programId)->get()->keyBy('document_type');
        $trashedTemplates = DocumentTemplate::onlyTrashed()->where('program_id', $programId)->get()->keyBy('document_type');

        $result = [];

        // 1. Predefined types (unless archived/trashed)
        foreach ($types as $key => $config) {
            if ($trashedTemplates->has($key)) {
                continue;
            }

            $template = $templates->get($key);
            $result[$key] = [
                'name' => $template?->name ?: $config['name'],
                'category' => $template?->category ?: $config['category'],
                'description' => $template?->description ?: $config['description'],
                'required' => $template ? (bool) $template->required : (bool) $config['required'],
                'is_custom' => false,
            ];
        }

        // 2. Custom active types
        foreach ($templates as $key => $template) {
            if ($template->is_custom && ! isset($result[$key])) {
                $result[$key] = [
                    'name' => $template->display_name,
                    'category' => $template->display_category,
                    'description' => $template->display_description,
                    'required' => (bool) $template->required,
                    'is_custom' => true,
                ];
            }
        }

        return $result;
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
