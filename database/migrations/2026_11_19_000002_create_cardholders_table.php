<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Everyone who can hold an ID card: students (from the student portal,
     * by matric number) and staff (from the staff records, by staff number).
     * A local snapshot, refreshed on demand; the source systems stay the truth.
     */
    public function up(): void
    {
        Schema::create('cardholders', function (Blueprint $table) {
            $table->id();
            $table->string('type');                        // student | staff
            $table->string('id_number')->unique();         // matric no. or staff no.
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
            $table->string('faculty')->nullable();         // staff: faculty / directorate
            $table->string('department')->nullable();      // staff: department / unit

            // students
            $table->string('programme')->nullable();
            $table->string('level')->nullable();
            $table->string('student_type')->nullable();    // full_time | part_time | diploma
            $table->string('graduation_year')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->text('guardian_address')->nullable();

            // staff
            $table->string('designation')->nullable();     // e.g. Senior Lecturer, Registry Officer
            $table->string('staff_category')->nullable();  // academic | non_academic | contract

            $table->timestamp('portal_synced_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'surname', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cardholders');
    }
};
