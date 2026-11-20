<?php

namespace App\Models;

use App\Enums\CardStatus;
use App\Enums\CardTemplate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property CardStatus $status
 * @property CardTemplate $template
 * @property array{zoom?: float, offX?: float, offY?: float, head?: array{top: float, cx: float, found?: bool}, background?: string}|null $framing
 */
class IdCard extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['photo_path'];

    protected function casts(): array
    {
        return [
            'status' => CardStatus::class,
            'template' => CardTemplate::class,
            'framing' => 'array',
            'captured_at' => 'datetime',
            'printed_at' => 'datetime',
            'encoded_at' => 'datetime',
            'portal_photo_synced_at' => 'datetime',
            'print_count' => 'integer',
        ];
    }

    /** @return BelongsTo<Cardholder, $this> */
    public function cardholder(): BelongsTo
    {
        return $this->belongsTo(Cardholder::class);
    }

    /** @return BelongsTo<User, $this> */
    public function capturedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'captured_by');
    }

    /** @return BelongsTo<User, $this> */
    public function printedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'printed_by');
    }

    /** @return HasMany<CardEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(CardEvent::class)->latest('created_at');
    }

    public function hasPhoto(): bool
    {
        return $this->photo_path !== null;
    }
}
