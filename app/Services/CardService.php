<?php

namespace App\Services;

use App\Enums\CardStatus;
use App\Enums\CardTemplate;
use App\Models\CardEvent;
use App\Models\IdCard;
use App\Models\Setting;
use App\Models\Student;
use App\Models\User;
use App\Services\StudentDirectory\PortalRecord;
use App\Services\StudentDirectory\StudentDirectory;
use App\Services\StudentDirectory\StudentDirectoryException;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

class CardService
{
    public function __construct(private readonly StudentDirectory $directory) {}

    /**
     * Find a student by matric number: the local copy if we have one (unless
     * $refresh), otherwise the student portal. Null when the portal has no such student.
     *
     * @throws StudentDirectoryException
     */
    public function lookup(string $matricNo, bool $refresh = false): ?Student
    {
        $matric = PortalRecord::normaliseMatric($matricNo);
        $local = Student::query()->where('matric_no', $matric)->first();

        if ($local && ! $refresh) {
            return $local;
        }

        $record = $this->directory->find($matric);
        if ($record === null || ! $record->isComplete()) {
            return $local; // keep what we have if the portal no longer lists them
        }

        return $this->import($record);
    }

    public function import(PortalRecord $record): Student
    {
        return Student::query()->updateOrCreate(
            ['matric_no' => $record->matric()],
            [...$record->toArray(), 'portal_synced_at' => now()],
        );
    }

    /** The student's card for the current session, created if needed. */
    public function cardFor(Student $student, User $user): IdCard
    {
        $session = (string) Setting::get('session');

        $card = IdCard::query()->firstOrCreate(
            ['student_id' => $student->id, 'session' => $session],
            [
                'template' => CardTemplate::forProgramme($student->programme, $student->level),
                'status' => CardStatus::Pending,
                'valid_until' => $student->graduation_year ?: Setting::get('valid_until'),
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

        $student = $card->student;
        $path = sprintf(
            'photos/%s/%s-%s.jpg',
            Str::slug($card->session),
            Str::slug(str_replace('/', '-', $student->matric_no)),
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

    /** @throws StudentDirectoryException */
    public function pushPhotoToPortal(IdCard $card, User $user): void
    {
        if (! $card->hasPhoto()) {
            throw new StudentDirectoryException('This card has no photo yet.');
        }
        if (! $this->directory->supportsPhotoUpdate()) {
            throw new StudentDirectoryException('This student portal connection cannot receive pictures.');
        }

        $this->directory->updatePhoto($card->student->matric_no, (string) $this->disk()->get($card->photo_path));

        $card->forceFill(['portal_photo_synced_at' => now()])->save();
        $this->log($card, $user, 'portal_photo_updated', 'Photo sent to the student portal');
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
            'matric_no' => $card?->student?->matric_no,
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
