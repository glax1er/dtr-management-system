<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::disableForeignKeyConstraints();

            DB::statement('ALTER TABLE supervisor_profiles RENAME TO supervisor_profiles_old');

            Schema::create('supervisor_profiles', function (Blueprint $table) {
                $table->foreignId('user_id')
                    ->primary()
                    ->constrained('users')
                    ->cascadeOnDelete()
                    ->cascadeOnUpdate();

                $table->foreignId('hte_id')
                    ->nullable()
                    ->constrained('htes', 'hte_id')
                    ->restrictOnDelete()
                    ->cascadeOnUpdate();

                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamp('created_at')->useCurrent();
                $table->enum('supervisor_type', ['hte', 'ojt'])->default('hte');
                $table->foreignId('program_id')
                    ->nullable()
                    ->constrained('programs', 'program_id')
                    ->restrictOnDelete()
                    ->cascadeOnUpdate();
            });

            DB::statement(
                'INSERT INTO supervisor_profiles (user_id, hte_id, status, created_at, supervisor_type, program_id) SELECT user_id, hte_id, status, created_at, supervisor_type, program_id FROM supervisor_profiles_old'
            );

            Schema::dropIfExists('supervisor_profiles_old');
            Schema::enableForeignKeyConstraints();

            return;
        }

        Schema::table('supervisor_profiles', function (Blueprint $table) {
            $table->foreignId('hte_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::disableForeignKeyConstraints();

            DB::statement('ALTER TABLE supervisor_profiles RENAME TO supervisor_profiles_old');

            Schema::create('supervisor_profiles', function (Blueprint $table) {
                $table->foreignId('user_id')
                    ->primary()
                    ->constrained('users')
                    ->cascadeOnDelete()
                    ->cascadeOnUpdate();

                $table->foreignId('hte_id')
                    ->constrained('htes', 'hte_id')
                    ->restrictOnDelete()
                    ->cascadeOnUpdate();

                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamp('created_at')->useCurrent();
                $table->enum('supervisor_type', ['hte', 'ojt'])->default('hte');
                $table->foreignId('program_id')
                    ->nullable()
                    ->constrained('programs', 'program_id')
                    ->restrictOnDelete()
                    ->cascadeOnUpdate();
            });

            DB::statement(
                'INSERT INTO supervisor_profiles (user_id, hte_id, status, created_at, supervisor_type, program_id) SELECT user_id, hte_id, status, created_at, supervisor_type, program_id FROM supervisor_profiles_old'
            );

            Schema::dropIfExists('supervisor_profiles_old');
            Schema::enableForeignKeyConstraints();

            return;
        }

        Schema::table('supervisor_profiles', function (Blueprint $table) {
            $table->foreignId('hte_id')->nullable(false)->change();
        });
    }
};
