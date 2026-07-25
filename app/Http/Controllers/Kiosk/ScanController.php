<?php

namespace App\Http\Controllers\Kiosk;

use App\Actions\Attendance\RecordScan;
use App\Exceptions\Attendance\InvalidScanException;
use App\Models\Kiosk;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ScanController extends Controller
{
    /**
     * The scanning screen itself — no auth, resolved purely by the
     * device_token in the URL matching an active kiosk row.
     */
    public function show(string $token): Response
    {
        $kiosk = Kiosk::where('device_token', $token)
            ->where('is_active', true)
            ->firstOrFail();

        return Inertia::render('kiosk/scan', [
            'kioskId' => $kiosk->id,
            'kioskName' => $kiosk->name,
        ]);
    }

    /**
     * The POST endpoint the scanner page calls after reading a QR code.
     */
    public function store(Request $request, string $token, RecordScan $recordScan): JsonResponse
    {
        $kiosk = Kiosk::where('device_token', $token)
            ->where('is_active', true)
            ->first();

        if ($kiosk === null) {
            return response()->json(['message' => 'This kiosk link is no longer valid.'], HttpResponse::HTTP_FORBIDDEN);
        }

        $data = $request->validate([
            'qr_code_value' => ['required', 'string'],
        ]);

        try {
            $result = $recordScan($data['qr_code_value'], $kiosk);
        } catch (InvalidScanException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'reason' => $e->reason->value,
            ], HttpResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'intern_name' => $result->internName,
            'id_number' => $result->idNumber,
            'program_name' => $result->programName, 
            'hte_name' => $result->hteName,         
            'label' => $result->label->value,
            'timestamp' => $result->timestamp->toIso8601String(),
            'is_duplicate' => $result->isDuplicate,
        ]);
    }
}