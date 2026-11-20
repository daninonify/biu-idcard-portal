<?php

namespace App\Services\Directory;

use App\Enums\HolderType;
use InvalidArgumentException;

/** Builds the configured directory for students and for staff (config/idcard.php). */
class Directories
{
    /** @var array<string, PeopleDirectory> */
    private array $resolved = [];

    public function for(HolderType $type): PeopleDirectory
    {
        return $this->resolved[$type->value] ??= $this->make($type);
    }

    public function students(): PeopleDirectory
    {
        return $this->for(HolderType::Student);
    }

    public function staff(): PeopleDirectory
    {
        return $this->for(HolderType::Staff);
    }

    private function make(HolderType $type): PeopleDirectory
    {
        $config = config("idcard.directory.{$type->value}");

        return match ($config['driver']) {
            'database' => new DatabaseDirectory($type, $config['database'], $config['label']),
            'http' => new HttpDirectory($type, $config['http'], $config['label']),
            'demo' => new DemoDirectory($type),
            default => throw new InvalidArgumentException(
                "Unknown {$type->value} directory [{$config['driver']}]: use demo, database or http."
            ),
        };
    }
}
