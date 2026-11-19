<?php

namespace App\Enums;

enum StudentType: string
{
    case FullTime = 'full_time';
    case PartTime = 'part_time';
    case Diploma = 'diploma';

    public function label(): string
    {
        return match ($this) {
            self::FullTime => 'Full time',
            self::PartTime => 'Part time',
            self::Diploma => 'Diploma',
        };
    }

    /** Accepts the many spellings portals use ("FULL TIME", "FT", "part-time"...). */
    public static function fromPortal(?string $value): ?self
    {
        $v = strtolower(preg_replace('/[^a-z]/i', '', (string) $value));

        return match (true) {
            $v === '' => null,
            in_array($v, ['fulltime', 'ft', 'full', 'regular'], true) => self::FullTime,
            in_array($v, ['parttime', 'pt', 'part', 'sandwich'], true) => self::PartTime,
            str_starts_with($v, 'dip') => self::Diploma,
            default => self::tryFrom((string) $value),
        };
    }
}
