<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        /* mPDF's CSS support is more limited than a real browser's —
           keep this to simple, well-supported properties (borders,
           padding, basic flex-free layout) rather than modern CSS. */
        body {
            font-family: sans-serif;
            font-size: 11px;
            color: #1a1a1a;
        }

        h1 {
            text-align: center;
            font-size: 16px;
            margin: 0 0 4px;
        }

        .subtitle {
            text-align: center;
            font-size: 10px;
            color: #555;
            margin: 0 0 16px;
        }

        table.identity {
            width: 100%;
            margin-bottom: 16px;
        }

        table.identity td {
            padding: 2px 4px;
            font-size: 11px;
        }

        table.identity td.label {
            width: 110px;
            color: #555;
        }

        table.log {
            width: 100%;
            border-collapse: collapse;
        }

        table.log th,
        table.log td {
            border: 1px solid #999;
            padding: 4px 6px;
            font-size: 10px;
            text-align: center;
        }

        table.log th {
            background-color: #f0f0f0;
            font-weight: bold;
        }

        table.log td.date-cell {
            text-align: left;
        }

        tr.total-row td {
            font-weight: bold;
            border-top: 2px solid #333;
        }

        .status-open {
            color: #b45309;
        }
    </style>
</head>
<body>
    <h1>Daily Time Record</h1>
    <p class="subtitle">{{ $month->format('F Y') }}</p>

    <table class="identity">
        <tr>
            <td class="label">Name</td>
            <td>{{ $user->name }}</td>
            <td class="label">HTE</td>
            <td>{{ $profile->hte->hte_name }}</td>
        </tr>
        <tr>
            <td class="label">ID Number</td>
            <td>{{ $profile->id_number }}</td>
            <td class="label">Program</td>
            <td>{{ $profile->program->program_name }}</td>
        </tr>
    </table>

    <table class="log">
        <thead>
            <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Time In<br>(Morning)</th>
                <th>Time Out<br>(Afternoon)</th>
                <th>Hours<br>Rendered</th>
                <th>Lunch<br>Deducted</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($days as $day)
                @php($row = $day->toArray())
                <tr>
                    <td class="date-cell">{{ $row['date'] }}</td>
                    <td>{{ $row['day'] }}</td>
                    <td>{{ $row['time_in'] }}</td>
                    <td>{{ $row['time_out'] ?? '—' }}</td>
                    <td>{{ number_format($row['hours_rendered'], 2) }}</td>
                    <td>{{ $row['lunch_deducted'] ? 'Yes' : 'No' }}</td>
                    <td class="{{ $row['status'] === 'open' ? 'status-open' : '' }}">
                        {{ $row['status'] === 'open' ? 'No time-out recorded' : 'Complete' }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="7">No attendance recorded for this month.</td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr class="total-row">
                <td colspan="4" style="text-align: right;">Total Hours Rendered</td>
                <td>{{ number_format($totalHours, 2) }}</td>
                <td colspan="2"></td>
            </tr>
        </tfoot>
    </table>
</body>
</html>