<?php

namespace App\Http\Controllers;

use App\Http\Presenters\CardPresenter;
use App\Models\IdCard;
use App\Models\Setting;
use App\Services\CardService;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

/** The capture studio: camera, background removal, framing, live card preview. */
class CaptureController extends Controller
{
    public function show(IdCard $card): Response
    {
        $card->load('student');

        return Inertia::render('cards/capture', [
            'card' => CardPresenter::card($card),
            'student' => CardPresenter::student($card->student),
            'cardData' => CardPresenter::cardData($card),
            'signatures' => ['registrar' => Setting::get('registrar_signature') ? route('settings.signature') : null],
            'defaults' => ['background' => Setting::get('default_background')],
            'rembgModels' => config('idcard.rembg.models'),
        ]);
    }

    public function store(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        $data = $request->validate([
            'photo' => ['required', 'file', 'mimetypes:image/jpeg', 'max:8192'],
            'engine' => ['required', 'string', 'regex:/^(none|mediapipe|rembg:[a-z0-9_-]+)$/'],
            'framing' => ['required', 'json'],
        ]);

        $framing = json_decode($data['framing'], true);
        $framing = [
            'zoom' => (float) ($framing['zoom'] ?? 1),
            'offX' => (float) ($framing['offX'] ?? 0),
            'offY' => (float) ($framing['offY'] ?? 0),
            'head' => [
                'top' => (float) ($framing['head']['top'] ?? 0.08),
                'cx' => (float) ($framing['head']['cx'] ?? 0.5),
                'found' => (bool) ($framing['head']['found'] ?? false),
            ],
            'background' => preg_match('/^#[0-9a-f]{6}$/i', (string) ($framing['background'] ?? '')) ? $framing['background'] : '#ffffff',
        ];

        try {
            $cards->savePhoto($card, (string) file_get_contents($data['photo']->getRealPath()), $data['engine'], $framing, $request->user());
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['photo' => $e->getMessage()]);
        }

        Toast::success('Photo saved for '.$card->student->full_name.'.');

        return $request->input('next') === 'print'
            ? to_route('cards.print', $card)
            : to_route('cards.show', $card);
    }
}
