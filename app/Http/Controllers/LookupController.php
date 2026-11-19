<?php

namespace App\Http\Controllers;

use App\Http\Presenters\CardPresenter;
use App\Models\IdCard;
use App\Services\CardService;
use App\Services\StudentDirectory\DemoDirectory;
use App\Services\StudentDirectory\StudentDirectory;
use App\Services\StudentDirectory\StudentDirectoryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Welcome Centre Search": find a student on the student portal by matric
 * number and open (or start) their card for the current session.
 */
class LookupController extends Controller
{
    public function index(Request $request, StudentDirectory $directory): Response
    {
        return Inertia::render('lookup', [
            'directory' => $directory->name(),
            'demoMatrics' => $directory instanceof DemoDirectory ? array_slice($directory->matricNumbers(), 0, 8) : [],
            'recent' => IdCard::query()->with('student')
                ->whereHas('events', fn ($q) => $q->where('user_id', $request->user()->id))
                ->latest('updated_at')->limit(6)->get()
                ->map(fn (IdCard $c) => CardPresenter::row($c)),
        ]);
    }

    public function store(Request $request, CardService $cards): RedirectResponse
    {
        $data = $request->validate([
            'matric_no' => ['required', 'string', 'max:40'],
        ], [], ['matric_no' => 'matric number']);

        try {
            $student = $cards->lookup($data['matric_no']);
        } catch (StudentDirectoryException $e) {
            return back()->withErrors(['matric_no' => $e->getMessage()])->withInput();
        }

        if ($student === null) {
            return back()->withErrors([
                'matric_no' => 'No student with matric number '.strtoupper(trim($data['matric_no'])).' was found on the student portal.',
            ])->withInput();
        }

        $card = $cards->cardFor($student, $request->user());

        return to_route('cards.show', $card);
    }
}
