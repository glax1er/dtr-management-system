<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('document_templates', function (Blueprint $table) {
            $table->string('name')->nullable()->after('document_type');
            $table->string('category')->nullable()->after('name');
            $table->text('description')->nullable()->after('category');
            $table->boolean('required')->default(true)->after('description');
            $table->boolean('is_custom')->default(false)->after('required');
            $table->string('original_filename')->nullable()->change();
            $table->string('file_path')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_templates', function (Blueprint $table) {
            $table->dropColumn(['name', 'category', 'description', 'required', 'is_custom']);
            $table->string('original_filename')->nullable(false)->change();
            $table->string('file_path')->nullable(false)->change();
        });
    }
};
