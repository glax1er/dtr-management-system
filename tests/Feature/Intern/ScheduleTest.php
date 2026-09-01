<?php

use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SchedulePeriod;
use App\Models\User;
use App\Notifications\ScheduleUpdatedNotification;
use Inertia\Testing\AssertableInertia as Assert;

function createScheduleTestIntern(): array
{
    $hte = Hte::create(['hte_name' => 'Acme Corporation', 'status' => 'active']);
    $program = Program::create(['program_name' => 'BS Information Tech']);
    $user = User::factory()->create(['role' => User::ROLE_INTERN]);

    $profile = InternProfile::create([
        'user_id' => $user->id,
        'id_number' => 'IT-2026-999',
        'sex' => 'female',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    return [$user, $profile, $hte, $program];
}

test('an intern can view the schedule & calendar page', function () {
    [$intern] = createScheduleTestIntern();

    $response = $this->actingAs($intern)->get(route('intern.schedule.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('intern/schedule')
        ->has('month')
        ->has('monthLabel')
        ->has('days')
        ->has('stats')
        ->has('hte')
        ->has('globalPeriods')
        ->has('htePeriods')
        ->has('recentNotifications')
        ->has('paginatedDays')
    );
});

test('calendar accurately reflects global schedule periods set by admin', function () {
    [$intern] = createScheduleTestIntern();

    // Create global schedule period
    SchedulePeriod::create([
        'hte_id' => null,
        'name' => 'First Semester 2026',
        'start_date' => '2026-09-01',
        'end_date' => '2026-10-31',
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

    $response = $this->actingAs($intern)->get(route('intern.schedule.index', ['month' => '2026-09']));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('intern/schedule')
        ->where('month', '2026-09')
        ->where('globalPeriods.0.name', 'First Semester 2026')
        ->where('globalPeriods.0.day_schedule.monday', '08:30')
        ->has('days', fn (Assert $days) => $days
            ->where('0.date', '2026-08-30') // leading sunday
            ->etc()
        )
    );
});

test('calendar gives precedence to HTE overrides created by supervisor', function () {
    [$intern, $profile, $hte] = createScheduleTestIntern();

    // Global schedule at 8:00
    SchedulePeriod::create([
        'hte_id' => null,
        'name' => 'Global Policy',
        'start_date' => '2026-09-01',
        'end_date' => '2026-09-30',
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

    // HTE specific override at 9:00 for Acme Corp
    SchedulePeriod::create([
        'hte_id' => $hte->hte_id,
        'name' => 'Acme Midterm Schedule',
        'start_date' => '2026-09-01',
        'end_date' => '2026-09-15',
        'day_schedule' => [
            'monday' => '09:00',
            'tuesday' => '09:00',
            'wednesday' => '09:00',
            'thursday' => '09:00',
            'friday' => '09:00',
            'saturday' => null,
            'sunday' => null,
        ],
    ]);

    $response = $this->actingAs($intern)->get(route('intern.schedule.index', ['month' => '2026-09']));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('intern/schedule')
        ->where('htePeriods.0.name', 'Acme Midterm Schedule')
        ->where('htePeriods.0.day_schedule.monday', '09:00')
        ->where('stats.hte_overrides_count', 1)
    );
});

test('schedule update notifications sent to intern are visible in recent updates', function () {
    [$intern, $profile, $hte] = createScheduleTestIntern();

    $intern->notify(new ScheduleUpdatedNotification(
        action: ScheduleUpdatedNotification::ACTION_UPDATED,
        scope: ScheduleUpdatedNotification::SCOPE_HTE,
        scheduleName: 'Acme Shift Revision',
        hteName: $hte->hte_name,
        actor: null,
        schedulePeriodId: 42,
    ));

    $response = $this->actingAs($intern)->get(route('intern.schedule.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('intern/schedule')
        ->where('recentNotifications.0.schedule_name', 'Acme Shift Revision')
        ->where('recentNotifications.0.scope', 'hte')
        ->where('recentNotifications.0.action', 'updated')
    );
});

test('intern is redirected to schedule calendar page when clicking schedule notification href', function () {
    [$intern, $profile, $hte] = createScheduleTestIntern();

    $notification = new ScheduleUpdatedNotification(
        action: ScheduleUpdatedNotification::ACTION_CREATED,
        scope: ScheduleUpdatedNotification::SCOPE_HTE,
        scheduleName: 'Acme Summer Shift',
        hteName: $hte->hte_name,
        actor: null,
        schedulePeriodId: 10,
        startDate: '2026-09-01',
    );

    $data = $notification->toArray($intern);
    expect($data['href'])->toBe('/intern/schedule?month=2026-09&highlight_date=2026-09-01');

    // Follow the href URL
    $response = $this->actingAs($intern)->get($data['href']);
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('intern/schedule')
        ->where('month', '2026-09')
    );
});

test('non-intern users cannot access intern schedule page', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $response = $this->actingAs($admin)->get(route('intern.schedule.index'));
    $response->assertForbidden();
});
