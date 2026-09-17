<?php

namespace Tests\Feature\Admin;

use App\Models\College;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SchedulePeriod;
use App\Models\User;
use App\Notifications\ScheduleUpdatedNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

function createCollegeAndProgram(string $name = 'College of Computer Studies', string $code = 'CCS'): array
{
    $college = College::create([
        'name' => $name,
        'code' => $code,
        'is_active' => true,
    ]);

    $program = Program::create([
        'program_name' => "BS in $name",
        'college_id' => $college->id,
    ]);

    return [$college, $program];
}

function createInternWithCollege(College $college, Program $program, ?Hte $hte = null): User
{
    $hte ??= Hte::create([
        'hte_name' => 'Test HTE '.uniqid(),
        'college_id' => $college->id,
        'status' => 'active',
    ]);

    $user = User::factory()->create([
        'role' => User::ROLE_INTERN,
        'college_id' => $college->id,
    ]);

    InternProfile::create([
        'user_id' => $user->id,
        'id_number' => 'ID-'.uniqid(),
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'is_approved_by_admin' => true,
        'admin_verified_at' => now(),
        'privacy_accepted_at' => now(),
    ]);

    return $user;
}

test('super admin can view schedule periods with college scopes and labels', function () {
    [$college] = createCollegeAndProgram('College of Engineering', 'COE');

    $superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
    ]);

    // Tier 1 University-wide
    $globalPeriod = SchedulePeriod::create([
        'hte_id' => null,
        'college_id' => null,
        'name' => 'University Baseline 2026',
        'start_date' => '2026-10-01',
        'end_date' => '2026-12-31',
        'day_schedule' => ['monday' => '08:00'],
    ]);

    // Tier 2 College-wide
    $collegePeriod = SchedulePeriod::create([
        'hte_id' => null,
        'college_id' => $college->id,
        'name' => 'COE Early Shift',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'day_schedule' => ['monday' => '07:30'],
    ]);

    $response = $this->actingAs($superAdmin)->get(route('admin.schedule.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/schedule')
        ->where('isSuperAdmin', true)
        ->has('colleges')
        ->has('periods', 2)
        ->where('periods.0.name', 'University Baseline 2026')
        ->where('periods.0.scope', 'global')
        ->where('periods.0.scope_label', 'University-wide Global Schedule')
        ->where('periods.1.name', 'COE Early Shift')
        ->where('periods.1.scope', 'college')
        ->where('periods.1.college_id', $college->id)
        ->where('periods.1.scope_label', 'Global schedule set by College of Engineering')
    );
});

test('super admin can create university-wide and college-specific schedules', function () {
    [$college] = createCollegeAndProgram();

    $superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
    ]);

    // 1. Create University-wide (college_id is null)
    $responseGlobal = $this->actingAs($superAdmin)->post(route('admin.schedule.store'), [
        'name' => 'University Fall 2026',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'college_id' => null,
        'day_schedule' => [
            'monday' => '08:00',
            'tuesday' => '08:00',
            'wednesday' => '08:00',
            'thursday' => '08:00',
            'friday' => '08:00',
            'saturday' => null,
            'sunday' => null,
        ],
    ]);

    $responseGlobal->assertRedirect();
    $this->assertDatabaseHas('schedule_periods', [
        'name' => 'University Fall 2026',
        'college_id' => null,
        'hte_id' => null,
    ]);

    // 2. Create College-specific schedule
    $responseCollege = $this->actingAs($superAdmin)->post(route('admin.schedule.store'), [
        'name' => 'CCS Special Term',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'college_id' => $college->id,
        'day_schedule' => [
            'monday' => '08:30',
            'tuesday' => '08:30',
            'wednesday' => '08:30',
            'thursday' => '08:30',
            'friday' => '08:30',
            'saturday' => null,
            'sunday' => null,
        ],
    ]);

    $responseCollege->assertRedirect();
    $this->assertDatabaseHas('schedule_periods', [
        'name' => 'CCS Special Term',
        'college_id' => $college->id,
        'hte_id' => null,
    ]);
});

test('college admin automatically scopes schedule creations to their college', function () {
    [$collegeA] = createCollegeAndProgram('College A', 'CLA');
    [$collegeB] = createCollegeAndProgram('College B', 'CLB');

    $collegeAdminA = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $collegeA->id,
    ]);

    // Even if college admin tries to spoof college_id to college B or null, controller enforces their own college_id
    $response = $this->actingAs($collegeAdminA)->post(route('admin.schedule.store'), [
        'name' => 'College A Term Schedule',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'college_id' => $collegeB->id, // Attempted spoof
        'day_schedule' => [
            'monday' => '08:00',
            'tuesday' => '08:00',
            'wednesday' => '08:00',
            'thursday' => '08:00',
            'friday' => '08:00',
            'saturday' => null,
            'sunday' => null,
        ],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('schedule_periods', [
        'name' => 'College A Term Schedule',
        'college_id' => $collegeA->id, // Strictly scoped to College A
    ]);
});

test('college admin only sees their own college schedule and university baseline, and cannot see other colleges', function () {
    [$collegeA] = createCollegeAndProgram('College A', 'CLA');
    [$collegeB] = createCollegeAndProgram('College B', 'CLB');

    $collegeAdminA = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $collegeA->id,
    ]);

    // University baseline
    SchedulePeriod::create([
        'hte_id' => null,
        'college_id' => null,
        'name' => 'University Baseline',
        'start_date' => '2026-10-01',
        'end_date' => '2026-12-31',
        'day_schedule' => ['monday' => '08:00'],
    ]);

    // College A schedule
    SchedulePeriod::create([
        'hte_id' => null,
        'college_id' => $collegeA->id,
        'name' => 'College A Schedule',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'day_schedule' => ['monday' => '08:30'],
    ]);

    // College B schedule
    SchedulePeriod::create([
        'hte_id' => null,
        'college_id' => $collegeB->id,
        'name' => 'College B Schedule',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'day_schedule' => ['monday' => '09:00'],
    ]);

    $response = $this->actingAs($collegeAdminA)->get(route('admin.schedule.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/schedule')
        ->where('isSuperAdmin', false)
        ->has('periods', 2)
        ->where('periods.0.name', 'University Baseline')
        ->where('periods.0.is_owner', false) // Read-only baseline for College Admin
        ->where('periods.1.name', 'College A Schedule')
        ->where('periods.1.is_owner', true)
    );
});

test('college admin cannot edit or delete university baseline or another college schedule', function () {
    [$collegeA] = createCollegeAndProgram('College A', 'CLA');
    [$collegeB] = createCollegeAndProgram('College B', 'CLB');

    $collegeAdminA = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $collegeA->id,
    ]);

    $globalPeriod = SchedulePeriod::create([
        'hte_id' => null,
        'college_id' => null,
        'name' => 'Global Baseline',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'day_schedule' => ['monday' => '08:00'],
    ]);

    $collegeBPeriod = SchedulePeriod::create([
        'hte_id' => null,
        'college_id' => $collegeB->id,
        'name' => 'College B Period',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'day_schedule' => ['monday' => '08:00'],
    ]);

    // Attempt to update University baseline -> 403
    $this->actingAs($collegeAdminA)
        ->patch(route('admin.schedule.update', $globalPeriod), [
            'name' => 'Hacked Global',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-31',
            'day_schedule' => ['monday' => '10:00'],
        ])
        ->assertForbidden();

    // Attempt to delete University baseline -> 403
    $this->actingAs($collegeAdminA)
        ->delete(route('admin.schedule.destroy', $globalPeriod))
        ->assertForbidden();

    // Attempt to update College B schedule -> 403
    $this->actingAs($collegeAdminA)
        ->patch(route('admin.schedule.update', $collegeBPeriod), [
            'name' => 'Hacked College B',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-31',
            'day_schedule' => ['monday' => '10:00'],
        ])
        ->assertForbidden();

    // Attempt to delete College B schedule -> 403
    $this->actingAs($collegeAdminA)
        ->delete(route('admin.schedule.destroy', $collegeBPeriod))
        ->assertForbidden();
});

test('3-tier schedule resolution hierarchy works correctly across HTE, College, and Global baseline', function () {
    [$collegeA, $programA] = createCollegeAndProgram('College A', 'CLA');
    [$collegeB, $programB] = createCollegeAndProgram('College B', 'CLB');

    $hteOverride = Hte::create([
        'hte_name' => 'Override Corp',
        'college_id' => $collegeA->id,
        'status' => 'active',
    ]);

    $hteRegular = Hte::create([
        'hte_name' => 'Regular Corp',
        'college_id' => $collegeA->id,
        'status' => 'active',
    ]);

    // Tier 1: University Global (8:00 AM)
    SchedulePeriod::create([
        'hte_id' => null,
        'college_id' => null,
        'name' => 'Tier 1 Global Baseline',
        'start_date' => '2026-09-01',
        'end_date' => '2026-09-30',
        'day_schedule' => ['monday' => '08:00'],
    ]);

    // Tier 2: College A Global Schedule (8:30 AM)
    SchedulePeriod::create([
        'hte_id' => null,
        'college_id' => $collegeA->id,
        'name' => 'Tier 2 College A Schedule',
        'start_date' => '2026-09-01',
        'end_date' => '2026-09-30',
        'day_schedule' => ['monday' => '08:30'],
    ]);

    // Tier 3: HTE Override for Override Corp (9:00 AM)
    SchedulePeriod::create([
        'hte_id' => $hteOverride->hte_id,
        'college_id' => null,
        'name' => 'Tier 3 HTE Override',
        'start_date' => '2026-09-01',
        'end_date' => '2026-09-30',
        'day_schedule' => ['monday' => '09:00'],
    ]);

    $monday = Carbon::parse('2026-09-07'); // A Monday in range

    // 1. Intern in College A at Override Corp: Tier 3 (9:00 AM) beats College & Global
    $timeTier3 = SchedulePeriod::expectedStartTimeFor($monday, $hteOverride->hte_id, $collegeA->id);
    expect($timeTier3)->toBe('09:00');

    // 2. Intern in College A at Regular Corp (no HTE override): Tier 2 (8:30 AM) beats Global
    $timeTier2 = SchedulePeriod::expectedStartTimeFor($monday, $hteRegular->hte_id, $collegeA->id);
    expect($timeTier2)->toBe('08:30');

    // 3. Intern in College B (no College schedule, no HTE override): falls back to Tier 1 Global (8:00 AM)
    $timeTier1 = SchedulePeriod::expectedStartTimeFor($monday, null, $collegeB->id);
    expect($timeTier1)->toBe('08:00');

    // Also test intern schedule controller Inertia response for Intern 2 (College schedule active)
    $internCollegeA = createInternWithCollege($collegeA, $programA, $hteRegular);

    $response = $this->actingAs($internCollegeA)->get(route('intern.schedule.index', ['month' => '2026-09']));
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('intern/schedule')
        ->where('days.8.date', '2026-09-07') // Monday Sept 7
        ->where('days.8.source_type', 'college_schedule')
        ->where('days.8.expected_start_time', '08:30')
        ->has('collegePeriods', 1)
        ->where('collegePeriods.0.name', 'Tier 2 College A Schedule')
    );
});

test('notifications for college schedule creation target only interns in that college', function () {
    Notification::fake();

    [$collegeA, $programA] = createCollegeAndProgram('College A', 'CLA');
    [$collegeB, $programB] = createCollegeAndProgram('College B', 'CLB');

    $internA = createInternWithCollege($collegeA, $programA);
    $internB = createInternWithCollege($collegeB, $programB);

    $collegeAdminA = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $collegeA->id,
    ]);

    $this->actingAs($collegeAdminA)->post(route('admin.schedule.store'), [
        'name' => 'College A Semester',
        'start_date' => '2026-09-01',
        'end_date' => '2026-12-31',
        'day_schedule' => [
            'monday' => '08:30',
            'tuesday' => null,
            'wednesday' => null,
            'thursday' => null,
            'friday' => null,
            'saturday' => null,
            'sunday' => null,
        ],
    ]);

    Notification::assertSentTo(
        $internA,
        ScheduleUpdatedNotification::class,
        fn (ScheduleUpdatedNotification $n) => $n->scope === ScheduleUpdatedNotification::SCOPE_COLLEGE
    );

    Notification::assertNotSentTo(
        $internB,
        ScheduleUpdatedNotification::class
    );
});
