<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->foreignId('campus_id')
                ->nullable()
                ->after('campus')
                ->constrained('campuses')
                ->nullOnDelete();
        });

        // Backfill campus_id for existing records if campuses exist
        if (Schema::hasTable('campuses')) {
            $campuses = DB::table('campuses')->get();
            if ($campuses->isNotEmpty()) {
                $campusMap = [];
                foreach ($campuses as $campus) {
                    $campusMap[strtolower($campus->name)] = $campus->id;
                    if (! empty($campus->code)) {
                        $campusMap[strtolower($campus->code)] = $campus->id;
                    }
                }

                $profiles = DB::table('intern_profiles')->whereNull('campus_id')->get();
                foreach ($profiles as $profile) {
                    $matchedId = null;
                    if (! empty($profile->campus) && isset($campusMap[strtolower($profile->campus)])) {
                        $matchedId = $campusMap[strtolower($profile->campus)];
                    } else {
                        $college = DB::table('programs')
                            ->join('colleges', 'programs.college_id', '=', 'colleges.id')
                            ->where('programs.program_id', $profile->program_id)
                            ->select('colleges.campus_id', 'colleges.campus')
                            ->first();

                        if ($college) {
                            if ($college->campus_id) {
                                $matchedId = $college->campus_id;
                            } elseif (! empty($college->campus) && isset($campusMap[strtolower($college->campus)])) {
                                $matchedId = $campusMap[strtolower($college->campus)];
                            }
                        }
                    }

                    if ($matchedId) {
                        DB::table('intern_profiles')
                            ->where('user_id', $profile->user_id)
                            ->update(['campus_id' => $matchedId]);
                    }
                }
            }
        }

        Schema::table('intern_profiles', function (Blueprint $table) {
            // Use the exact index name Laravel generated for the original ->unique() call
            // in create_intern_profiles_table to avoid fragile array-based derivation.
            $table->dropUnique('intern_profiles_id_number_unique');
            $table->unique(['campus_id', 'id_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Step 1: swap unique indexes first (before touching the FK column).
        // Keeping these in a separate closure from the dropConstrainedForeignId call
        // avoids DDL ordering conflicts on strict DB drivers (e.g. SQLite in tests).
        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->dropUnique(['campus_id', 'id_number']);
            $table->unique(['id_number']);
        });

        // Step 2: drop the FK constraint + campus_id column.
        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('campus_id');
        });
    }
};
