<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supervisor_profiles', function (Blueprint $table) {
            // Distinguish between HTE Supervisor and OJT Supervisor.
            // 'hte': supervisor is assigned to a specific HTE (existing behavior)
            // 'ojt': supervisor oversees all interns in a specific program
            $table->enum('supervisor_type', ['hte', 'ojt'])->default('hte')->after('hte_id');

            // For OJT supervisors: links to the program they oversee
            // For HTE supervisors: this is NULL
            $table->foreignId('program_id')
                ->nullable()
                ->after('supervisor_type')
                ->constrained('programs', 'program_id')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('supervisor_profiles', function (Blueprint $table) {
            $table->dropForeign(['program_id']);
            $table->dropColumn('program_id');
            $table->dropColumn('supervisor_type');
        });
    }
};
