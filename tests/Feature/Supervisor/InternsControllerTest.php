<?php

use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * @return array{0: User, 1: Hte}
 */
function makeSupervisorWithHte(): array
{
    $hte = Hte::create(['hte_name' => 'Test HTE']);

    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'hte_id' => $hte->hte_id,
        'status' => 'active',
    ]);

    return [$supervisor, $hte];
}

function makeApprovedInternForHte(Hte $hte): User
{
    $program = Program::create(['program_name' => 'BSCS-'.uniqid()]);

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

    return $intern;
}

/**
 * @return array{0: User, 1: Program}
 */
function makeOjtSupervisorForProgram(Program $program): array
{
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    SupervisorProfile::create([
        'user_id' => $supervisor->id,
        'supervisor_type' => 'ojt',
        'program_id' => $program->program_id,
        'status' => 'active',
    ]);

    return [$supervisor, $program];
}

function makeApprovedInternForHteAndProgram(Hte $hte, Program $program): User
{
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);

    InternProfile::create([
        'user_id' => $intern->id,
        'id_number' => '2026-'.$intern->id,
        'contact_number' => '0917'.str_pad((string) $intern->id, 7, '0', STR_PAD_LEFT),
        'sex' => 'male',
        'hte_id' => $hte->hte_id,
        'program_id' => $program->program_id,
        'status' => 'approved',
        'privacy_accepted_at' => now(),
    ]);

    return $intern;
}

test('a day with no time-in shows missing_time_in punctuality, without crashing', function () {
    [$supervisor, $hte] = makeSupervisorWithHte();
    $intern = makeApprovedInternForHte($hte);

    // Earliest (only) scan of the day is 2:00 PM — after the 13:00
    // cutoff, so DailyAttendance::$timeIn is null for this day.
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 14:00:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['month' => '2026-07']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/interns')
            ->has('logs', 1, fn ($log) => $log
                ->where('punctuality', 'missing_time_in')
                ->where('time_in', null)
                ->etc()
            )
        );
});

test('a time-in at or before the expected start time is marked on_time', function () {
    [$supervisor, $hte] = makeSupervisorWithHte();
    $intern = makeApprovedInternForHte($hte);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 07:45:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['month' => '2026-07']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('logs', 1, fn ($log) => $log
                ->where('punctuality', 'on_time')
                ->etc()
            )
        );
});

test('a time-in after the expected start time (but before the cutoff) is marked late', function () {
    [$supervisor, $hte] = makeSupervisorWithHte();
    $intern = makeApprovedInternForHte($hte);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 09:30:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'supervisor_user_id' => $supervisor->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['month' => '2026-07']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('logs', 1, fn ($log) => $log
                ->where('punctuality', 'late')
                ->etc()
            )
        );
});
test('an OJT supervisor sees a simple student roster covering every HTE within their own program', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForProgram($program);

    $hteA = Hte::create(['hte_name' => 'HTE A']);
    $hteB = Hte::create(['hte_name' => 'HTE B']);

    $internA = makeApprovedInternForHteAndProgram($hteA, $program);
    $internB = makeApprovedInternForHteAndProgram($hteB, $program);

    AttendanceLog::create([
        'intern_user_id' => $internA->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 07:45:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $internB->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 07:45:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/students')
            ->where('studentCount', 2)
            ->has('students.data', 2)
            ->where('students.total', 2)
        );
});

test('an OJT supervisor does not see students from a different program', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    $otherProgram = Program::create(['program_name' => 'BSCS-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForProgram($program);

    $hte = Hte::create(['hte_name' => 'HTE A']);
    makeApprovedInternForHteAndProgram($hte, $otherProgram);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/students')
            ->where('studentCount', 0)
            ->has('students.data', 0)
        );
});

test('the student roster exposes name, email, id number, contact number, assigned HTE, and total hours for an OJT supervisor', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForProgram($program);

    $hte = Hte::create(['hte_name' => 'HTE A']);
    $intern = makeApprovedInternForHteAndProgram($hte, $program);

    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 07:45:00', 'Asia/Manila'),
    ]);
    AttendanceLog::create([
        'intern_user_id' => $intern->id,
        'scan_timestamp' => Carbon::parse('2026-07-20 17:00:00', 'Asia/Manila'),
    ]);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/students')
            ->has('students.data', 1, fn ($student) => $student
                ->where('name', $intern->name)
                ->where('email', $intern->email)
                ->where('id_number', $intern->internProfile->id_number)
                ->where('contact_number', $intern->internProfile->contact_number)
                ->where('hte_name', 'HTE A')
                ->where('total_hours', fn ($hours) => $hours > 0)
                ->etc()
            )
        );
});

test('the student roster never exposes status, QR value, or profile timestamps to an OJT supervisor', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForProgram($program);

    $hte = Hte::create(['hte_name' => 'HTE A']);
    makeApprovedInternForHteAndProgram($hte, $program);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/students')
            ->has('students.data', 1, fn ($student) => $student
                ->missing('status')
                ->missing('qr_code_value')
                ->missing('registered_at')
                ->missing('approved_at')
                ->missing('privacy_accepted_at')
                ->missing('profile_photo_path')
                ->missing('profile_photo_url')
                ->etc()
            )
        );
});

test('the student roster paginates and honors per_page/page params', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForProgram($program);
    $hte = Hte::create(['hte_name' => 'HTE A']);

    foreach (range(1, 3) as $i) {
        makeApprovedInternForHteAndProgram($hte, $program);
    }

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['per_page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/students')
            ->where('studentCount', 3)
            ->has('students.data', 2)
            ->where('students.total', 3)
            ->where('students.last_page', 2)
            ->where('students.current_page', 1)
        );

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['per_page' => 2, 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('students.data', 1)
            ->where('students.current_page', 2)
        );
});

test('the student roster hte_id filter narrows to interns at that HTE', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForProgram($program);

    $hteA = Hte::create(['hte_name' => 'HTE A']);
    $hteB = Hte::create(['hte_name' => 'HTE B']);
    makeApprovedInternForHteAndProgram($hteA, $program);
    makeApprovedInternForHteAndProgram($hteB, $program);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['hte_id' => $hteA->hte_id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/students')
            ->where('students.total', 1)
            ->has('students.data', 1, fn ($student) => $student
                ->where('hte_name', 'HTE A')
                ->etc()
            )
        );
});

test('the student roster exposes hteOptions scoped to HTEs hosting the OJT supervisor\'s program', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    $otherProgram = Program::create(['program_name' => 'BSCS-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForProgram($program);

    $hteA = Hte::create(['hte_name' => 'HTE A']);
    $hteB = Hte::create(['hte_name' => 'HTE B — other program only']);
    makeApprovedInternForHteAndProgram($hteA, $program);
    makeApprovedInternForHteAndProgram($hteB, $otherProgram);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('hteOptions', 1, fn ($hte) => $hte
                ->where('hte_name', 'HTE A')
                ->etc()
            )
        );
});

test('an HTE supervisor still gets the full attendance log view, not the student roster', function () {
    [$supervisor, $hte] = makeSupervisorWithHte();
    makeApprovedInternForHte($hte);

    $this->actingAs($supervisor)
        ->get(route('supervisor.interns.index', ['month' => '2026-07']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/interns')
        );
});
