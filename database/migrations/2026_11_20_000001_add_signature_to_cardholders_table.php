<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The holder's own signature (printed on staff cards, as the old system
     * did). Kept on the person, so it carries over to later sessions' cards.
     */
    public function up(): void
    {
        Schema::table('cardholders', function (Blueprint $table) {
            $table->string('signature_path')->nullable()->after('staff_category');
            $table->timestamp('signature_captured_at')->nullable()->after('signature_path');
        });
    }

    public function down(): void
    {
        Schema::table('cardholders', function (Blueprint $table) {
            $table->dropColumn(['signature_path', 'signature_captured_at']);
        });
    }
};
