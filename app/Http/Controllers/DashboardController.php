<?php

namespace App\Http\Controllers;

use App\Enums\CardStatus;
use App\Enums\CardTemplate;
use App\Enums\HolderType;
use App\Http\Presenters\CardPresenter;
use App\Models\CardEvent;
use App\Models\IdCard;
use App\Models\Setting;
use App\Services\Directory\Directories;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Directories $directories): Response
    {
        $session = (string) Setting::get('session');

        // status counts per category for this session
        $grid = IdCard::query()->where('session', $session)
            ->selectRaw('template, status, count(*) as total')
            ->groupBy('template', 'status')
            ->get();

        $count = fn (?CardTemplate $cat, CardStatus $status) => (int) $grid
            ->when($cat, fn ($g) => $g->where('template', $cat))
            ->where('status', $status)
            ->sum('total');

        $categories = collect(CardTemplate::cases())->map(fn (CardTemplate $cat) => [
            'value' => $cat->value,
            'label' => $cat->label(),
            'pending' => $count($cat, CardStatus::Pending),
            'captured' => $count($cat, CardStatus::Captured),
            'printed' => $count($cat, CardStatus::Printed),
        ])->all();

        // Cards printed per day, last 14 days
        $since = now()->subDays(13)->startOfDay();
        $daily = CardEvent::query()
            ->whereIn('action', ['card_printed', 'card_reprinted'])
            ->where('created_at', '>=', $since)
            ->get(['created_at'])
            ->groupBy(fn (CardEvent $e) => $e->created_at->toDateString())
            ->map->count();

        $trend = collect(range(0, 13))->map(function (int $i) use ($since, $daily) {
            $day = $since->addDays($i);

            return ['date' => $day->toDateString(), 'label' => $day->format('D j'), 'printed' => (int) ($daily[$day->toDateString()] ?? 0)];
        });

        $demo = array_values(array_filter([
            ...LookupController::describe($directories, HolderType::Student)['demo'],
        ]));

        return Inertia::render('dashboard', [
            'session' => $session,
            'stats' => [
                'pending' => $count(null, CardStatus::Pending),
                'captured' => $count(null, CardStatus::Captured),
                'printed' => $count(null, CardStatus::Printed),
                'printed_today' => CardEvent::query()->whereIn('action', ['card_printed', 'card_reprinted'])->where('created_at', '>=', now()->startOfDay())->count(),
                'captured_today' => CardEvent::query()->whereIn('action', ['photo_captured', 'photo_replaced'])->where('created_at', '>=', now()->startOfDay())->count(),
                'reprints' => IdCard::query()->where('session', $session)->where('print_count', '>', 1)->count(),
            ],
            'categories' => $categories,
            'trend' => $trend,
            'queue' => IdCard::query()->with('cardholder')
                ->where('status', CardStatus::Captured)
                ->oldest('captured_at')->limit(6)->get()
                ->map(fn (IdCard $c) => CardPresenter::row($c)),
            'activity' => CardEvent::query()->with(['user', 'card.cardholder'])
                ->latest('created_at')->limit(8)->get()
                ->map(fn (CardEvent $e) => CardPresenter::event($e)),
            'directories' => [
                'student' => $directories->students()->name(),
                'staff' => $directories->staff()->name(),
            ],
            'demo' => [
                'student' => array_slice($demo, 0, 3),
                'staff' => array_slice(LookupController::describe($directories, HolderType::Staff)['demo'], 0, 2),
            ],
        ]);
    }
}
