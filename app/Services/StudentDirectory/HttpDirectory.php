<?php

namespace App\Services\StudentDirectory;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;

/**
 * Talks to the student portal's HTTP API.
 *
 *   GET  {base}{lookup_path}   -> 200 JSON student, 404 when unknown
 *   PUT  {base}{photo_path}    <- image/jpeg body
 *
 * The JSON is expected to use this app's field names (see PortalRecord::FIELDS),
 * optionally wrapped in `data_key`.
 */
class HttpDirectory implements StudentDirectory
{
    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config) {}

    public function name(): string
    {
        return 'Student portal API ('.parse_url((string) $this->config['base_url'], PHP_URL_HOST).')';
    }

    public function find(string $matricNo): ?PortalRecord
    {
        $matric = PortalRecord::normaliseMatric($matricNo);

        try {
            $response = $this->client()->get($this->path('lookup_path', $matric));
        } catch (ConnectionException) {
            throw new StudentDirectoryException('The student portal did not respond. Please try again shortly.');
        }

        if ($response->notFound()) {
            return null;
        }
        if ($response->failed()) {
            throw new StudentDirectoryException('The student portal returned an error ('.$response->status().').');
        }

        $json = $response->json();
        $data = $this->config['data_key'] ? Arr::get($json, $this->config['data_key'], $json) : $json;

        return is_array($data) ? PortalRecord::fromArray($data) : null;
    }

    public function supportsPhotoUpdate(): bool
    {
        return ! empty($this->config['photo_path']);
    }

    public function updatePhoto(string $matricNo, string $jpeg): void
    {
        try {
            $response = $this->client()
                ->withBody($jpeg, 'image/jpeg')
                ->put($this->path('photo_path', PortalRecord::normaliseMatric($matricNo)));
        } catch (ConnectionException) {
            throw new StudentDirectoryException('The student portal did not respond. Please try again shortly.');
        }

        if ($response->failed()) {
            throw new StudentDirectoryException('The student portal refused the photo ('.$response->status().').');
        }
    }

    private function client(): PendingRequest
    {
        if (empty($this->config['base_url'])) {
            throw new StudentDirectoryException('The student portal API is not configured (PORTAL_API_URL).');
        }

        return Http::baseUrl(rtrim($this->config['base_url'], '/'))
            ->acceptJson()
            ->timeout($this->config['timeout'])
            ->when($this->config['token'], fn (PendingRequest $r) => $r->withToken($this->config['token']));
    }

    private function path(string $key, string $matric): string
    {
        // Matric numbers contain slashes, so encode them as a single path segment.
        return str_replace('{matric}', rawurlencode($matric), (string) $this->config[$key]);
    }
}
