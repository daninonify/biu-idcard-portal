<?php

namespace App\Http\Controllers;

use App\Enums\HolderType;
use App\Http\Presenters\CardPresenter;
use App\Models\IdCard;
use App\Services\CardService;
use App\Services\Directory\DemoDirectory;
use App\Services\Directory\Directories;
use App\Services\Directory\DirectoryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Welcome Centre Search": find a student (matric no.) or staff member
 * (staff no.) and open, or start, their card for the current session.
 */
class LookupController extends Controller
{
    public function index(Request $request, Directories $directories): Response
    {
        $type = HolderType::tryFrom((string) $request->query('type')) ?? HolderType::Student;

        return Inertia::render('lookup', [
            'type' => $type->value,
            'directories' => [
                'student' => self::describe($directories, HolderType::Student),
                'staff' => self::describe($directories, HolderType::Staff),
            ],
            'recent' => IdCard::query()->with('cardholder')
                ->whereHas('events', fn ($q) => $q->where('user_id', $request->user()->id))
                ->latest('updated_at')->limit(8)->get()
                ->map(fn (IdCard $c) => CardPresenter::row($c)),
        ]);
    }

    public function store(Request $request, CardService $cards): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(HolderType::class)],
            'id_number' => ['required', 'string', 'max:40'],
        ], [], ['id_number' => 'number']);

        $type = HolderType::from($data['type']);

        try {
            $holder = $cards->lookup($type, $data['id_number']);
        } catch (DirectoryException $e) {
            return back()->withErrors(['id_number' => $e->getMessage()])->withInput();
        }

        if ($holder === null) {
            $where = $type === HolderType::Staff ? 'the staff records' : 'the student portal';

            return back()->withErrors([
                'id_number' => 'No '.strtolower($type->label()).' with '.strtolower($type->numberLabel()).' '
                    .strtoupper(trim($data['id_number'])).' was found in '.$where.'.',
            ])->withInput();
        }

        return to_route('cards.show', $cards->cardFor($holder, $request->user()));
    }

    /** @return array{name: string, demo: list<string>} */
    public static function describe(Directories $directories, HolderType $type): array
    {
        $directory = $directories->for($type);

        return [
            'name' => $directory->name(),
            'demo' => $directory instanceof DemoDirectory ? array_slice($directory->idNumbers(), 0, 6) : [],
        ];
    }
}
