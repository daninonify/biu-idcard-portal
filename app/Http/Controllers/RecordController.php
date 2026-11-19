<?php

namespace App\Http\Controllers;

use App\Http\Presenters\CardPresenter;
use App\Models\CardEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** "Records": the audit trail of everything done to cards. */
class RecordController extends Controller
{
    public const ACTIONS = [
        'card_created' => 'Card started',
        'photo_captured' => 'Photo captured',
        'photo_replaced' => 'Photo replaced',
        'card_printed' => 'Printed',
        'card_reprinted' => 'Reprinted',
        'card_encoded' => 'Encoded',
        'details_updated' => 'Details updated',
        'portal_refreshed' => 'Refreshed from portal',
        'portal_photo_updated' => 'Portal picture updated',
        'photo_downloaded' => 'Photo downloaded',
        'data_exported' => 'Data file generated',
        'card_deleted' => 'Card deleted',
    ];

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'action' => ['nullable', 'string', 'in:'.implode(',', array_keys(self::ACTIONS))],
            'user' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $events = CardEvent::query()
            ->with(['user', 'card.student'])
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->where(fn ($w) => $w
                ->where('matric_no', 'like', "%{$term}%")
                ->orWhere('description', 'like', "%{$term}%")
                ->orWhereHas('card.student', fn ($s) => $s->search($term))))
            ->when($filters['action'] ?? null, fn ($q, $a) => $q->where('action', $a))
            ->when($filters['user'] ?? null, fn ($q, $u) => $q->where('user_id', $u))
            ->when($filters['from'] ?? null, fn ($q, $d) => $q->where('created_at', '>=', $d))
            ->when($filters['to'] ?? null, fn ($q, $d) => $q->where('created_at', '<', now()->parse($d)->addDay()))
            ->latest('created_at')
            ->paginate(40)
            ->withQueryString()
            ->through(fn (CardEvent $e) => CardPresenter::event($e));

        return Inertia::render('records', [
            'events' => $events,
            'filters' => [
                'q' => $filters['q'] ?? '',
                'action' => $filters['action'] ?? '',
                'user' => isset($filters['user']) ? (string) $filters['user'] : '',
                'from' => $filters['from'] ?? '',
                'to' => $filters['to'] ?? '',
            ],
            'actions' => collect(self::ACTIONS)->map(fn ($label, $value) => compact('value', 'label'))->values(),
            'users' => User::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }
}
