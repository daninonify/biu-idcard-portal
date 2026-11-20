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
use App\Services\Directory\Directories;
use App\Services\Directory\DirectoryException;
use App\Support\Toast;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CardController extends Controller
{
    /**
     * "Card processing status": by category (Undergraduate / Postgraduate /
     * Staff) and status (Pending / Completed / All), with search.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'category' => ['nullable', Rule::in(['all', ...array_column(CardTemplate::cases(), 'value')])],
            'status' => ['nullable', Rule::in(['pending', 'completed', 'all'])],
            'q' => ['nullable', 'string', 'max:100'],
            'session' => ['nullable', 'string', 'max:20'],
        ]);
        $category = $filters['category'] ?? 'all';
        $status = $filters['status'] ?? 'pending';
        $session = $filters['session'] ?? (string) Setting::get('session');

        $inSession = fn (): Builder => IdCard::query()->when($session !== 'all', fn ($q) => $q->where('session', $session));
        $inCategory = fn (): Builder => $inSession()->when($category !== 'all', fn ($q) => $q->where('template', $category));

        $cards = $inCategory()
            ->with('cardholder')
            ->whereHas('cardholder', fn ($q) => $q->search($filters['q'] ?? null))
            ->when($status === 'pending', fn ($q) => $q->whereIn('status', CardStatus::open()))
            ->when($status === 'completed', fn ($q) => $q->where('status', CardStatus::Printed))
            ->orderByRaw("case status when 'captured' then 0 when 'pending' then 1 else 2 end")
            ->latest('updated_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (IdCard $c) => CardPresenter::row($c));

        // counts for the category tabs (respecting the status tab) and the status tabs (respecting the category)
        $byCategory = $inSession()
            ->when($status === 'pending', fn ($q) => $q->whereIn('status', CardStatus::open()))
            ->when($status === 'completed', fn ($q) => $q->where('status', CardStatus::Printed))
            ->selectRaw('template, count(*) as total')->groupBy('template')->pluck('total', 'template');

        return Inertia::render('cards/index', [
            'cards' => $cards,
            'filters' => ['category' => $category, 'status' => $status, 'q' => $filters['q'] ?? '', 'session' => $session],
            'sessions' => IdCard::query()->distinct()->orderByDesc('session')->pluck('session'),
            'categories' => collect(CardTemplate::cases())->map(fn (CardTemplate $t) => [
                'value' => $t->value,
                'label' => $t->label(),
                'count' => (int) ($byCategory[$t->value] ?? 0),
            ])->prepend(['value' => 'all', 'label' => 'All categories', 'count' => (int) $byCategory->sum()])->values(),
            'totals' => [
                'pending' => $inCategory()->whereIn('status', CardStatus::open())->count(),
                'completed' => $inCategory()->where('status', CardStatus::Printed)->count(),
                'all' => $inCategory()->count(),
            ],
        ]);
    }

    /** The person's record and card ("Registration form"). */
    public function show(IdCard $card, Directories $directories): Response
    {
        $card->load(['cardholder', 'capturedBy', 'printedBy']);
        $holder = $card->cardholder;
        $directory = $directories->for($holder->type);

        return Inertia::render('cards/show', [
            'card' => CardPresenter::card($card),
            'holder' => CardPresenter::holder($holder),
            'signatures' => SignatureController::forCard($card),
            'events' => $card->events()->with('user')->limit(30)->get()->map(fn (CardEvent $e) => CardPresenter::event($e)),
            'otherCards' => $holder->cards()->whereKeyNot($card->id)->latest()->get()->map(fn (IdCard $c) => CardPresenter::card($c)),
            'options' => [
                'studentTypes' => collect(StudentType::cases())->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
                'templates' => collect(CardTemplate::forType($holder->type))->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()]),
                'staffCategories' => CardPresenter::staffCategories(),
            ],
            'portal' => ['name' => $directory->name(), 'canUpdatePhoto' => $directory->supportsPhotoUpdate()],
        ]);
    }

    /**
     * Card-specific details staff may correct locally. Bio data itself comes
     * from the student portal / staff records and is refreshed from there.
     */
    public function update(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        $holder = $card->cardholder;
        $allowed = array_map(fn (CardTemplate $t) => $t->value, CardTemplate::forType($holder->type));

        $data = $request->validate([
            'template' => ['required', Rule::in($allowed)],
            'valid_until' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string', 'max:1000'],
            // students
            'student_type' => ['nullable', Rule::enum(StudentType::class)],
            'graduation_year' => ['nullable', 'string', 'max:10'],
            'guardian_name' => ['nullable', 'string', 'max:150'],
            'guardian_phone' => ['nullable', 'string', 'max:30'],
            'guardian_address' => ['nullable', 'string', 'max:500'],
            // staff
            'designation' => ['nullable', 'string', 'max:150'],
            'staff_category' => ['nullable', 'string', Rule::in(array_column(CardPresenter::staffCategories(), 'value'))],
        ]);

        $holder->update($holder->isStaff()
            ? [
                'designation' => $data['designation'] ?? null,
                'staff_category' => $data['staff_category'] ?? null,
            ]
            : [
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

    /** Pull the latest bio data from the student portal / staff records. */
    public function refresh(Request $request, IdCard $card, CardService $cards): RedirectResponse
    {
        $holder = $card->cardholder;

        try {
            $cards->lookup($holder->type, $holder->id_number, refresh: true);
            $source = $holder->isStaff() ? 'staff records' : 'student portal';
            $cards->log($card, $request->user(), 'portal_refreshed', "Details refreshed from the {$source}");
            Toast::success("Details refreshed from the {$source}.");
        } catch (DirectoryException $e) {
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
