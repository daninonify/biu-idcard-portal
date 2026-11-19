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

class PrintController extends Controller
{
    public function show(IdCard $card): Response|RedirectResponse
    {
        if (! $card->hasPhoto()) {
            Toast::error('Capture a photo before printing.');

            return to_route('cards.capture', $card);
        }

        $card->load('student');

        return Inertia::render('cards/print', [
            'card' => CardPresenter::card($card),
            'student' => CardPresenter::student($card->student),
            'cardData' => CardPresenter::cardData($card),
            'signatures' => ['registrar' => Setting::get('registrar_signature') ? route('settings.signature') : null],
            'reprintRequiresReason' => (bool) Setting::get('reprint_requires_reason'),
        ]);
    }

    /** Called after the operator confirms the card came out of the printer correctly. */
    public function store(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        $needsReason = $card->print_count > 0 && Setting::get('reprint_requires_reason');

        $data = $request->validate([
            'reason' => [$needsReason ? 'required' : 'nullable', 'string', 'max:200'],
        ], ['reason.required' => 'Say why this card is being reprinted.']);

        try {
            $cards->markPrinted($card, $request->user(), $data['reason'] ?? null);
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['reason' => $e->getMessage()]);
        }

        Toast::success('Marked as printed.');

        return to_route('cards.show', $card);
    }

    public function encode(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        $cards->markEncoded($card, $request->user());
        Toast::success('Marked as encoded.');

        return back();
    }
}
