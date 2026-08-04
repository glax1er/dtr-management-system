<?php

use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

function makeInternProfile(Hte $hte, Program $program, string $status = 'approved'): InternProfile
{
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);

    return InternProfile::create([
        'user_id' => $intern->id,
        'id_number' => '2026-'.$intern->id,
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => $status,
        'privacy_accepted_at' => now(),
    ]);
}

test('the admin dashboard exposes status breakdown, trend, top HTEs, and today\'s attendance', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $hteWithInterns = Hte::create(['hte_name' => 'Acme Corp', 'status' => 'active']);
    $emptyHte = Hte::create(['hte_name' => 'Empty Co', 'status' => 'active']);
    $program = Program::create(['program_name' => 'BSCS-'.uniqid()]);

    $approvedOne = makeInternProfile($hteWithInterns, $program, 'approved');
    $approvedTwo = makeInternProfile($hteWithInterns, $program, 'approved');
    makeInternProfile($hteWithInterns, $program, 'pending');
    makeInternProfile($hteWithInterns, $program, 'rejected');

    // Only one of the two approved interns has actually scanned in today.
    AttendanceLog::create([
        'intern_user_id' => $approvedOne->user_id,
        'scan_timestamp' => Carbon::now(config('dtr.timezone')),
    ]);

    $response = $this->actingAs($admin)->get(route('admin.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/dashboard')
        ->where('totalInterns', 2)
        ->where('pendingApprovals', 1)
        ->has('statusBreakdown', 3)
        ->has('registrationsTrend', 14)
        ->has('topHtes', 1) // the empty HTE is filtered out, only non-zero HTEs are ranked
        ->where('topHtes.0.name', 'Acme Corp')
        ->where('topHtes.0.count', 2)
        ->where('todayAttendance.checked_in', 1)
        ->where('todayAttendance.total', 2)
        ->where('todayAttendance.percent', 50)
    );
});

test('today\'s attendance is 0 out of 0 (not a division-by-zero error) when there are no approved interns yet', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $response = $this->actingAs($admin)->get(route('admin.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('todayAttendance.checked_in', 0)
        ->where('todayAttendance.total', 0)
        ->where('todayAttendance.percent', 0)
        ->where('topHtes', [])
    );
});

test('the registrations trend sums same-day signups instead of listing one row per intern', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $hte = Hte::create(['hte_name' => 'Acme Corp', 'status' => 'active']);
    $program = Program::create(['program_name' => 'BSCS-'.uniqid()]);

    makeInternProfile($hte, $program, 'approved');
    makeInternProfile($hte, $program, 'approved');

    $todayKey = Carbon::now(config('dtr.timezone'))->toDateString();

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('registrationsTrend', 14)
            ->where('registrationsTrend.13.date', $todayKey)
            ->where('registrationsTrend.13.count', 2)
        );
});
