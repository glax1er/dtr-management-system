<?php

namespace App\Exceptions\Attendance;

use App\Support\Attendance\ScanRejectionReason;
use RuntimeException;

/**
 * Thrown by RecordScan when a scan is genuinely invalid — as opposed
 * to a duplicate/debounced scan, which is not an error at all (see
 * ScanResult::$isDuplicate).
 */
class InvalidScanException extends RuntimeException
{
    public function __construct(
        public readonly ScanRejectionReason $reason,
    ) {
        parent::__construct($reason->message());
    }
}