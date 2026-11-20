<?php

namespace App\Enums;

/**
 * The card category, which is also the card design: Undergraduate,
 * Postgraduate (both students) or Staff.
 */
enum CardTemplate: string
{
    case Undergraduate = 'ug';
    case Postgraduate = 'pg';
    case Staff = 'staff';

    public function label(): string
    {
        return match ($this) {
            self::Undergraduate => 'Undergraduate',
            self::Postgraduate => 'Postgraduate',
            self::Staff => 'Staff',
        };
    }

    public function holderType(): HolderType
    {
        return $this === self::Staff ? HolderType::Staff : HolderType::Student;
    }

    /** @return list<self> categories a holder of this type can have */
    public static function forType(HolderType $type): array
    {
        return $type === HolderType::Staff ? [self::Staff] : [self::Undergraduate, self::Postgraduate];
    }

    /** Staff get the staff card; postgraduate programmes the PG card; everyone else the UG card. */
    public static function choose(HolderType $type, ?string $programme = null, ?string $level = null): self
    {
        if ($type === HolderType::Staff) {
            return self::Staff;
        }

        return self::forProgramme($programme, $level);
    }

    public static function forProgramme(?string $programme, ?string $level = null): self
    {
        $text = strtolower(($programme ?? '').' '.($level ?? ''));

        // Whole words only: "ma" must not match "Mass Communication".
        return preg_match('/\b(pg|pgd|pgde|postgrad\w*|masters?|msc|m\.sc|ma|m\.a|mba|mphil|phd|ph\.d|doctorate|doctoral)\b/', $text)
            ? self::Postgraduate
            : self::Undergraduate;
    }
}
