<?php

namespace App\Enums;

enum CardTemplate: string
{
    case Undergraduate = 'ug';
    case Postgraduate = 'pg';

    public function label(): string
    {
        return match ($this) {
            self::Undergraduate => 'Undergraduate',
            self::Postgraduate => 'Postgraduate',
        };
    }

    /** Postgraduate programmes get the PG card, everyone else the undergraduate one. */
    public static function forProgramme(?string $programme, ?string $level = null): self
    {
        $text = strtolower(($programme ?? '').' '.($level ?? ''));

        // Whole words only: "ma" must not match "Mass Communication".
        return preg_match('/\b(pg|pgd|pgde|postgrad\w*|masters?|msc|m\.sc|ma|m\.a|mba|mphil|phd|ph\.d|doctorate|doctoral)\b/', $text)
            ? self::Postgraduate
            : self::Undergraduate;
    }
}
