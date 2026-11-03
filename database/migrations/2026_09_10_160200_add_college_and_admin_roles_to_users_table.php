<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 50)->default('intern')->change();
            $table->foreignId('college_id')->nullable()->after('role')->constrained('colleges')->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('profile_photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('college_id');
            $table->dropColumn('is_active');
            $table->enum('role', ['admin', 'supervisor', 'intern'])->default('intern')->change();
        });
    }
};
