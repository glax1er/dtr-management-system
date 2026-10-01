<?php

use App\Models\College;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->collegeA = College::firstOrCreate(
        ['code' => 'TEST_A'],
        ['name' => 'College A', 'is_active' => true]
    );
    $this->collegeB = College::firstOrCreate(
        ['code' => 'TEST_B'],
        ['name' => 'College B', 'is_active' => true]
    );

    $this->superAdmin = User::factory()->create([
        'role' => User::ROLE_SUPER_ADMIN,
        'is_active' => true,
    ]);

    $this->collegeAdmin = User::factory()->create([
        'role' => User::ROLE_COLLEGE_ADMIN,
        'college_id' => $this->collegeA->id,
        'is_active' => true,
    ]);
});

test('super admin can view admins management page', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('admin.admins.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/admins/index')
        ->has('admins.data')
        ->has('colleges')
    );
});

test('college admin cannot view admins management page', function () {
    $response = $this->actingAs($this->collegeAdmin)->get(route('admin.admins.index'));

    $response->assertForbidden();
});

test('intern and supervisor cannot view admins management page', function () {
    $intern = User::factory()->create(['role' => User::ROLE_INTERN]);
    $supervisor = User::factory()->create(['role' => User::ROLE_SUPERVISOR]);

    $this->actingAs($intern)->get(route('admin.admins.index'))->assertForbidden();
    $this->actingAs($supervisor)->get(route('admin.admins.index'))->assertForbidden();
});

test('super admin can create a college admin with profile', function () {
    $response = $this->actingAs($this->superAdmin)->post(route('admin.admins.store'), [
        'name' => 'New College Admin',
        'email' => 'newcollegadmin@example.com',
        'role' => 'college_admin',
        'college_id' => $this->collegeA->id,
        'employee_id' => 'EMP-1001',
        'position' => 'College Dean',
        'password' => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
    ]);

    $response->assertRedirect();

    $newUser = User::where('email', 'newcollegadmin@example.com')->first();
    expect($newUser)->not->toBeNull();
    expect($newUser->role)->toBe(User::ROLE_COLLEGE_ADMIN);
    expect($newUser->college_id)->toBe($this->collegeA->id);
    expect($newUser->is_active)->toBeTrue();
    expect($newUser->collegeAdminProfile)->not->toBeNull();
    expect($newUser->collegeAdminProfile->employee_id)->toBe('EMP-1001');
    expect($newUser->collegeAdminProfile->position)->toBe('College Dean');
    expect(Hash::check('SecurePass123!', $newUser->password))->toBeTrue();
});

test('super admin can create another super admin', function () {
    $response = $this->actingAs($this->superAdmin)->post(route('admin.admins.store'), [
        'name' => 'New Super Admin',
        'email' => 'newsuperadmin@example.com',
        'role' => 'super_admin',
        'password' => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
    ]);

    $response->assertRedirect();

    $newUser = User::where('email', 'newsuperadmin@example.com')->first();
    expect($newUser)->not->toBeNull();
    expect($newUser->role)->toBe(User::ROLE_SUPER_ADMIN);
    expect($newUser->college_id)->toBeNull();
    expect($newUser->is_active)->toBeTrue();
    expect(Hash::check('SecurePass123!', $newUser->password))->toBeTrue();
});

test('college admin creation requires a valid college', function () {
    $response = $this->actingAs($this->superAdmin)->post(route('admin.admins.store'), [
        'name' => 'Invalid College Admin',
        'email' => 'invalidcollege@example.com',
        'role' => 'college_admin',
        'college_id' => 999999, // non-existent
        'password' => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
    ]);

    $response->assertSessionHasErrors(['college_id']);
    expect(User::where('email', 'invalidcollege@example.com')->exists())->toBeFalse();
});

test('super admin can update a college admin', function () {
    $response = $this->actingAs($this->superAdmin)->patch(route('admin.admins.update', $this->collegeAdmin), [
        'name' => 'Updated College Admin Name',
        'email' => 'updated_email@example.com',
        'college_id' => $this->collegeB->id,
    ]);

    $response->assertRedirect();

    $this->collegeAdmin->refresh();
    expect($this->collegeAdmin->name)->toBe('Updated College Admin Name');
    expect($this->collegeAdmin->email)->toBe('updated_email@example.com');
    expect($this->collegeAdmin->college_id)->toBe($this->collegeB->id);
});

test('super admin can toggle college admin active status', function () {
    expect($this->collegeAdmin->is_active)->toBeTrue();

    // Deactivate
    $response = $this->actingAs($this->superAdmin)->patch(route('admin.admins.updateStatus', $this->collegeAdmin), [
        'is_active' => false,
    ]);

    $response->assertRedirect();
    $this->collegeAdmin->refresh();
    expect($this->collegeAdmin->is_active)->toBeFalse();

    // Reactivate
    $this->actingAs($this->superAdmin)->patch(route('admin.admins.updateStatus', $this->collegeAdmin), [
        'is_active' => true,
    ]);

    $this->collegeAdmin->refresh();
    expect($this->collegeAdmin->is_active)->toBeTrue();
});

test('super admin cannot deactivate their own account', function () {
    $response = $this->actingAs($this->superAdmin)->patch(route('admin.admins.updateStatus', $this->superAdmin), [
        'is_active' => false,
    ]);

    $response->assertRedirect();
    $this->superAdmin->refresh();
    expect($this->superAdmin->is_active)->toBeTrue();
});

test('super admin can delete a college admin account', function () {
    $response = $this->actingAs($this->superAdmin)->delete(route('admin.admins.destroy', $this->collegeAdmin));

    $response->assertRedirect();
    expect(User::where('id', $this->collegeAdmin->id)->exists())->toBeFalse();
});

test('super admin cannot delete their own account', function () {
    $response = $this->actingAs($this->superAdmin)->delete(route('admin.admins.destroy', $this->superAdmin));

    $response->assertRedirect();
    expect(User::where('id', $this->superAdmin->id)->exists())->toBeTrue();
});
