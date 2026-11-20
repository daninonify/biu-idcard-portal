<?php

namespace App\Services\Directory;

use App\Enums\HolderType;

/**
 * A source of cardholders (the student portal, or the staff records): look
 * people up by ID number and, optionally, send their new photo back.
 */
interface PeopleDirectory
{
    public function type(): HolderType;

    /** Human-readable name of this connection, shown to staff. */
    public function name(): string;

    /** @throws DirectoryException when the source cannot be reached */
    public function find(string $idNumber): ?PortalRecord;

    public function supportsPhotoUpdate(): bool;

    /**
     * @param  string  $jpeg  the processed passport photo, JPEG bytes
     *
     * @throws DirectoryException
     */
    public function updatePhoto(string $idNumber, string $jpeg): void;
}
