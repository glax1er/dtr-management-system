<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resolution_tickets', function (Blueprint $table) {
            $table->id();

            // The intern requesting the resolution
            $table->foreignId('intern_user_id')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->date('date');

            // What the intern is proposing. Which of these is set depends
            // on that date's status: missing_time_in -> only time_in,
            // open -> only time_out, no_record -> both.
            $table->dateTime('proposed_time_in')->nullable();
            $table->dateTime('proposed_time_out')->nullable();

            $table->text('reason');

            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])
                ->default('pending');

            // What actually gets written back on approval. May differ from
            // proposed_* if the supervisor edited the time(s) before approving.
            $table->dateTime('final_time_in')->nullable();
            $table->dateTime('final_time_out')->nullable();

            // Nullable — only set once a supervisor acts on the ticket.
            $table->foreignId('resolved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();

            $table->index(['intern_user_id', 'date'], 'idx_intern_date_ticket');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resolution_tickets');
    }
};
