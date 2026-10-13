<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Handle an incoming request and attach protective HTTP security headers.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $response->headers->set('X-XSS-Protection', '0');

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // Attach full application Content-Security-Policy if not already explicitly set (e.g. by sandboxed file previews)
        if (! $response->headers->has('Content-Security-Policy')) {
            $response->headers->set('Content-Security-Policy', $this->buildContentSecurityPolicy($request));
        }

        return $response;
    }

    /**
     * Build the application Content-Security-Policy directive string.
     */
    protected function buildContentSecurityPolicy(Request $request): string
    {
        $scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'"];
        $styleSrc = ["'self'", "'unsafe-inline'", 'https://fonts.bunny.net', 'https://fonts.googleapis.com'];
        $fontSrc = ["'self'", 'data:', 'https://fonts.bunny.net', 'https://fonts.gstatic.com'];
        $imgSrc = ["'self'", 'data:', 'blob:'];
        $mediaSrc = ["'self'", 'blob:'];
        $connectSrc = ["'self'", 'ws:', 'wss:'];
        $frameSrc = ["'self'", 'blob:'];

        // Support Vite development server in local/testing or when Vite hot reload is active
        $hotFile = public_path('hot');
        if (file_exists($hotFile)) {
            $hotUrl = trim((string) file_get_contents($hotFile));
            if ($hotUrl !== '') {
                $scriptSrc[] = $hotUrl;
                $styleSrc[] = $hotUrl;
                $fontSrc[] = $hotUrl;
                $imgSrc[] = $hotUrl;
                $connectSrc[] = $hotUrl;

                $parsed = parse_url($hotUrl);
                $host = $parsed['host'] ?? null;
                $port = isset($parsed['port']) ? ':'.$parsed['port'] : '';
                if ($host) {
                    $connectSrc[] = 'ws://'.$host.$port;
                    $connectSrc[] = 'wss://'.$host.$port;
                }
            }
        }

        if (app()->isLocal() || app()->environment('testing')) {
            $devOrigins = [
                'http://localhost:*',
                'https://localhost:*',
                'http://127.0.0.1:*',
                'https://127.0.0.1:*',
                'http://*.test:*',
                'https://*.test:*',
            ];
            $devWsOrigins = [
                'ws://localhost:*',
                'wss://localhost:*',
                'ws://127.0.0.1:*',
                'wss://127.0.0.1:*',
                'ws://*.test:*',
                'wss://*.test:*',
            ];

            $scriptSrc = array_merge($scriptSrc, $devOrigins);
            $styleSrc = array_merge($styleSrc, $devOrigins);
            $fontSrc = array_merge($fontSrc, $devOrigins);
            $imgSrc = array_merge($imgSrc, $devOrigins);
            $connectSrc = array_merge($connectSrc, $devOrigins, $devWsOrigins);
        }

        $directives = [
            "default-src 'self'",
            'script-src '.implode(' ', array_unique($scriptSrc)),
            'style-src '.implode(' ', array_unique($styleSrc)),
            'font-src '.implode(' ', array_unique($fontSrc)),
            'img-src '.implode(' ', array_unique($imgSrc)),
            'media-src '.implode(' ', array_unique($mediaSrc)),
            'connect-src '.implode(' ', array_unique($connectSrc)),
            'frame-src '.implode(' ', array_unique($frameSrc)),
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
        ];

        if (! app()->isLocal() && $request->isSecure()) {
            $directives[] = 'upgrade-insecure-requests';
        }

        return implode('; ', $directives);
    }
}
