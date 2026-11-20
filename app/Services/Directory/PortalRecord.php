<?php

namespace App\Services\Directory;

use App\Enums\StudentType;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * One cardholder as returned by any connection, normalised to this app's fields.
 */
final readonly class PortalRecord
{
    /** Fields copied into the local `cardholders` table. */
    public const FIELDS = [
        'id_number', 'surname', 'first_name', 'middle_name', 'email', 'phone',
        'date_of_birth', 'sex', 'country', 'state', 'lga', 'address',
        'faculty', 'department',
        // students
        'programme', 'level', 'student_type', 'graduation_year',
        'guardian_name', 'guardian_phone', 'guardian_address',
        // staff
        'designation', 'staff_category',
    ];

    /** @param array<string, string|null> $attributes */
    private function __construct(public array $attributes) {}

    /** "scn/csc/ 230101" becomes "SCN/CSC/230101". */
    public static function normaliseId(string $id): string
    {
        return strtoupper(preg_replace('/\s+/', '', trim($id)) ?? '');
    }

    /** @param array<string, mixed> $raw already mapped to this app's field names */
    public static function fromArray(array $raw): self
    {
        $clean = static fn ($v) => is_scalar($v) && trim((string) $v) !== '' ? trim((string) $v) : null;

        $out = [];
        foreach (self::FIELDS as $field) {
            $out[$field] = $clean($raw[$field] ?? null);
        }

        $out['id_number'] = self::normaliseId((string) $out['id_number']);
        $out['student_type'] = StudentType::fromPortal($out['student_type'])?->value;
        if ($out['staff_category'] !== null) {
            $out['staff_category'] = str_replace([' ', '-'], '_', strtolower($out['staff_category']));
        }

        if ($out['date_of_birth'] !== null) {
            try {
                $out['date_of_birth'] = CarbonImmutable::parse(str_replace('/', '-', $out['date_of_birth']))->toDateString();
            } catch (Throwable) {
                $out['date_of_birth'] = null;
            }
        }
        foreach (['surname', 'first_name', 'middle_name'] as $name) {
            if ($out[$name] !== null) {
                $out[$name] = mb_convert_case(mb_strtolower($out[$name]), MB_CASE_TITLE);
            }
        }

        return new self($out);
    }

    /** @return array<string, string|null> */
    public function toArray(): array
    {
        return $this->attributes;
    }

    public function idNumber(): string
    {
        return (string) $this->attributes['id_number'];
    }

    public function isComplete(): bool
    {
        return $this->attributes['id_number'] && $this->attributes['surname'] && $this->attributes['first_name'];
    }
}
