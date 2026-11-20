<?php

namespace App\Http\Controllers;

use App\Enums\CardTemplate;
use App\Http\Presenters\CardPresenter;
use App\Models\CardEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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
        'signature_captured' => 'Signature captured',
        'signature_removed' => 'Signature removed',
        'data_exported' => 'Data file generated',
        'card_deleted' => 'Card deleted',
    ];

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', Rule::in(array_column(CardTemplate::cases(), 'value'))],
            'action' => ['nullable', 'string', 'in:'.implode(',', array_keys(self::ACTIONS))],
            'user' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $events = CardEvent::query()
            ->with(['user', 'card.cardholder'])
            ->when($filters['q'] ?? null, function ($q, $term) {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';

                return $q->where(fn ($w) => $w
                    ->where('id_number', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereHas('card.cardholder', fn ($s) => $s->search($term)));
            })
            ->when($filters['category'] ?? null, fn ($q, $c) => $q->where('category', $c))
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
                'category' => $filters['category'] ?? '',
                'action' => $filters['action'] ?? '',
                'user' => isset($filters['user']) ? (string) $filters['user'] : '',
                'from' => $filters['from'] ?? '',
                'to' => $filters['to'] ?? '',
            ],
            'actions' => collect(self::ACTIONS)->map(fn ($label, $value) => compact('value', 'label'))->values(),
            'categories' => CardPresenter::categories(),
            'users' => User::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }
}
