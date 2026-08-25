<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $program_id
 * @property string $document_type
 * @property string|null $name
 * @property string|null $category
 * @property string|null $description
 * @property bool $required
 * @property bool $is_custom
 * @property string|null $original_filename
 * @property string|null $file_path
 * @property int|null $file_size_bytes
 * @property string|null $mime_type
 * @property int $uploaded_by
 * @property string|null $instructions
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class DocumentTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'program_id',
        'document_type',
        'name',
        'category',
        'description',
        'required',
        'is_custom',
        'original_filename',
        'file_path',
        'file_size_bytes',
        'mime_type',
        'uploaded_by',
        'instructions',
    ];

    protected $casts = [
        'file_size_bytes' => 'integer',
        'program_id' => 'integer',
        'required' => 'boolean',
        'is_custom' => 'boolean',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id', 'program_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by', 'id');
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->name ?: (InternDocument::getTypeConfig($this->document_type)['name'] ?? $this->document_type);
    }

    public function getDisplayCategoryAttribute(): string
    {
        return $this->category ?: (InternDocument::getTypeConfig($this->document_type)['category'] ?? 'Pre Deployment');
    }

    public function getDisplayDescriptionAttribute(): string
    {
        return $this->description ?: (InternDocument::getTypeConfig($this->document_type)['description'] ?? '');
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

    public function getFileExtensionAttribute(): string
    {
        if (! $this->original_filename) {
            return 'FILE';
        }

        $ext = pathinfo($this->original_filename, PATHINFO_EXTENSION);

        return strtoupper($ext ?: 'FILE');
    }

    public function hasFile(): bool
    {
        return ! empty($this->file_path);
    }
}
