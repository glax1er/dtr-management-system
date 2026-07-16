<?php

namespace App\Support\Attendance;

use Carbon\CarbonInterface;

/**
 * The outcome of a successfully accepted scan. A debounced duplicate
 * is still a ScanResult, not an exception — from the intern's and
 * supervisor's point of view the scan worked, the system just chose
 * not to write a second row for it (same behavior as commercial time
 * clocks, which still confirm a duplicate punch instead of erroring).
 */
final readonly class ScanResult
{
    public function __construct(
        public int $internUserId,
        public string $internName,
        public ScanLabel $label,
        public CarbonInterface $timestamp,
        public bool $isDuplicate,
    ) {}
}