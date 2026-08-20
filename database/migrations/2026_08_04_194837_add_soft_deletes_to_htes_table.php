// database/migrations/2026_08_05_000001_add_soft_deletes_to_htes_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('htes', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('htes', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};