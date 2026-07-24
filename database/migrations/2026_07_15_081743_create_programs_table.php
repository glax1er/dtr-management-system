<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programs', function (Blueprint $table) {
            $table->id('program_id');
            $table->string('program_name', 100)->unique(); // e.g. BSIT-BTM, BSIT-IS, BSCS
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('required_hours')->nullable(); // Total OJT hours an intern under this program must render. 
            // Nullable: when a program hasn't had this set by Admin yet, the app falls back to config('dtr.default_required_hours').
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programs');
    }
};