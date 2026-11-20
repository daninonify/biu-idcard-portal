<?php

namespace App\Http\Presenters;

use App\Enums\CardTemplate;
use App\Models\CardEvent;
use App\Models\Cardholder;
use App\Models\IdCard;
use App\Services\CardService;

/**
 * The exact shape of data sent to the browser. Keeping it explicit means new
 * columns never leak to pages by accident.
 */
final class CardPresenter
{
    private const STAFF_CATEGORIES = [
        'academic' => 'Academic',
        'non_academic' => 'Non-academic',
        'contract' => 'Contract',
    ];

    /** @return array<string, mixed> */
    public static function holder(Cardholder $h): array
    {
        return [
            'id' => $h->id,
            'type' => $h->type->value,
            'type_label' => $h->type->label(),
            'number_label' => $h->type->numberLabel(),
            'id_number' => $h->id_number,
            'full_name' => $h->full_name,
            'surname' => $h->surname,
            'first_name' => $h->first_name,
            'middle_name' => $h->middle_name,
            'email' => $h->email,
            'phone' => $h->phone,
            'date_of_birth' => $h->date_of_birth?->toDateString(),
            'sex' => $h->sex,
            'country' => $h->country,
            'state' => $h->state,
            'lga' => $h->lga,
            'address' => $h->address,
            'faculty' => $h->faculty,
            'department' => $h->department,
            // students
            'programme' => $h->programme,
            'level' => $h->level,
            'student_type' => $h->student_type?->value,
            'student_type_label' => $h->student_type?->label(),
            'graduation_year' => $h->graduation_year,
            'guardian_name' => $h->guardian_name,
            'guardian_phone' => $h->guardian_phone,
            'guardian_address' => $h->guardian_address,
            // staff
            'designation' => $h->designation,
            'staff_category' => $h->staff_category,
            'staff_category_label' => self::staffCategoryLabel($h->staff_category),
            'has_signature' => $h->signature_path !== null,
            'signature_captured_at' => $h->signature_captured_at?->toIso8601String(),
            'portal_synced_at' => $h->portal_synced_at?->toIso8601String(),
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

    /** A table row: card + the holder columns the lists show. */
    public static function row(IdCard $c): array
    {
        $h = $c->cardholder;

        return [
            'id' => $c->id,
            'holder_type' => $h->type->value,
            'id_number' => $h->id_number,
            'full_name' => $h->full_name,
            'phone' => $h->phone,
            'faculty' => $h->faculty,
            'department' => $h->department,
            // what the "type" column shows: student type, or the staff member's role
            'detail' => $h->isStaff()
                ? ($h->designation ?? self::staffCategoryLabel($h->staff_category))
                : $h->student_type?->label(),
            'category' => $c->template->value,
            'category_label' => $c->template->label(),
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
        $category = $e->category ? CardTemplate::tryFrom($e->category) : null;

        return [
            'id' => $e->id,
            'action' => $e->action,
            'description' => $e->description,
            'id_number' => $e->id_number,
            'category' => $category?->value,
            'category_label' => $category?->label(),
            'card_id' => $e->id_card_id,
            'holder_name' => $e->card?->cardholder?->full_name,
            'user' => $e->user?->name,
            'ip_address' => $e->ip_address,
            'created_at' => $e->created_at?->toIso8601String(),
        ];
    }

    /**
     * What the card templates need.
     *
     * @return array<string, string|null>
     */
    public static function cardData(IdCard $c): array
    {
        $h = $c->cardholder;

        return [
            'surname' => $h->surname,
            'firstName' => $h->first_name,
            'middleName' => $h->middle_name,
            'department' => $h->department,
            'faculty' => $h->faculty,
            'matric' => $h->isStaff() ? null : $h->id_number,
            'staffNo' => $h->isStaff() ? $h->id_number : null,
            'designation' => $h->designation,
            'programme' => $h->programme,
            'studentType' => $h->student_type?->value,
            'validUntil' => $c->valid_until,
        ];
    }

    public static function staffCategoryLabel(?string $category): ?string
    {
        return $category ? (self::STAFF_CATEGORIES[$category] ?? ucwords(str_replace('_', ' ', $category))) : null;
    }

    /** @return list<array{value: string, label: string}> */
    public static function staffCategories(): array
    {
        return collect(self::STAFF_CATEGORIES)->map(fn ($label, $value) => compact('value', 'label'))->values()->all();
    }

    /** @return list<array{value: string, label: string}> */
    public static function categories(): array
    {
        return collect(CardTemplate::cases())->map(fn (CardTemplate $t) => ['value' => $t->value, 'label' => $t->label()])->all();
    }
}
