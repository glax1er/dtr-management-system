<?php

use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;

/**
 * @return array{0: User, 1: Hte}
 */
function makeHteSupervisorWithHte(): array
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

/**
 * @return array{0: User, 1: Program}
 */
function makeOjtSupervisorForHtesTest(Program $program): array
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

function makeApprovedInternForHteAndProgramInHtesTest(Hte $hte, Program $program): User
{
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

test('an OJT supervisor sees every HTE hosting an intern from their own program', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForHtesTest($program);

    $hteA = Hte::create(['hte_name' => 'HTE A', 'address' => '123 Main St', 'contact_number' => '0917']);
    $hteB = Hte::create(['hte_name' => 'HTE B']);
    $hteC = Hte::create(['hte_name' => 'HTE C — no interns here']);

    makeApprovedInternForHteAndProgramInHtesTest($hteA, $program);
    makeApprovedInternForHteAndProgramInHtesTest($hteB, $program);

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/htes')
            ->where('hteCount', 2)
            ->has('htes.data', 2)
            ->where('htes.total', 2)
        );
});

test('an OJT supervisor does not see HTEs hosting only a different program\'s interns', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    $otherProgram = Program::create(['program_name' => 'BSCS-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForHtesTest($program);

    $hte = Hte::create(['hte_name' => 'HTE A']);
    makeApprovedInternForHteAndProgramInHtesTest($hte, $otherProgram);

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/htes')
            ->where('hteCount', 0)
            ->has('htes.data', 0)
        );
});

test('the HTE roster exposes name, address, contact person, contact number, status, and scoped intern count', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForHtesTest($program);

    $hte = Hte::create([
        'hte_name' => 'HTE A',
        'address' => '123 Main St',
        'contact_person' => 'Jane Dela Cruz',
        'contact_number' => '0917-000-0000',
        'status' => 'active',
    ]);
    makeApprovedInternForHteAndProgramInHtesTest($hte, $program);

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/htes')
            ->has('htes.data', 1, fn ($row) => $row
                ->where('hte_name', 'HTE A')
                ->where('address', '123 Main St')
                ->where('contact_person', 'Jane Dela Cruz')
                ->where('contact_number', '0917-000-0000')
                ->where('status', 'active')
                ->where('interns_count', 1)
                ->etc()
            )
        );
});

test('the HTE roster\'s intern count only counts interns from the OJT supervisor\'s own program', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    $otherProgram = Program::create(['program_name' => 'BSCS-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForHtesTest($program);

    $hte = Hte::create(['hte_name' => 'HTE A']);
    makeApprovedInternForHteAndProgramInHtesTest($hte, $program);
    makeApprovedInternForHteAndProgramInHtesTest($hte, $otherProgram);

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('htes.data', 1, fn ($row) => $row
                ->where('interns_count', 1)
                ->etc()
            )
        );
});

test('the HTE roster paginates and honors per_page/page params', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForHtesTest($program);

    foreach (range(1, 3) as $i) {
        $hte = Hte::create(['hte_name' => "HTE {$i}"]);
        makeApprovedInternForHteAndProgramInHtesTest($hte, $program);
    }

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index', ['per_page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/htes')
            ->where('hteCount', 3)
            ->has('htes.data', 2)
            ->where('htes.total', 3)
            ->where('htes.last_page', 2)
            ->where('htes.current_page', 1)
        );

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index', ['per_page' => 2, 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('htes.data', 1)
            ->where('htes.current_page', 2)
        );
});

test('the HTE roster search filters by HTE name', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForHtesTest($program);

    $hteA = Hte::create(['hte_name' => 'Acme Corp']);
    $hteB = Hte::create(['hte_name' => 'Zenith Inc']);
    makeApprovedInternForHteAndProgramInHtesTest($hteA, $program);
    makeApprovedInternForHteAndProgramInHtesTest($hteB, $program);

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index', ['search' => 'Acme']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('htes.total', 1)
            ->has('htes.data', 1, fn ($row) => $row
                ->where('hte_name', 'Acme Corp')
                ->etc()
            )
        );
});

test('an HTE supervisor is forbidden from the OJT-only HTE roster', function () {
    [$supervisor] = makeHteSupervisorWithHte();

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index'))
        ->assertForbidden();
});

test('each HTE row carries its own scoped intern list for the dropdown', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    $otherProgram = Program::create(['program_name' => 'BSCS-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForHtesTest($program);

    $hte = Hte::create(['hte_name' => 'HTE A']);
    $intern = makeApprovedInternForHteAndProgramInHtesTest($hte, $program);
    // A different program's intern at the same HTE shouldn't leak into
    // this OJT supervisor's dropdown.
    makeApprovedInternForHteAndProgramInHtesTest($hte, $otherProgram);

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('htes.data', 1, fn ($row) => $row
                ->has('interns', 1, fn ($internRow) => $internRow
                    ->where('intern_user_id', $intern->id)
                    ->where('name', $intern->name)
                    ->where('email', $intern->email)
                    ->etc()
                )
                ->etc()
            )
        );
});

test('the HTE roster status filter narrows to active or inactive HTEs', function () {
    $program = Program::create(['program_name' => 'BSIT-BTM-'.uniqid()]);
    [$supervisor] = makeOjtSupervisorForHtesTest($program);

    $activeHte = Hte::create(['hte_name' => 'Active HTE', 'status' => 'active']);
    $inactiveHte = Hte::create(['hte_name' => 'Inactive HTE', 'status' => 'inactive']);
    makeApprovedInternForHteAndProgramInHtesTest($activeHte, $program);
    makeApprovedInternForHteAndProgramInHtesTest($inactiveHte, $program);

    $this->actingAs($supervisor)
        ->get(route('supervisor.htes.index', ['status' => 'inactive']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('htes.total', 1)
            ->has('htes.data', 1, fn ($row) => $row
                ->where('hte_name', 'Inactive HTE')
                ->etc()
            )
        );
});
