<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('must_change_password')
                ->default(false)
                ->after('password');
        });

        $defaultPassword = config('supervisor.default_supervisor_password', 'Supervisor@123');

        \App\Models\User::query()
            ->where('role', \App\Models\User::ROLE_SUPERVISOR)
            ->get()
            ->each(function (\App\Models\User $supervisor) use ($defaultPassword) {
                if (\Illuminate\Support\Facades\Hash::check($defaultPassword, $supervisor->password)) {
                    $supervisor->update(['must_change_password' => true]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('must_change_password');
        });
    }
};
