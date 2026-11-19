<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

/**
 * The "Offline" engine. rembg runs on this server, bound to 127.0.0.1, and
 * only signed-in staff reach it, through here. Photos never leave the server.
 */
class RembgController extends Controller
{
    public function status(): JsonResponse
    {
        try {
            $ok = Http::timeout(3)->get(rtrim(config('idcard.rembg.url'), '/').'/openapi.json')->successful();
        } catch (ConnectionException) {
            $ok = false;
        }

        return response()->json(['running' => $ok]);
    }

    public function remove(Request $request): Response
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimetypes:image/png,image/jpeg', 'max:12288'],
            'model' => ['required', 'string', 'in:'.implode(',', config('idcard.rembg.models'))],
        ]);

        try {
            $response = Http::timeout(config('idcard.rembg.timeout'))
                ->attach('file', (string) file_get_contents($data['file']->getRealPath()), 'photo.png')
                ->post(rtrim(config('idcard.rembg.url'), '/').'/api/remove', [
                    'model' => $data['model'],
                    'om' => 'true', // the mask only; compositing happens in the browser
                ]);
        } catch (ConnectionException) {
            return response()->json([
                'message' => 'The Offline engine (rembg) is not running on the server. Ask the administrator to start it.',
            ], 503);
        }

        if ($response->failed()) {
            report(new \RuntimeException('rembg failed: '.$response->status().' '.substr($response->body(), 0, 300)));

            return response()->json([
                'message' => $response->status() >= 500
                    ? 'The Offline engine failed on this photo (the server may be short of memory). Try a lighter model.'
                    : 'The Offline engine rejected the photo.',
            ], 502);
        }

        return response($response->body(), 200, ['Content-Type' => 'image/png', 'Cache-Control' => 'no-store']);
    }
}
