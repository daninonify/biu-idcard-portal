<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A local snapshot of the student's record from the student portal, taken
     * when the card is started and refreshed on demand. The portal stays the
     * source of truth for bio data.
     */
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('matric_no')->unique();
            $table->string('surname');
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('sex')->nullable();
            $table->string('country')->nullable();
            $table->string('state')->nullable();
            $table->string('lga')->nullable();
            $table->text('address')->nullable();
            $table->string('faculty')->nullable();
            $table->string('department')->nullable();
            $table->string('programme')->nullable();
            $table->string('level')->nullable();
            $table->string('student_type')->nullable();   // full_time | part_time | diploma
            $table->string('graduation_year')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->text('guardian_address')->nullable();
            $table->timestamp('portal_synced_at')->nullable();
            $table->timestamps();

            $table->index(['surname', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
