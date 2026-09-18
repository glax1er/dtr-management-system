<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('htes', function (Blueprint $table) {
            $table->foreignId('college_id')->nullable()->after('hte_id')->constrained('colleges')->nullOnDelete();
        });

        $htes = DB::table('htes')->whereNull('college_id')->get();
        foreach ($htes as $hte) {
            $collegeId = DB::table('intern_profiles')
                ->join('programs', 'intern_profiles.program_id', '=', 'programs.program_id')
                ->where('intern_profiles.hte_id', $hte->hte_id)
                ->value('programs.college_id');

            if ($collegeId) {
                DB::table('htes')->where('hte_id', $hte->hte_id)->update(['college_id' => $collegeId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('htes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('college_id');
        });
    }
};
