<?php

namespace App\Support\Attendance;

enum ScanRejectionReason: string
{
    case QrNotRecognized = 'qr_not_recognized';
    case InternNotApproved = 'intern_not_approved';
    case ScannerNotSupervisor = 'scanner_not_supervisor';
    case HteMismatch = 'hte_mismatch';

    /**
     * User-facing message for the supervisor's scanner screen.
     */
    public function message(): string
    {
        return match ($this) {
            self::QrNotRecognized => 'QR code not recognized.',
            self::InternNotApproved => 'This intern\'s account is not approved yet.',
            self::ScannerNotSupervisor => 'This account is not set up as a supervisor scanner.',
            self::HteMismatch => 'This intern is not assigned to your HTE.',
        };
    }
}