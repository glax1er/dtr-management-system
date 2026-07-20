<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->timestamp('privacy_accepted_at')->after('registered_at');
        });
    }

    public function down(): void
    {
        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->dropColumn('privacy_accepted_at');
        });
    }
};