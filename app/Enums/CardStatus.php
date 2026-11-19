<?php

namespace App\Enums;

enum CardStatus: string
{
    /** Record pulled from the portal, no photo yet. */
    case Pending = 'pending';

    /** Photo captured and saved, ready to print. */
    case Captured = 'captured';

    /** Printed at least once (the legacy "Completed"). */
    case Printed = 'printed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Awaiting photo',
            self::Captured => 'Ready to print',
            self::Printed => 'Printed',
        };
    }

    /** @return list<self> */
    public static function open(): array
    {
        return [self::Pending, self::Captured];
    }
}
