<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('id_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cardholder_id')->constrained()->cascadeOnDelete();
            $table->string('session');                       // e.g. 2026/2027
            $table->string('template');                      // category: ug | pg | staff
            $table->string('status')->default('pending');    // pending | captured | printed
            $table->string('valid_until')->nullable();

            $table->string('photo_path')->nullable();
            $table->string('photo_engine')->nullable();
            $table->json('framing')->nullable();             // zoom, offsets and head position
            $table->foreignId('captured_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('captured_at')->nullable();

            $table->foreignId('printed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('printed_at')->nullable();
            $table->unsignedInteger('print_count')->default(0);
            $table->timestamp('encoded_at')->nullable();
            $table->timestamp('portal_photo_synced_at')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['cardholder_id', 'session']);
            $table->index(['template', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('id_cards');
    }
};
