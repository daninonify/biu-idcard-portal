<?php

namespace App\Http\Controllers;

use App\Enums\CardTemplate;
use App\Http\Presenters\CardPresenter;
use App\Models\IdCard;
use App\Services\CardService;
use App\Services\Directory\Directories;
use App\Services\Directory\DirectoryException;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Update portal pictures": send captured photos back to where each person
 * came from (student portal for students, staff records for staff).
 */
class PortalPictureController extends Controller
{
    public function index(Request $request, Directories $directories): Response
    {
        $filters = $request->validate([
            'show' => ['nullable', Rule::in(['waiting', 'sent'])],
            'category' => ['nullable', Rule::in(['all', ...array_column(CardTemplate::cases(), 'value')])],
        ]);
        $show = $filters['show'] ?? 'waiting';
        $category = $filters['category'] ?? 'all';

        $base = fn () => IdCard::query()->whereNotNull('photo_path')
            ->when($category !== 'all', fn ($q) => $q->where('template', $category));

        $cards = $base()->with('cardholder')
            ->when($show === 'waiting', fn ($q) => $q->whereNull('portal_photo_synced_at'))
            ->when($show === 'sent', fn ($q) => $q->whereNotNull('portal_photo_synced_at'))
            ->latest('captured_at')
            ->paginate(24)
            ->withQueryString()
            ->through(fn (IdCard $c) => CardPresenter::row($c) + [
                'can_send' => $directories->for($c->cardholder->type)->supportsPhotoUpdate(),
            ]);

        $waitingByCategory = IdCard::query()->whereNotNull('photo_path')->whereNull('portal_photo_synced_at')
            ->selectRaw('template, count(*) as total')->groupBy('template')->pluck('total', 'template');

        return Inertia::render('portal-pictures', [
            'cards' => $cards,
            'show' => $show,
            'category' => $category,
            'categories' => collect(CardTemplate::cases())->map(fn (CardTemplate $t) => [
                'value' => $t->value,
                'label' => $t->label(),
                'waiting' => (int) ($waitingByCategory[$t->value] ?? 0),
            ])->prepend(['value' => 'all', 'label' => 'All categories', 'waiting' => (int) $waitingByCategory->sum()])->values(),
            'portals' => [
                'student' => ['name' => $directories->students()->name(), 'canUpdatePhoto' => $directories->students()->supportsPhotoUpdate()],
                'staff' => ['name' => $directories->staff()->name(), 'canUpdatePhoto' => $directories->staff()->supportsPhotoUpdate()],
            ],
            'waiting' => $base()->whereNull('portal_photo_synced_at')->count(),
        ]);
    }

    public function store(Request $request, CardService $cards): RedirectResponse
    {
        $ids = $request->validate([
            'cards' => ['required', 'array', 'min:1', 'max:100'],
            'cards.*' => ['integer', 'exists:id_cards,id'],
        ])['cards'];

        $sent = ['student' => 0, 'staff' => 0];
        $failed = [];
        foreach (IdCard::query()->with('cardholder')->whereKey($ids)->get() as $card) {
            try {
                $cards->pushPhotoToPortal($card, $request->user());
                $sent[$card->cardholder->type->value]++;
            } catch (DirectoryException $e) {
                $failed[] = $card->cardholder->id_number.': '.$e->getMessage();
            }
        }

        $parts = array_filter([
            $sent['student'] ? $sent['student'].' to the student portal' : null,
            $sent['staff'] ? $sent['staff'].' to the staff records' : null,
        ]);
        $summary = $parts ? 'Sent '.implode(' and ', $parts).'.' : '';

        if ($failed) {
            Toast::error(trim($summary.' '.count($failed).' failed — '.$failed[0]));
        } else {
            Toast::success($summary ?: 'Nothing to send.');
        }

        return back();
    }
}
