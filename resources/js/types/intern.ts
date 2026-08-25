export type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
};

export type InternProfileSummary = {
    photo_url: string | null;
    name: string;
    email: string;
    id_number: string;
    hte_name: string;
    program_name: string;
    status: 'pending' | 'approved' | 'rejected';
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
    pending_ticket_id: number | null;
};

export type InternDashboardProps = {
    profile: InternProfileSummary;
    today: TodayAttendance;
    hours: HoursSummary;
    month: string;
    monthLabel: string;
    logs: PaginatedData<AttendanceDay>;
    monthTotalHours: number;
    canGoNextMonth: boolean;
};