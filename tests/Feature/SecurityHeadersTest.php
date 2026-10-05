<?php

test('security headers including full content-security-policy are present in web responses', function () {
    $response = $this->get('/login');

    $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    $response->assertHeader('X-Content-Type-Options', 'nosniff');
    $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    $response->assertHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    $response->assertHeader('Cross-Origin-Opener-Policy', 'same-origin');
    $response->assertHeader('X-XSS-Protection', '0');

    $response->assertHeader('Content-Security-Policy');
    $csp = $response->headers->get('Content-Security-Policy');

    expect($csp)->toContain("default-src 'self'")
        ->toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
        ->toContain("style-src 'self' 'unsafe-inline'")
        ->toContain("font-src 'self' data:")
        ->toContain("img-src 'self' data: blob:")
        ->toContain("media-src 'self' blob:")
        ->toContain("connect-src 'self' ws: wss:")
        ->toContain("frame-src 'self' blob:")
        ->toContain("object-src 'none'")
        ->toContain("base-uri 'self'")
        ->toContain("form-action 'self'")
        ->toContain("frame-ancestors 'self'");
});

test('https requests receive hsts and upgrade-insecure-requests in csp', function () {
    $response = $this->withServerVariables(['HTTPS' => 'on'])->get('/login');

    $response->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    $csp = $response->headers->get('Content-Security-Policy');
    expect($csp)->toContain('upgrade-insecure-requests');
});
