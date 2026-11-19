<?php

namespace App\Services\StudentDirectory;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Reads students straight from the student portal's database (config/idcard.php
 * maps its column names). Writes only the photo column, and only if configured.
 */
class DatabaseDirectory implements StudentDirectory
{
    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config) {}

    public function name(): string
    {
        return 'Student portal database ('.$this->config['connection'].'.'.$this->config['table'].')';
    }

    public function find(string $matricNo): ?PortalRecord
    {
        $columns = $this->config['columns'];

        try {
            $row = $this->db()->table($this->config['table'])
                ->whereRaw('UPPER(REPLACE('.$this->wrap($columns['matric_no']).", ' ', '')) = ?", [PortalRecord::normaliseMatric($matricNo)])
                ->first();
        } catch (Throwable $e) {
            report($e);
            throw new StudentDirectoryException('The student portal database could not be reached. Please try again or contact the administrator.');
        }

        if ($row === null) {
            return null;
        }

        $row = (array) $row;
        $mapped = [];
        foreach ($columns as $field => $column) {
            $mapped[$field] = $column ? ($row[$column] ?? null) : null;
        }

        return PortalRecord::fromArray($mapped);
    }

    public function supportsPhotoUpdate(): bool
    {
        return ! empty($this->config['photo_column']);
    }

    public function updatePhoto(string $matricNo, string $jpeg): void
    {
        if (! $this->supportsPhotoUpdate()) {
            throw new StudentDirectoryException('Updating portal pictures is not configured (PORTAL_DB_PHOTO_COLUMN).');
        }

        $table = $this->config['photo_table'] ?: $this->config['table'];

        try {
            $updated = $this->db()->table($table)
                ->where($this->config['columns']['matric_no'], PortalRecord::normaliseMatric($matricNo))
                ->update([$this->config['photo_column'] => $jpeg]);
        } catch (Throwable $e) {
            report($e);
            throw new StudentDirectoryException('The photo could not be saved to the student portal.');
        }

        if ($updated === 0) {
            throw new StudentDirectoryException('The student was not found in the portal, so the photo was not saved.');
        }
    }

    private function db(): ConnectionInterface
    {
        return DB::connection($this->config['connection']);
    }

    private function wrap(string $column): string
    {
        return $this->db()->getQueryGrammar()->wrap($column);
    }
}
