<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_periods', function (Blueprint $table) {
            $table->foreignId('college_id')->nullable()->after('hte_id')->constrained('colleges')->nullOnDelete();
            $table->index(['college_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::table('schedule_periods', function (Blueprint $table) {
            $table->dropIndex(['college_id', 'start_date', 'end_date']);
            $table->dropConstrainedForeignId('college_id');
        });
    }
};
