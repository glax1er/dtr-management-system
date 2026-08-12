<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'notifications_cleared_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('notifications_cleared_at');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'notifications_cleared_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('notifications_cleared_at')->nullable();
            });
        }
    }
};
