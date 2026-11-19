<?php

namespace App\Http\Presenters;

use App\Models\CardEvent;
use App\Models\IdCard;
use App\Models\Student;
use App\Services\CardService;

/**
 * The exact shape of data sent to the browser. Keeping it explicit means new
 * columns never leak to pages by accident.
 */
final class CardPresenter
{
    /** @return array<string, mixed> */
    public static function student(Student $s): array
    {
        return [
            'id' => $s->id,
            'matric_no' => $s->matric_no,
            'full_name' => $s->full_name,
            'surname' => $s->surname,
            'first_name' => $s->first_name,
            'middle_name' => $s->middle_name,
            'email' => $s->email,
            'phone' => $s->phone,
            'date_of_birth' => $s->date_of_birth?->toDateString(),
            'sex' => $s->sex,
            'country' => $s->country,
            'state' => $s->state,
            'lga' => $s->lga,
            'address' => $s->address,
            'faculty' => $s->faculty,
            'department' => $s->department,
            'programme' => $s->programme,
            'level' => $s->level,
            'student_type' => $s->student_type?->value,
            'student_type_label' => $s->student_type?->label(),
            'graduation_year' => $s->graduation_year,
            'guardian_name' => $s->guardian_name,
            'guardian_phone' => $s->guardian_phone,
            'guardian_address' => $s->guardian_address,
            'portal_synced_at' => $s->portal_synced_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function card(IdCard $c): array
    {
        return [
            'id' => $c->id,
            'session' => $c->session,
            'template' => $c->template->value,
            'template_label' => $c->template->label(),
            'status' => $c->status->value,
            'status_label' => $c->status->label(),
            'valid_until' => $c->valid_until,
            'has_photo' => $c->hasPhoto(),
            'photo_url' => $c->hasPhoto() ? route('cards.photo', [$c, 'v' => $c->captured_at?->timestamp]) : null,
            'photo_engine' => $c->photo_engine,
            'photo_engine_label' => $c->photo_engine ? app(CardService::class)->engineLabel($c->photo_engine) : null,
            'framing' => $c->framing,
            'captured_at' => $c->captured_at?->toIso8601String(),
            'captured_by' => $c->capturedBy?->name,
            'printed_at' => $c->printed_at?->toIso8601String(),
            'printed_by' => $c->printedBy?->name,
            'print_count' => $c->print_count,
            'encoded_at' => $c->encoded_at?->toIso8601String(),
            'portal_photo_synced_at' => $c->portal_photo_synced_at?->toIso8601String(),
            'notes' => $c->notes,
            'created_at' => $c->created_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ];
    }

    /** A table row: card + the student columns the list shows. */
    public static function row(IdCard $c): array
    {
        $s = $c->student;

        return [
            'id' => $c->id,
            'matric_no' => $s->matric_no,
            'full_name' => $s->full_name,
            'phone' => $s->phone,
            'faculty' => $s->faculty,
            'department' => $s->department,
            'student_type_label' => $s->student_type?->label(),
            'template_label' => $c->template->label(),
            'status' => $c->status->value,
            'status_label' => $c->status->label(),
            'print_count' => $c->print_count,
            'thumb_url' => $c->hasPhoto() ? route('cards.photo', [$c, 'v' => $c->captured_at?->timestamp]) : null,
            'portal_photo_synced_at' => $c->portal_photo_synced_at?->toIso8601String(),
            'captured_at' => $c->captured_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function event(CardEvent $e): array
    {
        return [
            'id' => $e->id,
            'action' => $e->action,
            'description' => $e->description,
            'matric_no' => $e->matric_no,
            'card_id' => $e->id_card_id,
            'student_name' => $e->card?->student?->full_name,
            'user' => $e->user?->name,
            'ip_address' => $e->ip_address,
            'created_at' => $e->created_at?->toIso8601String(),
        ];
    }

    /**
     * What the card templates need, in the same shape as the original studio.
     *
     * @return array<string, string|null>
     */
    public static function cardData(IdCard $c): array
    {
        $s = $c->student;

        return [
            'surname' => $s->surname,
            'firstName' => $s->first_name,
            'middleName' => $s->middle_name,
            'department' => $s->department,
            'faculty' => $s->faculty,
            'matric' => $s->matric_no,
            'programme' => $s->programme,
            'validUntil' => $c->valid_until,
        ];
    }
}
