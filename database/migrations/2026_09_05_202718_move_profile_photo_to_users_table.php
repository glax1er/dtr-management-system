<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('profile_photo_path')->nullable()->after('email');
        });

        // Carry over any photo an intern already uploaded before this
        // feature moved from InternProfile onto the shared users table —
        // nobody's existing photo should disappear because of this change.
        DB::table('intern_profiles')
            ->whereNotNull('profile_photo_path')
            ->orderBy('user_id')
            ->each(function ($profile) {
                DB::table('users')
                    ->where('id', $profile->user_id)
                    ->update(['profile_photo_path' => $profile->profile_photo_path]);
            });

        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->dropColumn('profile_photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->string('profile_photo_path')->nullable();
        });

        DB::table('users')
            ->whereNotNull('profile_photo_path')
            ->orderBy('id')
            ->each(function ($user) {
                DB::table('intern_profiles')
                    ->where('user_id', $user->id)
                    ->update(['profile_photo_path' => $user->profile_photo_path]);
            });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('profile_photo_path');
        });
    }
};