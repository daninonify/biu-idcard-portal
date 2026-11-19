<?php

namespace App\Http\Controllers;

use App\Enums\CardStatus;
use App\Enums\CardTemplate;
use App\Enums\StudentType;
use App\Http\Presenters\CardPresenter;
use App\Models\CardEvent;
use App\Models\IdCard;
use App\Models\Setting;
use App\Services\CardService;
use App\Services\StudentDirectory\StudentDirectory;
use App\Services\StudentDirectory\StudentDirectoryException;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CardController extends Controller
{
    /** "Card processing status": Pending / Completed / All, with search. */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'completed', 'all'])],
            'q' => ['nullable', 'string', 'max:100'],
            'session' => ['nullable', 'string', 'max:20'],
        ]);
        $status = $filters['status'] ?? 'pending';
        $session = $filters['session'] ?? (string) Setting::get('session');

        $base = IdCard::query()->when($session !== 'all', fn ($q) => $q->where('session', $session));

        $cards = (clone $base)
            ->with('student')
            ->whereHas('student', fn ($q) => $q->search($filters['q'] ?? null))
            ->when($status === 'pending', fn ($q) => $q->whereIn('status', CardStatus::open()))
            ->when($status === 'completed', fn ($q) => $q->where('status', CardStatus::Printed))
            ->orderByRaw("case status when 'captured' then 0 when 'pending' then 1 else 2 end")
            ->latest('updated_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (IdCard $c) => CardPresenter::row($c));

        return Inertia::render('cards/index', [
            'cards' => $cards,
            'filters' => ['status' => $status, 'q' => $filters['q'] ?? '', 'session' => $session],
            'sessions' => IdCard::query()->distinct()->orderByDesc('session')->pluck('session'),
            'totals' => [
                'pending' => (clone $base)->whereIn('status', CardStatus::open())->count(),
                'completed' => (clone $base)->where('status', CardStatus::Printed)->count(),
                'all' => (clone $base)->count(),
            ],
        ]);
    }

    /** The student's record and card ("Registration form"). */
    public function show(IdCard $card, StudentDirectory $directory): Response
    {
        $card->load(['student', 'capturedBy', 'printedBy']);

        return Inertia::render('cards/show', [
            'card' => CardPresenter::card($card),
            'student' => CardPresenter::student($card->student),
            'events' => $card->events()->with('user')->limit(30)->get()->map(fn (CardEvent $e) => CardPresenter::event($e)),
            'otherCards' => $card->student->cards()->whereKeyNot($card->id)->latest()->get()->map(fn (IdCard $c) => CardPresenter::card($c)),
            'options' => [
                'studentTypes' => collect(StudentType::cases())->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
                'templates' => collect(CardTemplate::cases())->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
            ],
            'portal' => ['name' => $directory->name(), 'canUpdatePhoto' => $directory->supportsPhotoUpdate()],
        ]);
    }

    /**
     * Card-specific details staff may correct locally. Bio data itself comes
     * from the student portal and is refreshed from there.
     */
    public function update(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        $data = $request->validate([
            'template' => ['required', Rule::enum(CardTemplate::class)],
            'student_type' => ['nullable', Rule::enum(StudentType::class)],
            'valid_until' => ['nullable', 'string', 'max:20'],
            'graduation_year' => ['nullable', 'string', 'max:10'],
            'guardian_name' => ['nullable', 'string', 'max:150'],
            'guardian_phone' => ['nullable', 'string', 'max:30'],
            'guardian_address' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $card->student->update([
            'student_type' => $data['student_type'] ?? null,
            'graduation_year' => $data['graduation_year'] ?? null,
            'guardian_name' => $data['guardian_name'] ?? null,
            'guardian_phone' => $data['guardian_phone'] ?? null,
            'guardian_address' => $data['guardian_address'] ?? null,
        ]);
        $card->update([
            'template' => $data['template'],
            'valid_until' => $data['valid_until'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        $cards->log($card, $request->user(), 'details_updated', 'Card details updated');
        Toast::success('Details saved.');

        return back();
    }

    /** Pull the latest bio data from the student portal. */
    public function refresh(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        try {
            $cards->lookup($card->student->matric_no, refresh: true);
            $cards->log($card, $request->user(), 'portal_refreshed', 'Bio data refreshed from the student portal');
            Toast::success('Bio data refreshed from the student portal.');
        } catch (StudentDirectoryException $e) {
            Toast::error($e->getMessage());
        }

        return back();
    }

    public function destroy(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        Gate::authorize('admin');

        $cards->deleteCard($card, $request->user());
        Toast::success('Card record deleted.');

        return to_route('cards.index');
    }
}
