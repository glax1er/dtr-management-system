<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id('log_id');

            // The intern who was scanned
            $table->foreignId('intern_user_id')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // Which supervisor's scanner logged it
            $table->foreignId('supervisor_user_id')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->dateTime('scan_timestamp')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['intern_user_id', 'scan_timestamp'], 'idx_intern_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};