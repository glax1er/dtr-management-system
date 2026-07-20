<?php

namespace App\Http\Controllers\Intern;

use App\Http\Controllers\Controller;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Renders the currently logged-in intern's own qr_code_value as an
 * actual PNG image. This is intentionally the ONE endpoint used for
 * both display and download — an <img src="..."> tag shows it inline,
 * and an <a href="..." download="qr-code.png"> pointed at the same URL
 * forces a save instead of a navigation. No separate download route
 * needed; the `download` HTML attribute is what makes the difference,
 * not anything server-side.
 */
class QrCodeImageController extends Controller
{
    public function show(Request $request): Response
    {
        $internProfile = $request->user()->internProfile;

        // Shouldn't be reachable in the normal flow — approval always
        // sets qr_code_value — but this route is only useful once
        // that's true, so fail loudly rather than render a blank image.
        abort_if($internProfile === null || $internProfile->qr_code_value === null, 404);

        $result = (new Builder(
            writer: new PngWriter,
            data: $internProfile->qr_code_value,
            size: 400,
            margin: 16,
        ))->build();

        return response($result->getString(), 200, [
            'Content-Type' => $result->getMimeType(),
        ]);
    }
}