<?php

namespace Database\Seeders;

use App\Models\CardEvent;
use App\Models\User;
use App\Services\CardService;
use App\Services\StudentDirectory\DemoDirectory;
use App\Services\StudentDirectory\PortalRecord;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;

/**
 * Fictional students at every stage, so each screen has something to show.
 * Photos are drawn silhouettes, not people.
 */
class DemoCardSeeder extends Seeder
{
    public function run(CardService $cards): void
    {
        $directory = new DemoDirectory;
        $operator = User::query()->where('email', 'operator@idcard.test')->firstOrFail();
        $admin = User::query()->where('email', 'admin@idcard.test')->firstOrFail();
        Auth::setUser($operator);

        foreach (array_slice($directory->all(), 0, 26) as $i => $raw) {
            $student = $cards->import(PortalRecord::fromArray($raw));
            $card = $cards->cardFor($student, $operator);

            if ($i % 3 === 0) {
                continue; // pending: no photo yet
            }

            $framing = ['zoom' => 1, 'offX' => 0, 'offY' => 0, 'head' => ['top' => 0.14, 'cx' => 0.5, 'found' => true], 'background' => '#ffffff'];
            $cards->savePhoto($card, $this->silhouette($i), 'mediapipe', $framing, $operator);

            if ($i % 3 === 2) {
                $cards->markPrinted($card, $i % 2 ? $operator : $admin);
                if ($i % 7 === 0) {
                    $cards->markPrinted($card, $admin, 'Card damaged in the printer');
                }
                if ($i % 4 === 0) {
                    $cards->pushPhotoToPortal($card, $operator);
                }
            }
        }

        // Spread the history over the last fortnight so the dashboard chart has a shape.
        CardEvent::query()->orderBy('id')->get()->each(function (CardEvent $e, int $n) {
            $e->forceFill(['created_at' => now()->subDays(13 - ($n % 14))->setTime(8 + $n % 9, ($n * 7) % 60)])->save();
        });
    }

    /** A simple head-and-shoulders drawing as a JPEG. */
    private function silhouette(int $seed): string
    {
        $w = 600;
        $h = 800;
        $img = imagecreatetruecolor($w, $h);
        imagefill($img, 0, 0, imagecolorallocate($img, 255, 255, 255));

        $tones = [[94, 64, 46], [141, 97, 70], [120, 80, 58], [168, 120, 90]];
        $shirts = [[52, 63, 140], [30, 110, 140], [90, 90, 98], [150, 40, 60]];
        [$r, $g, $b] = $tones[$seed % 4];
        [$sr, $sg, $sb] = $shirts[$seed % 4];
        $skin = imagecolorallocate($img, $r, $g, $b);
        $hair = imagecolorallocate($img, 28, 22, 20);
        $shirt = imagecolorallocate($img, $sr, $sg, $sb);

        imagefilledellipse($img, 300, 730, 560, 420, $shirt);         // shoulders
        imagefilledrectangle($img, 255, 430, 345, 560, $skin);        // neck
        imagefilledellipse($img, 300, 300, 300, 380, $skin);          // face
        imagefilledellipse($img, 300, 200, 330, 230, $hair);          // hair
        imagefilledrectangle($img, 130, 190, 470, 230, $skin);
        imagefilledellipse($img, 300, 250, 290, 160, $skin);

        ob_start();
        imagejpeg($img, null, 88);
        imagedestroy($img);

        return (string) ob_get_clean();
    }
}
