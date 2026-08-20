<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->foreignId('kiosk_id')->nullable()->after('supervisor_user_id')
                ->constrained('kiosks')->nullOnDelete();
        });

        // SQLite can't alter a column to nullable in-place the same way
        // MySQL/Postgres can; since supervisor_user_id already exists as
        // NOT NULL, this is handled by Laravel's schema builder using a
        // temporary-table rebuild under the hood — safe for local/dev data.
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->foreignId('supervisor_user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->dropForeign(['kiosk_id']);
            $table->dropColumn('kiosk_id');
            $table->foreignId('supervisor_user_id')->nullable(false)->change();
        });
    }
};