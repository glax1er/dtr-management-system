<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * attendance_logs.supervisor_user_id was created with restrictOnDelete(),
     * which silently blocks permanently deleting a supervisor's account the
     * moment they've scanned even a single attendance log — and that scan
     * belongs to an intern, not the supervisor, so it must never be wiped
     * just because the supervisor's account is being erased.
     *
     * Switching to nullOnDelete() (the same pattern already used for
     * reviewed_by / resolved_by elsewhere) keeps the intern's attendance
     * history intact and lets the supervisor's account be permanently
     * deleted without a foreign key violation.
     */
    public function up(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->dropForeign(['supervisor_user_id']);
        });

        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->foreignId('supervisor_user_id')
                ->nullable()
                ->change();
        });

        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->foreign('supervisor_user_id')
                ->references('id')->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->dropForeign(['supervisor_user_id']);
        });

        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->foreignId('supervisor_user_id')
                ->nullable(false)
                ->change();
        });

        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->foreign('supervisor_user_id')
                ->references('id')->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });
    }
};
