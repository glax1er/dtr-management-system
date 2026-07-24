<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supervisor_profiles', function (Blueprint $table) {
            // One-to-one with users: the profile IS the supervisor,
            // it has no independent lifecycle, so user_id is the PK.
            $table->foreignId('user_id')
                ->primary()
                ->constrained('users')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('hte_id')
                ->constrained('htes', 'hte_id')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamp('created_at')->now;
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supervisor_profiles');
    }
};