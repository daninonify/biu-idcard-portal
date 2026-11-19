<?php

namespace App\Http\Controllers;

use App\Enums\CardStatus;
use App\Http\Presenters\CardPresenter;
use App\Models\CardEvent;
use App\Models\IdCard;
use App\Models\Setting;
use App\Services\StudentDirectory\DemoDirectory;
use App\Services\StudentDirectory\StudentDirectory;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(StudentDirectory $directory): Response
    {
        $session = (string) Setting::get('session');
        $inSession = IdCard::query()->where('session', $session);

        $byStatus = (clone $inSession)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

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

        return Inertia::render('dashboard', [
            'session' => $session,
            'stats' => [
                'pending' => (int) ($byStatus[CardStatus::Pending->value] ?? 0),
                'captured' => (int) ($byStatus[CardStatus::Captured->value] ?? 0),
                'printed' => (int) ($byStatus[CardStatus::Printed->value] ?? 0),
                'printed_today' => CardEvent::query()->whereIn('action', ['card_printed', 'card_reprinted'])->where('created_at', '>=', now()->startOfDay())->count(),
                'captured_today' => CardEvent::query()->whereIn('action', ['photo_captured', 'photo_replaced'])->where('created_at', '>=', now()->startOfDay())->count(),
                'reprints' => (clone $inSession)->where('print_count', '>', 1)->count(),
            ],
            'trend' => $trend,
            'queue' => IdCard::query()->with('student')
                ->where('status', CardStatus::Captured)
                ->oldest('captured_at')->limit(6)->get()
                ->map(fn (IdCard $c) => CardPresenter::row($c)),
            'activity' => CardEvent::query()->with(['user', 'card.student'])
                ->latest('created_at')->limit(8)->get()
                ->map(fn (CardEvent $e) => CardPresenter::event($e)),
            'directory' => $directory->name(),
            'demoMatrics' => $directory instanceof DemoDirectory ? array_slice($directory->matricNumbers(), 0, 6) : [],
        ]);
    }
}
