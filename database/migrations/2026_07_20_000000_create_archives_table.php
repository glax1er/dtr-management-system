<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('archives', function (Blueprint $table) {
            $table->id();
            // Polymorphic — reusable for supervisors, interns, HTEs, etc.
            $table->morphs('archivable');
            // Full snapshot of the row at the time of archiving
            $table->json('data');
            $table->timestamp('archived_at');
            $table->timestamp('restored_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('archives');
    }
};  