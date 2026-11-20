<?php

namespace App\Services\Directory;

use App\Enums\HolderType;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Reads people straight from the source database (config/idcard.php maps its
 * column names). Writes only the photo column, and only if configured.
 */
class DatabaseDirectory implements PeopleDirectory
{
    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly HolderType $type,
        private readonly array $config,
        private readonly string $label,
    ) {}

    public function type(): HolderType
    {
        return $this->type;
    }

    public function name(): string
    {
        return ucfirst($this->label).' database ('.$this->config['connection'].'.'.$this->config['table'].')';
    }

    public function find(string $idNumber): ?PortalRecord
    {
        $columns = $this->config['columns'];

        try {
            $row = $this->db()->table($this->config['table'])
                ->whereRaw('UPPER(REPLACE('.$this->wrap($columns['id_number']).", ' ', '')) = ?", [PortalRecord::normaliseId($idNumber)])
                ->first();
        } catch (Throwable $e) {
            report($e);
            throw new DirectoryException("The {$this->label} could not be reached. Please try again or contact the administrator.");
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

    public function updatePhoto(string $idNumber, string $jpeg): void
    {
        if (! $this->supportsPhotoUpdate()) {
            throw new DirectoryException("Sending pictures to the {$this->label} is not configured.");
        }

        $table = $this->config['photo_table'] ?: $this->config['table'];

        try {
            $updated = $this->db()->table($table)
                ->where($this->config['columns']['id_number'], PortalRecord::normaliseId($idNumber))
                ->update([$this->config['photo_column'] => $jpeg]);
        } catch (Throwable $e) {
            report($e);
            throw new DirectoryException("The photo could not be saved to the {$this->label}.");
        }

        if ($updated === 0) {
            throw new DirectoryException("Not found in the {$this->label}, so the photo was not saved.");
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
