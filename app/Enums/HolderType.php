<?php

namespace App\Enums;

/** Who the card is for. Students are looked up by matric number, staff by staff number. */
enum HolderType: string
{
    case Student = 'student';
    case Staff = 'staff';

    public function label(): string
    {
        return match ($this) {
            self::Student => 'Student',
            self::Staff => 'Staff',
        };
    }

    public function numberLabel(): string
    {
        return match ($this) {
            self::Student => 'Matric no.',
            self::Staff => 'Staff no.',
        };
    }
}
