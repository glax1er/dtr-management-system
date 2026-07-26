export type InternProfileSummary = {
    name: string;
    email: string;
    id_number: string;
    hte_name: string;
    program_name: string;
    status: 'pending' | 'approved' | 'rejected';
    /**
     * Whether a QR code has been generated yet. The actual QR
     * generation/display flow is being built separately — this flag is
     * only used to decide what placeholder text to show.
     */
    has_qr_code: boolean;
};

export type TodayAttendance = {
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: 'not_started' | 'open' | 'missing_time_in' | 'complete';
};

export type HoursSummary = {
    total_rendered: number;
    required: number;
    progress_percent: number;
};

export type AttendanceDay = {
    date: string;
    day: string;
    time_in: string | null;
    time_out: string | null;
    hours_rendered: number;
    lunch_deducted: boolean;
    status: 'open' | 'missing_time_in' | 'no_record' | 'complete';
    raw_scan_count: number;
    /**
     * A pending resolution ticket's id, if one already exists for this
     * date — null otherwise. Drives whether the row shows "Request
     * Resolution" or a "Pending" state with a cancel option.
     */
    pending_ticket_id: number | null;
};

export type InternDashboardProps = {
    profile: InternProfileSummary;
    today: TodayAttendance;
    hours: HoursSummary;
    month: string; // 'YYYY-MM'
    monthLabel: string; // e.g. 'July 2026'
    logs: AttendanceDay[];
    monthTotalHours: number;
    canGoNextMonth: boolean;
};
