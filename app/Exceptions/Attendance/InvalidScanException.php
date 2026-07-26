<?php

namespace App\Exceptions\Attendance;

use App\Support\Attendance\ScanRejectionReason;
use Exception;

class InvalidScanException extends Exception
{
    public function __construct(
        public readonly ScanRejectionReason $reason,
    ) {
        parent::__construct($reason->message());
    }
}
