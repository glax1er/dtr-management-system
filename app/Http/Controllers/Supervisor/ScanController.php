<?php

namespace App\Http\Controllers\Supervisor;

use App\Actions\Attendance\RecordScan;
use App\Exceptions\Attendance\InvalidScanException;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint the scanner page calls after reading a QR code. Once wired
 * into the role:supervisor route group (see routes/web.php once
 * Pabillo-branch merges), $request->user() is guaranteed to be a
 * supervisor account by the time this runs — RecordScan still checks
 * HTE scoping itself, since that's a data check, not an auth check.
 */
class ScanController extends Controller
{
    public function __invoke(Request $request, RecordScan $recordScan): JsonResponse
    {
        $data = $request->validate([
            'qr_code_value' => ['required', 'string'],
        ]);

        try {
            $result = $recordScan($data['qr_code_value'], $request->user());
        } catch (InvalidScanException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'reason' => $e->reason->value,
            ], 422);
        }

        return response()->json([
            'intern_name' => $result->internName,
            'label' => $result->label->value,
            'timestamp' => $result->timestamp->toIso8601String(),
            'is_duplicate' => $result->isDuplicate,
        ]);
    }
}