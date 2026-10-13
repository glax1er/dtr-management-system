<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
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
            $table->text('contact_number')->nullable()->change();
        });

        Schema::table('htes', function (Blueprint $table) {
            $table->text('contact_number')->nullable()->change();
            $table->text('contact_person')->nullable()->change();
        });

        Schema::table('supervisor_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('supervisor_profiles', 'contact_number')) {
                $table->text('contact_number')->nullable()->after('supervisor_type');
            }
        });

        Schema::table('college_admin_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('college_admin_profiles', 'contact_number')) {
                $table->text('contact_number')->nullable()->after('position');
            }
        });

        // Encrypt any existing plain-text values at rest
        foreach (DB::table('intern_profiles')->whereNotNull('contact_number')->get() as $row) {
            if (! empty($row->contact_number)) {
                try {
                    Crypt::decryptString($row->contact_number);
                } catch (Throwable) {
                    DB::table('intern_profiles')
                        ->where('user_id', $row->user_id)
                        ->update(['contact_number' => Crypt::encryptString($row->contact_number)]);
                }
            }
        }

        foreach (DB::table('htes')->whereNotNull('contact_number')->get() as $row) {
            if (! empty($row->contact_number)) {
                try {
                    Crypt::decryptString($row->contact_number);
                } catch (Throwable) {
                    DB::table('htes')
                        ->where('hte_id', $row->hte_id)
                        ->update(['contact_number' => Crypt::encryptString($row->contact_number)]);
                }
            }
        }

        foreach (DB::table('htes')->whereNotNull('contact_person')->get() as $row) {
            if (! empty($row->contact_person)) {
                try {
                    Crypt::decryptString($row->contact_person);
                } catch (Throwable) {
                    DB::table('htes')
                        ->where('hte_id', $row->hte_id)
                        ->update(['contact_person' => Crypt::encryptString($row->contact_person)]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('college_admin_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('college_admin_profiles', 'contact_number')) {
                $table->dropColumn('contact_number');
            }
        });

        Schema::table('supervisor_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('supervisor_profiles', 'contact_number')) {
                $table->dropColumn('contact_number');
            }
        });

        Schema::table('htes', function (Blueprint $table) {
            $table->string('contact_person', 100)->nullable()->change();
            $table->string('contact_number', 20)->nullable()->change();
        });

        Schema::table('intern_profiles', function (Blueprint $table) {
            $table->string('contact_number', 20)->nullable()->change();
        });
    }
};
