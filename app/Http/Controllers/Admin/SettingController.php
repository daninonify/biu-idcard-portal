<?php

namespace App\Http\Controllers\Admin;

use App\Enums\HolderType;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\CardService;
use App\Services\Directory\Directories;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

class SettingController extends Controller
{
    public function edit(Directories $directories): Response
    {
        try {
            $rembg = Http::timeout(2)->get(rtrim(config('idcard.rembg.url'), '/').'/openapi.json')->successful();
        } catch (Throwable) {
            $rembg = false;
        }

        $describe = fn (HolderType $type) => [
            'label' => $type === HolderType::Staff ? 'Staff records' : 'Student portal',
            'name' => $directories->for($type)->name(),
            'driver' => config("idcard.directory.{$type->value}.driver"),
            'env' => $type === HolderType::Staff ? 'STAFF_DIRECTORY' : 'STUDENT_DIRECTORY',
            'can_update_photo' => $directories->for($type)->supportsPhotoUpdate(),
        ];

        return Inertia::render('admin/settings', [
            'settings' => [
                'session' => Setting::get('session'),
                'valid_until' => Setting::get('valid_until'),
                'staff_valid_until' => Setting::get('staff_valid_until'),
                'default_background' => Setting::get('default_background'),
                'reprint_requires_reason' => (bool) Setting::get('reprint_requires_reason'),
                'registrar_signature_url' => Setting::get('registrar_signature') ? route('settings.signature', ['v' => crc32((string) Setting::get('registrar_signature'))]) : null,
                'legacy_signature_urls' => [route('signatures.legacy', 'a'), route('signatures.legacy', 'b')],
            ],
            'system' => [
                'directories' => [$describe(HolderType::Student), $describe(HolderType::Staff)],
                'rembg_url' => config('idcard.rembg.url'),
                'rembg_running' => $rembg,
                'photo_disk' => config('idcard.photo_disk'),
            ],
        ]);
    }

    public function update(Request $request, CardService $cards): RedirectResponse
    {
        $data = $request->validate([
            'session' => ['required', 'string', 'regex:/^\d{4}\/\d{4}$/'],
            'valid_until' => ['required', 'string', 'max:20'],
            'staff_valid_until' => ['required', 'string', 'max:20'],
            'default_background' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'reprint_requires_reason' => ['required', 'boolean'],
            'registrar_signature' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'remove_signature' => ['nullable', 'boolean'],
        ], ['session.regex' => 'Use the form 2026/2027.']);

        foreach (['session', 'valid_until', 'staff_valid_until', 'default_background', 'reprint_requires_reason'] as $key) {
            Setting::put($key, $data[$key]);
        }

        $old = Setting::get('registrar_signature');
        if ($request->hasFile('registrar_signature')) {
            $path = $request->file('registrar_signature')->store('branding', config('idcard.photo_disk'));
            Setting::put('registrar_signature', $path);
            $old && $cards->disk()->delete($old);
        } elseif (! empty($data['remove_signature']) && $old) {
            Setting::put('registrar_signature', null);
            $cards->disk()->delete($old);
        }

        Toast::success('Settings saved.');

        return back();
    }

    /** The registrar's signature image for the card back (staff only). */
    public function signature(CardService $cards): HttpResponse
    {
        $path = Setting::get('registrar_signature');
        abort_unless($path && $cards->disk()->exists($path), 404);

        return response((string) $cards->disk()->get($path), 200, [
            'Content-Type' => $cards->disk()->mimeType($path) ?: 'image/png',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
