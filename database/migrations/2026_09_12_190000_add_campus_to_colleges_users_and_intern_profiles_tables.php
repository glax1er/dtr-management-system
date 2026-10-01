<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('colleges', function (Blueprint $table) {
            $table->string('campus', 100)->nullable()->after('name');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('campus', 100)->nullable()->after('college_id');
        });

        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->string('campus', 100)->nullable()->after('program_id');
        });
    }

    public function down(): void
    {
        Schema::table('colleges', function (Blueprint $table) {
            $table->dropColumn('campus');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('campus');
        });

        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->dropColumn('campus');
        });
    }
};
