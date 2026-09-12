<?php

use App\Models\College;
use App\Models\Hte;
use App\Models\Program;
use App\Models\User;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'is_active' => true,
    ]);

    $this->collegeA = College::create([
        'name' => 'College of Computing '.uniqid(),
        'code' => 'CC_'.uniqid(),
        'description' => 'Computing programs',
        'is_active' => true,
    ]);

    $this->collegeAdmin = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $this->collegeA->id,
        'is_active' => true,
    ]);
});

test('super admin can view colleges index with assigned admin email', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.colleges.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/colleges/index')
        ->where('colleges.data', function ($colleges) {
            $college = collect($colleges)->firstWhere('id', $this->collegeA->id);
            expect($college['admin_email'])->toBe($this->collegeAdmin->email);
            return true;
        })
    );
});

test('college admin cannot view colleges index', function () {
    $response = $this->actingAs($this->collegeAdmin)->get(route('admin.colleges.index'));

    $response->assertForbidden();
});

test('super admin can create a new college with campus', function () {
    $code = 'NEW_'.rand(100, 999);
    $response = $this->actingAs($this->superAdmin)->post(route('admin.colleges.store'), [
        'name' => 'New College',
        'code' => $code,
        'campus' => 'Tagum',
        'description' => 'New College Description',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('colleges', [
        'name' => 'New College',
        'code' => $code,
        'campus' => 'Tagum',
        'is_active' => true,
    ]);
});

test('super admin can update a college and its campus', function () {
    $response = $this->actingAs($this->superAdmin)->patch(route('admin.colleges.update', $this->collegeA), [
        'name' => 'Updated College Name',
        'code' => $this->collegeA->code,
        'campus' => 'Mintal',
        'description' => 'Updated description',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('colleges', [
        'id' => $this->collegeA->id,
        'name' => 'Updated College Name',
        'campus' => 'Mintal',
    ]);
});

test('super admin can filter colleges by campus and status', function () {
    $collegeObrero = College::create([
        'name' => 'College Obrero '.uniqid(),
        'code' => 'CO_'.uniqid(),
        'campus' => 'Obrero',
        'is_active' => true,
    ]);

    $collegeTagum = College::create([
        'name' => 'College Tagum '.uniqid(),
        'code' => 'CT_'.uniqid(),
        'campus' => 'Tagum',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->superAdmin)->get(route('admin.colleges.index', ['campus' => 'Obrero']));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/colleges/index')
        ->where('filters.campus', 'Obrero')
        ->where('colleges.data', function ($colleges) use ($collegeObrero, $collegeTagum) {
            $ids = collect($colleges)->pluck('id');
            return $ids->contains($collegeObrero->id) && ! $ids->contains($collegeTagum->id);
        })
    );
});

test('super admin can toggle college status', function () {
    $response = $this->actingAs($this->superAdmin)->patch(route('admin.colleges.updateStatus', $this->collegeA), [
        'is_active' => false,
    ]);

    $response->assertRedirect();
    expect($this->collegeA->fresh()->is_active)->toBeFalse();
});

test('super admin can archive a college', function () {
    $response = $this->actingAs($this->superAdmin)->delete(route('admin.colleges.destroy', $this->collegeA));

    $response->assertRedirect();
    expect($this->collegeA->fresh()->trashed())->toBeTrue();
});

test('archived college can be viewed, restored, and force deleted in archives', function () {
    $this->collegeA->delete();

    // View in archives
    $response = $this->actingAs($this->superAdmin)->get(route('admin.archives.index', ['type' => 'colleges']));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/archives/index')
        ->where('currentType', 'colleges')
        ->has('records.data')
    );

    // College admin forbidden from viewing colleges archive
    $this->actingAs($this->collegeAdmin)
        ->get(route('admin.archives.index', ['type' => 'colleges']))
        ->assertForbidden();

    // Restore
    $restoreResponse = $this->actingAs($this->superAdmin)->post(route('admin.archives.restore', [
        'type' => 'colleges',
        'id' => $this->collegeA->id,
    ]));
    $restoreResponse->assertRedirect();
    expect($this->collegeA->fresh()->trashed())->toBeFalse();

    // Re-delete then force delete
    $this->collegeA->delete();
    $forceDeleteResponse = $this->actingAs($this->superAdmin)->delete(route('admin.archives.forceDelete', [
        'type' => 'colleges',
        'id' => $this->collegeA->id,
    ]));
    $forceDeleteResponse->assertRedirect();
    $this->assertDatabaseMissing('colleges', ['id' => $this->collegeA->id]);
});

test('intern registration requires matching program and college', function () {
    Notification::fake();

    $collegeB = College::create([
        'name' => 'College B '.uniqid(),
        'code' => 'CB_'.uniqid(),
        'is_active' => true,
    ]);

    $programInA = Program::create([
        'college_id' => $this->collegeA->id,
        'program_name' => 'Prog In A '.uniqid(),
    ]);

    $hte = Hte::create(['hte_name' => 'Test HTE '.uniqid(), 'status' => 'active']);

    // Attempt registration with program belonging to College A, but submitting College B -> validation error
    $response = $this->post(route('register.store'), [
        'name' => 'Student User',
        'email' => 'student.mismatch@usep.edu.ph',
        'id_number' => '2026-99901',
        'sex' => 'female',
        'college_id' => $collegeB->id,
        'program_id' => $programInA->program_id,
        'hte_id' => $hte->hte_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response->assertSessionHasErrors('program_id');

    $this->collegeA->update(['campus' => 'Obrero']);

    // Registration with matching college, campus and program succeeds
    $validResponse = $this->post(route('register.store'), [
        'name' => 'Student User Valid',
        'email' => 'student.valid@usep.edu.ph',
        'id_number' => '2026-99902',
        'sex' => 'female',
        'campus' => 'Obrero',
        'college_id' => $this->collegeA->id,
        'program_id' => $programInA->program_id,
        'hte_id' => $hte->hte_id,
        'privacy_accepted' => true,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $validResponse->assertRedirect(route('verification.notice'));
    $user = User::where('email', 'student.valid@usep.edu.ph')->first();
    expect($user)->not->toBeNull();
    expect($user->college_id)->toBe($this->collegeA->id);
    expect($user->campus)->toBe('Obrero');
    expect($user->internProfile->campus)->toBe('Obrero');
});

test('admin management index lists campus for super admin and college admin', function () {
    $this->collegeA->update(['campus' => 'Obrero']);

    $response = $this->actingAs($this->superAdmin)->get(route('admin.admins.index'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/admins/index')
        ->where('admins.data', function ($admins) {
            $collegeAdminItem = collect($admins)->firstWhere('id', $this->collegeAdmin->id);
            expect($collegeAdminItem['campus'])->toBe('Obrero');

            $superAdminItem = collect($admins)->firstWhere('id', $this->superAdmin->id);
            expect($superAdminItem['campus'])->toBe('All Campuses');

            return true;
        })
    );
});
