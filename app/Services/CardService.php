<?php

namespace App\Services;

use App\Enums\CardStatus;
use App\Enums\CardTemplate;
use App\Enums\HolderType;
use App\Models\CardEvent;
use App\Models\Cardholder;
use App\Models\IdCard;
use App\Models\Setting;
use App\Models\User;
use App\Services\Directory\Directories;
use App\Services\Directory\DirectoryException;
use App\Services\Directory\PortalRecord;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

class CardService
{
    public function __construct(private readonly Directories $directories) {}

    /**
     * Find a student (by matric no.) or staff member (by staff no.): the local
     * copy if we have one (unless $refresh), otherwise the source system.
     * Null when the source has no such person.
     *
     * @throws DirectoryException
     */
    public function lookup(HolderType $type, string $idNumber, bool $refresh = false): ?Cardholder
    {
        $id = PortalRecord::normaliseId($idNumber);
        $local = Cardholder::query()->where('type', $type)->where('id_number', $id)->first();

        if ($local && ! $refresh) {
            return $local;
        }

        $record = $this->directories->for($type)->find($id);
        if ($record === null || ! $record->isComplete()) {
            return $local; // keep what we have if the source no longer lists them
        }

        return $this->import($type, $record);
    }

    public function import(HolderType $type, PortalRecord $record): Cardholder
    {
        return Cardholder::query()->updateOrCreate(
            ['id_number' => $record->idNumber()],
            [...$record->toArray(), 'type' => $type, 'portal_synced_at' => now()],
        );
    }

    /** The person's card for the current session, created if needed. */
    public function cardFor(Cardholder $holder, User $user): IdCard
    {
        $session = (string) Setting::get('session');

        $card = IdCard::query()->firstOrCreate(
            ['cardholder_id' => $holder->id, 'session' => $session],
            [
                'template' => CardTemplate::choose($holder->type, $holder->programme, $holder->level),
                'status' => CardStatus::Pending,
                'valid_until' => $holder->isStaff()
                    ? Setting::get('staff_valid_until')
                    : ($holder->graduation_year ?: Setting::get('valid_until')),
            ],
        );

        if ($card->wasRecentlyCreated) {
            $this->log($card, $user, 'card_created', "Card started for {$session}");
        }

        return $card;
    }

    /**
     * @param  array<string, mixed>  $framing
     */
    public function savePhoto(IdCard $card, string $jpeg, string $engine, array $framing, User $user): IdCard
    {
        if (! str_starts_with($jpeg, "\xFF\xD8\xFF")) {
            throw new InvalidArgumentException('The photo must be a JPEG image.');
        }

        $holder = $card->cardholder;
        $path = sprintf(
            'photos/%s/%s/%s-%s.jpg',
            Str::slug($card->session),
            $card->template->value,
            Str::slug(str_replace('/', '-', $holder->id_number)),
            Str::lower(Str::random(8)),
        );

        $replacing = $card->hasPhoto();
        $old = $card->photo_path;

        $this->disk()->put($path, $jpeg);

        DB::transaction(function () use ($card, $path, $engine, $framing, $user, $replacing) {
            $card->forceFill([
                'photo_path' => $path,
                'photo_engine' => $engine,
                'framing' => $framing,
                'captured_by' => $user->id,
                'captured_at' => now(),
                'portal_photo_synced_at' => null,
                'status' => $card->status === CardStatus::Pending ? CardStatus::Captured : $card->status,
            ])->save();

            $this->log($card, $user, $replacing ? 'photo_replaced' : 'photo_captured',
                ($replacing ? 'Photo replaced' : 'Photo captured').' ('.$this->engineLabel($engine).')',
                ['engine' => $engine]);
        });

        if ($old && $old !== $path) {
            $this->disk()->delete($old);
        }

        return $card->refresh();
    }

    public function markPrinted(IdCard $card, User $user, ?string $reason = null): IdCard
    {
        if (! $card->hasPhoto()) {
            throw new InvalidArgumentException('Capture a photo before printing this card.');
        }

        $reprint = $card->print_count > 0;

        DB::transaction(function () use ($card, $user, $reason, $reprint) {
            $card->forceFill([
                'status' => CardStatus::Printed,
                'printed_by' => $user->id,
                'printed_at' => now(),
                'print_count' => $card->print_count + 1,
            ])->save();

            $this->log($card, $user, $reprint ? 'card_reprinted' : 'card_printed',
                $reprint ? 'Reprinted (copy '.$card->print_count.')'.($reason ? ": {$reason}" : '') : 'Card printed',
                array_filter(['reason' => $reason]));
        });

        return $card->refresh();
    }

    public function markEncoded(IdCard $card, User $user): IdCard
    {
        $card->forceFill(['encoded_at' => now()])->save();
        $this->log($card, $user, 'card_encoded', 'Card encoded');

        return $card;
    }

    /**
     * Send the photo back to where the person came from: the student portal
     * for students, the staff records for staff.
     *
     * @throws DirectoryException
     */
    public function pushPhotoToPortal(IdCard $card, User $user): void
    {
        if (! $card->hasPhoto()) {
            throw new DirectoryException('This card has no photo yet.');
        }
        $directory = $this->directories->for($card->cardholder->type);
        if (! $directory->supportsPhotoUpdate()) {
            throw new DirectoryException('The '.$directory->name().' connection cannot receive pictures.');
        }

        $directory->updatePhoto($card->cardholder->id_number, (string) $this->disk()->get($card->photo_path));

        $card->forceFill(['portal_photo_synced_at' => now()])->save();
        $this->log($card, $user, 'portal_photo_updated', 'Photo sent to the '.($card->cardholder->isStaff() ? 'staff records' : 'student portal'));
    }

    public function deleteCard(IdCard $card, User $user): void
    {
        $this->log($card, $user, 'card_deleted', 'Card record deleted', ['session' => $card->session]);

        if ($card->photo_path) {
            $this->disk()->delete($card->photo_path);
        }
        $card->delete();
    }

    /** @param array<string, mixed> $meta */
    public function log(?IdCard $card, ?User $user, string $action, ?string $description = null, array $meta = []): CardEvent
    {
        return CardEvent::query()->create([
            'id_card_id' => $card?->id,
            'id_number' => $card?->cardholder?->id_number,
            'category' => $card?->template?->value,
            'user_id' => $user?->id,
            'action' => $action,
            'description' => $description,
            'meta' => $meta ?: null,
            'ip_address' => request()->ip(),
        ]);
    }

    public function disk(): Filesystem
    {
        return Storage::disk(config('idcard.photo_disk'));
    }

    public function engineLabel(string $engine): string
    {
        $models = [
            'u2net_human_seg' => 'U²-Net human',
            'isnet-general-use' => 'ISNet general',
            'birefnet-portrait' => 'BiRefNet portrait',
        ];

        return match (true) {
            $engine === 'mediapipe' => 'Fast',
            str_starts_with($engine, 'rembg') => 'Offline · '.($models[Str::after($engine, ':')] ?? Str::after($engine, ':')),
            $engine === 'none' => 'Original background',
            default => $engine,
        };
    }
}
