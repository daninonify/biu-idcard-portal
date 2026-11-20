<?php

namespace App\Http\Controllers;

use App\Models\IdCard;
use App\Models\Setting;
use App\Services\CardService;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Signatures printed on cards, all served only to signed-in staff:
 *  - the cardholder's own signature (staff cards), drawn or scanned at the desk;
 *  - the registrar signatures carried over from the old card templates.
 */
class SignatureController extends Controller
{
    public function show(IdCard $card, CardService $cards): Response
    {
        $path = $card->cardholder->signature_path;
        abort_unless($path && $cards->disk()->exists($path), 404);

        return response((string) $cards->disk()->get($path), 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    /** Expects a PNG with a transparent background (the capture page prepares it). */
    public function store(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        $request->validate([
            'signature' => ['required', 'file', 'mimetypes:image/png', 'max:2048', 'dimensions:min_width=80,min_height=20,max_width=4000,max_height=4000'],
        ]);

        $holder = $card->cardholder;
        $old = $holder->signature_path;
        $path = 'signatures/'.Str::slug(str_replace('/', '-', $holder->id_number)).'-'.Str::lower(Str::random(8)).'.png';

        $cards->disk()->put($path, (string) file_get_contents($request->file('signature')->getRealPath()));
        $holder->forceFill(['signature_path' => $path, 'signature_captured_at' => now()])->save();
        if ($old && $old !== $path) {
            $cards->disk()->delete($old);
        }

        $cards->log($card, $request->user(), 'signature_captured', $old ? 'Holder signature replaced' : 'Holder signature captured');
        Toast::success('Signature saved.');

        return back();
    }

    public function destroy(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        $holder = $card->cardholder;
        if ($holder->signature_path) {
            $cards->disk()->delete($holder->signature_path);
            $holder->forceFill(['signature_path' => null, 'signature_captured_at' => null])->save();
            $cards->log($card, $request->user(), 'signature_removed', 'Holder signature removed');
        }
        Toast::success('Signature removed.');

        return back();
    }

    /** Registrar signature from the old templates: a = full-time card, b = the others. */
    public function legacy(string $variant): Response
    {
        abort_unless(in_array($variant, ['a', 'b'], true), 404);

        return response()->file(resource_path("legacy/registrar-signature-{$variant}.png"), [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    /**
     * What the card templates need: the uploaded registrar signature (which
     * replaces the old ones), the old ones, and the holder's own signature.
     *
     * @return array<string, mixed>
     */
    public static function forCard(IdCard $card): array
    {
        $uploaded = Setting::get('registrar_signature');

        return [
            'registrar' => $uploaded ? route('settings.signature', ['v' => crc32((string) $uploaded)]) : null,
            'legacy' => [
                'a' => route('signatures.legacy', 'a'),
                'b' => route('signatures.legacy', 'b'),
            ],
            'holder' => $card->cardholder->signature_path
                ? route('cards.signature', [$card, 'v' => $card->cardholder->signature_captured_at?->timestamp])
                : null,
        ];
    }
}
