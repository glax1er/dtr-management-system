<?php

use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\ResolutionTicket;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Support\Carbon;

test('an HTE supervisor sees their dashboard with paginated recent scans and stats', function () {
    $hte = Hte::create(['hte_name' => 'Acme Corp']);
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);
    InternProfile::create([
        'user_id' => $intern->id,
        'id_number' => '2026-'.$intern->id,
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'scan_timestamp' => Carbon::now('Asia/Manila')->setTime(8, 0),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/dashboard')
            ->where('myInternsCount', 1)
            ->where('scansToday', 1)
            ->has('recentScans.data', 1, fn ($scan) => $scan
                ->where('intern_name', $intern->name)
                ->where('label', 'time_in')
                ->etc()
            )
            ->where('recentScans.total', 1)
            ->where('recentScans.current_page', 1)
        );
});

test('an OJT supervisor is redirected to interns index when accessing dashboard', function () {
    $program = Program::create(['program_name' => 'BSCS-'.uniqid()]);
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'ojt',
        'program_id' => $program->program_id,
        'status' => 'active',
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.dashboard'))
        ->assertRedirect(route('supervisor.interns.index'));
});

test('recent scans on supervisor dashboard honors pagination per_page and page query parameters', function () {
    $hte = Hte::create(['hte_name' => 'Initech Corp']);
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    $program = Program::create(['program_name' => 'BSIS-'.uniqid()]);
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);
    InternProfile::create([
        'user_id' => $intern->id,
        'id_number' => '2026-'.$intern->id,
        'sex' => 'female',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    foreach (range(1, 5) as $i) {
        AttendanceLog::create([
            'intern_user_id' => $intern->id,
            'scan_timestamp' => Carbon::now('Asia/Manila')->subMinutes(60 - $i * 5),
        ]);
    }

    $this->actingAs($supervisor)
        ->get(route('supervisor.dashboard', ['per_page' => 2, 'page' => 1]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/dashboard')
            ->has('recentScans.data', 2)
            ->where('recentScans.total', 5)
            ->where('recentScans.last_page', 3)
            ->where('recentScans.current_page', 1)
        );

    $this->actingAs($supervisor)
        ->get(route('supervisor.dashboard', ['per_page' => 2, 'page' => 3]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/dashboard')
            ->has('recentScans.data', 1)
            ->where('recentScans.current_page', 3)
        );
});

test('a first scan after the time-out cutoff displays as time_out in recent scans', function () {
    $hte = Hte::create(['hte_name' => 'Cutoff Test Corp']);
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);
    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    $program = Program::create(['program_name' => 'BSIT-'.uniqid()]);
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);
    InternProfile::create([
        'user_id' => $intern->id,
        'id_number' => '2026-'.$intern->id,
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'scan_timestamp' => Carbon::now('Asia/Manila')->setTime(16, 30),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/dashboard')
            ->has('recentScans.data', 1, fn ($scan) => $scan
                ->where('intern_name', $intern->name)
                ->where('label', 'time_out')
                ->etc()
            )
        );
});
