<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            // Null = global default, set by admin. Non-null = HTE-specific
            // override, set by that HTE's supervisor.
            $table->foreignId('hte_id')->nullable()->constrained('htes', 'hte_id')->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            // {"monday": "13:00", "tuesday": "08:00", ..., "friday": null}
            // null value for a day means "no work expected" that day.
            $table->json('day_schedule');
            $table->timestamps();

            $table->index(['hte_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_periods');
    }
};