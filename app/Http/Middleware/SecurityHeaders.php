<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Locks the browser down: pages may only load code from, and send data to,
 * this server. Student photos and records therefore cannot be sent elsewhere
 * from the page, even by a bug or a compromised dependency.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        Vite::useCspNonce();

        $response = $next($request);

        $dev = $this->viteDevOrigin();
        $devHttp = $dev ? ' '.$dev : '';
        $devWs = $dev ? ' '.preg_replace('/(^| )http/', '$1ws', $dev) : '';

        $policy = implode('; ', [
            "default-src 'self'",
            // wasm-unsafe-eval: MediaPipe's WebAssembly runtime
            "script-src 'self' 'nonce-".Vite::cspNonce()."' 'wasm-unsafe-eval'".$devHttp,
            "style-src 'self' 'unsafe-inline'".$devHttp,
            "img-src 'self' data: blob:".$devHttp,
            "font-src 'self' data:".$devHttp,
            "media-src 'self' blob: mediastream:",
            "connect-src 'self'".$devHttp.$devWs,
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ]);

        $response->headers->set('Content-Security-Policy', $policy);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'same-origin');
        $response->headers->set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');

        // Browsers only honour these over HTTPS (production).
        if ($request->isSecure()) {
            $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }

        return $response;
    }

    /** The Vite dev server, while `npm run dev` is running locally. */
    private function viteDevOrigin(): ?string
    {
        if (! app()->isLocal()) {
            return null;
        }

        $hot = public_path('hot');
        if (! is_file($hot)) {
            return null;
        }

        $url = trim((string) file_get_contents($hot));
        $parts = parse_url($url);

        if (! isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        // CSP cannot express IPv6 literals such as [::1]; allow the local dev
        // scheme instead (local environment only, never in production).
        if (str_contains($parts['host'], ':')) {
            return $parts['scheme'].':';
        }

        $port = isset($parts['port']) ? ':'.$parts['port'] : '';

        // Herd also serves dev assets from vite.<site> on the same port.
        return $parts['scheme'].'://'.$parts['host'].$port.' '.$parts['scheme'].'://*.'.$parts['host'].$port;
    }
}
