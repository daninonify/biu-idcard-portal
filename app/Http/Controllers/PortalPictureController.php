<?php

namespace App\Http\Controllers;

use App\Http\Presenters\CardPresenter;
use App\Models\IdCard;
use App\Services\CardService;
use App\Services\StudentDirectory\StudentDirectory;
use App\Services\StudentDirectory\StudentDirectoryException;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** "Update portal pictures": send captured photos back to the student portal. */
class PortalPictureController extends Controller
{
    public function index(Request $request, StudentDirectory $directory): Response
    {
        $show = $request->validate(['show' => ['nullable', Rule::in(['waiting', 'sent'])]])['show'] ?? 'waiting';

        $cards = IdCard::query()->with('student')
            ->whereNotNull('photo_path')
            ->when($show === 'waiting', fn ($q) => $q->whereNull('portal_photo_synced_at'))
            ->when($show === 'sent', fn ($q) => $q->whereNotNull('portal_photo_synced_at'))
            ->latest('captured_at')
            ->paginate(24)
            ->withQueryString()
            ->through(fn (IdCard $c) => CardPresenter::row($c));

        return Inertia::render('portal-pictures', [
            'cards' => $cards,
            'show' => $show,
            'portal' => ['name' => $directory->name(), 'canUpdatePhoto' => $directory->supportsPhotoUpdate()],
            'waiting' => IdCard::query()->whereNotNull('photo_path')->whereNull('portal_photo_synced_at')->count(),
        ]);
    }

    public function store(Request $request, CardService $cards): RedirectResponse
    {
        $ids = $request->validate([
            'cards' => ['required', 'array', 'min:1', 'max:100'],
            'cards.*' => ['integer', 'exists:id_cards,id'],
        ])['cards'];

        $sent = 0;
        $failed = [];
        foreach (IdCard::query()->with('student')->whereKey($ids)->get() as $card) {
            try {
                $cards->pushPhotoToPortal($card, $request->user());
                $sent++;
            } catch (StudentDirectoryException $e) {
                $failed[] = $card->student->matric_no.': '.$e->getMessage();
            }
        }

        if ($failed) {
            Toast::error(($sent ? "{$sent} sent. " : '').count($failed).' failed — '.$failed[0]);
        } else {
            Toast::success($sent === 1 ? 'Picture sent to the student portal.' : "{$sent} pictures sent to the student portal.");
        }

        return back();
    }
}
