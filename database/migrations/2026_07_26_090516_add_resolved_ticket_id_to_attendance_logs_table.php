<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            // Nullable — null means a real scan. Set only on rows written
            // back by an approved resolution ticket, so they stay
            // traceable to the ticket that created them (see
            // ResolutionTicketController::approve()). restrictOnDelete
            // keeps that trail intact: a ticket can't be deleted while a
            // written-back row still points to it.
            $table->foreignId('resolved_ticket_id')
                ->nullable()
                ->after('supervisor_user_id')
                ->constrained('resolution_tickets')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->dropForeign(['resolved_ticket_id']);
            $table->dropColumn('resolved_ticket_id');
        });
    }
};
