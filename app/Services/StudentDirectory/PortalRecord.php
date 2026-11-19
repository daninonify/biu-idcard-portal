<?php

namespace App\Services\StudentDirectory;

use App\Enums\StudentType;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * One student as returned by any connector, normalised to this app's fields.
 */
final readonly class PortalRecord
{
    /** Fields copied into the local `students` table. */
    public const FIELDS = [
        'matric_no', 'surname', 'first_name', 'middle_name', 'email', 'phone',
        'date_of_birth', 'sex', 'country', 'state', 'lga', 'address',
        'faculty', 'department', 'programme', 'level', 'student_type',
        'graduation_year', 'guardian_name', 'guardian_phone', 'guardian_address',
    ];

    /** @param array<string, string|null> $attributes */
    private function __construct(public array $attributes) {}

    public static function normaliseMatric(string $matric): string
    {
        return strtoupper(preg_replace('/\s+/', '', trim($matric)) ?? '');
    }

    /** @param array<string, mixed> $raw already mapped to this app's field names */
    public static function fromArray(array $raw): self
    {
        $clean = static fn ($v) => is_scalar($v) && trim((string) $v) !== '' ? trim((string) $v) : null;

        $out = [];
        foreach (self::FIELDS as $field) {
            $out[$field] = $clean($raw[$field] ?? null);
        }

        $out['matric_no'] = self::normaliseMatric((string) $out['matric_no']);
        $out['student_type'] = StudentType::fromPortal($out['student_type'])?->value;

        if ($out['date_of_birth'] !== null) {
            try {
                $out['date_of_birth'] = CarbonImmutable::parse($out['date_of_birth'])->toDateString();
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

    public function matric(): string
    {
        return (string) $this->attributes['matric_no'];
    }

    public function isComplete(): bool
    {
        return $this->attributes['matric_no'] && $this->attributes['surname'] && $this->attributes['first_name'];
    }
}
