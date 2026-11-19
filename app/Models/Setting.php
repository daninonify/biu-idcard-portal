<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Portal-wide settings (card session, validity, signatures...). Use the
 * static helpers; values are cached and JSON-encoded.
 */
class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    /** Defaults used until an administrator changes them. */
    public static function defaults(): array
    {
        $year = (int) now()->format('Y');
        $start = now()->month >= 8 ? $year : $year - 1;

        return [
            'session' => $start.'/'.($start + 1),
            'valid_until' => (string) ($start + 4),
            'default_background' => '#ffffff',
            'registrar_signature' => null,   // path on the photo disk
            'reprint_requires_reason' => true,
        ];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $all = static::allValues();

        return array_key_exists($key, $all) ? $all[$key] : ($default ?? (static::defaults()[$key] ?? null));
    }

    public static function put(string $key, mixed $value): void
    {
        static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget('settings.all');
    }

    /** @return array<string, mixed> */
    public static function allValues(): array
    {
        return Cache::rememberForever('settings.all', fn () => array_merge(
            static::defaults(),
            static::query()->pluck('value', 'key')->all(),
        ));
    }
}
