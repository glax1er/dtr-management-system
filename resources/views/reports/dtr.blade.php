<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; font-size: 10px; color: #000; }

        .header-table, .header-table td {
            border: 1px solid #000;
            border-collapse: collapse;
        }
        .header-table { width: 100%; table-layout: fixed; }
        .header-table .logo-cell { width: 15%; text-align: center; padding: 4px; }
        .header-table .info-cell { width: 70%; text-align: center; padding: 4px; }

        .title-bar {
            border: 1px solid #000;
            border-top: none;
            text-align: center;
            font-weight: bold;
            font-size: 13px;
            padding: 4px;
        }

        .info-table, .info-table td {
            border: 1px solid #000;
            border-collapse: collapse;
        }
        .info-table { width: 100%; margin-top: -1px; }
        .info-table td { padding: 6px 8px; vertical-align: top; }

        table.log, table.log th, table.log td {
            border: 1px solid #000;
            border-collapse: collapse;
        }
        table.log { width: 100%; margin-top: -1px; text-align: center; }
        table.log th { padding: 4px; font-weight: normal; }
        table.log td { padding: 5px 4px; }
        table.log td.desc-cell { text-align: left; }

        tr.total-row td { font-weight: bold; }

        .signature-block { margin-top: 50px; text-align: center; }
        .signature-line { border-top: 1px solid #000; width: 240px; margin: 0 auto 4px auto; }
    </style>
</head>
<body>

    {{-- Header --}}
    <table class="header-table">
        <tr>
            <td class="logo-cell">
                <img src="{{ public_path('images/usep-logo.png') }}" width="100" height="100">
            </td>
            <td class="info-cell">
                Republic of the Philippines<br>
                <strong style="font-size:13px;">University of Southeastern Philippines</strong><br>
                Iñigo St., Bo. Obrero, Davao City 8000<br>
                <span style="font-size:9px;">Website: www.usep.edu.ph</span><br>
                <span style="font-size:9px;">Telephone: (082) 227-8192 local 249</span><br>
                <span style="font-size:9px;">Email: cic_dean@usep.edu.ph</span>
            </td>
            <td class="logo-cell">
                <img src="{{ public_path('images/cic-logo.png') }}" width="100" height="100">
            </td>
        </tr>
    </table>
    <div class="title-bar">DAILY TIME RECORD</div>

    {{-- Intern / company info --}}
    <table class="info-table">
        <tr>
            <td style="width:70%;">Name of Student: <strong>{{ $user->name }}</strong></td>
            <td style="width:30%;">Model:</td>
        </tr>
        <tr>
            <td colspan="2">Name of Company/Organization: <strong>{{ $profile->hte->hte_name }}</strong></td>
        </tr>
        <tr>
            <td>Name of OJT Supervisor: <strong>{{ $profile->hte->contact_person }}</strong></td>
            <td>Address of Company/Organization: <strong>{{ $profile->hte->address }}</strong></td>
        </tr>
        <tr>
            <td>Contact Numbers: <strong>{{ $profile->hte->contact_number }}</strong></td>
            <td>Department Assigned: <strong>{{ $profile->hte->hte_name }}</strong></td>
        </tr>
    </table>

    {{-- For the period --}}
    <p style="margin: 6px 0 0; font-size: 10px;">For the month of <strong>{{ $month->format('F Y') }}</strong></p>

    {{-- Log table --}}
    <table class="log">
        <thead>
            <tr>
                <th rowspan="2" style="width:10%;">Date</th>
                <th colspan="2">Time</th>
                <th rowspan="2" style="width:12%;">No. of Hours</th>
                <th rowspan="2" style="width:38%;">Description of Activities</th>
            </tr>
            <tr>
                <th style="width:15%;">IN</th>
                <th style="width:15%;">OUT</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($days as $day)
                @php($row = $day->toArray())
                <tr>
                    <td>{{ $row['date'] }}</td>
                    <td>{{ $row['time_in'] }}</td>
                    <td>{{ $row['time_out'] ?? '' }}</td>
                    <td>{{ number_format($row['hours_rendered'], 2) }}</td>
                    <td class="desc-cell"></td>
                </tr>
            @empty
                <tr>
                    <td colspan="5">No attendance recorded for this month.</td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr class="total-row">
                <td colspan="3" style="text-align:right; padding-right:8px;">TOTALS</td>
                <td>{{ number_format($totalHours, 2) }}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    <div class="signature-block">
        <div class="signature-line"></div>
        HTE Supervisor
    </div>

</body>
</html>