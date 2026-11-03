<?php

use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\Kiosk;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

if (! function_exists('makeHte')) {
    function makeHte(string $name = 'CIC'): Hte
    {
        return Hte::create(['hte_name' => $name]);
    }
}

if (! function_exists('makeProgram')) {
    function makeProgram(): Program
    {
        return Program::create(['program_name' => 'BSIT-BTM '.uniqid()]);
    }
}

if (! function_exists('makeIntern')) {
    function makeIntern(Hte $hte, string $status = 'approved', ?string $qrCodeValue = null): User
    {
        $user = User::factory()->create(['role' => 'intern']);

        InternProfile::create([
            'user_id' => $user->id,
            'id_number' => 'ID-'.$user->id,
            'sex' => 'male',
            'hte_id' => $hte->hte_id,
            'program_id' => makeProgram()->program_id,
            'status' => $status,
            'qr_code_value' => $qrCodeValue ?? 'QR-'.$user->id,
            'registered_at' => now(),
            'approved_at' => $status === 'approved' ? now() : null,
            'privacy_accepted_at' => now(),
        ]);

        return $user;
    }
}

if (! function_exists('makeKiosk')) {
    function makeKiosk(): Kiosk
    {
        return Kiosk::create([
            'name' => 'Main Kiosk',
            'device_token' => Kiosk::generateToken(),
            'is_active' => true,
        ]);
    }
}
