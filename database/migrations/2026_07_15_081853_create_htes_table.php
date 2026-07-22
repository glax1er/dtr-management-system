<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('htes', function (Blueprint $table) {
            $table->id('hte_id');
            $table->string('hte_name', 150);
            $table->string('address', 255)->nullable();
            $table->string('contact_person', 100)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamp('created_at')->now();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('htes');
    }
};