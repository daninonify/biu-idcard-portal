<?php

namespace App\Http\Controllers;

use App\Models\IdCard;
use App\Services\CardService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Student photos live on a private disk and are only served to signed-in
 * staff, never from a public URL.
 */
class PhotoController extends Controller
{
    public function show(IdCard $card, CardService $cards): Response
    {
        abort_unless($card->hasPhoto() && $cards->disk()->exists($card->photo_path), 404);

        return response((string) $cards->disk()->get($card->photo_path), 200, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    /** "Download picture file", named by matric number. */
    public function download(Request $request, IdCard $card, CardService $cards): Response
    {
        abort_unless($card->hasPhoto() && $cards->disk()->exists($card->photo_path), 404);

        $cards->log($card, $request->user(), 'photo_downloaded', 'Photo downloaded');
        $name = Str::slug(str_replace('/', '-', $card->student->matric_no)).'.jpg';

        return $cards->disk()->download($card->photo_path, strtoupper($name), ['Content-Type' => 'image/jpeg']);
    }
}
