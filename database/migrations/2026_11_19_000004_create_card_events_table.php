<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Audit trail: who did what to which card. Kept when a card is deleted.
     */
    public function up(): void
    {
        Schema::create('card_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_card_id')->nullable()->constrained()->nullOnDelete();
            $table->string('matric_no')->nullable()->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action')->index();
            $table->string('description')->nullable();
            $table->json('meta')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_events');
    }
};
