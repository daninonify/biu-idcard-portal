<?php

namespace App\Services\StudentDirectory;

/**
 * The student portal, as seen by the ID card portal: look students up by
 * matriculation number and (optionally) send their new photo back.
 */
interface StudentDirectory
{
    /** Human-readable name of this connector, shown to administrators. */
    public function name(): string;

    /**
     * @throws StudentDirectoryException when the portal cannot be reached
     */
    public function find(string $matricNo): ?PortalRecord;

    public function supportsPhotoUpdate(): bool;

    /**
     * @param  string  $jpeg  the processed passport photo, JPEG bytes
     *
     * @throws StudentDirectoryException
     */
    public function updatePhoto(string $matricNo, string $jpeg): void;
}
