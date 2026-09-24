<?php

use App\Models\AttendanceLog;
use App\Models\Campus;
use App\Models\College;
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
        'registered_at' => Carbon::now(config('dtr.timezone')),
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

test('super admin dashboard exposes institutional analytics for campuses, colleges, and admins', function () {
    $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

    $campus = Campus::create([
        'name' => 'Main Campus '.uniqid(),
        'code' => 'MC'.rand(10, 99),
        'is_active' => true,
    ]);

    $college = College::create([
        'name' => 'College of Engineering '.uniqid(),
        'code' => 'CE'.rand(10, 99),
        'campus_id' => $campus->id,
        'campus' => $campus->name,
        'is_active' => true,
    ]);

    $collegeAdmin = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $college->id,
        'is_active' => true,
    ]);

    $program = Program::create([
        'college_id' => $college->id,
        'program_name' => 'BSCE-'.uniqid(),
        'is_active' => true,
    ]);

    $hte = Hte::create(['hte_name' => 'Civic Builders '.uniqid(), 'status' => 'active']);
    makeInternProfile($hte, $program, 'approved');

    $response = $this->actingAs($superAdmin)->get(route('admin.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('superAdminAnalytics.campuses.total', fn ($total) => $total >= 1)
        ->where('superAdminAnalytics.colleges.total', fn ($total) => $total >= 1)
        ->where('superAdminAnalytics.admins.total', fn ($total) => $total >= 2)
        ->where('superAdminAnalytics.admins.super_admins', fn ($sa) => $sa >= 1)
        ->where('superAdminAnalytics.admins.college_admins', fn ($ca) => $ca >= 1)
        ->where('superAdminAnalytics.admins.coverage_percent', fn ($cp) => $cp > 0)
    );
});

test('college admin dashboard does not expose superAdminAnalytics', function () {
    $college = College::create([
        'name' => 'Arts & Sciences '.uniqid(),
        'code' => 'AS'.rand(10, 99),
        'is_active' => true,
    ]);

    $collegeAdmin = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $college->id,
    ]);

    $response = $this->actingAs($collegeAdmin)->get(route('admin.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('superAdminAnalytics', null)
    );
});

