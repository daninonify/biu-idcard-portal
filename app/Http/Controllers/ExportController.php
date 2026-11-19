<?php

namespace App\Http\Controllers;

use App\Enums\CardStatus;
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
 * named by matric number, e.g. for the card printer's own software or archives.
 */
class ExportController extends Controller
{
    public function index(): Response
    {
        $session = (string) Setting::get('session');

        return Inertia::render('exports', [
            'session' => $session,
            'sessions' => IdCard::query()->distinct()->orderByDesc('session')->pluck('session'),
            'counts' => [
                'all' => IdCard::query()->where('session', $session)->count(),
                'captured' => IdCard::query()->where('session', $session)->where('status', CardStatus::Captured)->count(),
                'printed' => IdCard::query()->where('session', $session)->where('status', CardStatus::Printed)->count(),
                'photos' => IdCard::query()->where('session', $session)->whereNotNull('photo_path')->count(),
            ],
        ]);
    }

    public function download(Request $request, CardService $cards): StreamedResponse|BinaryFileResponse
    {
        $data = $request->validate([
            'format' => ['required', Rule::in(['csv', 'photos'])],
            'session' => ['required', 'string', 'max:20'],
            'status' => ['required', Rule::in(['all', 'pending', 'captured', 'printed'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $query = $this->query($data);
        $stamp = now()->format('Ymd-His');
        $slug = Str::slug($data['session']);

        $count = (clone $query)->count();
        $cards->log(null, $request->user(), 'data_exported',
            ($data['format'] === 'csv' ? 'Spreadsheet' : 'Photo ZIP')." of {$count} cards ({$data['session']}, {$data['status']})",
            $data);

        return $data['format'] === 'csv'
            ? $this->csv($query, "idcards-{$slug}-{$data['status']}-{$stamp}.csv")
            : $this->zip($query, $cards, "photos-{$slug}-{$data['status']}-{$stamp}.zip");
    }

    /** @param array<string, mixed> $f */
    private function query(array $f): Builder
    {
        return IdCard::query()
            ->with('student')
            ->where('session', $f['session'])
            ->when($f['status'] !== 'all', fn ($q) => $q->where('status', $f['status']))
            ->when($f['from'] ?? null, fn ($q, $d) => $q->where('updated_at', '>=', $d))
            ->when($f['to'] ?? null, fn ($q, $d) => $q->where('updated_at', '<', now()->parse($d)->addDay()))
            ->orderBy('id');
    }

    private function csv(Builder $query, string $filename): StreamedResponse
    {
        $columns = ['Matric No', 'Surname', 'First Name', 'Middle Name', 'Faculty', 'Department', 'Programme',
            'Student Type', 'Phone', 'Email', 'Session', 'Card', 'Valid Until', 'Status', 'Times Printed',
            'Photo Captured', 'Printed At', 'Photo File'];

        return response()->streamDownload(function () use ($query, $columns) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows names correctly
            fputcsv($out, $columns);

            $query->chunk(500, function ($chunk) use ($out) {
                foreach ($chunk as $card) {
                    $s = $card->student;
                    fputcsv($out, array_map([$this, 'safeCell'], [
                        $s->matric_no, $s->surname, $s->first_name, $s->middle_name, $s->faculty, $s->department,
                        $s->programme, $s->student_type?->label(), $s->phone, $s->email, $card->session,
                        $card->template->label(), $card->valid_until, $card->status->label(), $card->print_count,
                        $card->captured_at?->format('Y-m-d H:i'), $card->printed_at?->format('Y-m-d H:i'),
                        $card->hasPhoto() ? $this->photoName($s->matric_no) : '',
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
                    $zip->addFromString($this->photoName($card->student->matric_no), (string) $cards->disk()->get($card->photo_path));
                }
            }
        });

        if ($zip->numFiles === 0) {
            $zip->addFromString('README.txt', "No photos matched the selected filters.\n");
        }
        $zip->close();

        return response()->download($path, $filename, ['Content-Type' => 'application/zip'])->deleteFileAfterSend();
    }

    private function photoName(string $matric): string
    {
        return strtoupper(str_replace('/', '-', $matric)).'.jpg';
    }

    /** Stop spreadsheet formula injection (cells starting with = + - @). */
    private function safeCell(mixed $value): string
    {
        $value = (string) $value;

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }
}
