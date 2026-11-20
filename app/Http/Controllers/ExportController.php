<?php

namespace App\Http\Controllers;

use App\Enums\CardStatus;
use App\Enums\CardTemplate;
use App\Http\Presenters\CardPresenter;
use App\Models\Cardholder;
use App\Models\IdCard;
use App\Models\Setting;
use App\Services\CardService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

/**
 * "Generate data files": a spreadsheet of card data and/or a ZIP of photos
 * named by matric / staff number, per category, e.g. for the card printer's
 * own software or archives.
 */
class ExportController extends Controller
{
    public function index(): Response
    {
        $session = (string) Setting::get('session');

        $grid = IdCard::query()->where('session', $session)
            ->selectRaw('template, status, count(*) as total, sum(case when photo_path is not null then 1 else 0 end) as photos')
            ->groupBy('template', 'status')->get();

        return Inertia::render('exports', [
            'session' => $session,
            'sessions' => IdCard::query()->distinct()->orderByDesc('session')->pluck('session'),
            'categories' => CardPresenter::categories(),
            'counts' => collect(CardTemplate::cases())->mapWithKeys(fn (CardTemplate $t) => [$t->value => [
                'all' => (int) $grid->where('template', $t)->sum('total'),
                'captured' => (int) $grid->where('template', $t)->where('status', CardStatus::Captured)->sum('total'),
                'printed' => (int) $grid->where('template', $t)->where('status', CardStatus::Printed)->sum('total'),
                'photos' => (int) $grid->where('template', $t)->sum('photos'),
            ]]),
        ]);
    }

    public function download(Request $request, CardService $cards): StreamedResponse|BinaryFileResponse
    {
        $data = $request->validate([
            'format' => ['required', Rule::in(['csv', 'photos'])],
            'session' => ['required', 'string', 'max:20'],
            'category' => ['required', Rule::in(['all', ...array_column(CardTemplate::cases(), 'value')])],
            'status' => ['required', Rule::in(['all', 'pending', 'captured', 'printed'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $query = $this->query($data);
        $stamp = now()->format('Ymd-His');
        $name = Str::slug($data['session']).'-'.($data['category'] === 'all' ? 'all-categories' : CardTemplate::from($data['category'])->label()).'-'.$data['status'];
        $name = Str::lower(Str::slug($name));

        $count = (clone $query)->count();
        $what = $data['category'] === 'all' ? 'all categories' : CardTemplate::from($data['category'])->label();
        $cards->log(null, $request->user(), 'data_exported',
            ($data['format'] === 'csv' ? 'Spreadsheet' : 'Photo ZIP')." of {$count} cards ({$data['session']}, {$what}, {$data['status']})",
            $data);

        return $data['format'] === 'csv'
            ? $this->csv($query, "idcards-{$name}-{$stamp}.csv")
            : $this->zip($query, $cards, "photos-{$name}-{$stamp}.zip");
    }

    /** @param array<string, mixed> $f */
    private function query(array $f): Builder
    {
        return IdCard::query()
            ->with('cardholder')
            ->where('session', $f['session'])
            ->when($f['category'] !== 'all', fn ($q) => $q->where('template', $f['category']))
            ->when($f['status'] !== 'all', fn ($q) => $q->where('status', $f['status']))
            ->when($f['from'] ?? null, fn ($q, $d) => $q->where('updated_at', '>=', $d))
            ->when($f['to'] ?? null, fn ($q, $d) => $q->where('updated_at', '<', now()->parse($d)->addDay()))
            // grouped by category, then by name
            ->orderByRaw("case template when 'ug' then 0 when 'pg' then 1 else 2 end")
            ->orderBy(Cardholder::select('surname')->whereColumn('cardholders.id', 'id_cards.cardholder_id'))
            ->orderBy('id_cards.id'); // unique tie-breaker so chunk() never skips or repeats rows
    }

    private function csv(Builder $query, string $filename): StreamedResponse
    {
        $columns = ['Category', 'ID Number', 'Surname', 'First Name', 'Middle Name', 'Faculty / Directorate',
            'Department / Unit', 'Programme', 'Student Type', 'Designation', 'Staff Category', 'Phone', 'Email',
            'Session', 'Valid Until', 'Status', 'Times Printed', 'Photo Captured', 'Printed At', 'Photo File'];

        return response()->streamDownload(function () use ($query, $columns) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows names correctly
            fputcsv($out, $columns);

            $query->chunk(500, function ($chunk) use ($out) {
                foreach ($chunk as $card) {
                    $h = $card->cardholder;
                    fputcsv($out, array_map([$this, 'safeCell'], [
                        $card->template->label(), $h->id_number, $h->surname, $h->first_name, $h->middle_name,
                        $h->faculty, $h->department, $h->programme, $h->student_type?->label(), $h->designation,
                        CardPresenter::staffCategoryLabel($h->staff_category), $h->phone, $h->email,
                        $card->session, $card->valid_until, $card->status->label(), $card->print_count,
                        $card->captured_at?->format('Y-m-d H:i'), $card->printed_at?->format('Y-m-d H:i'),
                        $card->hasPhoto() ? $this->photoName($card) : '',
                    ]));
                }
            });
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function zip(Builder $query, CardService $cards, string $filename): BinaryFileResponse
    {
        $path = tempnam(sys_get_temp_dir(), 'idcards');
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::OVERWRITE);

        $query->whereNotNull('photo_path')->chunk(200, function ($chunk) use ($zip, $cards) {
            foreach ($chunk as $card) {
                if ($cards->disk()->exists($card->photo_path)) {
                    $zip->addFromString($this->photoName($card), (string) $cards->disk()->get($card->photo_path));
                }
            }
        });

        if ($zip->numFiles === 0) {
            $zip->addFromString('README.txt', "No photos matched the selected filters.\n");
        }
        $zip->close();

        return response()->download($path, $filename, ['Content-Type' => 'application/zip'])->deleteFileAfterSend();
    }

    /** e.g. "Undergraduate/SCN-CSC-230101.jpg", "Staff/BIU-AC-0150.jpg" */
    private function photoName(IdCard $card): string
    {
        return $card->template->label().'/'.strtoupper(str_replace('/', '-', $card->cardholder->id_number)).'.jpg';
    }

    /** Stop spreadsheet formula injection (cells starting with = + - @). */
    private function safeCell(mixed $value): string
    {
        $value = (string) $value;

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }
}
