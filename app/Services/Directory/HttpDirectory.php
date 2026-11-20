<?php

namespace App\Services\Directory;

use App\Enums\HolderType;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;

/**
 * Talks to the source system's HTTP API.
 *
 *   GET  {base}{lookup_path}   -> 200 JSON person, 404 when unknown
 *   PUT  {base}{photo_path}    <- image/jpeg body
 *
 * The JSON uses this app's field names (PortalRecord::FIELDS), with the
 * number as `id_number` (or `matric_no` / `staff_no`), optionally wrapped in
 * `data_key`.
 */
class HttpDirectory implements PeopleDirectory
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
        return ucfirst($this->label).' API ('.parse_url((string) $this->config['base_url'], PHP_URL_HOST).')';
    }

    public function find(string $idNumber): ?PortalRecord
    {
        try {
            $response = $this->client()->get($this->path('lookup_path', PortalRecord::normaliseId($idNumber)));
        } catch (ConnectionException) {
            throw new DirectoryException("The {$this->label} did not respond. Please try again shortly.");
        }

        if ($response->notFound()) {
            return null;
        }
        if ($response->failed()) {
            throw new DirectoryException("The {$this->label} returned an error ({$response->status()}).");
        }

        $json = $response->json();
        $data = $this->config['data_key'] ? Arr::get($json, $this->config['data_key'], $json) : $json;
        if (! is_array($data)) {
            return null;
        }
        $data['id_number'] ??= $data['matric_no'] ?? $data['staff_no'] ?? null;

        return PortalRecord::fromArray($data);
    }

    public function supportsPhotoUpdate(): bool
    {
        return ! empty($this->config['photo_path']) && ! empty($this->config['base_url']);
    }

    public function updatePhoto(string $idNumber, string $jpeg): void
    {
        try {
            $response = $this->client()
                ->withBody($jpeg, 'image/jpeg')
                ->put($this->path('photo_path', PortalRecord::normaliseId($idNumber)));
        } catch (ConnectionException) {
            throw new DirectoryException("The {$this->label} did not respond. Please try again shortly.");
        }

        if ($response->failed()) {
            throw new DirectoryException("The {$this->label} refused the photo ({$response->status()}).");
        }
    }

    private function client(): PendingRequest
    {
        if (empty($this->config['base_url'])) {
            throw new DirectoryException("The {$this->label} API is not configured.");
        }

        return Http::baseUrl(rtrim($this->config['base_url'], '/'))
            ->acceptJson()
            ->timeout($this->config['timeout'])
            ->when($this->config['token'], fn (PendingRequest $r) => $r->withToken($this->config['token']));
    }

    private function path(string $key, string $id): string
    {
        // ID numbers contain slashes, so encode them as a single path segment.
        return str_replace(['{id}', '{matric}'], rawurlencode($id), (string) $this->config[$key]);
    }
}
