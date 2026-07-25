<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intern_profiles', function (Blueprint $table) {
            // One-to-one with users: the profile IS the intern,
            // it has no independent lifecycle, so user_id is the PK.
            $table->foreignId('user_id')
                ->primary()
                ->constrained('users')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->string('id_number', 50)->unique();
            $table->string('contact_number', 20)->nullable(); // optional per privacy
            $table->enum('sex', ['male', 'female']);

            $table->foreignId('hte_id')
                ->constrained('htes', 'hte_id')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('program_id')
                ->constrained('programs', 'program_id')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('qr_code_value', 255)->nullable()->unique(); // generated on approval
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamp('approved_at')->nullable();

            $table->index('hte_id', 'idx_intern_profile_hte');
            $table->index('status', 'idx_intern_profile_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intern_profiles');
    }
};