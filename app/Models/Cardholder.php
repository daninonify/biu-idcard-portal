<?php

namespace App\Models;

use App\Enums\HolderType;
use App\Enums\StudentType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A student or staff member who can hold an ID card.
 *
 * @property HolderType $type
 */
class Cardholder extends Model
{
    protected $guarded = ['id'];

    protected $appends = ['full_name'];

    protected function casts(): array
    {
        return [
            'type' => HolderType::class,
            'date_of_birth' => 'date:Y-m-d',
            'student_type' => StudentType::class,
            'portal_synced_at' => 'datetime',
            'signature_captured_at' => 'datetime',
        ];
    }

    /** @return HasMany<IdCard, $this> */
    public function cards(): HasMany
    {
        return $this->hasMany(IdCard::class);
    }

    public function isStaff(): bool
    {
        return $this->type === HolderType::Staff;
    }

    /** @return Attribute<string, never> */
    protected function fullName(): Attribute
    {
        return Attribute::get(fn () => trim(implode(' ', array_filter([
            $this->surname, $this->first_name, $this->middle_name,
        ]))));
    }

    /** ID number (matric or staff), name, phone or email. */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $query;
        }

        return $query->where(function (Builder $q) use ($term) {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
            $q->where('id_number', 'like', $like)
                ->orWhere('surname', 'like', $like)
                ->orWhere('first_name', 'like', $like)
                ->orWhere('middle_name', 'like', $like)
                ->orWhere('phone', 'like', $like)
                ->orWhere('email', 'like', $like);

            // "OKAFOR ADA" style: every word must match some name part
            $words = preg_split('/\s+/', $term) ?: [];
            if (count($words) > 1) {
                $q->orWhere(function (Builder $all) use ($words) {
                    foreach ($words as $w) {
                        $w = '%'.str_replace(['%', '_'], ['\%', '\_'], $w).'%';
                        $all->where(fn (Builder $one) => $one
                            ->where('surname', 'like', $w)
                            ->orWhere('first_name', 'like', $w)
                            ->orWhere('middle_name', 'like', $w));
                    }
                });
            }
        });
    }
}
